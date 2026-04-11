package com.habitai.habit;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;

public interface HabitPauseHistoryRepository extends JpaRepository<HabitPauseHistory, Long> {

    boolean existsByHabitIdAndPausedFromLessThanEqualAndPausedUntilGreaterThanEqual(
            Long habitId, LocalDate date, LocalDate date2
    );
}
