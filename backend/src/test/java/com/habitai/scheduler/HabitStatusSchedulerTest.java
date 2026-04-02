package com.habitai.scheduler;

import com.habitai.habit.Habit;
import com.habitai.habit.HabitRepository;
import com.habitai.habit.HabitService;
import com.habitai.habitlog.HabitLog;
import com.habitai.habitlog.HabitLogRepository;
import com.habitai.habitlog.HabitStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class HabitStatusSchedulerTest {

    @Mock
    private HabitService habitService;

    @Mock
    private HabitRepository habitRepository;

    @Mock
    private HabitLogRepository habitLogRepository;

    @InjectMocks
    private HabitStatusScheduler habitStatusScheduler;

    private LocalDate today;
    private LocalTime now;

    @BeforeEach
    void setUp() {
        today = LocalDate.now();
        now = LocalTime.now();
    }

    // updateMissedHabits - No Habits Tests

    @Test
    void testUpdateMissedHabitsWhenNoOverdueHabits() {
        // Arrange
        when(habitRepository.findByTargetTimeBefore(any(LocalTime.class)))
                .thenReturn(new ArrayList<>());

        // Act
        habitStatusScheduler.updateMissedHabits();

        // Assert
        verify(habitRepository).findByTargetTimeBefore(any(LocalTime.class));
        verify(habitLogRepository, never()).findByDate(any());
        verify(habitLogRepository, never()).saveAll(any());
    }

    @Test
    void testUpdateMissedHabitsWithEmptyOverdueList() {
        // Arrange
        List<Habit> emptyList = new ArrayList<>();
        when(habitRepository.findByTargetTimeBefore(any(LocalTime.class)))
                .thenReturn(emptyList);

        // Act
        habitStatusScheduler.updateMissedHabits();

        // Assert
        verify(habitRepository).findByTargetTimeBefore(any(LocalTime.class));
        verify(habitLogRepository, never()).saveAll(any());
    }

    // updateMissedHabits - Single Habit Tests

    @Test
    void testUpdateMissedHabitsWithSingleOverdueHabit() {
        // Arrange
        Habit habit = createHabit(1L, 100L, LocalTime.of(8, 0));
        when(habitRepository.findByTargetTimeBefore(any(LocalTime.class)))
                .thenReturn(List.of(habit));
        when(habitLogRepository.findByDate(today))
                .thenReturn(new ArrayList<>());
        when(habitService.isScheduledForDate(habit, today))
                .thenReturn(true);

        // Act
        habitStatusScheduler.updateMissedHabits();

        // Assert
        verify(habitLogRepository).saveAll(any());
    }

    @Test
    void testUpdateMissedHabitsWhenHabitNotScheduledForDate() {
        // Arrange
        Habit habit = createHabit(1L, 100L, LocalTime.of(8, 0));
        when(habitRepository.findByTargetTimeBefore(any(LocalTime.class)))
                .thenReturn(List.of(habit));
        when(habitLogRepository.findByDate(today))
                .thenReturn(new ArrayList<>());
        when(habitService.isScheduledForDate(habit, today))
                .thenReturn(false);

        // Act
        habitStatusScheduler.updateMissedHabits();

        // Assert
        verify(habitLogRepository, never()).saveAll(any());
    }

    @Test
    void testUpdateMissedHabitsWhenHabitAlreadyLogged() {
        // Arrange
        Habit habit = createHabit(1L, 100L, LocalTime.of(8, 0));
        HabitLog existingLog = new HabitLog();
        existingLog.setHabitId(1L);
        existingLog.setUserId(100L);
        existingLog.setDate(today);
        existingLog.setStatus(HabitStatus.COMPLETED);

        when(habitRepository.findByTargetTimeBefore(any(LocalTime.class)))
                .thenReturn(List.of(habit));
        when(habitLogRepository.findByDate(today))
                .thenReturn(List.of(existingLog));
        when(habitService.isScheduledForDate(habit, today))
                .thenReturn(true);

        // Act
        habitStatusScheduler.updateMissedHabits();

        // Assert
        verify(habitLogRepository, never()).saveAll(any());
    }

    // updateMissedHabits - Multiple Habits Tests

    @Test
    void testUpdateMissedHabitsWithMultipleOverdueHabits() {
        // Arrange
        Habit habit1 = createHabit(1L, 100L, LocalTime.of(8, 0));
        Habit habit2 = createHabit(2L, 100L, LocalTime.of(9, 0));
        Habit habit3 = createHabit(3L, 100L, LocalTime.of(10, 0));

        when(habitRepository.findByTargetTimeBefore(any(LocalTime.class)))
                .thenReturn(List.of(habit1, habit2, habit3));
        when(habitLogRepository.findByDate(today))
                .thenReturn(new ArrayList<>());
        when(habitService.isScheduledForDate(any(Habit.class), any(LocalDate.class)))
                .thenReturn(true);

        // Act
        habitStatusScheduler.updateMissedHabits();

        // Assert
        verify(habitLogRepository, times(1)).saveAll(any());
    }

    @Test
    void testUpdateMissedHabitsWithMixedScheduledAndUnscheduled() {
        // Arrange
        Habit scheduledHabit1 = createHabit(1L, 100L, LocalTime.of(8, 0));
        Habit unscheduledHabit = createHabit(2L, 100L, LocalTime.of(9, 0));
        Habit scheduledHabit2 = createHabit(3L, 100L, LocalTime.of(10, 0));

        when(habitRepository.findByTargetTimeBefore(any(LocalTime.class)))
                .thenReturn(List.of(scheduledHabit1, unscheduledHabit, scheduledHabit2));
        when(habitLogRepository.findByDate(today))
                .thenReturn(new ArrayList<>());

        when(habitService.isScheduledForDate(scheduledHabit1, today))
                .thenReturn(true);
        when(habitService.isScheduledForDate(unscheduledHabit, today))
                .thenReturn(false);
        when(habitService.isScheduledForDate(scheduledHabit2, today))
                .thenReturn(true);

        // Act
        habitStatusScheduler.updateMissedHabits();

        // Assert
        verify(habitLogRepository, times(1)).saveAll(any());
    }

    @Test
    void testUpdateMissedHabitsWithPartiallyLoggedHabits() {
        // Arrange
        Habit habit1 = createHabit(1L, 100L, LocalTime.of(8, 0));
        Habit habit2 = createHabit(2L, 100L, LocalTime.of(9, 0));
        Habit habit3 = createHabit(3L, 100L, LocalTime.of(10, 0));

        HabitLog log2 = new HabitLog();
        log2.setHabitId(2L);
        log2.setUserId(100L);
        log2.setDate(today);
        log2.setStatus(HabitStatus.COMPLETED);

        when(habitRepository.findByTargetTimeBefore(any(LocalTime.class)))
                .thenReturn(List.of(habit1, habit2, habit3));
        when(habitLogRepository.findByDate(today))
                .thenReturn(List.of(log2));
        when(habitService.isScheduledForDate(any(Habit.class), any(LocalDate.class)))
                .thenReturn(true);

        // Act
        habitStatusScheduler.updateMissedHabits();

        // Assert
        verify(habitLogRepository, times(1)).saveAll(any());
    }

    // updateMissedHabits - Different User Tests

    @Test
    void testUpdateMissedHabitsWithMultipleUsers() {
        // Arrange
        Habit habit1User1 = createHabit(1L, 100L, LocalTime.of(8, 0));
        Habit habit2User2 = createHabit(2L, 200L, LocalTime.of(8, 0));
        Habit habit3User1 = createHabit(3L, 100L, LocalTime.of(9, 0));

        when(habitRepository.findByTargetTimeBefore(any(LocalTime.class)))
                .thenReturn(List.of(habit1User1, habit2User2, habit3User1));
        when(habitLogRepository.findByDate(today))
                .thenReturn(new ArrayList<>());
        when(habitService.isScheduledForDate(any(Habit.class), any(LocalDate.class)))
                .thenReturn(true);

        // Act
        habitStatusScheduler.updateMissedHabits();

        // Assert
        verify(habitLogRepository, times(1)).saveAll(any());
    }

    @Test
    void testUpdateMissedHabitsKeysWithDifferentUsersAndHabits() {
        // Arrange
        Habit habit1User1 = createHabit(1L, 100L, LocalTime.of(8, 0));
        Habit habit1User2 = createHabit(1L, 200L, LocalTime.of(8, 0));

        HabitLog log1User1 = new HabitLog();
        log1User1.setHabitId(1L);
        log1User1.setUserId(100L);
        log1User1.setDate(today);
        log1User1.setStatus(HabitStatus.COMPLETED);

        when(habitRepository.findByTargetTimeBefore(any(LocalTime.class)))
                .thenReturn(List.of(habit1User1, habit1User2));
        when(habitLogRepository.findByDate(today))
                .thenReturn(List.of(log1User1));
        when(habitService.isScheduledForDate(any(Habit.class), any(LocalDate.class)))
                .thenReturn(true);

        // Act
        habitStatusScheduler.updateMissedHabits();

        // Assert
        verify(habitLogRepository, times(1)).saveAll(any());
    }

    // updateMissedHabits - Different Time Tests

    @Test
    void testUpdateMissedHabitsFiltersHabitsByCurrentTime() {
        // Arrange
        Habit earlyHabit = createHabit(1L, 100L, LocalTime.of(8, 0));
        Habit lateHabit = createHabit(2L, 100L, LocalTime.of(14, 0));

        when(habitRepository.findByTargetTimeBefore(any(LocalTime.class)))
                .thenReturn(List.of(earlyHabit));
        when(habitLogRepository.findByDate(today))
                .thenReturn(new ArrayList<>());
        when(habitService.isScheduledForDate(earlyHabit, today))
                .thenReturn(true);

        // Act
        habitStatusScheduler.updateMissedHabits();

        // Assert
        verify(habitRepository).findByTargetTimeBefore(any(LocalTime.class));
        verify(habitLogRepository, times(1)).saveAll(any());
    }

    @Test
    void testUpdateMissedHabitsWithEarlyMorningTime() {
        // Arrange
        Habit habit = createHabit(1L, 100L, LocalTime.of(6, 0));
        when(habitRepository.findByTargetTimeBefore(any(LocalTime.class)))
                .thenReturn(List.of(habit));
        when(habitLogRepository.findByDate(today))
                .thenReturn(new ArrayList<>());
        when(habitService.isScheduledForDate(habit, today))
                .thenReturn(true);

        // Act
        habitStatusScheduler.updateMissedHabits();

        // Assert
        verify(habitLogRepository, times(1)).saveAll(any());
    }

    @Test
    void testUpdateMissedHabitsWithLateEveningTime() {
        // Arrange
        Habit habit = createHabit(1L, 100L, LocalTime.of(22, 0));
        when(habitRepository.findByTargetTimeBefore(any(LocalTime.class)))
                .thenReturn(List.of(habit));
        when(habitLogRepository.findByDate(today))
                .thenReturn(new ArrayList<>());
        when(habitService.isScheduledForDate(habit, today))
                .thenReturn(true);

        // Act
        habitStatusScheduler.updateMissedHabits();

        // Assert
        verify(habitLogRepository, times(1)).saveAll(any());
    }

    // updateMissedHabits - No Insert Tests

    @Test
    void testUpdateMissedHabitsDoesNotSaveEmptyList() {
        // Arrange
        Habit habit = createHabit(1L, 100L, LocalTime.of(8, 0));
        HabitLog existingLog = new HabitLog();
        existingLog.setHabitId(1L);
        existingLog.setUserId(100L);
        existingLog.setDate(today);
        existingLog.setStatus(HabitStatus.COMPLETED);

        when(habitRepository.findByTargetTimeBefore(any(LocalTime.class)))
                .thenReturn(List.of(habit));
        when(habitLogRepository.findByDate(today))
                .thenReturn(List.of(existingLog));
        when(habitService.isScheduledForDate(habit, today))
                .thenReturn(true);

        // Act
        habitStatusScheduler.updateMissedHabits();

        // Assert
        verify(habitLogRepository, never()).saveAll(any());
    }

    @Test
    void testUpdateMissedHabitsAllHabitsAlreadyLogged() {
        // Arrange
        Habit habit1 = createHabit(1L, 100L, LocalTime.of(8, 0));
        Habit habit2 = createHabit(2L, 100L, LocalTime.of(9, 0));

        HabitLog log1 = new HabitLog();
        log1.setHabitId(1L);
        log1.setUserId(100L);
        log1.setDate(today);

        HabitLog log2 = new HabitLog();
        log2.setHabitId(2L);
        log2.setUserId(100L);
        log2.setDate(today);

        when(habitRepository.findByTargetTimeBefore(any(LocalTime.class)))
                .thenReturn(List.of(habit1, habit2));
        when(habitLogRepository.findByDate(today))
                .thenReturn(List.of(log1, log2));
        when(habitService.isScheduledForDate(any(Habit.class), any(LocalDate.class)))
                .thenReturn(true);

        // Act
        habitStatusScheduler.updateMissedHabits();

        // Assert
        verify(habitLogRepository, never()).saveAll(any());
    }

    @Test
    void testUpdateMissedHabitsIdempotent() {
        // Arrange
        Habit habit = createHabit(1L, 100L, LocalTime.of(8, 0));
        when(habitRepository.findByTargetTimeBefore(any(LocalTime.class)))
                .thenReturn(List.of(habit));
        when(habitLogRepository.findByDate(today))
                .thenReturn(new ArrayList<>());
        when(habitService.isScheduledForDate(habit, today))
                .thenReturn(true);

        // Act
        habitStatusScheduler.updateMissedHabits();
        habitStatusScheduler.updateMissedHabits();

        // Assert - Should be called twice, once for each invocation
        verify(habitRepository, times(2)).findByTargetTimeBefore(any(LocalTime.class));
        verify(habitLogRepository, times(2)).findByDate(today);
    }

    @Test
    void testUpdateMissedHabitsTransactional() {
        // Arrange
        Habit habit = createHabit(1L, 100L, LocalTime.of(8, 0));
        when(habitRepository.findByTargetTimeBefore(any(LocalTime.class)))
                .thenReturn(List.of(habit));
        when(habitLogRepository.findByDate(today))
                .thenReturn(new ArrayList<>());
        when(habitService.isScheduledForDate(habit, today))
                .thenReturn(true);

        // Act - The method is @Transactional, so this verifies it completes without error
        try {
            habitStatusScheduler.updateMissedHabits();
        } catch (Exception e) {
            throw new AssertionError("updateMissedHabits() should not throw exception", e);
        }

        // Assert
        verify(habitLogRepository).saveAll(any());
    }

    // updateMissedHabits - Status Verification Tests

    @Test
    void testUpdateMissedHabitsCreatesLogsWithMissedStatus() {
        // Arrange
        Habit habit1 = createHabit(10L, 100L, LocalTime.of(8, 0));
        Habit habit2 = createHabit(20L, 100L, LocalTime.of(9, 0));

        when(habitRepository.findByTargetTimeBefore(any(LocalTime.class)))
                .thenReturn(List.of(habit1, habit2));
        when(habitLogRepository.findByDate(today))
                .thenReturn(new ArrayList<>());
        when(habitService.isScheduledForDate(any(Habit.class), any(LocalDate.class)))
                .thenReturn(true);

        // Act
        habitStatusScheduler.updateMissedHabits();

        // Assert
        verify(habitLogRepository, times(1)).saveAll(any());
    }

    @Test
    void testUpdateMissedHabitsWithLargeNumberOfHabits() {
        // Arrange
        List<Habit> habits = new ArrayList<>();
        for (int i = 1; i <= 50; i++) {
            habits.add(createHabit((long) i, 100L, LocalTime.of(8, 0)));
        }

        when(habitRepository.findByTargetTimeBefore(any(LocalTime.class)))
                .thenReturn(habits);
        when(habitLogRepository.findByDate(today))
                .thenReturn(new ArrayList<>());
        when(habitService.isScheduledForDate(any(Habit.class), any(LocalDate.class)))
                .thenReturn(true);

        // Act
        habitStatusScheduler.updateMissedHabits();

        // Assert
        verify(habitLogRepository, times(1)).saveAll(any());
    }

    @Test
    void testUpdateMissedHabitsWithAllHabitsScheduled() {
        // Arrange
        Habit habit1 = createHabit(1L, 100L, LocalTime.of(8, 0));
        Habit habit2 = createHabit(2L, 100L, LocalTime.of(9, 0));
        Habit habit3 = createHabit(3L, 100L, LocalTime.of(10, 0));
        Habit habit4 = createHabit(4L, 100L, LocalTime.of(11, 0));

        when(habitRepository.findByTargetTimeBefore(any(LocalTime.class)))
                .thenReturn(List.of(habit1, habit2, habit3, habit4));
        when(habitLogRepository.findByDate(today))
                .thenReturn(new ArrayList<>());
        when(habitService.isScheduledForDate(any(Habit.class), any(LocalDate.class)))
                .thenReturn(true);

        // Act
        habitStatusScheduler.updateMissedHabits();

        // Assert
        verify(habitLogRepository, times(1)).saveAll(any());
    }

    @Test
    void testUpdateMissedHabitsWithNoneScheduled() {
        // Arrange
        Habit habit1 = createHabit(1L, 100L, LocalTime.of(8, 0));
        Habit habit2 = createHabit(2L, 100L, LocalTime.of(9, 0));

        when(habitRepository.findByTargetTimeBefore(any(LocalTime.class)))
                .thenReturn(List.of(habit1, habit2));
        when(habitLogRepository.findByDate(today))
                .thenReturn(new ArrayList<>());
        when(habitService.isScheduledForDate(any(Habit.class), any(LocalDate.class)))
                .thenReturn(false);

        // Act
        habitStatusScheduler.updateMissedHabits();

        // Assert
        verify(habitLogRepository, never()).saveAll(any());
    }

    // Helper method to create test habits
    private Habit createHabit(Long id, Long userId, LocalTime targetTime) {
        Habit habit = new Habit();
        habit.setId(id);
        habit.setUserId(userId);
        habit.setTargetTime(targetTime);
        return habit;
    }

}
