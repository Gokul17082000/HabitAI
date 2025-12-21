package com.habitai.habitlog;

import java.time.LocalDate;

public record HabitActivityStatus(
        LocalDate date,
        HabitStatus habitStatus
) {}
