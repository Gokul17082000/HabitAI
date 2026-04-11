package com.habitai.habitlog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface HabitLogRepository extends JpaRepository<HabitLog, Long> {

    List<HabitLog> findByHabitIdAndUserId(Long habitId, Long userId);

    Optional<HabitLog> findByHabitIdAndUserIdAndDate(Long habitId, Long userId, LocalDate date);

    List<HabitLog> findByHabitIdAndUserIdAndDateBetweenOrderByDateAsc(
            Long habitId, Long userId, LocalDate startDate, LocalDate endDate);

    List<HabitLog> findByUserIdAndDate(Long userId, LocalDate date);

    List<HabitLog> findByHabitIdAndUserIdAndStatusOrderByDateDesc(
            Long habitId, Long userId, HabitStatus status);

    List<HabitLog> findByUserIdAndDateBetween(Long userId, LocalDate startDate, LocalDate endDate);

    List<HabitLog> findByDate(LocalDate date);

    /** Used by the MISSED scheduler to pre-load logs across a date window (covers all timezones). */
    List<HabitLog> findByDateBetween(LocalDate startDate, LocalDate endDate);

    @Transactional
    void deleteByHabitIdAndUserId(Long habitId, Long userId);

    @Query("SELECT COUNT(l) FROM HabitLog l WHERE l.userId = :userId AND l.status = :status")
    long countByUserIdAndStatus(@Param("userId") Long userId, @Param("status") HabitStatus status);

    @Query("SELECT COUNT(DISTINCT l.date) FROM HabitLog l WHERE l.userId = :userId")
    long countDistinctDatesByUserId(@Param("userId") Long userId);

    /** Returns distinct completed dates ordered ascending — used for longest-streak calc. */
    @Query("SELECT DISTINCT l.date FROM HabitLog l " +
            "WHERE l.userId = :userId AND l.status = 'COMPLETED' " +
            "ORDER BY l.date ASC")
    List<LocalDate> findDistinctCompletedDatesByUserId(@Param("userId") Long userId);

    /** Returns distinct dates with at least one COMPLETED log, ordered descending — for current-streak. */
    @Query("SELECT DISTINCT l.date FROM HabitLog l " +
            "WHERE l.userId = :userId AND l.status = 'COMPLETED' " +
            "ORDER BY l.date DESC")
    List<LocalDate> findDistinctCompletedDatesDescByUserId(@Param("userId") Long userId);

    /** Returns all distinct log dates ordered ascending — for longest-streak calc. */
    @Query("SELECT DISTINCT l.date FROM HabitLog l " +
            "WHERE l.userId = :userId " +
            "ORDER BY l.date ASC")
    List<LocalDate> findDistinctLogDatesByUserId(@Param("userId") Long userId);

    /** Returns all distinct log dates ordered descending — for current-streak calc. */
    @Query("SELECT DISTINCT l.date FROM HabitLog l " +
            "WHERE l.userId = :userId " +
            "ORDER BY l.date DESC")
    List<LocalDate> findDistinctLogDatesDescByUserId(@Param("userId") Long userId);

    /**
     * Bulk-loads all dates that have at least one log with the given status for a user.
     * Used by streak calculations to avoid N+1 queries (one existsBy per date).
     */
    @Query("SELECT DISTINCT l.date FROM HabitLog l " +
            "WHERE l.userId = :userId AND l.status = :status")
    Set<LocalDate> findDatesByUserIdAndStatus(
            @Param("userId") Long userId,
            @Param("status") HabitStatus status);

    /** Returns true if a log exists for the given user, date, and status. */
    boolean existsByUserIdAndDateAndStatus(Long userId, LocalDate date, HabitStatus status);

    /** Per-habit completion and total counts — for top-habits ranking. */
    @Query("SELECT l.habitId, " +
            "SUM(CASE WHEN l.status = 'COMPLETED' THEN 1 ELSE 0 END), " +
            "SUM(CASE WHEN l.status IN ('COMPLETED','MISSED') THEN 1 ELSE 0 END) " +
            "FROM HabitLog l WHERE l.userId = :userId " +
            "GROUP BY l.habitId")
    List<Object[]> findHabitCompletionStatsByUserId(@Param("userId") Long userId);

    // Batch-load users hit by scheduler — avoids N+1 per notification tick
    @Query("SELECT DISTINCT l.userId FROM HabitLog l WHERE l.date = :date")
    List<Long> findDistinctUserIdsByDate(@Param("date") LocalDate date);

    /** Per-habit completion and missed counts for a specific date range — used for weekly digest. */
    @Query("SELECT l.habitId, " +
            "SUM(CASE WHEN l.status = 'COMPLETED' THEN 1 ELSE 0 END), " +
            "SUM(CASE WHEN l.status = 'MISSED' THEN 1 ELSE 0 END) " +
            "FROM HabitLog l WHERE l.userId = :userId " +
            "AND l.date BETWEEN :startDate AND :endDate " +
            "GROUP BY l.habitId")
    List<Object[]> findWeeklyStatsByUserId(
            @Param("userId") Long userId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);
}