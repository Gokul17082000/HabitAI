package com.habitai.habit;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.Set;

public record HabitDTO(
        long id,
        String title,
        String description,
        String category,
        HabitFrequency frequency,
        Set<DayOfWeek> daysOfWeek,
        Set<Integer> daysOfMonth,
        LocalTime targetTime
) {}

