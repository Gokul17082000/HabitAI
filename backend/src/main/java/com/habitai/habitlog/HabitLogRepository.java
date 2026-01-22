package com.habitai.habitlog;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface HabitLogRepository extends JpaRepository<HabitLog, Long> {
    List<HabitLog> findByHabitIdAndUserId(Long habitId, Long userId);
    HabitLog findByHabitIdAndUserIdAndDate(Long habitId,  Long userId, LocalDate date);
    List<HabitLog> findByHabitIdAndUserIdAndDateBetweenOrderByDateAsc(Long habitId, Long userId, LocalDate startDate, LocalDate endDate);
    void deleteByHabitIdAndUserId(Long habitId, Long userId);
}
