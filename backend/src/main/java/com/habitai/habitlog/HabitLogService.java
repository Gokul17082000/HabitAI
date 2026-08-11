package com.habitai.habitlog;

import com.habitai.common.security.CurrentUser;
import com.habitai.common.validation.HabitAccessValidator;
import com.habitai.habit.Habit;
import com.habitai.habit.HabitScheduleService;
import com.habitai.user.StreakFreezeService;
import com.habitai.user.StreakFreezeUsageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class HabitLogService {

    private final HabitLogRepository habitLogRepository;
    private final HabitAccessValidator habitAccessValidator;
    private final CurrentUser currentUser;
    private final HabitScheduleService habitScheduleService;
    private final StreakFreezeUsageRepository streakFreezeUsageRepository;

    // Self-reference through the Spring proxy so @Transactional(REQUIRES_NEW) on
    // retryAfterConcurrentInsert actually starts a new transaction (self-calls bypass the proxy).
    @Autowired
    @Lazy
    private HabitLogService self;

    public HabitLogService(HabitLogRepository habitLogRepository,
                           HabitAccessValidator habitAccessValidator,
                           CurrentUser currentUser,
                           HabitScheduleService habitScheduleService,
                           StreakFreezeUsageRepository streakFreezeUsageRepository) {
        this.habitLogRepository = habitLogRepository;
        this.habitAccessValidator = habitAccessValidator;
        this.currentUser = currentUser;
        this.habitScheduleService = habitScheduleService;
        this.streakFreezeUsageRepository = streakFreezeUsageRepository;
    }

    @org.springframework.transaction.annotation.Transactional
    public void updateTodayHabitStatus(long habitId, HabitLogRequest habitLogRequest) {
        Habit habit = habitAccessValidator.getAndValidate(habitId);
        long userId = currentUser.getId();
        ZoneId zone = currentUser.getZone();
        LocalDate today = LocalDate.now(zone);

        if (!habitLogRequest.date().isEqual(today)) {
            throw new IllegalStateException("Cannot update past or future habits");
        }

        if (habit.isPaused()) {
            throw new IllegalStateException("Cannot log a paused habit");
        }

        Optional<HabitLog> existing = habitLogRepository
                .findByHabitIdAndUserIdAndDate(habitId, userId, today);

        try {
            saveHabitLog(habit, habitId, userId, today, habitLogRequest, existing);
        } catch (DataIntegrityViolationException e) {
            // Concurrent request already inserted a row — delegate to self through the
            // Spring proxy so REQUIRES_NEW actually suspends this transaction and opens a
            // fresh one. A direct this.retry(...) call bypasses the proxy and inherits the
            // current (now rollback-only) transaction, silently discarding the save.
            self.retryAfterConcurrentInsert(habit, habitId, userId, today, habitLogRequest);
        }
    }

    @org.springframework.transaction.annotation.Transactional(propagation = Propagation.REQUIRES_NEW)
    public void retryAfterConcurrentInsert(Habit habit, long habitId, long userId,
                                           LocalDate today, HabitLogRequest habitLogRequest) {
        Optional<HabitLog> concurrent = habitLogRepository
                .findByHabitIdAndUserIdAndDate(habitId, userId, today);
        saveHabitLog(habit, habitId, userId, today, habitLogRequest, concurrent);
    }

    private void saveHabitLog(Habit habit, long habitId, long userId, LocalDate today,
                              HabitLogRequest habitLogRequest, Optional<HabitLog> existing) {
        // --- MISSED (carries an explanatory note) ---
        // MISSED is sent when the user attaches a "why did you skip" note. It arrives with
        // count 0 for both binary and countable habits. Persist it explicitly here — otherwise
        // the countable branch below treats count <= 0 as an un-log and deletes the row,
        // silently discarding the note the user just wrote (and falsely reporting success).
        if (habitLogRequest.habitStatus() == HabitStatus.MISSED) {
            HabitLog habitLog = existing.orElseGet(() -> {
                HabitLog newLog = new HabitLog();
                newLog.setHabitId(habitId);
                newLog.setUserId(userId);
                newLog.setDate(today);
                return newLog;
            });
            habitLog.setStatus(HabitStatus.MISSED);
            habitLog.setCurrentCount(0);
            habitLog.setNote(habitLogRequest.note());
            habitLogRepository.save(habitLog);
            return;
        }

        // --- Binary habit (yes/no) ---
        if (!habit.isCountable()) {
            if (habitLogRequest.habitStatus() == HabitStatus.PENDING) {
                existing.ifPresent(habitLogRepository::delete);
                return;
            }

            HabitLog habitLog = existing.orElseGet(() -> {
                HabitLog newLog = new HabitLog();
                newLog.setHabitId(habitId);
                newLog.setUserId(userId);
                newLog.setDate(today);
                return newLog;
            });

            habitLog.setStatus(habitLogRequest.habitStatus());
            habitLog.setCurrentCount(0);
            habitLog.setNote(habitLogRequest.note());
            habitLogRepository.save(habitLog);
            return;
        }

        // --- Countable habit ---
        int newCount = habitLogRequest.currentCount();

        if (newCount <= 0) {
            existing.ifPresent(habitLogRepository::delete);
            return;
        }

        HabitStatus computedStatus;
        if (newCount >= habit.getTargetCount()) {
            computedStatus = HabitStatus.COMPLETED;
            newCount = habit.getTargetCount();
        } else {
            computedStatus = HabitStatus.PARTIALLY_COMPLETED;
        }

        HabitLog habitLog = existing.orElseGet(() -> {
            HabitLog newLog = new HabitLog();
            newLog.setHabitId(habitId);
            newLog.setUserId(userId);
            newLog.setDate(today);
            return newLog;
        });

        habitLog.setStatus(computedStatus);
        habitLog.setCurrentCount(newCount);
        habitLog.setNote(habitLogRequest.note());
        habitLogRepository.save(habitLog);
    }

    public HabitStreakResponse getCurrentStreak(long habitId) {
        Habit habit = habitAccessValidator.getAndValidate(habitId);
        long userId = currentUser.getId();
        ZoneId zone = currentUser.getZone();

        // INTENTIONAL: streaks count only COMPLETED days, not PARTIALLY_COMPLETED.
        // A streak represents hitting the full target every scheduled day — partial
        // completions are recorded and shown in the activity heatmap but do not
        // extend or preserve the streak. This keeps the metric unambiguous: a streak
        // of N means the user fully completed the habit N consecutive scheduled days.
        Set<LocalDate> completedDates = habitLogRepository
                .findByHabitIdAndUserIdAndStatusOrderByDateDesc(habitId, userId, HabitStatus.COMPLETED)
                .stream()
                .map(HabitLog::getDate)
                .collect(java.util.stream.Collectors.toSet());

        Set<LocalDate> frozenDates = streakFreezeUsageRepository.findUsedOnByUserId(userId);

        LocalDate today = LocalDate.now(zone);
        LocalDate cursor = today;
        int streak = 0;

        while (!cursor.isBefore(habit.getCreatedAt())) {
            if (!habitScheduleService.isScheduledForDate(habit, cursor)) {
                cursor = cursor.minusDays(1);
                continue;
            }
            if (completedDates.contains(cursor)) {
                streak++;
                cursor = cursor.minusDays(1);
            } else if (cursor.isEqual(today)) {
                cursor = cursor.minusDays(1);
            } else if (frozenDates.contains(cursor)) {
                // frozen date — skip without breaking streak
                cursor = cursor.minusDays(1);
            } else {
                break;
            }
        }

        return new HabitStreakResponse(streak);
    }

    public HabitStreakResponse getLongestStreak(long habitId) {
        Habit habit = habitAccessValidator.getAndValidate(habitId);
        long userId = currentUser.getId();
        ZoneId zone = currentUser.getZone();

        // INTENTIONAL: same COMPLETED-only policy as getCurrentStreak — see comment there.
        Set<LocalDate> completedDates = habitLogRepository
                .findByHabitIdAndUserIdAndStatusOrderByDateDesc(habitId, userId, HabitStatus.COMPLETED)
                .stream()
                .map(HabitLog::getDate)
                .collect(java.util.stream.Collectors.toSet());

        Set<LocalDate> frozenDates = streakFreezeUsageRepository.findUsedOnByUserId(userId);

        if (completedDates.isEmpty()) return new HabitStreakResponse(0);

        LocalDate today = LocalDate.now(zone);
        List<LocalDate> scheduledDays = new ArrayList<>();
        LocalDate cursor = habit.getCreatedAt();
        while (!cursor.isAfter(today)) {
            if (habitScheduleService.isScheduledForDate(habit, cursor)) {
                scheduledDays.add(cursor);
            }
            cursor = cursor.plusDays(1);
        }

        if (scheduledDays.isEmpty()) return new HabitStreakResponse(0);

        int longest = 0;
        int current = 0;
        for (LocalDate day : scheduledDays) {
            if (completedDates.contains(day)) {
                current++;
                longest = Math.max(longest, current);
            } else if (frozenDates.contains(day)) {
                // frozen day: preserve streak without counting it toward the length
            } else {
                current = 0;
            }
        }

        return new HabitStreakResponse(longest);
    }

    public List<HabitActivityStatus> getHabitActivity(long habitId, LocalDate startDate, LocalDate endDate) {
        Habit habit = habitAccessValidator.getAndValidate(habitId);
        long userId = currentUser.getId();
        ZoneId zone = currentUser.getZone();

        LocalDate effectiveStart = startDate.isBefore(habit.getCreatedAt())
                ? habit.getCreatedAt()
                : startDate;

        List<HabitLog> habitLogs = habitLogRepository
                .findByHabitIdAndUserIdAndDateBetweenOrderByDateAsc(habitId, userId, effectiveStart, endDate);

        List<HabitActivityStatus> habitActivityStatusList = new ArrayList<>();
        LocalDate today = LocalDate.now(zone);
        LocalTime nowTime = LocalTime.now(zone);
        LocalDate currentDate = effectiveStart;
        LocalDate effectiveEndDate = endDate.isAfter(today) ? today : endDate;

        int i = 0;
        while (!currentDate.isAfter(effectiveEndDate)) {
            if (!habitScheduleService.isScheduledForDate(habit, currentDate)) {
                currentDate = currentDate.plusDays(1);
                continue;
            }

            // Skip logs whose dates fall before currentDate — these belong to dates
            // that are no longer scheduled (e.g. after a DAILY→WEEKLY frequency change).
            // Without this, i gets stuck on the stale log and every subsequent
            // scheduled date would appear as MISSED even if it has a valid log.
            while (i < habitLogs.size() && habitLogs.get(i).getDate().isBefore(currentDate)) {
                i++;
            }

            HabitActivityStatus habitActivityStatus;
            if (i < habitLogs.size() && habitLogs.get(i).getDate().isEqual(currentDate)) {
                habitActivityStatus = new HabitActivityStatus(currentDate, habitLogs.get(i).getStatus(), habitLogs.get(i).getNote());
                i++;
            } else if (currentDate.isEqual(today)) {
                // Mirror HabitService.getDefaultStatus: if targetTime has already passed,
                // show MISSED rather than PENDING so both endpoints agree.
                LocalTime target = habit.getTargetTime();
                HabitStatus todayStatus = (target == null || nowTime.isBefore(target))
                        ? HabitStatus.PENDING
                        : HabitStatus.MISSED;
                habitActivityStatus = new HabitActivityStatus(currentDate, todayStatus, null);
            } else {
                habitActivityStatus = new HabitActivityStatus(currentDate, HabitStatus.MISSED, null);
            }

            habitActivityStatusList.add(habitActivityStatus);
            currentDate = currentDate.plusDays(1);
        }
        return habitActivityStatusList;
    }

    public void deleteByHabitId(long habitId) {
        habitLogRepository.deleteByHabitIdAndUserId(habitId, currentUser.getId());
    }
}