package com.habitai.notification;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import com.habitai.user.User;
import com.habitai.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Optional;

@Service
public class NotificationService {

    private static final Logger logger = LoggerFactory.getLogger(NotificationService.class);
    private final UserRepository userRepository;

    public NotificationService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public void notify(Long userId, String habitTitle, LocalTime time) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) return;

        String pushToken = userOpt.get().getPushToken();
        if (pushToken == null || pushToken.isBlank()) {
            logger.info("No push token for user {}", userId);
            return;
        }

        try {
            String formattedTime = time.format(DateTimeFormatter.ofPattern("hh:mm a"));

            Message message = Message.builder()
                    .setToken(pushToken)
                    .setNotification(Notification.builder()
                            .setTitle("HabitAI Reminder 🔔")
                            .setBody("Time for: " + habitTitle + " at " + formattedTime)
                            .build())
                    .build();

            String response = FirebaseMessaging.getInstance().send(message);
            logger.info("Notification sent for habit '{}': {}", habitTitle, response);
        } catch (Exception e) {
            logger.error("Failed to send notification for habit '{}': {}", habitTitle, e.getMessage());
        }
    }
}