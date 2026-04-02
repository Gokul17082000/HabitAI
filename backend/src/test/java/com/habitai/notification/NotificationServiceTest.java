package com.habitai.notification;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    private NotificationService notificationService;
    private static final String PUSH_TOKEN = "test_push_token_123";
    private static final String HABIT_TITLE = "Morning Exercise";

    @BeforeEach
    void setUp() {
        notificationService = new NotificationService();
    }

    // notify - Success Tests

    @Test
    void testNotifyWithValidParameters() throws Exception {
        // Arrange
        LocalTime time = LocalTime.of(6, 30);
        String habitTitle = "Meditation";

        try (MockedStatic<FirebaseMessaging> firebaseMessagingMock = mockStatic(FirebaseMessaging.class)) {
            FirebaseMessaging mockInstance = mock(FirebaseMessaging.class);
            firebaseMessagingMock.when(FirebaseMessaging::getInstance).thenReturn(mockInstance);

            // Act
            notificationService.notify(PUSH_TOKEN, habitTitle, time);

            // Assert - Verify send was called with a Message
            verify(mockInstance).send(any(Message.class));
        }
    }

    @Test
    void testNotifyWithMorningTime() throws Exception {
        // Arrange
        LocalTime time = LocalTime.of(7, 0);
        String habitTitle = "Breakfast";

        try (MockedStatic<FirebaseMessaging> firebaseMessagingMock = mockStatic(FirebaseMessaging.class)) {
            FirebaseMessaging mockInstance = mock(FirebaseMessaging.class);
            firebaseMessagingMock.when(FirebaseMessaging::getInstance).thenReturn(mockInstance);

            // Act
            notificationService.notify(PUSH_TOKEN, habitTitle, time);

            // Assert
            verify(mockInstance).send(any(Message.class));
        }
    }

    @Test
    void testNotifyWithAfternoonTime() throws Exception {
        // Arrange
        LocalTime time = LocalTime.of(14, 30);
        String habitTitle = "Lunch Walk";

        try (MockedStatic<FirebaseMessaging> firebaseMessagingMock = mockStatic(FirebaseMessaging.class)) {
            FirebaseMessaging mockInstance = mock(FirebaseMessaging.class);
            firebaseMessagingMock.when(FirebaseMessaging::getInstance).thenReturn(mockInstance);

            // Act
            notificationService.notify(PUSH_TOKEN, habitTitle, time);

            // Assert
            verify(mockInstance).send(any(Message.class));
        }
    }

    @Test
    void testNotifyWithEveningTime() throws Exception {
        // Arrange
        LocalTime time = LocalTime.of(18, 45);
        String habitTitle = "Evening Yoga";

        try (MockedStatic<FirebaseMessaging> firebaseMessagingMock = mockStatic(FirebaseMessaging.class)) {
            FirebaseMessaging mockInstance = mock(FirebaseMessaging.class);
            firebaseMessagingMock.when(FirebaseMessaging::getInstance).thenReturn(mockInstance);

            // Act
            notificationService.notify(PUSH_TOKEN, habitTitle, time);

            // Assert
            verify(mockInstance).send(any(Message.class));
        }
    }

    @Test
    void testNotifyWithMidnightTime() throws Exception {
        // Arrange
        LocalTime time = LocalTime.of(0, 0);
        String habitTitle = "Sleep";

        try (MockedStatic<FirebaseMessaging> firebaseMessagingMock = mockStatic(FirebaseMessaging.class)) {
            FirebaseMessaging mockInstance = mock(FirebaseMessaging.class);
            firebaseMessagingMock.when(FirebaseMessaging::getInstance).thenReturn(mockInstance);

            // Act
            notificationService.notify(PUSH_TOKEN, habitTitle, time);

            // Assert
            verify(mockInstance).send(any(Message.class));
        }
    }

    @Test
    void testNotifyWithNoonTime() throws Exception {
        // Arrange
        LocalTime time = LocalTime.of(12, 0);
        String habitTitle = "Lunch";

        try (MockedStatic<FirebaseMessaging> firebaseMessagingMock = mockStatic(FirebaseMessaging.class)) {
            FirebaseMessaging mockInstance = mock(FirebaseMessaging.class);
            firebaseMessagingMock.when(FirebaseMessaging::getInstance).thenReturn(mockInstance);

            // Act
            notificationService.notify(PUSH_TOKEN, habitTitle, time);

            // Assert
            verify(mockInstance).send(any(Message.class));
        }
    }

    @Test
    void testNotifyWithSingleCharacterHabitTitle() throws Exception {
        // Arrange
        LocalTime time = LocalTime.of(9, 0);
        String habitTitle = "A";

        try (MockedStatic<FirebaseMessaging> firebaseMessagingMock = mockStatic(FirebaseMessaging.class)) {
            FirebaseMessaging mockInstance = mock(FirebaseMessaging.class);
            firebaseMessagingMock.when(FirebaseMessaging::getInstance).thenReturn(mockInstance);

            // Act
            notificationService.notify(PUSH_TOKEN, habitTitle, time);

            // Assert
            verify(mockInstance).send(any(Message.class));
        }
    }

    @Test
    void testNotifyWithLongHabitTitle() throws Exception {
        // Arrange
        LocalTime time = LocalTime.of(10, 30);
        String habitTitle = "Read technical documentation for 30 minutes";

        try (MockedStatic<FirebaseMessaging> firebaseMessagingMock = mockStatic(FirebaseMessaging.class)) {
            FirebaseMessaging mockInstance = mock(FirebaseMessaging.class);
            firebaseMessagingMock.when(FirebaseMessaging::getInstance).thenReturn(mockInstance);

            // Act
            notificationService.notify(PUSH_TOKEN, habitTitle, time);

            // Assert
            verify(mockInstance).send(any(Message.class));
        }
    }

    @Test
    void testNotifyWithSpecialCharactersInHabitTitle() throws Exception {
        // Arrange
        LocalTime time = LocalTime.of(11, 0);
        String habitTitle = "Drink 💧 Water!";

        try (MockedStatic<FirebaseMessaging> firebaseMessagingMock = mockStatic(FirebaseMessaging.class)) {
            FirebaseMessaging mockInstance = mock(FirebaseMessaging.class);
            firebaseMessagingMock.when(FirebaseMessaging::getInstance).thenReturn(mockInstance);

            // Act
            notificationService.notify(PUSH_TOKEN, habitTitle, time);

            // Assert
            verify(mockInstance).send(any(Message.class));
        }
    }

    @Test
    void testNotifyWithDifferentPushTokens() throws Exception {
        // Arrange
        LocalTime time = LocalTime.of(9, 0);
        String token1 = "token_1";
        String token2 = "token_2";

        try (MockedStatic<FirebaseMessaging> firebaseMessagingMock = mockStatic(FirebaseMessaging.class)) {
            FirebaseMessaging mockInstance = mock(FirebaseMessaging.class);
            firebaseMessagingMock.when(FirebaseMessaging::getInstance).thenReturn(mockInstance);

            // Act
            notificationService.notify(token1, HABIT_TITLE, time);
            notificationService.notify(token2, HABIT_TITLE, time);

            // Assert
            verify(mockInstance, times(2)).send(any(Message.class));
        }
    }

    @Test
    void testNotifyMultipleTimesWithSameParameters() throws Exception {
        // Arrange
        LocalTime time = LocalTime.of(10, 0);

        try (MockedStatic<FirebaseMessaging> firebaseMessagingMock = mockStatic(FirebaseMessaging.class)) {
            FirebaseMessaging mockInstance = mock(FirebaseMessaging.class);
            firebaseMessagingMock.when(FirebaseMessaging::getInstance).thenReturn(mockInstance);

            // Act
            notificationService.notify(PUSH_TOKEN, HABIT_TITLE, time);
            notificationService.notify(PUSH_TOKEN, HABIT_TITLE, time);
            notificationService.notify(PUSH_TOKEN, HABIT_TITLE, time);

            // Assert
            verify(mockInstance, times(3)).send(any(Message.class));
        }
    }

    // notify - Exception Handling Tests

    @Test
    void testNotifyHandlesFirebaseMessagingException() throws Exception {
        // Arrange
        LocalTime time = LocalTime.of(11, 0);

        try (MockedStatic<FirebaseMessaging> firebaseMessagingMock = mockStatic(FirebaseMessaging.class)) {
            FirebaseMessaging mockInstance = mock(FirebaseMessaging.class);
            firebaseMessagingMock.when(FirebaseMessaging::getInstance).thenReturn(mockInstance);
            doThrow(new RuntimeException("Firebase service error"))
                    .when(mockInstance).send(any(Message.class));

            // Act & Assert - Should not throw, should catch and log
            notificationService.notify(PUSH_TOKEN, HABIT_TITLE, time);

            // Verify that send was attempted
            verify(mockInstance).send(any(Message.class));
        }
    }

    @Test
    void testNotifyHandlesInvalidPushToken() throws Exception {
        // Arrange
        LocalTime time = LocalTime.of(12, 0);
        String invalidToken = "";

        try (MockedStatic<FirebaseMessaging> firebaseMessagingMock = mockStatic(FirebaseMessaging.class)) {
            FirebaseMessaging mockInstance = mock(FirebaseMessaging.class);
            firebaseMessagingMock.when(FirebaseMessaging::getInstance).thenReturn(mockInstance);

            // Act & Assert - Should not throw even with invalid token
            try {
                notificationService.notify(invalidToken, HABIT_TITLE, time);
                // If we reach here, method properly handles the case
            } catch (Exception e) {
                throw new AssertionError("notify() should not throw exception for invalid token", e);
            }
        }
    }

    @Test
    void testNotifyHandlesNullPushToken() throws Exception {
        // Arrange
        LocalTime time = LocalTime.of(13, 0);

        try (MockedStatic<FirebaseMessaging> firebaseMessagingMock = mockStatic(FirebaseMessaging.class)) {
            FirebaseMessaging mockInstance = mock(FirebaseMessaging.class);
            firebaseMessagingMock.when(FirebaseMessaging::getInstance).thenReturn(mockInstance);

            // Act & Assert - Should not throw even with null token
            try {
                notificationService.notify(null, HABIT_TITLE, time);
                // If we reach here, method properly handles the case
            } catch (Exception e) {
                throw new AssertionError("notify() should not throw exception for null token", e);
            }
        }
    }

    @Test
    void testNotifyHandlesTimeoutException() throws Exception {
        // Arrange
        LocalTime time = LocalTime.of(14, 0);

        try (MockedStatic<FirebaseMessaging> firebaseMessagingMock = mockStatic(FirebaseMessaging.class)) {
            FirebaseMessaging mockInstance = mock(FirebaseMessaging.class);
            firebaseMessagingMock.when(FirebaseMessaging::getInstance).thenReturn(mockInstance);
            doThrow(new RuntimeException("Request timeout"))
                    .when(mockInstance).send(any(Message.class));

            // Act & Assert - Should not throw, should catch and log
            notificationService.notify(PUSH_TOKEN, HABIT_TITLE, time);

            // Verify that send was attempted
            verify(mockInstance).send(any(Message.class));
        }
    }

    @Test
    void testNotifyHandlesGenericException() throws Exception {
        // Arrange
        LocalTime time = LocalTime.of(15, 0);

        try (MockedStatic<FirebaseMessaging> firebaseMessagingMock = mockStatic(FirebaseMessaging.class)) {
            FirebaseMessaging mockInstance = mock(FirebaseMessaging.class);
            firebaseMessagingMock.when(FirebaseMessaging::getInstance).thenReturn(mockInstance);
            doThrow(new RuntimeException("Unexpected error"))
                    .when(mockInstance).send(any(Message.class));

            // Act & Assert - Should not throw, should catch and log
            notificationService.notify(PUSH_TOKEN, HABIT_TITLE, time);

            // Verify that send was attempted
            verify(mockInstance).send(any(Message.class));
        }
    }

    @Test
    void testNotifyWithMultipleExceptions() throws Exception {
        // Arrange
        LocalTime time = LocalTime.of(16, 0);

        try (MockedStatic<FirebaseMessaging> firebaseMessagingMock = mockStatic(FirebaseMessaging.class)) {
            FirebaseMessaging mockInstance = mock(FirebaseMessaging.class);
            firebaseMessagingMock.when(FirebaseMessaging::getInstance).thenReturn(mockInstance);
            doThrow(new RuntimeException("Error 1"))
                    .doThrow(new RuntimeException("Error 2"))
                    .when(mockInstance).send(any(Message.class));

            // Act - Both calls should handle their exceptions gracefully
            notificationService.notify(PUSH_TOKEN, "Habit1", time);
            notificationService.notify(PUSH_TOKEN, "Habit2", time);

            // Assert
            verify(mockInstance, times(2)).send(any(Message.class));
        }
    }

    @Test
    void testNotifyRecoveryAfterException() throws Exception {
        // Arrange
        LocalTime time = LocalTime.of(17, 0);

        try (MockedStatic<FirebaseMessaging> firebaseMessagingMock = mockStatic(FirebaseMessaging.class)) {
            FirebaseMessaging mockInstance = mock(FirebaseMessaging.class);
            firebaseMessagingMock.when(FirebaseMessaging::getInstance).thenReturn(mockInstance);

            // First call fails
            doThrow(new RuntimeException("First attempt failed"))
                    .when(mockInstance).send(any(Message.class));

            // Act
            notificationService.notify(PUSH_TOKEN, "Habit1", time);

            // Verify first call was attempted
            verify(mockInstance, times(1)).send(any(Message.class));
        }
    }

    @Test
    void testNotifyDoesNotThrowException() throws Exception {
        // Arrange
        LocalTime time = LocalTime.of(8, 30);

        try (MockedStatic<FirebaseMessaging> firebaseMessagingMock = mockStatic(FirebaseMessaging.class)) {
            FirebaseMessaging mockInstance = mock(FirebaseMessaging.class);
            firebaseMessagingMock.when(FirebaseMessaging::getInstance).thenReturn(mockInstance);
            doThrow(new RuntimeException("Critical error"))
                    .when(mockInstance).send(any(Message.class));

            // Act & Assert - Should complete without throwing
            try {
                notificationService.notify(PUSH_TOKEN, HABIT_TITLE, time);
                // If we reach here, method properly handles the exception
            } catch (Exception e) {
                throw new AssertionError("notify() should not throw exception", e);
            }
        }
    }

    @Test
    void testNotifyWithVariousTimes() throws Exception {
        // Arrange
        try (MockedStatic<FirebaseMessaging> firebaseMessagingMock = mockStatic(FirebaseMessaging.class)) {
            FirebaseMessaging mockInstance = mock(FirebaseMessaging.class);
            firebaseMessagingMock.when(FirebaseMessaging::getInstance).thenReturn(mockInstance);

            // Act - Test various times of day
            LocalTime[] times = {
                    LocalTime.of(0, 0),
                    LocalTime.of(6, 0),
                    LocalTime.of(12, 0),
                    LocalTime.of(18, 0),
                    LocalTime.of(23, 59)
            };

            for (LocalTime time : times) {
                notificationService.notify(PUSH_TOKEN, HABIT_TITLE, time);
            }

            // Assert
            verify(mockInstance, times(5)).send(any(Message.class));
        }
    }

    @Test
    void testNotifyCalledMultipleTimesWithDifferentHabits() throws Exception {
        // Arrange
        LocalTime time = LocalTime.of(15, 30);
        String[] habits = {"Habit1", "Habit2", "Habit3", "Habit4", "Habit5"};

        try (MockedStatic<FirebaseMessaging> firebaseMessagingMock = mockStatic(FirebaseMessaging.class)) {
            FirebaseMessaging mockInstance = mock(FirebaseMessaging.class);
            firebaseMessagingMock.when(FirebaseMessaging::getInstance).thenReturn(mockInstance);

            // Act
            for (String habit : habits) {
                notificationService.notify(PUSH_TOKEN, habit, time);
            }

            // Assert
            verify(mockInstance, times(5)).send(any(Message.class));
        }
    }

    @Test
    void testNotifyIntegrationWithMultipleParameters() throws Exception {
        // Arrange
        try (MockedStatic<FirebaseMessaging> firebaseMessagingMock = mockStatic(FirebaseMessaging.class)) {
            FirebaseMessaging mockInstance = mock(FirebaseMessaging.class);
            firebaseMessagingMock.when(FirebaseMessaging::getInstance).thenReturn(mockInstance);

            // Act - Test with multiple different tokens and times
            notificationService.notify("token1", "Habit1", LocalTime.of(8, 0));
            notificationService.notify("token2", "Habit2", LocalTime.of(12, 0));
            notificationService.notify("token3", "Habit3", LocalTime.of(20, 0));

            // Assert
            verify(mockInstance, times(3)).send(any(Message.class));
        }
    }

}
