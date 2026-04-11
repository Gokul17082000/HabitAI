package com.habitai.habit;

import com.habitai.common.validation.HabitAccessValidator;
import com.habitai.common.security.CurrentUser;
import com.habitai.habitlog.HabitLog;
import com.habitai.habitlog.HabitLogRepository;
import com.habitai.habitlog.HabitStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import com.habitai.common.AppConstants;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class HabitService {

    private final HabitRepository habitRepository;
    private final CurrentUser currentUser;
    private final HabitAccessValidator habitAccessValidator;
    private final HabitLogRepository habitLogRepository;
    private final HabitScheduleService habitScheduleService;
    private final HabitPauseHistoryRepository habitPauseHistoryRepository;

    public HabitService(HabitRepository habitRepository,
                        CurrentUser currentUser,
                        HabitAccessValidator habitAccessValidator,
                        HabitLogRepository habitLogRepository,
                        HabitScheduleService habitScheduleService,
                        HabitPauseHistoryRepository habitPauseHistoryRepository) {
        this.habitRepository = habitRepository;
        this.currentUser = currentUser;
        this.habitAccessValidator = habitAccessValidator;
        this.habitLogRepository = habitLogRepository;
        this.habitScheduleService = habitScheduleService;
        this.habitPauseHistoryRepository = habitPauseHistoryRepository;
    }

    public List<HabitDTO> getAllHabits() {
        return habitRepository.findByUserId(currentUser.getId())
                .stream()
                .filter(h -> !h.isArchived())
                .map(this::toDTO)
                .toList();
    }

    public List<HabitDTO> getArchivedHabits() {
        return habitRepository.findByUserId(currentUser.getId())
                .stream()
                .filter(Habit::isArchived)
                .map(this::toDTO)
                .toList();
    }

    public List<HabitResponse> getHabitsForDate(LocalDate date) {
        long userId = currentUser.getId();
        ZoneId zone = currentUser.getZone();
        LocalTime now = LocalTime.now(zone);
        LocalDate today = LocalDate.now(zone);

        List<Habit> habits = habitRepository.findByUserId(userId)
                .stream()
                .filter(habit -> !habit.isPaused())
                .filter(habit -> !habit.isArchived())
                .filter(habit -> isScheduledForDate(habit, date))
                .filter(habit -> !date.isBefore(habit.getCreatedAt()))
                .toList();

        Map<Long, HabitLog> logMap = habitLogRepository
                .findByUserIdAndDate(userId, date)
                .stream()
                .collect(Collectors.toMap(HabitLog::getHabitId, log -> log));

        return habits.stream()
                .map(habit -> {
                    HabitLog log = logMap.get(habit.getId());

                    HabitStatus status;
                    int currentCount;

                    if (log != null) {
                        status = log.getStatus();
                        currentCount = log.getCurrentCount();
                    } else {
                        status = getDefaultStatus(date, today, now, habit);
                        currentCount = 0;
                    }

                    return new HabitResponse(
                            habit.getId(),
                            habit.getTitle(),
                            habit.getDescription(),
                            habit.getCategory(),
                            habit.getTargetTime(),
                            habit.getTargetCount(),
                            habit.isCountable(),
                            currentCount,
                            status
                    );
                })
                .toList();
    }

    private HabitStatus getDefaultStatus(LocalDate date, LocalDate today, LocalTime now, Habit habit) {
        if (date.isBefore(today)) return HabitStatus.MISSED;
        if (date.isAfter(today)) return HabitStatus.PENDING;
        // Guard against null targetTime — treat as PENDING (give benefit of the doubt)
        LocalTime target = habit.getTargetTime();
        return (target == null || now.isBefore(target)) ? HabitStatus.PENDING : HabitStatus.MISSED;
    }

    public HabitDTO getHabitById(long habitId) {
        Habit habit = habitAccessValidator.getAndValidate(habitId);
        return toDTO(habit);
    }

    public boolean isScheduledForDate(Habit habit, LocalDate date) {
        return habitScheduleService.isScheduledForDate(habit, date);
    }

    @Transactional
    public HabitDTO createHabit(HabitRequest habitRequest) {
        validateSchedule(habitRequest);

        Habit habit = new Habit();
        habit.setTitle(habitRequest.title());
        habit.setDescription(habitRequest.description());
        habit.setCategory(habitRequest.category());
        habit.setFrequency(habitRequest.frequency());
        habit.setDaysOfWeek(habitRequest.daysOfWeek());
        habit.setDaysOfMonth(habitRequest.daysOfMonth());
        habit.setUserId(currentUser.getId());
        habit.setTargetTime(habitRequest.targetTime());
        habit.setCountable(habitRequest.isCountable());
        habit.setTargetCount(habitRequest.targetCount());
        habit.setCreatedAt(LocalDate.now(currentUser.getZone()));

        normalizeSchedule(habit);

        Habit saved = habitRepository.save(habit);
        return toDTO(saved);
    }

    @Transactional
    public void updateHabit(long habitId, HabitRequest habitRequest) {
        validateSchedule(habitRequest);

        Habit habit = habitAccessValidator.getAndValidate(habitId);

        ZoneId zone = currentUser.getZone();

        // If targetCount changed on a countable habit, recompute today's log status
        if (habit.isCountable() && habitRequest.isCountable()
                && habit.getTargetCount() != habitRequest.targetCount()) {

            LocalDate today = LocalDate.now(zone);
            habitLogRepository
                    .findByHabitIdAndUserIdAndDate(habitId, habit.getUserId(), today)
                    .ifPresent(log -> {
                        if (log.getCurrentCount() >= habitRequest.targetCount()) {
                            log.setStatus(HabitStatus.COMPLETED);
                            log.setCurrentCount(habitRequest.targetCount());
                        } else if (log.getCurrentCount() > 0) {
                            log.setStatus(HabitStatus.PARTIALLY_COMPLETED);
                        }
                        habitLogRepository.save(log);
                    });
        }

        habit.setTitle(habitRequest.title());
        habit.setDescription(habitRequest.description());
        habit.setCategory(habitRequest.category());
        habit.setFrequency(habitRequest.frequency());
        habit.setDaysOfWeek(habitRequest.daysOfWeek());
        habit.setDaysOfMonth(habitRequest.daysOfMonth());
        habit.setTargetTime(habitRequest.targetTime());
        habit.setCountable(habitRequest.isCountable());
        habit.setTargetCount(habitRequest.targetCount());
        // NOTE: createdAt is intentionally NOT updated here — editing a habit
        // must never change its original creation date, as streaks and activity
        // history are anchored to that date.

        normalizeSchedule(habit);
        habitRepository.save(habit);
    }

    @Transactional
    public void deleteHabit(long habitId) {
        Habit habit = habitAccessValidator.getAndValidate(habitId);
        habitPauseHistoryRepository.deleteByHabitId(habitId);
        habitLogRepository.deleteByHabitIdAndUserId(habitId, habit.getUserId());
        habitRepository.delete(habit);
    }

    private HabitDTO toDTO(Habit habit) {
        return new HabitDTO(
                habit.getId(),
                habit.getTitle(),
                habit.getDescription(),
                habit.getCategory(),
                habit.getFrequency(),
                habit.getDaysOfWeek(),
                habit.getDaysOfMonth(),
                habit.getTargetTime(),
                habit.getCreatedAt(),
                habit.isCountable(),
                habit.getTargetCount(),
                habit.isPaused(),
                habit.getPausedUntil(),
                habit.isArchived()
        );
    }

    private void validateSchedule(HabitRequest habitRequest) {
        switch (habitRequest.frequency()) {
            case WEEKLY -> {
                if (habitRequest.daysOfWeek() == null || habitRequest.daysOfWeek().isEmpty()) {
                    throw new IllegalArgumentException("At least one day of week required");
                }
            }
            case MONTHLY -> {
                if (habitRequest.daysOfMonth() == null || habitRequest.daysOfMonth().isEmpty()) {
                    throw new IllegalArgumentException("At least one day of month is required");
                }
                for (Integer d : habitRequest.daysOfMonth()) {
                    if (d < 1 || d > 31)
                        throw new IllegalArgumentException("Invalid day: " + d);
                    // Warn: days 29-31 will be clamped to the last day of shorter months
                    // (e.g. day 31 becomes day 30 in April). This is intentional behaviour —
                    // the habit fires on the last valid day rather than being silently skipped.
                    // Clients should surface this caveat in their UI.
                }
            }
        }
    }

    private void normalizeSchedule(Habit habit) {
        switch (habit.getFrequency()) {
            case DAILY -> {
                habit.setDaysOfWeek(null);
                habit.setDaysOfMonth(null);
            }
            case WEEKLY -> habit.setDaysOfMonth(null);
            case MONTHLY -> habit.setDaysOfWeek(null);
        }
    }

    @Transactional(readOnly = true)
    public Map<String, List<String>> getMonthSummary(int year, int month) {
        long userId = currentUser.getId();
        ZoneId zone = currentUser.getZone();

        LocalDate startDate = LocalDate.of(year, month, 1);
        LocalDate endDate = startDate.withDayOfMonth(startDate.lengthOfMonth());

        List<HabitLog> logs = habitLogRepository
                .findByUserIdAndDateBetween(userId, startDate, endDate);

        List<Habit> habits = habitRepository.findByUserId(userId);

        Map<String, List<String>> result = new HashMap<>();

        LocalDate current = startDate;
        LocalDate today = LocalDate.now(zone);

        while (!current.isAfter(endDate) && !current.isAfter(today)) {
            final LocalDate date = current;

            List<Habit> scheduledHabits = habits.stream()
                    .filter(h -> isScheduledForDate(h, date))
                    .filter(h -> !date.isBefore(h.getCreatedAt()))
                    // SUGGESTION FIX: exclude habits that were paused on this specific date.
                    // Previously, all paused habits were included and shown as MISSED for
                    // the entire month, inflating missed counts for paused periods.
                    // A habit is considered paused on a date if paused=true AND
                    // pausedUntil is on or after that date (meaning the pause was active).
                    .filter(h -> !isHabitPausedOnDate(h, date))
                    .toList();

            if (!scheduledHabits.isEmpty()) {
                Map<Long, HabitStatus> dayLogs = logs.stream()
                        .filter(l -> l.getDate().equals(date))
                        .collect(Collectors.toMap(HabitLog::getHabitId, HabitLog::getStatus));

                List<String> statuses = scheduledHabits.stream()
                        .map(h -> {
                            HabitStatus status = dayLogs.get(h.getId());
                            if (status != null) return status.name();
                            if (date.isBefore(today)) return HabitStatus.MISSED.name();
                            return HabitStatus.PENDING.name();
                        })
                        .toList();

                result.put(date.toString(), statuses);
            }

            current = current.plusDays(1);
        }

        return result;
    }

    /**
     * Delegates to HabitScheduleService — moved there so UserStatsService can
     * share the same logic without duplicating it.
     */
    private boolean isHabitPausedOnDate(Habit habit, LocalDate date) {
        return habitScheduleService.isHabitPausedOnDate(habit.getId(), date);
    }

    @Transactional
    public void pauseHabit(long habitId, PauseRequest request) {
        Habit habit = habitAccessValidator.getAndValidate(habitId);
        LocalDate today = LocalDate.now(currentUser.getZone());
        LocalDate until = today.plusDays(request.days());

        habit.setPaused(true);
        habit.setPausedUntil(until);
        habitRepository.save(habit);

        HabitPauseHistory habitPauseHistory = new HabitPauseHistory();
        habitPauseHistory.setHabitId(habitId);
        habitPauseHistory.setPausedFrom(today);
        habitPauseHistory.setPausedUntil(until);

        habitPauseHistoryRepository.save(habitPauseHistory);
    }

    @Transactional
    public void resumeHabit(long habitId) {
        Habit habit = habitAccessValidator.getAndValidate(habitId);
        habit.setPaused(false);
        habit.setPausedUntil(null);
        habitRepository.save(habit);
    }

    @Transactional
    public void archiveHabit(long habitId) {
        Habit habit = habitAccessValidator.getAndValidate(habitId);
        habit.setArchived(true);
        habit.setPaused(false);       // unpause if paused
        habit.setPausedUntil(null);
        habitRepository.save(habit);
    }

    @Transactional
    public void unarchiveHabit(long habitId) {
        Habit habit = habitAccessValidator.getAndValidate(habitId);
        habit.setArchived(false);
        habitRepository.save(habit);
    }
}