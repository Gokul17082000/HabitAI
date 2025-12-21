package com.habitai.habit;

import java.time.LocalTime;

public record HabitDTO(
        long id,
        String title,
        String description,
        String category,
        HabitFrequency frequency,
        LocalTime targetTime
) {}

