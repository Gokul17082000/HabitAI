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
import java.util.Set;
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
                .sorted(java.util.Comparator
                        .comparingInt(Habit::getSortOrder)
                        .thenComparingLong(Habit::getId))
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

        List<Habit> allHabits = habitRepository.findByUserId(userId);

        // Bulk-load pause history so we can evaluate historical pause state per date,
        // not just the live isPaused() flag. Mirrors the same pattern in getMonthSummary.
        Set<Long> habitIds = allHabits.stream().map(Habit::getId).collect(Collectors.toSet());
        Map<Long, List<HabitPauseHistory>> pausesByHabitId = habitPauseHistoryRepository
                .findByHabitIdIn(habitIds)
                .stream()
                .collect(Collectors.groupingBy(HabitPauseHistory::getHabitId));

        List<Habit> habits = allHabits.stream()
                .filter(habit -> !habit.isArchived())
                .filter(habit -> isScheduledForDate(habit, date))
                .filter(habit -> !date.isBefore(habit.getCreatedAt()))
                .filter(habit -> !isPausedOnDate(pausesByHabitId.getOrDefault(habit.getId(), List.of()), date))
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
        habit.setNotificationsEnabled(habitRequest.notificationsEnabled());
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
        habit.setNotificationsEnabled(habitRequest.notificationsEnabled());
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
                habit.isArchived(),
                habit.isNotificationsEnabled(),
                habit.getSortOrder()
        );
    }

    @Transactional
    public void updateSortOrder(long habitId, int newSortOrder) {
        Habit habit = habitAccessValidator.getAndValidate(habitId);
        habit.setSortOrder(newSortOrder);
        habitRepository.save(habit);
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

        // Bulk-load pause history for all habits upfront — avoids O(habits × days) DB
        // queries from calling isHabitPausedOnDate (a DB existsBy) inside the day loop.
        // Same pattern already used in UserStatsService.getYearPixels.
        Set<Long> habitIds = habits.stream().map(Habit::getId).collect(Collectors.toSet());
        Map<Long, List<HabitPauseHistory>> pausesByHabitId = habitPauseHistoryRepository
                .findByHabitIdIn(habitIds)
                .stream()
                .collect(Collectors.groupingBy(HabitPauseHistory::getHabitId));

        Map<String, List<String>> result = new HashMap<>();

        LocalDate current = startDate;
        LocalDate today = LocalDate.now(zone);

        while (!current.isAfter(endDate) && !current.isAfter(today)) {
            final LocalDate date = current;

            List<Habit> scheduledHabits = habits.stream()
                    .filter(h -> isScheduledForDate(h, date))
                    .filter(h -> !date.isBefore(h.getCreatedAt()))
                    .filter(h -> !isPausedOnDate(pausesByHabitId.getOrDefault(h.getId(), List.of()), date))
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

    private boolean isPausedOnDate(List<HabitPauseHistory> pauses, LocalDate date) {
        return pauses.stream()
                .anyMatch(p -> !date.isBefore(p.getPausedFrom()) && !date.isAfter(p.getPausedUntil()));
    }

    @Transactional
    public void pauseHabit(long habitId, PauseRequest request) {
        Habit habit = habitAccessValidator.getAndValidate(habitId);
        LocalDate today = LocalDate.now(currentUser.getZone());
        LocalDate until = today.plusDays(request.days());

        habit.setPaused(true);
        habit.setPausedUntil(until);
        habitRepository.save(habit);

        // If already paused, extend the existing record rather than inserting a new one.
        // A second insert would leave an orphan row that resumeHabit() (which only clears
        // the most recent row) cannot clean up, permanently hiding the habit from summaries.
        HabitPauseHistory habitPauseHistory = habitPauseHistoryRepository
                .findTopByHabitIdOrderByPausedFromDesc(habitId)
                .filter(h -> !h.getPausedFrom().isAfter(today) && !h.getPausedUntil().isBefore(today))
                .orElseGet(() -> {
                    HabitPauseHistory newHistory = new HabitPauseHistory();
                    newHistory.setHabitId(habitId);
                    newHistory.setPausedFrom(today);
                    return newHistory;
                });

        habitPauseHistory.setPausedUntil(until);
        habitPauseHistoryRepository.save(habitPauseHistory);
    }

    @Transactional
    public void resumeHabit(long habitId) {
        Habit habit = habitAccessValidator.getAndValidate(habitId);
        habit.setPaused(false);
        habit.setPausedUntil(null);
        habitRepository.save(habit);

        LocalDate today = LocalDate.now(currentUser.getZone());
        habitPauseHistoryRepository
                .findTopByHabitIdOrderByPausedFromDesc(habitId)
                .ifPresent(history -> {
                    if (history.getPausedUntil().isAfter(today)) {
                        history.setPausedUntil(today);
                        habitPauseHistoryRepository.save(history);
                    }
                });
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