package com.habitai.user;

public record StreakFreezeResponse(
        int availableFreezes,
        int maxFreezes
) {}