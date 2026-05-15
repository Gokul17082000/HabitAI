package com.habitai.habit;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface HabitPauseHistoryRepository extends JpaRepository<HabitPauseHistory, Long> {

    boolean existsByHabitIdAndPausedFromLessThanEqualAndPausedUntilGreaterThanEqual(
            Long habitId, LocalDate date, LocalDate date2
    );

    void deleteByHabitId(Long habitId);

    Optional<HabitPauseHistory> findTopByHabitIdOrderByPausedFromDesc(Long habitId);

    /** Bulk-loads all pause records for a set of habit IDs — used to avoid N+1 in year-pixels. */
    List<HabitPauseHistory> findByHabitIdIn(Collection<Long> habitIds);
}
