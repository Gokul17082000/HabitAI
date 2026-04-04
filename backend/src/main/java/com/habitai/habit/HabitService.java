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

    public HabitService(HabitRepository habitRepository,
                        CurrentUser currentUser,
                        HabitAccessValidator habitAccessValidator,
                        HabitLogRepository habitLogRepository,
                        HabitScheduleService habitScheduleService) {
        this.habitRepository = habitRepository;
        this.currentUser = currentUser;
        this.habitAccessValidator = habitAccessValidator;
        this.habitLogRepository = habitLogRepository;
        this.habitScheduleService = habitScheduleService;
    }

    public List<HabitDTO> getAllHabits() {
        return habitRepository.findByUserId(currentUser.getId()).stream().map(this::toDTO).toList();
    }

    public List<HabitResponse> getHabitsForDate(LocalDate date) {
        long userId = currentUser.getId();
        LocalTime now = LocalTime.now(AppConstants.APP_ZONE);
        LocalDate today = LocalDate.now(AppConstants.APP_ZONE);

        List<Habit> habits = habitRepository.findByUserId(userId)
                .stream()
                .filter(habit -> !habit.isPaused())
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
        return now.isBefore(habit.getTargetTime()) ? HabitStatus.PENDING : HabitStatus.MISSED;
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

        normalizeSchedule(habit);

        Habit saved = habitRepository.save(habit);
        return toDTO(saved);
    }

    @Transactional
    public void updateHabit(long habitId, HabitRequest habitRequest) {
        validateSchedule(habitRequest);

        Habit habit = habitAccessValidator.getAndValidate(habitId);

        // If targetCount changed on a countable habit, recompute today's log status
        if (habit.isCountable() && habitRequest.isCountable()
                && habit.getTargetCount() != habitRequest.targetCount()) {

            LocalDate today = LocalDate.now(AppConstants.APP_ZONE);
            habitLogRepository
                    .findByHabitIdAndUserIdAndDate(habitId, habit.getUserId(), today)
                    .ifPresent(log -> {
                        if (log.getCurrentCount() >= habitRequest.targetCount()) {
                            log.setStatus(HabitStatus.COMPLETED);
                            log.setCurrentCount(habitRequest.targetCount()); // cap at new target
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

        normalizeSchedule(habit);
        habitRepository.save(habit);
    }

    @Transactional
    public void deleteHabit(long habitId) {
        Habit habit = habitAccessValidator.getAndValidate(habitId);
        // Delete logs directly via repository to avoid circular dependency with HabitLogService
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
                habit.getPausedUntil()
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

        LocalDate startDate = LocalDate.of(year, month, 1);
        LocalDate endDate = startDate.withDayOfMonth(startDate.lengthOfMonth());

        List<HabitLog> logs = habitLogRepository
                .findByUserIdAndDateBetween(userId, startDate, endDate);

        List<Habit> habits = habitRepository.findByUserId(userId);

        Map<String, List<String>> result = new HashMap<>();

        LocalDate current = startDate;
        LocalDate today = LocalDate.now(AppConstants.APP_ZONE);

        while (!current.isAfter(endDate) && !current.isAfter(today)) {
            final LocalDate date = current;

            List<Habit> scheduledHabits = habits.stream()
                    .filter(h -> isScheduledForDate(h, date))
                    .filter(h -> !date.isBefore(h.getCreatedAt()))
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

    @Transactional
    public void pauseHabit(long habitId, PauseRequest request) {
        Habit habit = habitAccessValidator.getAndValidate(habitId);
        habit.setPaused(true);
        habit.setPausedUntil(LocalDate.now(AppConstants.APP_ZONE).plusDays(request.days()));
        habitRepository.save(habit);
    }

    @Transactional
    public void resumeHabit(long habitId) {
        Habit habit = habitAccessValidator.getAndValidate(habitId);
        habit.setPaused(false);
        habit.setPausedUntil(null);
        habitRepository.save(habit);
    }
}