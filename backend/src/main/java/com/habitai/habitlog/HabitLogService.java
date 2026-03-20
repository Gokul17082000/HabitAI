package com.habitai.habitlog;

import com.habitai.common.security.CurrentUser;
import com.habitai.common.validation.HabitAccessValidator;
import com.habitai.habit.Habit;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class HabitLogService {

    private final HabitLogRepository habitLogRepository;
    private final HabitAccessValidator habitAccessValidator;
    private final CurrentUser currentUser;

    public HabitLogService(HabitLogRepository habitLogRepository, HabitAccessValidator habitAccessValidator, CurrentUser currentUser) {
        this.habitLogRepository = habitLogRepository;
        this.habitAccessValidator = habitAccessValidator;
        this.currentUser = currentUser;
    }

    public void updateTodayHabitStatus(long habitId, HabitLogRequest habitLogRequest) {
        habitAccessValidator.getAndValidate(habitId);
        long userId = currentUser.getId();
        LocalDate today = LocalDate.now();

        if (!habitLogRequest.date().isEqual(today)) {
            throw new IllegalStateException("Cannot update past or future habits");
        }

        Optional<HabitLog> existing = habitLogRepository
                .findByHabitIdAndUserIdAndDate(habitId, userId, today);

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
        habitLogRepository.save(habitLog);
    }

    public HabitStreakResponse getCurrentStreak(long habitId) {
        habitAccessValidator.getAndValidate(habitId);
        long userId = currentUser.getId();

        List<LocalDate> completedDates = habitLogRepository
                .findByHabitIdAndUserIdAndStatusOrderByDateDesc(habitId, userId, HabitStatus.COMPLETED)
                .stream()
                .map(HabitLog::getDate)
                .toList();

        LocalDate date = LocalDate.now();
        int streak = 0;

        for (LocalDate completedDate : completedDates) {
            if (completedDate.isEqual(date)) {
                streak++;
                date = date.minusDays(1);
            } else if (completedDate.isBefore(date)) {
                break;
            }
        }

        return new HabitStreakResponse(streak);
    }

    public HabitStreakResponse getLongestStreak(long habitId) {
        habitAccessValidator.getAndValidate(habitId);
        long userId = currentUser.getId();

        List<LocalDate> completedDates = habitLogRepository
                .findByHabitIdAndUserIdAndStatusOrderByDateDesc(habitId, userId, HabitStatus.COMPLETED)
                .stream()
                .map(HabitLog::getDate)
                .sorted()
                .toList();

        if (completedDates.isEmpty()) return new HabitStreakResponse(0);

        int longestStreak = 1;
        int currentStreak = 1;

        for (int i = 1; i < completedDates.size(); i++) {
            if (completedDates.get(i).equals(completedDates.get(i - 1).plusDays(1))) {
                currentStreak++;
                longestStreak = Math.max(longestStreak, currentStreak);
            } else {
                currentStreak = 1;
            }
        }

        return new HabitStreakResponse(longestStreak);
    }

    public List<HabitActivityStatus> getHabitActivity(long habitId, LocalDate startDate, LocalDate endDate) {
        Habit habit = habitAccessValidator.getAndValidate(habitId);
        long userId = currentUser.getId();

        LocalDate effectiveStart = startDate.isBefore(habit.getCreatedAt())
                ? habit.getCreatedAt()
                : startDate;

        List<HabitLog> habitLogs = habitLogRepository
                .findByHabitIdAndUserIdAndDateBetweenOrderByDateAsc(habitId, userId, effectiveStart, endDate);

        List<HabitActivityStatus> habitActivityStatusList = new ArrayList<>();
        LocalDate today = LocalDate.now();
        LocalDate currentDate = effectiveStart;
        LocalDate effectiveEndDate = endDate.isAfter(today) ? today : endDate;

        int i = 0;
        while (!currentDate.isAfter(effectiveEndDate)) {
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