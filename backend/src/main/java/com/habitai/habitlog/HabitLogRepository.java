package com.habitai.habitlog;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface HabitLogRepository extends JpaRepository<HabitLog, Long> {
    HabitLog findByHabitIdAndUserIdAndDate(Long habitId,  Long userId, LocalDate date);
    List<HabitLog> findByHabitIdAndUserIdOrderByDateDesc(Long habitId, Long userId);
    List<HabitLog> findByHabitIdAndUserIdAndDateBetweenOrderByDateAsc(Long habitId, Long userId, LocalDate startDate, LocalDate endDate);
}
