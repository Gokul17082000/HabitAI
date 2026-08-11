package com.habitai.scheduler;

import com.habitai.habit.Habit;
import com.habitai.habit.HabitRepository;
import com.habitai.habit.HabitScheduleService;
import com.habitai.habitlog.HabitLogRepository;
import com.habitai.notification.NotificationService;
import com.habitai.user.User;
import com.habitai.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SchedulerServiceTest {

    @Mock
    private HabitRepository habitRepository;

    @Mock
    private HabitLogRepository habitLogRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private HabitScheduleService habitScheduleService;

    @InjectMocks
    private SchedulerService schedulerService;

    private LocalTime now;
    private LocalTime later;

    @BeforeEach
    void setUp() {
        // Use actual current time and shift slightly ahead so target times are still
        // within the reminder window when the service checks LocalTime.now(zone).
        now = LocalTime.now(ZoneOffset.UTC).plusSeconds(1);
        later = now.plusMinutes(15);

        schedulerService = spy(schedulerService);
        when(habitScheduleService.isScheduledForDate(any(Habit.class), any(LocalDate.class))).thenReturn(true);
        when(userRepository.findByPushTokenNotNull()).thenReturn(new ArrayList<>());
        // Default: no habits already logged today — tests that need a logged habit can override
        when(habitLogRepository.findByUserIdInAndDateBetween(any(), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(new ArrayList<>());
    }

    // sendHabitReminder - No Habits Tests

    @Test
    void testSendHabitReminderWhenNoHabitsFound() {
        // Arrange
        when(userRepository.findByPushTokenNotNull()).thenReturn(new ArrayList<>());

        // Act
        schedulerService.sendHabitReminder();

        // Assert
        verify(userRepository).findByPushTokenNotNull();
        verify(notificationService, never()).notify(any(), any(), any());
        verifyNoInteractions(habitRepository);
    }

    @Test
    void testSendHabitReminderWithEmptyHabitList() {
        // Arrange
        User user = createUser(100L, "token123");
        when(userRepository.findByPushTokenNotNull()).thenReturn(List.of(user));
        when(habitRepository.findByUserIdIn(any())).thenReturn(new ArrayList<>());

        // Act
        schedulerService.sendHabitReminder();

        // Assert
        verify(notificationService, never()).notify(any(), any(), any());
    }

    // sendHabitReminder - Single Habit Tests

    @Test
    void testSendHabitReminderWithSingleHabit() {
        // Arrange
        Habit habit = createHabit(1L, 100L, "Morning Exercise", now);
        User user = createUser(100L, "token123");

        when(userRepository.findByPushTokenNotNull()).thenReturn(List.of(user));
        when(habitRepository.findByUserIdIn(any())).thenReturn(List.of(habit));

        // Act
        schedulerService.sendHabitReminder();

        // Assert
        verify(notificationService).notify("token123", "Morning Exercise", now);
    }

    @Test
    void testSendHabitReminderWithSingleHabitNoUser() {
        // Arrange
        when(userRepository.findByPushTokenNotNull()).thenReturn(new ArrayList<>());

        // Act
        schedulerService.sendHabitReminder();

        // Assert
        verify(notificationService, never()).notify(any(), any(), any());
    }

    @Test
    void testSendHabitReminderWithUserNoPushToken() {
        // Arrange
        when(userRepository.findByPushTokenNotNull()).thenReturn(new ArrayList<>());

        // Act
        schedulerService.sendHabitReminder();

        // Assert
        verify(notificationService, never()).notify(any(), any(), any());
    }

    @Test
    void testSendHabitReminderWithUserBlankPushToken() {
        // Arrange
        Habit habit = createHabit(1L, 100L, "Morning Exercise", now);
        User user = createUser(100L, "   ");

        when(userRepository.findByPushTokenNotNull()).thenReturn(List.of(user));
        when(habitRepository.findByUserIdIn(any())).thenReturn(List.of(habit));

        // Act
        schedulerService.sendHabitReminder();

        // Assert
        verify(notificationService, never()).notify(any(), any(), any());
    }

    @Test
    void testSendHabitReminderWithValidPushToken() {
        // Arrange
        Habit habit = createHabit(1L, 100L, "Morning Exercise", now);
        User user = createUser(100L, "valid_token_12345");

        when(userRepository.findByPushTokenNotNull()).thenReturn(List.of(user));
        when(habitRepository.findByUserIdIn(any())).thenReturn(List.of(habit));

        // Act
        schedulerService.sendHabitReminder();

        // Assert
        verify(notificationService).notify("valid_token_12345", "Morning Exercise", now);
    }

    // sendHabitReminder - Multiple Habits Same User Tests

    @Test
    void testSendHabitReminderWithMultipleHabitsSameUser() {
        // Arrange
        Habit habit1 = createHabit(1L, 100L, "Morning Exercise", now);
        Habit habit2 = createHabit(2L, 100L, "Meditation", now.plusMinutes(5));
        Habit habit3 = createHabit(3L, 100L, "Breakfast", now.plusMinutes(10));
        User user = createUser(100L, "token123");

        when(userRepository.findByPushTokenNotNull()).thenReturn(List.of(user));
        when(habitRepository.findByUserIdIn(any())).thenReturn(List.of(habit1, habit2, habit3));

        // Act
        schedulerService.sendHabitReminder();

        // Assert
        verify(notificationService).notify("token123", "Morning Exercise", now);
        verify(notificationService).notify("token123", "Meditation", now.plusMinutes(5));
        verify(notificationService).notify("token123", "Breakfast", now.plusMinutes(10));
        verify(notificationService, times(3)).notify(any(), any(), any());
    }

    @Test
    void testSendHabitReminderWithDuplicateHabitsForSameUser() {
        // Arrange
        Habit habit1 = createHabit(1L, 100L, "Morning Exercise", now);
        Habit habit2 = createHabit(2L, 100L, "Morning Exercise", now);
        User user = createUser(100L, "token123");

        when(userRepository.findByPushTokenNotNull()).thenReturn(List.of(user));
        when(habitRepository.findByUserIdIn(any())).thenReturn(List.of(habit1, habit2));

        // Act
        schedulerService.sendHabitReminder();

        // Assert
        verify(notificationService, times(2)).notify("token123", "Morning Exercise", now);
    }

    // sendHabitReminder - Multiple Users Tests

    @Test
    void testSendHabitReminderWithMultipleUsers() {
        // Arrange
        Habit habit1User1 = createHabit(1L, 100L, "Habit1", now);
        Habit habit2User2 = createHabit(2L, 200L, "Habit2", now.plusMinutes(5));
        Habit habit3User1 = createHabit(3L, 100L, "Habit3", now.plusMinutes(10));

        User user1 = createUser(100L, "token100");
        User user2 = createUser(200L, "token200");

        when(userRepository.findByPushTokenNotNull()).thenReturn(List.of(user1, user2));
        when(habitRepository.findByUserIdIn(any())).thenReturn(List.of(habit1User1, habit2User2, habit3User1));

        // Act
        schedulerService.sendHabitReminder();

        // Assert
        verify(notificationService).notify("token100", "Habit1", now);
        verify(notificationService).notify("token100", "Habit3", now.plusMinutes(10));
        verify(notificationService).notify("token200", "Habit2", now.plusMinutes(5));
        verify(notificationService, times(3)).notify(any(), any(), any());
    }

    @Test
    void testSendHabitReminderWithMultipleUsersOneWithoutToken() {
        // Arrange
        Habit habit1User1 = createHabit(1L, 100L, "Habit1", now);
        Habit habit2User2 = createHabit(2L, 200L, "Habit2", now.plusMinutes(5));

        User user1 = createUser(100L, "token100");
        User user2 = createUser(200L, null);

        when(userRepository.findByPushTokenNotNull()).thenReturn(List.of(user1));
        when(habitRepository.findByUserIdIn(any())).thenReturn(List.of(habit1User1));

        // Act
        schedulerService.sendHabitReminder();

        // Assert
        verify(notificationService, times(1)).notify(any(), any(), any());
        verify(notificationService).notify("token100", "Habit1", now);
    }

    // sendHabitReminder - Midnight Wraparound Tests

    @Test
    void testSendHabitReminderWithInvalidTimezoneFallsBackToUTC() {
        // Arrange
        Habit habit = createHabit(1L, 100L, "Late Night", now);
        User user = createUser(100L, "token123");
        user.setTimezone("Invalid/Zone");

        when(userRepository.findByPushTokenNotNull()).thenReturn(List.of(user));
        when(habitRepository.findByUserIdIn(any())).thenReturn(List.of(habit));

        // Act
        schedulerService.sendHabitReminder();

        // Assert
        verify(notificationService).notify("token123", "Late Night", now);
    }

    // sendHabitReminder - Time Range Tests

    @Test
    void testSendHabitReminderChecksCorrectUserQuery() {
        // Arrange
        User user = createUser(100L, "token123");
        when(userRepository.findByPushTokenNotNull()).thenReturn(List.of(user));
        when(habitRepository.findByUserIdIn(any())).thenReturn(new ArrayList<>());

        // Act
        schedulerService.sendHabitReminder();

        // Assert
        ArgumentCaptor<List<Long>> userIdsCaptor = ArgumentCaptor.forClass(List.class);
        verify(habitRepository).findByUserIdIn(userIdsCaptor.capture());
        assert userIdsCaptor.getValue().contains(100L);
    }

    // sendHabitReminder - Habit Properties Tests

    @Test
    void testSendHabitReminderPassesCorrectHabitTitle() {
        // Arrange
        Habit habit = createHabit(1L, 100L, "Read Book", now);
        User user = createUser(100L, "token123");

        when(userRepository.findByPushTokenNotNull()).thenReturn(List.of(user));
        when(habitRepository.findByUserIdIn(any())).thenReturn(List.of(habit));

        // Act
        schedulerService.sendHabitReminder();

        // Assert
        verify(notificationService).notify("token123", "Read Book", now);
    }

    @Test
    void testSendHabitReminderPassesCorrectHabitTime() {
        // Arrange
        LocalTime customTime = now;
        Habit habit = createHabit(1L, 100L, "Afternoon Walk", customTime);
        User user = createUser(100L, "token123");

        when(userRepository.findByPushTokenNotNull()).thenReturn(List.of(user));
        when(habitRepository.findByUserIdIn(any())).thenReturn(List.of(habit));

        // Act
        schedulerService.sendHabitReminder();

        // Assert
        verify(notificationService).notify("token123", "Afternoon Walk", customTime);
    }

    @Test
    void testSendHabitReminderWithSpecialCharactersInTitle() {
        // Arrange
        Habit habit = createHabit(1L, 100L, "Drink 💧 Water!", now);
        User user = createUser(100L, "token123");

        when(userRepository.findByPushTokenNotNull()).thenReturn(List.of(user));
        when(habitRepository.findByUserIdIn(any())).thenReturn(List.of(habit));

        // Act
        schedulerService.sendHabitReminder();

        // Assert
        verify(notificationService).notify("token123", "Drink 💧 Water!", now);
    }

    // sendHabitReminder - Large Scale Tests

    @Test
    void testSendHabitReminderWithManyHabitsAcrossUsers() {
        // Arrange
        List<Habit> habits = new ArrayList<>();
        for (int i = 1; i <= 20; i++) {
            long userId = 100L + (i % 5); // 5 different users
            habits.add(createHabit((long) i, userId, "Habit" + i, now.plusMinutes(i % 15)));
        }

        when(userRepository.findByPushTokenNotNull()).thenReturn(List.of(
                createUser(100L, "token100"),
                createUser(101L, "token101"),
                createUser(102L, "token102"),
                createUser(103L, "token103"),
                createUser(104L, "token104")));
        when(habitRepository.findByUserIdIn(any())).thenReturn(habits);

        // Act
        schedulerService.sendHabitReminder();

        // Assert
        verify(notificationService, times(20)).notify(any(), any(), any());
    }

    @Test
    void testSendHabitReminderHandlesMixedValidAndInvalidUsers() {
        // Arrange
        List<Habit> habits = new ArrayList<>();
        habits.add(createHabit(1L, 100L, "Habit1", now));
        habits.add(createHabit(2L, 200L, "Habit2", now.plusMinutes(5)));
        habits.add(createHabit(3L, 300L, "Habit3", now.plusMinutes(10)));

        when(userRepository.findByPushTokenNotNull()).thenReturn(List.of(
                createUser(100L, "token100")));
        when(habitRepository.findByUserIdIn(any())).thenReturn(List.of(habits.get(0)));

        // Act
        schedulerService.sendHabitReminder();

        // Assert
        verify(notificationService, times(1)).notify(any(), any(), any());
        verify(notificationService).notify("token100", "Habit1", now);
    }

    @Test
    void testSendHabitReminderWithLongHabitTitle() {
        // Arrange
        String longTitle = "This is a very long habit title that contains many words and characters";
        Habit habit = createHabit(1L, 100L, longTitle, now);
        User user = createUser(100L, "token123");

        when(userRepository.findByPushTokenNotNull()).thenReturn(List.of(user));
        when(habitRepository.findByUserIdIn(any())).thenReturn(List.of(habit));

        // Act
        schedulerService.sendHabitReminder();

        // Assert
        verify(notificationService).notify("token123", longTitle, now);
    }

    // sendHabitReminder - Edge Cases

    @Test
    void testSendHabitReminderIdempotent() {
        // Arrange
        Habit habit = createHabit(1L, 100L, "Morning Exercise", now);
        User user = createUser(100L, "token123");

        when(userRepository.findByPushTokenNotNull()).thenReturn(List.of(user));
        when(habitRepository.findByUserIdIn(any())).thenReturn(List.of(habit));

        // Act
        schedulerService.sendHabitReminder();
        schedulerService.sendHabitReminder();

        // Assert
        verify(notificationService, times(2)).notify("token123", "Morning Exercise", now);
    }

    @Test
    void testSendHabitReminderWithNullUserOptional() {
        // Arrange
        when(userRepository.findByPushTokenNotNull()).thenReturn(new ArrayList<>());

        // Act & Assert - Should not throw NPE
        try {
            schedulerService.sendHabitReminder();
        } catch (NullPointerException e) {
            throw new AssertionError("sendHabitReminder() should handle empty Optional", e);
        }
    }

    // Helper methods to create test objects

    private Habit createHabit(Long id, Long userId, String title, LocalTime targetTime) {
        Habit habit = new Habit();
        habit.setId(id);
        habit.setUserId(userId);
        habit.setTitle(title);
        habit.setTargetTime(targetTime);
        return habit;
    }

    private User createUser(Long userId, String pushToken) {
        User user = new User();
        user.setId(userId);
        user.setPushToken(pushToken);
        user.setTimezone("UTC");
        return user;
    }

}
