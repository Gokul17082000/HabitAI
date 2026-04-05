package com.habitai.habitlog;

import com.habitai.common.security.CurrentUser;
import com.habitai.common.validation.HabitAccessValidator;
import com.habitai.habit.Habit;
import com.habitai.habit.HabitScheduleService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class HabitLogServiceTest {

    @Mock
    private HabitLogRepository habitLogRepository;

    @Mock
    private HabitAccessValidator habitAccessValidator;

    @Mock
    private CurrentUser currentUser;

    @Mock
    private HabitScheduleService habitScheduleService;

    @InjectMocks
    private HabitLogService habitLogService;

    private static final long HABIT_ID = 1L;
    private static final long USER_ID = 100L;
    private LocalDate today;

    @BeforeEach
    void setUp() {
        today = LocalDate.now();
        when(currentUser.getId()).thenReturn(USER_ID);
        when(habitScheduleService.isScheduledForDate(any(Habit.class), any(LocalDate.class))).thenReturn(true);
    }

    // updateTodayHabitStatus Tests

    @Test
    void testUpdateTodayHabitStatusCompleted() {
        // Arrange
        Habit mockHabit = new Habit();
        mockHabit.setId(HABIT_ID);
        when(habitAccessValidator.getAndValidate(HABIT_ID)).thenReturn(mockHabit);
        when(habitLogRepository.findByHabitIdAndUserIdAndDate(HABIT_ID, USER_ID, today))
                .thenReturn(Optional.empty());

        HabitLogRequest request = new HabitLogRequest(today, HabitStatus.COMPLETED, 1, null);

        // Act
        habitLogService.updateTodayHabitStatus(HABIT_ID, request);

        // Assert
        verify(habitLogRepository).save(argThat(log ->
                log.getHabitId() == HABIT_ID &&
                        log.getUserId() == USER_ID &&
                        log.getDate().equals(today) &&
                        log.getStatus() == HabitStatus.COMPLETED
        ));
    }

    @Test
    void testUpdateTodayHabitStatusMissed() {
        // Arrange
        Habit mockHabit = new Habit();
        mockHabit.setId(HABIT_ID);
        when(habitAccessValidator.getAndValidate(HABIT_ID)).thenReturn(mockHabit);
        when(habitLogRepository.findByHabitIdAndUserIdAndDate(HABIT_ID, USER_ID, today))
                .thenReturn(Optional.empty());

        HabitLogRequest request = new HabitLogRequest(today, HabitStatus.MISSED, 0, null);

        // Act
        habitLogService.updateTodayHabitStatus(HABIT_ID, request);

        // Assert
        verify(habitLogRepository).save(argThat(log ->
                log.getStatus() == HabitStatus.MISSED
        ));
    }

    @Test
    void testUpdateTodayHabitStatusPartiallyCompleted() {
        // Arrange
        Habit mockHabit = new Habit();
        mockHabit.setId(HABIT_ID);
        when(habitAccessValidator.getAndValidate(HABIT_ID)).thenReturn(mockHabit);
        when(habitLogRepository.findByHabitIdAndUserIdAndDate(HABIT_ID, USER_ID, today))
                .thenReturn(Optional.empty());

        HabitLogRequest request = new HabitLogRequest(today, HabitStatus.PARTIALLY_COMPLETED, 1, null);

        // Act
        habitLogService.updateTodayHabitStatus(HABIT_ID, request);

        // Assert
        verify(habitLogRepository).save(argThat(log ->
                log.getStatus() == HabitStatus.PARTIALLY_COMPLETED
        ));
    }

    @Test
    void testUpdateTodayHabitStatusPending() {
        // Arrange
        HabitLog existingLog = new HabitLog();
        existingLog.setId(1L);
        existingLog.setHabitId(HABIT_ID);
        existingLog.setStatus(HabitStatus.COMPLETED);

        when(habitAccessValidator.getAndValidate(HABIT_ID)).thenReturn(new Habit());
        when(habitLogRepository.findByHabitIdAndUserIdAndDate(HABIT_ID, USER_ID, today))
                .thenReturn(Optional.of(existingLog));

        HabitLogRequest request = new HabitLogRequest(today, HabitStatus.PENDING, 1, null);

        // Act
        habitLogService.updateTodayHabitStatus(HABIT_ID, request);

        // Assert
        verify(habitLogRepository).delete(existingLog);
        verify(habitLogRepository, never()).save(any());
    }

    @Test
    void testUpdateTodayHabitStatusUpdateExisting() {
        // Arrange
        HabitLog existingLog = new HabitLog();
        existingLog.setId(1L);
        existingLog.setHabitId(HABIT_ID);
        existingLog.setStatus(HabitStatus.COMPLETED);

        when(habitAccessValidator.getAndValidate(HABIT_ID)).thenReturn(new Habit());
        when(habitLogRepository.findByHabitIdAndUserIdAndDate(HABIT_ID, USER_ID, today))
                .thenReturn(Optional.of(existingLog));

        HabitLogRequest request = new HabitLogRequest(today, HabitStatus.MISSED, 0, null);

        // Act
        habitLogService.updateTodayHabitStatus(HABIT_ID, request);

        // Assert
        verify(habitLogRepository).save(existingLog);
        assertEquals(HabitStatus.MISSED, existingLog.getStatus());
    }

    @Test
    void testUpdateTodayHabitStatusPastDateThrows() {
        // Arrange
        LocalDate pastDate = today.minusDays(1);
        Habit mockHabit = new Habit();
        when(habitAccessValidator.getAndValidate(HABIT_ID)).thenReturn(mockHabit);

        HabitLogRequest request = new HabitLogRequest(pastDate, HabitStatus.COMPLETED, 1, null);

        // Act & Assert
        assertThrows(IllegalStateException.class, () ->
                habitLogService.updateTodayHabitStatus(HABIT_ID, request)
        );
    }

    @Test
    void testUpdateTodayHabitStatusFutureDateThrows() {
        // Arrange
        LocalDate futureDate = today.plusDays(1);
        Habit mockHabit = new Habit();
        when(habitAccessValidator.getAndValidate(HABIT_ID)).thenReturn(mockHabit);

        HabitLogRequest request = new HabitLogRequest(futureDate, HabitStatus.COMPLETED, 1, null);

        // Act & Assert
        assertThrows(IllegalStateException.class, () ->
                habitLogService.updateTodayHabitStatus(HABIT_ID, request)
        );
    }

    // getCurrentStreak Tests

    @Test
    void testGetCurrentStreakZero() {
        // Arrange
        when(habitAccessValidator.getAndValidate(HABIT_ID)).thenReturn(createHabitWithCreatedAt(today.minusDays(10)));
        when(habitLogRepository.findByHabitIdAndUserIdAndStatusOrderByDateDesc(
                HABIT_ID, USER_ID, HabitStatus.COMPLETED))
                .thenReturn(new ArrayList<>());

        // Act
        HabitStreakResponse response = habitLogService.getCurrentStreak(HABIT_ID);

        // Assert
        assertEquals(0, response.streak());
    }

    @Test
    void testGetCurrentStreakOneDay() {
        // Arrange
        HabitLog log = new HabitLog();
        log.setDate(today);
        log.setStatus(HabitStatus.COMPLETED);

        when(habitAccessValidator.getAndValidate(HABIT_ID)).thenReturn(createHabitWithCreatedAt(today.minusDays(10)));
        when(habitLogRepository.findByHabitIdAndUserIdAndStatusOrderByDateDesc(
                HABIT_ID, USER_ID, HabitStatus.COMPLETED))
                .thenReturn(List.of(log));

        // Act
        HabitStreakResponse response = habitLogService.getCurrentStreak(HABIT_ID);

        // Assert
        assertEquals(1, response.streak());
    }

    @Test
    void testGetCurrentStreakConsecutiveDays() {
        // Arrange
        HabitLog log1 = new HabitLog();
        log1.setDate(today);
        log1.setStatus(HabitStatus.COMPLETED);

        HabitLog log2 = new HabitLog();
        log2.setDate(today.minusDays(1));
        log2.setStatus(HabitStatus.COMPLETED);

        HabitLog log3 = new HabitLog();
        log3.setDate(today.minusDays(2));
        log3.setStatus(HabitStatus.COMPLETED);

        when(habitAccessValidator.getAndValidate(HABIT_ID)).thenReturn(createHabitWithCreatedAt(today.minusDays(10)));
        when(habitLogRepository.findByHabitIdAndUserIdAndStatusOrderByDateDesc(
                HABIT_ID, USER_ID, HabitStatus.COMPLETED))
                .thenReturn(List.of(log1, log2, log3));

        // Act
        HabitStreakResponse response = habitLogService.getCurrentStreak(HABIT_ID);

        // Assert
        assertEquals(3, response.streak());
    }

    @Test
    void testGetCurrentStreakBrokenStreak() {
        // Arrange
        HabitLog log1 = new HabitLog();
        log1.setDate(today);
        log1.setStatus(HabitStatus.COMPLETED);

        HabitLog log2 = new HabitLog();
        log2.setDate(today.minusDays(2)); // Gap of 1 day
        log2.setStatus(HabitStatus.COMPLETED);

        when(habitAccessValidator.getAndValidate(HABIT_ID)).thenReturn(createHabitWithCreatedAt(today.minusDays(10)));
        when(habitLogRepository.findByHabitIdAndUserIdAndStatusOrderByDateDesc(
                HABIT_ID, USER_ID, HabitStatus.COMPLETED))
                .thenReturn(List.of(log1, log2));

        // Act
        HabitStreakResponse response = habitLogService.getCurrentStreak(HABIT_ID);

        // Assert
        assertEquals(1, response.streak());
    }

    @Test
    void testGetCurrentStreakYesterdayOnly() {
        // Arrange
        HabitLog log = new HabitLog();
        log.setDate(today.minusDays(1));
        log.setStatus(HabitStatus.COMPLETED);

        when(habitAccessValidator.getAndValidate(HABIT_ID)).thenReturn(createHabitWithCreatedAt(today));
        when(habitLogRepository.findByHabitIdAndUserIdAndStatusOrderByDateDesc(
                HABIT_ID, USER_ID, HabitStatus.COMPLETED))
                .thenReturn(List.of(log));

        // Act
        HabitStreakResponse response = habitLogService.getCurrentStreak(HABIT_ID);

        // Assert
        assertEquals(0, response.streak());
    }

    // getLongestStreak Tests

    @Test
    void testGetLongestStreakZero() {
        // Arrange
        when(habitAccessValidator.getAndValidate(HABIT_ID)).thenReturn(createHabitWithCreatedAt(today.minusDays(10)));
        when(habitLogRepository.findByHabitIdAndUserIdAndStatusOrderByDateDesc(
                HABIT_ID, USER_ID, HabitStatus.COMPLETED))
                .thenReturn(new ArrayList<>());

        // Act
        HabitStreakResponse response = habitLogService.getLongestStreak(HABIT_ID);

        // Assert
        assertEquals(0, response.streak());
    }

    @Test
    void testGetLongestStreakSingleDay() {
        // Arrange
        HabitLog log = new HabitLog();
        log.setDate(today);
        log.setStatus(HabitStatus.COMPLETED);

        when(habitAccessValidator.getAndValidate(HABIT_ID)).thenReturn(createHabitWithCreatedAt(today.minusDays(10)));
        when(habitLogRepository.findByHabitIdAndUserIdAndStatusOrderByDateDesc(
                HABIT_ID, USER_ID, HabitStatus.COMPLETED))
                .thenReturn(List.of(log));

        // Act
        HabitStreakResponse response = habitLogService.getLongestStreak(HABIT_ID);

        // Assert
        assertEquals(1, response.streak());
    }

    @Test
    void testGetLongestStreakConsecutiveDays() {
        // Arrange
        HabitLog log1 = new HabitLog();
        log1.setDate(today.minusDays(2));
        log1.setStatus(HabitStatus.COMPLETED);

        HabitLog log2 = new HabitLog();
        log2.setDate(today.minusDays(1));
        log2.setStatus(HabitStatus.COMPLETED);

        HabitLog log3 = new HabitLog();
        log3.setDate(today);
        log3.setStatus(HabitStatus.COMPLETED);

        when(habitAccessValidator.getAndValidate(HABIT_ID)).thenReturn(createHabitWithCreatedAt(today.minusDays(10)));
        when(habitLogRepository.findByHabitIdAndUserIdAndStatusOrderByDateDesc(
                HABIT_ID, USER_ID, HabitStatus.COMPLETED))
                .thenReturn(List.of(log3, log2, log1));

        // Act
        HabitStreakResponse response = habitLogService.getLongestStreak(HABIT_ID);

        // Assert
        assertEquals(3, response.streak());
    }

    @Test
    void testGetLongestStreakMultipleStreaks() {
        // Arrange
        HabitLog log1 = new HabitLog();
        log1.setDate(today.minusDays(10));
        log1.setStatus(HabitStatus.COMPLETED);

        HabitLog log2 = new HabitLog();
        log2.setDate(today.minusDays(9));
        log2.setStatus(HabitStatus.COMPLETED);

        HabitLog log3 = new HabitLog();
        log3.setDate(today.minusDays(8));
        log3.setStatus(HabitStatus.COMPLETED);

        HabitLog log4 = new HabitLog();
        log4.setDate(today.minusDays(5));
        log4.setStatus(HabitStatus.COMPLETED);

        HabitLog log5 = new HabitLog();
        log5.setDate(today.minusDays(4));
        log5.setStatus(HabitStatus.COMPLETED);

        when(habitAccessValidator.getAndValidate(HABIT_ID)).thenReturn(createHabitWithCreatedAt(today.minusDays(10)));
        when(habitLogRepository.findByHabitIdAndUserIdAndStatusOrderByDateDesc(
                HABIT_ID, USER_ID, HabitStatus.COMPLETED))
                .thenReturn(List.of(log5, log4, log3, log2, log1));

        // Act
        HabitStreakResponse response = habitLogService.getLongestStreak(HABIT_ID);

        // Assert
        assertEquals(3, response.streak());
    }

    @Test
    void testGetLongestStreakLongerSecondStreak() {
        // Arrange
        HabitLog log1 = new HabitLog();
        log1.setDate(today.minusDays(6));
        log1.setStatus(HabitStatus.COMPLETED);

        HabitLog log2 = new HabitLog();
        log2.setDate(today.minusDays(5));
        log2.setStatus(HabitStatus.COMPLETED);

        HabitLog log3 = new HabitLog();
        log3.setDate(today.minusDays(2));
        log3.setStatus(HabitStatus.COMPLETED);

        HabitLog log4 = new HabitLog();
        log4.setDate(today.minusDays(1));
        log4.setStatus(HabitStatus.COMPLETED);

        HabitLog log5 = new HabitLog();
        log5.setDate(today);
        log5.setStatus(HabitStatus.COMPLETED);

        when(habitAccessValidator.getAndValidate(HABIT_ID)).thenReturn(createHabitWithCreatedAt(today.minusDays(10)));
        when(habitLogRepository.findByHabitIdAndUserIdAndStatusOrderByDateDesc(
                HABIT_ID, USER_ID, HabitStatus.COMPLETED))
                .thenReturn(List.of(log5, log4, log3, log2, log1));

        // Act
        HabitStreakResponse response = habitLogService.getLongestStreak(HABIT_ID);

        // Assert
        assertEquals(3, response.streak());
    }

    private Habit createHabitWithCreatedAt(LocalDate createdAt) {
        Habit habit = new Habit();
        habit.setCreatedAt(createdAt);
        return habit;
    }

    // getHabitActivity Tests

    @Test
    void testGetHabitActivitySingleDay() {
        // Arrange
        LocalDate startDate = today;
        LocalDate endDate = today;

        Habit habit = new Habit();
        habit.setCreatedAt(today);

        HabitLog log = new HabitLog();
        log.setDate(today);
        log.setStatus(HabitStatus.COMPLETED);

        when(habitAccessValidator.getAndValidate(HABIT_ID)).thenReturn(habit);
        when(habitLogRepository.findByHabitIdAndUserIdAndDateBetweenOrderByDateAsc(
                HABIT_ID, USER_ID, today, today))
                .thenReturn(List.of(log));

        // Act
        List<HabitActivityStatus> activities = habitLogService.getHabitActivity(HABIT_ID, startDate, endDate);

        // Assert
        assertEquals(1, activities.size());
        assertEquals(HabitStatus.COMPLETED, activities.get(0).habitStatus());
    }

    @Test
    void testGetHabitActivityMultipleDaysWithMixed() {
        // Arrange
        LocalDate startDate = today.minusDays(2);
        LocalDate endDate = today;

        Habit habit = new Habit();
        habit.setCreatedAt(today.minusDays(2));

        HabitLog log1 = new HabitLog();
        log1.setDate(today.minusDays(2));
        log1.setStatus(HabitStatus.COMPLETED);

        HabitLog log2 = new HabitLog();
        log2.setDate(today);
        log2.setStatus(HabitStatus.COMPLETED);

        when(habitAccessValidator.getAndValidate(HABIT_ID)).thenReturn(habit);
        when(habitLogRepository.findByHabitIdAndUserIdAndDateBetweenOrderByDateAsc(
                HABIT_ID, USER_ID, startDate, today))
                .thenReturn(List.of(log1, log2));

        // Act
        List<HabitActivityStatus> activities = habitLogService.getHabitActivity(HABIT_ID, startDate, endDate);

        // Assert
        assertEquals(3, activities.size());
        assertEquals(HabitStatus.COMPLETED, activities.get(0).habitStatus());
        assertEquals(HabitStatus.MISSED, activities.get(1).habitStatus());
        assertEquals(HabitStatus.COMPLETED, activities.get(2).habitStatus());
    }

    @Test
    void testGetHabitActivityAllMissed() {
        // Arrange
        LocalDate startDate = today.minusDays(2);
        LocalDate endDate = today;

        Habit habit = new Habit();
        habit.setCreatedAt(today.minusDays(2));

        when(habitAccessValidator.getAndValidate(HABIT_ID)).thenReturn(habit);
        when(habitLogRepository.findByHabitIdAndUserIdAndDateBetweenOrderByDateAsc(
                HABIT_ID, USER_ID, startDate, endDate))
                .thenReturn(new ArrayList<>());

        // Act
        List<HabitActivityStatus> activities = habitLogService.getHabitActivity(HABIT_ID, startDate, endDate);

        // Assert
        assertEquals(3, activities.size());
        assertEquals(HabitStatus.MISSED, activities.get(0).habitStatus());
        assertEquals(HabitStatus.MISSED, activities.get(1).habitStatus());
        assertEquals(HabitStatus.PENDING, activities.get(2).habitStatus());
    }

    @Test
    void testGetHabitActivityStartDateBeforeCreationDate() {
        // Arrange
        LocalDate createdAt = today.minusDays(1);
        LocalDate startDate = today.minusDays(5);
        LocalDate endDate = today;

        Habit habit = new Habit();
        habit.setCreatedAt(createdAt);

        HabitLog log = new HabitLog();
        log.setDate(today);
        log.setStatus(HabitStatus.COMPLETED);

        when(habitAccessValidator.getAndValidate(HABIT_ID)).thenReturn(habit);
        when(habitLogRepository.findByHabitIdAndUserIdAndDateBetweenOrderByDateAsc(
                HABIT_ID, USER_ID, createdAt, endDate))
                .thenReturn(List.of(log));

        // Act
        List<HabitActivityStatus> activities = habitLogService.getHabitActivity(HABIT_ID, startDate, endDate);

        // Assert
        assertEquals(2, activities.size());
        assertEquals(createdAt, activities.get(0).date());
    }

    @Test
    void testGetHabitActivityEndDateInFuture() {
        // Arrange
        LocalDate startDate = today;
        LocalDate endDate = today.plusDays(5);

        Habit habit = new Habit();
        habit.setCreatedAt(today);

        HabitLog log = new HabitLog();
        log.setDate(today);
        log.setStatus(HabitStatus.COMPLETED);

        when(habitAccessValidator.getAndValidate(HABIT_ID)).thenReturn(habit);
        when(habitLogRepository.findByHabitIdAndUserIdAndDateBetweenOrderByDateAsc(
                HABIT_ID, USER_ID, today, today))
                .thenReturn(List.of(log));

        // Act
        List<HabitActivityStatus> activities = habitLogService.getHabitActivity(HABIT_ID, startDate, endDate);

        // Assert
        assertEquals(1, activities.size());
        assertEquals(today, activities.get(0).date());
    }

    @Test
    void testGetHabitActivityVariousStatuses() {
        // Arrange
        LocalDate startDate = today.minusDays(3);
        LocalDate endDate = today;

        Habit habit = new Habit();
        habit.setCreatedAt(today.minusDays(3));

        HabitLog log1 = new HabitLog();
        log1.setDate(today.minusDays(3));
        log1.setStatus(HabitStatus.COMPLETED);

        HabitLog log2 = new HabitLog();
        log2.setDate(today.minusDays(2));
        log2.setStatus(HabitStatus.PARTIALLY_COMPLETED);

        HabitLog log3 = new HabitLog();
        log3.setDate(today);
        log3.setStatus(HabitStatus.COMPLETED);

        when(habitAccessValidator.getAndValidate(HABIT_ID)).thenReturn(habit);
        when(habitLogRepository.findByHabitIdAndUserIdAndDateBetweenOrderByDateAsc(
                HABIT_ID, USER_ID, startDate, today))
                .thenReturn(List.of(log1, log2, log3));

        // Act
        List<HabitActivityStatus> activities = habitLogService.getHabitActivity(HABIT_ID, startDate, endDate);

        // Assert
        assertEquals(4, activities.size());
        assertEquals(HabitStatus.COMPLETED, activities.get(0).habitStatus());
        assertEquals(HabitStatus.PARTIALLY_COMPLETED, activities.get(1).habitStatus());
        assertEquals(HabitStatus.MISSED, activities.get(2).habitStatus());
        assertEquals(HabitStatus.COMPLETED, activities.get(3).habitStatus());
    }

    // deleteByHabitId Tests

    @Test
    void testDeleteByHabitId() {
        // Act
        habitLogService.deleteByHabitId(HABIT_ID);

        // Assert
        verify(habitLogRepository).deleteByHabitIdAndUserId(HABIT_ID, USER_ID);
    }

    @Test
    void testDeleteByHabitIdMultipleRecords() {
        // Act
        habitLogService.deleteByHabitId(HABIT_ID);

        // Assert
        verify(habitLogRepository, times(1)).deleteByHabitIdAndUserId(HABIT_ID, USER_ID);
    }

}
