package com.habitai.habitlog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface HabitLogRepository extends JpaRepository<HabitLog, Long> {
    List<HabitLog> findByHabitIdAndUserId(Long habitId, Long userId);
    Optional<HabitLog> findByHabitIdAndUserIdAndDate(Long habitId, Long userId, LocalDate date);
    List<HabitLog> findByHabitIdAndUserIdAndDateBetweenOrderByDateAsc(Long habitId, Long userId, LocalDate startDate, LocalDate endDate);
    List<HabitLog> findByUserId(Long userId);
    List<HabitLog> findByUserIdAndDate(Long userId, LocalDate date);
    List<HabitLog> findByHabitIdAndUserIdAndStatusOrderByDateDesc(Long habitId, Long userId, HabitStatus status);

    @Transactional
    void deleteByHabitIdAndUserId(Long habitId, Long userId);
}