package com.habitai.habit;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public interface HabitRepository extends JpaRepository<Habit, Long> {
    List<Habit> findByUserId(Long userId);
    List<Habit> findByTargetTimeBetween(LocalTime startTime, LocalTime endTime);
    List<Habit> findByTargetTimeAfter(LocalTime startTime);
    List<Habit> findByTargetTimeBefore(LocalTime endTime);
    List<Habit> findByPausedTrueAndPausedUntilLessThanEqual(LocalDate date);

}
