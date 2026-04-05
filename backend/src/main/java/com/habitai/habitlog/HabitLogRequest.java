package com.habitai.habitlog;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record HabitLogRequest(@NotNull LocalDate date, @NotNull HabitStatus habitStatus, @Min(0) int currentCount, String note) {}
