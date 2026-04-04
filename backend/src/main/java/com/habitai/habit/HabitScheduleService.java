package com.habitai.habit;

import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
public class HabitScheduleService {

    public boolean isScheduledForDate(Habit habit, LocalDate date) {
        return switch (habit.getFrequency()) {
            case DAILY -> true;
            case WEEKLY -> isWeeklyMatch(habit, date);
            case MONTHLY -> isMonthlyMatch(habit, date);
        };
    }

    private boolean isWeeklyMatch(Habit habit, LocalDate date) {
        return habit.getDaysOfWeek() != null
                && habit.getDaysOfWeek().contains(date.getDayOfWeek());
    }

    private boolean isMonthlyMatch(Habit habit, LocalDate date) {
        if (habit.getDaysOfMonth() == null || habit.getDaysOfMonth().isEmpty()) return false;

        int lastDayOfMonth = date.lengthOfMonth();
        for (Integer targetDay : habit.getDaysOfMonth()) {
            int effectiveDay = Math.min(targetDay, lastDayOfMonth);
            if (effectiveDay == date.getDayOfMonth()) return true;
        }
        return false;
    }
}
