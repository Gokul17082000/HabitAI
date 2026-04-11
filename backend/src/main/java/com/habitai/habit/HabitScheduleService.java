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

    /**
     * Returns true if the habit was paused on the given date.
     *
     * We approximate from current DB state: if paused=true and pausedUntil >= date,
     * the pause window was still active on that date. Past pauses that have already
     * been auto-resumed (paused=false) are invisible — a known trade-off without a
     * full audit log table. Moved here from HabitService so that both HabitService
     * and UserStatsService can share the same logic consistently.
     */
    public boolean isHabitPausedOnDate(Habit habit, LocalDate date) {
        if (!habit.isPaused()) return false;
        if (habit.getPausedUntil() == null) return true; // paused indefinitely
        return !date.isAfter(habit.getPausedUntil());
    }
}