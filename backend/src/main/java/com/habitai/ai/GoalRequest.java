package com.habitai.ai;

import jakarta.validation.constraints.NotBlank;

public record GoalRequest(@NotBlank String goal) {}