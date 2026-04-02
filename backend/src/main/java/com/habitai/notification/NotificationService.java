package com.habitai.notification;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

@Service
public class NotificationService {

    private static final Logger logger = LoggerFactory.getLogger(NotificationService.class);

    public void notify(String pushToken, String habitTitle, LocalTime time) {
        try {
            String formattedTime = time.format(DateTimeFormatter.ofPattern("hh:mm a"));
            Message message = Message.builder()
                    .setToken(pushToken)
                    .setNotification(Notification.builder()
                            .setTitle("HabitAI Reminder 🔔")
                            .setBody("Time for: " + habitTitle + " at " + formattedTime)
                            .build())
                    .build();
            FirebaseMessaging.getInstance().send(message);
        } catch (Exception e) {
            logger.error("Failed to send notification for '{}': {}", habitTitle, e.getMessage());
        }
    }
}