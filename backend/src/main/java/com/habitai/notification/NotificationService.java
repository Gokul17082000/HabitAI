package com.habitai.notification;

import org.springframework.stereotype.Service;

import java.time.LocalTime;

@Service
public class NotificationService {

    public void notify(Long userId, String habitTitle, LocalTime time){
        System.out.println("Reminder for user " + userId + ": '" + habitTitle + "' at " + time);
    }
}
