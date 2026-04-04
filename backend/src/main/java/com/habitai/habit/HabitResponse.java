package com.habitai.habit;

import com.habitai.habitlog.HabitStatus;

import java.time.LocalTime;

public record HabitResponse(
        long id,
        String title,
        String description,
        String category,
        LocalTime targetTime,
        int targetCount,
        boolean isCountable,
        int currentCount,
        HabitStatus habitStatus
) {}
