package com.habitai.user;

import com.habitai.common.security.CurrentUser;
import com.habitai.exception.UserNotFoundException;
import com.habitai.notification.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private CurrentUser currentUser;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private UserService userService;

    private final long userId = 42L;
    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(userId);
        user.setEmail("test@example.com");
        user.setPassword("securepass");
        user.setCreatedAt(LocalDateTime.now());
    }

    @Test
    void getUserDetails_whenUserExists_returnsUserDTO() {
        when(currentUser.getId()).thenReturn(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        UserDTO result = userService.getUserDetails();

        assertNotNull(result);
        assertEquals("test@example.com", result.email());
        verify(currentUser, times(1)).getId();
        verify(userRepository, times(1)).findById(userId);
    }

    @Test
    void getUserDetails_whenUserDoesNotExist_throwsUserNotFoundException() {
        when(currentUser.getId()).thenReturn(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThrows(UserNotFoundException.class, () -> userService.getUserDetails());

        verify(currentUser, times(1)).getId();
        verify(userRepository, times(1)).findById(userId);
    }

    @Test
    void savePushToken_whenUserExists_updatesPushTokenAndSavesUser() {
        when(currentUser.getId()).thenReturn(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenReturn(user);

        String token = "newPushToken";
        userService.savePushToken(token);

        assertEquals(token, user.getPushToken());
        verify(currentUser, times(1)).getId();
        verify(userRepository, times(1)).findById(userId);
        verify(userRepository, times(1)).save(user);
    }

    @Test
    void savePushToken_whenUserDoesNotExist_throwsUserNotFoundException() {
        when(currentUser.getId()).thenReturn(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThrows(UserNotFoundException.class, () -> userService.savePushToken("token123"));

        verify(currentUser, times(1)).getId();
        verify(userRepository, times(1)).findById(userId);
        verify(userRepository, never()).save(any(User.class));
    }
}
