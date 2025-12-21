package com.habitai.habit;

import java.time.LocalTime;

public record HabitRequest(
        String title,
        String description,
        String category,
        HabitFrequency frequency,
        LocalTime targetTime
) {}

