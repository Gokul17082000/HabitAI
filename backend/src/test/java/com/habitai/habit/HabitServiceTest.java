package com.habitai.habit;

import com.habitai.common.validation.HabitAccessValidator;
import com.habitai.common.security.CurrentUser;
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

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class HabitServiceTest {

    @Mock
    private HabitRepository habitRepository;

    @Mock
    private CurrentUser currentUser;

    @Mock
    private HabitAccessValidator habitAccessValidator;

    @Mock
    private HabitScheduleService habitScheduleService;

    @Mock
    private HabitLogRepository habitLogRepository;

    @InjectMocks
    private HabitService habitService;

    private final HabitScheduleService realScheduleService = new HabitScheduleService();

    private long userId = 100L;
    private HabitRequest dailyHabitRequest;
    private HabitRequest weeklyHabitRequest;
    private HabitRequest monthlyHabitRequest;
    private Habit habit;

    @BeforeEach
    void setUp() {
        when(currentUser.getId()).thenReturn(userId);
        when(habitScheduleService.isScheduledForDate(any(Habit.class), any(LocalDate.class)))
                .thenAnswer(invocation -> realScheduleService.isScheduledForDate(
                        invocation.getArgument(0), invocation.getArgument(1)));

        // Daily habit request
        dailyHabitRequest = new HabitRequest(
                "Morning Run",
                "30 minute morning run",
                "Exercise",
                HabitFrequency.DAILY,
                null,
                null,
                LocalTime.of(6, 0),
                1,
                false
        );

        // Weekly habit request
        weeklyHabitRequest = new HabitRequest(
                "Gym Day",
                "Gym workout",
                "Exercise",
                HabitFrequency.WEEKLY,
                Set.of(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY),
                null,
                LocalTime.of(18, 0),
                1,
                false
        );

        // Monthly habit request
        monthlyHabitRequest = new HabitRequest(
                "Monthly Review",
                "Review goals",
                "Personal",
                HabitFrequency.MONTHLY,
                null,
                Set.of(1, 15),
                LocalTime.of(10, 0),
                1,
                false
        );

        // Sample habit
        habit = new Habit();
        habit.setId(1L);
        habit.setUserId(userId);
        habit.setTitle("Morning Run");
        habit.setDescription("30 minute morning run");
        habit.setCategory("Exercise");
        habit.setFrequency(HabitFrequency.DAILY);
        habit.setTargetTime(LocalTime.of(6, 0));
        habit.setCreatedAt(LocalDate.now().minusDays(10));
    }

    @Test
    void createHabit_withDailyFrequency_shouldSucceed() {
        // Arrange
        when(habitRepository.save(any(Habit.class))).thenReturn(habit);

        // Act
        HabitDTO result = habitService.createHabit(dailyHabitRequest);

        // Assert
        assertNotNull(result);
        assertEquals("Morning Run", result.title());
        assertEquals("Exercise", result.category());
        assertEquals(HabitFrequency.DAILY, result.frequency());
        verify(habitRepository, times(1)).save(any(Habit.class));
    }

    @Test
    void createHabit_withWeeklyFrequency_shouldSucceed() {
        // Arrange
        Habit weeklyHabit = new Habit();
        weeklyHabit.setId(2L);
        weeklyHabit.setUserId(userId);
        weeklyHabit.setTitle("Gym Day");
        weeklyHabit.setFrequency(HabitFrequency.WEEKLY);
        weeklyHabit.setDaysOfWeek(Set.of(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY));
        weeklyHabit.setCreatedAt(LocalDate.now());

        when(habitRepository.save(any(Habit.class))).thenReturn(weeklyHabit);

        // Act
        HabitDTO result = habitService.createHabit(weeklyHabitRequest);

        // Assert
        assertNotNull(result);
        assertEquals("Gym Day", result.title());
        assertEquals(HabitFrequency.WEEKLY, result.frequency());
        verify(habitRepository, times(1)).save(any(Habit.class));
    }

    @Test
    void createHabit_withWeeklyFrequencyButNoDays_shouldThrowException() {
        // Arrange
        HabitRequest invalidWeekly = new HabitRequest(
                "Gym",
                "description",
                "Exercise",
                HabitFrequency.WEEKLY,
                null,
                null,
                LocalTime.of(18, 0),
                1,
                false
        );

        // Act & Assert
        assertThrows(IllegalArgumentException.class, () -> habitService.createHabit(invalidWeekly));
    }

    @Test
    void createHabit_withMonthlyFrequencyButNoDays_shouldThrowException() {
        // Arrange
        HabitRequest invalidMonthly = new HabitRequest(
                "Review",
                "description",
                "Personal",
                HabitFrequency.MONTHLY,
                null,
                null,
                LocalTime.of(10, 0),
                1,
                false
        );

        // Act & Assert
        assertThrows(IllegalArgumentException.class, () -> habitService.createHabit(invalidMonthly));
    }

    @Test
    void createHabit_withInvalidDayOfMonth_shouldThrowException() {
        // Arrange
        HabitRequest invalidDay = new HabitRequest(
                "Review",
                "description",
                "Personal",
                HabitFrequency.MONTHLY,
                null,
                Set.of(32),
                LocalTime.of(10, 0),
                1,
                false
        );

        // Act & Assert
        assertThrows(IllegalArgumentException.class, () -> habitService.createHabit(invalidDay));
    }

    @Test
    void getAllHabits_shouldReturnUserHabits() {
        // Arrange
        List<Habit> habits = List.of(habit);
        when(habitRepository.findByUserId(userId)).thenReturn(habits);

        // Act
        List<HabitDTO> result = habitService.getAllHabits();

        // Assert
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("Morning Run", result.get(0).title());
        verify(habitRepository, times(1)).findByUserId(userId);
    }

    @Test
    void getHabitById_shouldReturnHabit() {
        // Arrange
        when(habitAccessValidator.getAndValidate(1L)).thenReturn(habit);

        // Act
        HabitDTO result = habitService.getHabitById(1L);

        // Assert
        assertNotNull(result);
        assertEquals("Morning Run", result.title());
        verify(habitAccessValidator, times(1)).getAndValidate(1L);
    }

    @Test
    void deleteHabit_shouldDeleteHabitAndLogs() {
        // Arrange
        when(habitAccessValidator.getAndValidate(1L)).thenReturn(habit);

        // Act
        habitService.deleteHabit(1L);

        // Assert
        verify(habitAccessValidator, times(1)).getAndValidate(1L);
        verify(habitLogRepository, times(1)).deleteByHabitIdAndUserId(1L, userId);
        verify(habitRepository, times(1)).delete(habit);
    }

    @Test
    void updateHabit_shouldUpdateHabitDetails() {
        // Arrange
        when(habitAccessValidator.getAndValidate(1L)).thenReturn(habit);
        HabitRequest updateRequest = new HabitRequest(
                "Updated Run",
                "Updated description",
                "Exercise",
                HabitFrequency.DAILY,
                null,
                null,
                LocalTime.of(7, 0),
                1,
                false
        );

        // Act
        habitService.updateHabit(1L, updateRequest);

        // Assert
        assertEquals("Updated Run", habit.getTitle());
        assertEquals("Updated description", habit.getDescription());
        assertEquals(LocalTime.of(7, 0), habit.getTargetTime());
        verify(habitRepository, times(1)).save(habit);
    }

    @Test
    void isScheduledForDate_withDailyFrequency_shouldAlwaysReturnTrue() {
        // Arrange
        LocalDate date = LocalDate.now();

        // Act & Assert
        assertTrue(habitService.isScheduledForDate(habit, date));
    }

    @Test
    void isScheduledForDate_withWeeklyFrequency_shouldReturnTrueForScheduledDays() {
        // Arrange
        Habit weeklyHabit = new Habit();
        weeklyHabit.setFrequency(HabitFrequency.WEEKLY);
        weeklyHabit.setDaysOfWeek(Set.of(DayOfWeek.MONDAY));

        LocalDate monday = LocalDate.of(2026, 4, 6); // This is a Monday
        LocalDate tuesday = LocalDate.of(2026, 4, 7); // This is a Tuesday

        // Act & Assert
        assertTrue(habitService.isScheduledForDate(weeklyHabit, monday));
        assertFalse(habitService.isScheduledForDate(weeklyHabit, tuesday));
    }

    @Test
    void isScheduledForDate_withMonthlyFrequency_shouldReturnTrueForScheduledDays() {
        // Arrange
        Habit monthlyHabit = new Habit();
        monthlyHabit.setFrequency(HabitFrequency.MONTHLY);
        monthlyHabit.setDaysOfMonth(Set.of(1, 15));

        LocalDate day1 = LocalDate.of(2026, 4, 1);
        LocalDate day15 = LocalDate.of(2026, 4, 15);
        LocalDate day10 = LocalDate.of(2026, 4, 10);

        // Act & Assert
        assertTrue(habitService.isScheduledForDate(monthlyHabit, day1));
        assertTrue(habitService.isScheduledForDate(monthlyHabit, day15));
        assertFalse(habitService.isScheduledForDate(monthlyHabit, day10));
    }

    @Test
    void getMonthSummary_shouldReturnStatusForEachDay() {
        // Arrange
        List<Habit> habits = List.of(habit);
        LocalDate date1 = LocalDate.of(2026, 4, 1);

        HabitLog log = new HabitLog();
        log.setHabitId(habit.getId());
        log.setDate(date1);
        log.setStatus(HabitStatus.COMPLETED);

        when(habitRepository.findByUserId(userId)).thenReturn(habits);
        when(habitLogRepository.findByUserIdAndDateBetween(eq(userId), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(List.of(log));

        // Act
        Map<String, List<String>> result = habitService.getMonthSummary(2026, 4);

        // Assert
        assertNotNull(result);
        verify(habitRepository, times(1)).findByUserId(userId);
        verify(habitLogRepository, times(1)).findByUserIdAndDateBetween(eq(userId), any(LocalDate.class), any(LocalDate.class));
    }

    @Test
    void getHabitsForDate_shouldReturnScheduledHabitsWithStatus() {
        // Arrange
        LocalDate date = LocalDate.of(2026, 4, 6); // Monday
        Habit dailyHabit = new Habit();
        dailyHabit.setId(1L);
        dailyHabit.setTitle("Morning Run");
        dailyHabit.setDescription("30 min run");
        dailyHabit.setCategory("Exercise");
        dailyHabit.setFrequency(HabitFrequency.DAILY);
        dailyHabit.setTargetTime(LocalTime.of(6, 0));
        dailyHabit.setCreatedAt(LocalDate.now().minusDays(10));

        when(habitRepository.findByUserId(userId)).thenReturn(List.of(dailyHabit));
        when(habitLogRepository.findByUserIdAndDate(userId, date)).thenReturn(Collections.emptyList());

        // Act
        List<HabitResponse> result = habitService.getHabitsForDate(date);

        // Assert
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("Morning Run", result.get(0).title());
    }

    @Test
    void getHabitsForDate_shouldReturnCompletedStatusFromLog() {
        // Arrange
        LocalDate date = LocalDate.now();
        Habit dailyHabit = new Habit();
        dailyHabit.setId(1L);
        dailyHabit.setTitle("Morning Run");
        dailyHabit.setFrequency(HabitFrequency.DAILY);
        dailyHabit.setTargetTime(LocalTime.of(6, 0));
        dailyHabit.setCreatedAt(LocalDate.now().minusDays(10));

        HabitLog log = new HabitLog();
        log.setHabitId(1L);
        log.setStatus(HabitStatus.COMPLETED);

        when(habitRepository.findByUserId(userId)).thenReturn(List.of(dailyHabit));
        when(habitLogRepository.findByUserIdAndDate(userId, date)).thenReturn(List.of(log));

        // Act
        List<HabitResponse> result = habitService.getHabitsForDate(date);

        // Assert
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(HabitStatus.COMPLETED, result.get(0).habitStatus());
    }

    @Test
    void getHabitsForDate_shouldReturnMissedStatusForPastDate() {
        // Arrange
        LocalDate pastDate = LocalDate.now().minusDays(5);
        Habit dailyHabit = new Habit();
        dailyHabit.setId(1L);
        dailyHabit.setTitle("Morning Run");
        dailyHabit.setFrequency(HabitFrequency.DAILY);
        dailyHabit.setTargetTime(LocalTime.of(6, 0));
        dailyHabit.setCreatedAt(LocalDate.now().minusDays(10));

        when(habitRepository.findByUserId(userId)).thenReturn(List.of(dailyHabit));
        when(habitLogRepository.findByUserIdAndDate(userId, pastDate)).thenReturn(Collections.emptyList());

        // Act
        List<HabitResponse> result = habitService.getHabitsForDate(pastDate);

        // Assert
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(HabitStatus.MISSED, result.get(0).habitStatus());
    }

    @Test
    void getHabitsForDate_shouldReturnPendingStatusForFutureDate() {
        // Arrange
        LocalDate futureDate = LocalDate.now().plusDays(5);
        Habit dailyHabit = new Habit();
        dailyHabit.setId(1L);
        dailyHabit.setTitle("Morning Run");
        dailyHabit.setFrequency(HabitFrequency.DAILY);
        dailyHabit.setTargetTime(LocalTime.of(6, 0));
        dailyHabit.setCreatedAt(LocalDate.now().minusDays(10));

        when(habitRepository.findByUserId(userId)).thenReturn(List.of(dailyHabit));
        when(habitLogRepository.findByUserIdAndDate(userId, futureDate)).thenReturn(Collections.emptyList());

        // Act
        List<HabitResponse> result = habitService.getHabitsForDate(futureDate);

        // Assert
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(HabitStatus.PENDING, result.get(0).habitStatus());
    }

    @Test
    void getHabitsForDate_shouldNotReturnHabitBeforeCreationDate() {
        // Arrange
        LocalDate date = LocalDate.now().minusDays(15);
        Habit dailyHabit = new Habit();
        dailyHabit.setId(1L);
        dailyHabit.setTitle("Morning Run");
        dailyHabit.setFrequency(HabitFrequency.DAILY);
        dailyHabit.setTargetTime(LocalTime.of(6, 0));
        dailyHabit.setCreatedAt(LocalDate.now().minusDays(10));

        when(habitRepository.findByUserId(userId)).thenReturn(List.of(dailyHabit));
        when(habitLogRepository.findByUserIdAndDate(userId, date)).thenReturn(Collections.emptyList());

        // Act
        List<HabitResponse> result = habitService.getHabitsForDate(date);

        // Assert
        assertNotNull(result);
        assertEquals(0, result.size());
    }

    @Test
    void isWeeklyMatch_withNullDaysOfWeek_shouldReturnFalse() {
        // Arrange
        Habit weeklyHabit = new Habit();
        weeklyHabit.setFrequency(HabitFrequency.WEEKLY);
        weeklyHabit.setDaysOfWeek(null);

        LocalDate monday = LocalDate.of(2026, 4, 6);

        // Act & Assert
        assertFalse(habitService.isScheduledForDate(weeklyHabit, monday));
    }

    @Test
    void isWeeklyMatch_withEmptyDaysOfWeek_shouldReturnFalse() {
        // Arrange
        Habit weeklyHabit = new Habit();
        weeklyHabit.setFrequency(HabitFrequency.WEEKLY);
        weeklyHabit.setDaysOfWeek(Collections.emptySet());

        LocalDate monday = LocalDate.of(2026, 4, 6);

        // Act & Assert
        assertFalse(habitService.isScheduledForDate(weeklyHabit, monday));
    }

    @Test
    void isMonthlyMatch_withNullDaysOfMonth_shouldReturnFalse() {
        // Arrange
        Habit monthlyHabit = new Habit();
        monthlyHabit.setFrequency(HabitFrequency.MONTHLY);
        monthlyHabit.setDaysOfMonth(null);

        LocalDate date = LocalDate.of(2026, 4, 1);

        // Act & Assert
        assertFalse(habitService.isScheduledForDate(monthlyHabit, date));
    }

    @Test
    void isMonthlyMatch_withEmptyDaysOfMonth_shouldReturnFalse() {
        // Arrange
        Habit monthlyHabit = new Habit();
        monthlyHabit.setFrequency(HabitFrequency.MONTHLY);
        monthlyHabit.setDaysOfMonth(Collections.emptySet());

        LocalDate date = LocalDate.of(2026, 4, 1);

        // Act & Assert
        assertFalse(habitService.isScheduledForDate(monthlyHabit, date));
    }

    @Test
    void normalizeSchedule_withDailyFrequency_shouldClearWeeklyAndMonthly() {
        // Arrange
        Habit dailyHabit = new Habit();
        dailyHabit.setFrequency(HabitFrequency.DAILY);
        dailyHabit.setDaysOfWeek(Set.of(DayOfWeek.MONDAY));
        dailyHabit.setDaysOfMonth(Set.of(1, 2));
        dailyHabit.setTitle("Daily");
        dailyHabit.setCategory("Test");
        dailyHabit.setTargetTime(LocalTime.of(6, 0));
        dailyHabit.setUserId(userId);

        when(habitRepository.save(any(Habit.class))).thenReturn(dailyHabit);

        // Act
        HabitDTO result = habitService.createHabit(new HabitRequest("Daily", "", "Test", HabitFrequency.DAILY, Set.of(DayOfWeek.MONDAY), Set.of(1), LocalTime.of(6, 0), 1, false));

        // Assert
        assertNotNull(result);
        verify(habitRepository).save(argThat(h -> h.getDaysOfWeek() == null && h.getDaysOfMonth() == null));
    }

    @Test
    void normalizeSchedule_withWeeklyFrequency_shouldClearMonthly() {
        // Arrange
        Habit weeklyHabit = new Habit();
        weeklyHabit.setFrequency(HabitFrequency.WEEKLY);
        weeklyHabit.setDaysOfWeek(Set.of(DayOfWeek.MONDAY));
        weeklyHabit.setDaysOfMonth(Set.of(1, 2));
        weeklyHabit.setTitle("Weekly");
        weeklyHabit.setCategory("Test");
        weeklyHabit.setTargetTime(LocalTime.of(6, 0));
        weeklyHabit.setUserId(userId);

        when(habitRepository.save(any(Habit.class))).thenReturn(weeklyHabit);

        // Act
        HabitDTO result = habitService.createHabit(new HabitRequest("Weekly", "", "Test", HabitFrequency.WEEKLY, Set.of(DayOfWeek.MONDAY), null, LocalTime.of(6, 0), 1, false));

        // Assert
        assertNotNull(result);
        verify(habitRepository).save(argThat(h -> h.getDaysOfMonth() == null));
    }

    @Test
    void normalizeSchedule_withMonthlyFrequency_shouldClearWeekly() {
        // Arrange
        Habit monthlyHabit = new Habit();
        monthlyHabit.setFrequency(HabitFrequency.MONTHLY);
        monthlyHabit.setDaysOfWeek(Set.of(DayOfWeek.MONDAY));
        monthlyHabit.setDaysOfMonth(Set.of(1, 2));
        monthlyHabit.setTitle("Monthly");
        monthlyHabit.setCategory("Test");
        monthlyHabit.setTargetTime(LocalTime.of(6, 0));
        monthlyHabit.setUserId(userId);

        when(habitRepository.save(any(Habit.class))).thenReturn(monthlyHabit);

        // Act
        HabitDTO result = habitService.createHabit(new HabitRequest("Monthly", "", "Test", HabitFrequency.MONTHLY, null, Set.of(1, 2), LocalTime.of(6, 0), 1, false));

        // Assert
        assertNotNull(result);
        verify(habitRepository).save(argThat(h -> h.getDaysOfWeek() == null));
    }
}