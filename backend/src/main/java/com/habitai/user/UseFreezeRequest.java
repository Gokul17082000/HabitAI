package com.habitai.user;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record UseFreezeRequest(@NotNull LocalDate date) {}