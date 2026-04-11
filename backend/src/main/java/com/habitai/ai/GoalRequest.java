package com.habitai.ai;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record GoalRequest(
        @NotBlank
        @Size(max = 500, message = "Goal must be 500 characters or fewer")
        String goal
) {}