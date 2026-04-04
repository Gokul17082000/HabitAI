package com.habitai.habit;

import jakarta.validation.constraints.*;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.Set;

public record HabitRequest(
        @NotBlank @Size(max = 100) String title,
        @NotBlank @Size(max = 100) String description,
        @NotBlank @Size(max = 100) String category,
        @NotNull HabitFrequency frequency,
        Set<DayOfWeek> daysOfWeek,
        Set<Integer> daysOfMonth,
        @NotNull LocalTime targetTime,
        @Min(1) @Max(100) int targetCount,
        boolean isCountable
) {}