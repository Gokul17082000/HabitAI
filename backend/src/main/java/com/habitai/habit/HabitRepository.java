package com.habitai.habit;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Collection;
import java.util.List;

public interface HabitRepository extends JpaRepository<Habit, Long> {
    List<Habit> findByUserId(Long userId);

    /** Batch-loads habits for a set of users — avoids N+1 in schedulers. */
    List<Habit> findByUserIdIn(Collection<Long> userIds);
    List<Habit> findByTargetTimeBetween(LocalTime startTime, LocalTime endTime);
    List<Habit> findByTargetTimeAfter(LocalTime startTime);
    List<Habit> findByTargetTimeBefore(LocalTime endTime);
    List<Habit> findByPausedTrueAndPausedUntilLessThanEqual(LocalDate date);

    /** Used by the MISSED scheduler — only loads active habits, avoids a full table scan. */
    List<Habit> findByPausedFalseAndArchivedFalse();

}