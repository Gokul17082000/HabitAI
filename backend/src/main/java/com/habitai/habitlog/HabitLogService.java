package com.habitai.habitlog;

import com.habitai.common.security.CurrentUser;
import com.habitai.common.validation.HabitAccessValidator;
import com.habitai.habit.Habit;
import com.habitai.habit.HabitScheduleService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
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

    public HabitLogService(HabitLogRepository habitLogRepository,
                           HabitAccessValidator habitAccessValidator,
                           CurrentUser currentUser,
                           HabitScheduleService habitScheduleService) {
        this.habitLogRepository = habitLogRepository;
        this.habitAccessValidator = habitAccessValidator;
        this.currentUser = currentUser;
        this.habitScheduleService = habitScheduleService;
    }

    public void updateTodayHabitStatus(long habitId, HabitLogRequest habitLogRequest) {
        Habit habit = habitAccessValidator.getAndValidate(habitId);
        long userId = currentUser.getId();
        ZoneId zone = currentUser.getZone();
        LocalDate today = LocalDate.now(zone);

        if (!habitLogRequest.date().isEqual(today)) {
            throw new IllegalStateException("Cannot update past or future habits");
        }

        Optional<HabitLog> existing = habitLogRepository
                .findByHabitIdAndUserIdAndDate(habitId, userId, today);

        try {
            saveHabitLog(habit, habitId, userId, today, habitLogRequest, existing);
        } catch (DataIntegrityViolationException e) {
            // Concurrent request already inserted a row — re-fetch and update it
            Optional<HabitLog> concurrent = habitLogRepository
                    .findByHabitIdAndUserIdAndDate(habitId, userId, today);
            saveHabitLog(habit, habitId, userId, today, habitLogRequest, concurrent);
        }
    }

    private void saveHabitLog(Habit habit, long habitId, long userId, LocalDate today,
                              HabitLogRequest habitLogRequest, Optional<HabitLog> existing) {
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

        Set<LocalDate> completedDates = habitLogRepository
                .findByHabitIdAndUserIdAndStatusOrderByDateDesc(habitId, userId, HabitStatus.COMPLETED)
                .stream()
                .map(HabitLog::getDate)
                .collect(java.util.stream.Collectors.toSet());

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

        Set<LocalDate> completedDates = habitLogRepository
                .findByHabitIdAndUserIdAndStatusOrderByDateDesc(habitId, userId, HabitStatus.COMPLETED)
                .stream()
                .map(HabitLog::getDate)
                .collect(java.util.stream.Collectors.toSet());

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
        LocalDate currentDate = effectiveStart;
        LocalDate effectiveEndDate = endDate.isAfter(today) ? today : endDate;

        int i = 0;
        while (!currentDate.isAfter(effectiveEndDate)) {
            if (!habitScheduleService.isScheduledForDate(habit, currentDate)) {
                currentDate = currentDate.plusDays(1);
                continue;
            }

            HabitActivityStatus habitActivityStatus;
            if (i < habitLogs.size() && habitLogs.get(i).getDate().isEqual(currentDate)) {
                habitActivityStatus = new HabitActivityStatus(currentDate, habitLogs.get(i).getStatus());
                i++;
            } else if (currentDate.isEqual(today)) {
                habitActivityStatus = new HabitActivityStatus(currentDate, HabitStatus.PENDING);
            } else {
                habitActivityStatus = new HabitActivityStatus(currentDate, HabitStatus.MISSED);
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