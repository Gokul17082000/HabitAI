package com.habitai.habitlog;

import jakarta.validation.constraints.NotNull;

public record HabitLogRequest(@NotNull HabitStatus habitStatus) {}
