package com.habitai.user;

import java.time.LocalDate;
import java.util.List;

public record UserStatsResponse(
        int totalHabits,
        int totalCompleted,
        int totalMissed,
        int totalDaysTracked,
        int overallConsistency,
        int currentStreak,
        int longestStreak,
        List<TopHabit> topHabits,
        LocalDate memberSince
) {
    public record TopHabit(String title, int completions, int consistencyPercent) {}
}