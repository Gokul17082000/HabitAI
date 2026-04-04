package com.habitai.habit;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record PauseRequest(@NotNull @Min(1) @Max(30) int days) {}