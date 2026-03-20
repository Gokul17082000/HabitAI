package com.habitai.habit;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Set;

public record HabitDTO(
        Long id,
        String title,
        String description,
        String category,
        HabitFrequency frequency,
        Set<DayOfWeek> daysOfWeek,
        Set<Integer> daysOfMonth,
        LocalTime targetTime,
        LocalDate createdAt
) {}