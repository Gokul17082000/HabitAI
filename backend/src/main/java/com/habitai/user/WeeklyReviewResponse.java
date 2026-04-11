package com.habitai.user;

import java.time.LocalDate;
import java.util.List;

public record WeeklyReviewResponse(
        LocalDate weekStart,
        LocalDate weekEnd,
        int overallPercent,
        List<HabitWeekStat> habitStats,
        String aiInsight
) {
    public record HabitWeekStat(
            String title,
            int completed,
            int total,
            int consistencyPercent
    ) {}
}