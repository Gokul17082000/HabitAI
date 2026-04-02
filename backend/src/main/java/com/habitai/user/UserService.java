package com.habitai.user;

import com.habitai.common.security.CurrentUser;
import com.habitai.exception.UserNotFoundException;
import com.habitai.notification.NotificationService;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final CurrentUser currentUser;
    private final NotificationService notificationService;

    public UserService(UserRepository userRepository, CurrentUser currentUser, NotificationService notificationService) {
        this.userRepository = userRepository;
        this.currentUser = currentUser;
        this.notificationService = notificationService;
    }

    public UserDTO getUserDetails() {
        long id = currentUser.getId();
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException("User not found"));
        return new UserDTO(user.getEmail());
    }

    public void savePushToken(String pushToken) {
        long id = currentUser.getId();
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException("User not found"));
        user.setPushToken(pushToken);
        userRepository.save(user);
    }
}
