package com.habitai.habit;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record SortOrderRequest(
        @NotNull @Min(0) Integer sortOrder
) {}
