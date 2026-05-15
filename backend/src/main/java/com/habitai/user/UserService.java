package com.habitai.user;

import com.habitai.common.security.CurrentUser;
import com.habitai.exception.PasswordDoesNotMatchException;
import com.habitai.exception.UserNotFoundException;
import com.habitai.notification.NotificationService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final CurrentUser currentUser;
    private final NotificationService notificationService;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository,
                       CurrentUser currentUser,
                       NotificationService notificationService,
                       PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.currentUser = currentUser;
        this.notificationService = notificationService;
        this.passwordEncoder = passwordEncoder;
    }

    public UserDTO getUserDetails() {
        long id = currentUser.getId();
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException("User not found"));
        return new UserDTO(user.getEmail());
    }

    @Transactional
    public void savePushToken(String pushToken) {
        long id = currentUser.getId();
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException("User not found"));
        user.setPushToken(pushToken);
        userRepository.save(user);
    }

    @Transactional
    public void changePassword(ChangePasswordRequest request) {
        long id = currentUser.getId();
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            throw new PasswordDoesNotMatchException("Current password is incorrect");
        }

        user.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
    }
}
