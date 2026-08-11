package com.habitai.scheduler;

import com.habitai.habit.Habit;
import com.habitai.habit.HabitCategory;
import com.habitai.habit.HabitFrequency;
import com.habitai.habit.HabitRepository;
import com.habitai.habit.HabitScheduleService;
import com.habitai.habitlog.HabitLog;
import com.habitai.habitlog.HabitLogRepository;
import com.habitai.habitlog.HabitStatus;
import com.habitai.user.User;
import com.habitai.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class HabitStatusSchedulerTest {

    @Mock
    private HabitRepository habitRepository;

    @Mock
    private HabitLogRepository habitLogRepository;

    @Mock
    private HabitScheduleService habitScheduleService;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private HabitStatusScheduler habitStatusScheduler;

    private LocalDate today;
    private LocalTime now;

    @BeforeEach
    void setUp() {
        today = LocalDate.now(ZoneId.of("UTC"));
        now = LocalTime.now(ZoneId.of("UTC")).minusMinutes(5);

        when(habitScheduleService.isScheduledForDate(any(Habit.class), any(LocalDate.class))).thenReturn(true);
        when(habitLogRepository.findByUserIdInAndDateBetween(anyCollection(), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(new ArrayList<>());
    }

    @Test
    void testUpdateMissedHabitsWhenNoActiveHabits() {
        when(habitRepository.findByPausedFalseAndArchivedFalse()).thenReturn(new ArrayList<>());

        habitStatusScheduler.updateMissedHabits();

        verify(habitLogRepository, never()).saveAll(any());
    }

    @Test
    void testUpdateMissedHabitsWithSingleOverdueHabit() {
        Habit habit = createHabit(1L, 100L, now.minusMinutes(1));
        User user = createUser(100L, "UTC");

        when(habitRepository.findByPausedFalseAndArchivedFalse()).thenReturn(List.of(habit));
        when(userRepository.findByIdIn(anyCollection())).thenReturn(List.of(user));

        habitStatusScheduler.updateMissedHabits();

        verify(habitLogRepository).saveAll(any());
    }

    @Test
    void testUpdateMissedHabitsDoesNotSaveIfNotScheduled() {
        Habit habit = createHabit(1L, 100L, now.minusMinutes(1));
        User user = createUser(100L, "UTC");

        when(habitRepository.findByPausedFalseAndArchivedFalse()).thenReturn(List.of(habit));
        when(userRepository.findByIdIn(anyCollection())).thenReturn(List.of(user));
        when(habitScheduleService.isScheduledForDate(habit, today)).thenReturn(false);

        habitStatusScheduler.updateMissedHabits();

        verify(habitLogRepository, never()).saveAll(any());
    }

    @Test
    void testUpdateMissedHabitsDoesNotSaveIfAlreadyLogged() {
        Habit habit = createHabit(1L, 100L, now.minusMinutes(1));
        User user = createUser(100L, "UTC");
        HabitLog existingLog = createHabitLog(1L, 100L, today, HabitStatus.COMPLETED);

        when(habitRepository.findByPausedFalseAndArchivedFalse()).thenReturn(List.of(habit));
        when(userRepository.findByIdIn(anyCollection())).thenReturn(List.of(user));
        when(habitLogRepository.findByUserIdInAndDateBetween(anyCollection(), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(List.of(existingLog));

        habitStatusScheduler.updateMissedHabits();

        verify(habitLogRepository, never()).saveAll(any());
    }

    @Test
    void testUpdateMissedHabitsWithMultipleOverdueHabits() {
        Habit habit1 = createHabit(1L, 100L, now.minusMinutes(1));
        Habit habit2 = createHabit(2L, 100L, now.minusMinutes(2));
        Habit habit3 = createHabit(3L, 100L, now.minusMinutes(3));
        User user = createUser(100L, "UTC");

        when(habitRepository.findByPausedFalseAndArchivedFalse()).thenReturn(List.of(habit1, habit2, habit3));
        when(userRepository.findByIdIn(anyCollection())).thenReturn(List.of(user));

        habitStatusScheduler.updateMissedHabits();

        verify(habitLogRepository).saveAll(any());
    }

    @Test
    void testUpdateMissedHabitsWithDifferentUserTimezones() {
        Habit habit1 = createHabit(1L, 100L, now.minusMinutes(1));
        Habit habit2 = createHabit(2L, 200L, now.minusMinutes(1));
        User user1 = createUser(100L, "America/New_York");
        User user2 = createUser(200L, "Asia/Kolkata");

        when(habitRepository.findByPausedFalseAndArchivedFalse()).thenReturn(List.of(habit1, habit2));
        when(userRepository.findByIdIn(anyCollection())).thenReturn(List.of(user1, user2));

        habitStatusScheduler.updateMissedHabits();

        verify(habitLogRepository).saveAll(any());
    }

    @Test
    void testUpdateMissedHabitsIsIdempotentAcrossRuns() {
        Habit habit = createHabit(1L, 100L, now.minusMinutes(1));
        User user = createUser(100L, "UTC");

        when(habitRepository.findByPausedFalseAndArchivedFalse()).thenReturn(List.of(habit));
        when(userRepository.findByIdIn(anyCollection())).thenReturn(List.of(user));

        habitStatusScheduler.updateMissedHabits();
        habitStatusScheduler.updateMissedHabits();

        verify(habitRepository, times(2)).findByPausedFalseAndArchivedFalse();
        verify(habitLogRepository, times(2)).findByUserIdInAndDateBetween(anyCollection(), any(LocalDate.class), any(LocalDate.class));
    }

    @Test
    void testUpdateMissedHabitsDoesNotSaveEmptyLogList() {
        Habit habit = createHabit(1L, 100L, now.minusMinutes(1));
        User user = createUser(100L, "UTC");
        HabitLog existingLog = createHabitLog(1L, 100L, today, HabitStatus.COMPLETED);

        when(habitRepository.findByPausedFalseAndArchivedFalse()).thenReturn(List.of(habit));
        when(userRepository.findByIdIn(anyCollection())).thenReturn(List.of(user));
        when(habitLogRepository.findByUserIdInAndDateBetween(anyCollection(), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(List.of(existingLog));

        habitStatusScheduler.updateMissedHabits();

        verify(habitLogRepository, never()).saveAll(any());
    }

    private Habit createHabit(Long id, Long userId, LocalTime targetTime) {
        Habit habit = new Habit();
        habit.setId(id);
        habit.setUserId(userId);
        habit.setTitle("Test Habit");
        habit.setCategory(HabitCategory.FITNESS);
        habit.setFrequency(HabitFrequency.DAILY);
        habit.setTargetTime(targetTime);
        habit.setCreatedAt(today.minusDays(1));
        habit.setNotificationsEnabled(true);
        habit.setPaused(false);
        habit.setArchived(false);
        return habit;
    }

    private User createUser(Long userId, String timezone) {
        User user = new User();
        user.setId(userId);
        user.setPushToken("token" + userId);
        user.setTimezone(timezone);
        user.setEmail("user" + userId + "@example.com");
        user.setPassword("password");
        user.setCreatedAt(Instant.now());
        return user;
    }

    private HabitLog createHabitLog(Long habitId, Long userId, LocalDate date, HabitStatus status) {
        HabitLog log = new HabitLog();
        log.setHabitId(habitId);
        log.setUserId(userId);
        log.setDate(date);
        log.setStatus(status);
        return log;
    }
}
