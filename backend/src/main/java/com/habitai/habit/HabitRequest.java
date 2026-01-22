package com.habitai.habit;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.Set;

public record HabitRequest(
        @NotBlank String title,
        @NotBlank String description,
        @NotBlank String category,
        @NotNull HabitFrequency frequency,
        Set<DayOfWeek> daysOfWeek,
        Set<Integer> daysOfMonth,
        @NotNull LocalTime targetTime
) {}

