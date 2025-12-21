package com.habitai.scheduler;

import com.habitai.habit.Habit;
import com.habitai.habit.HabitRepository;
import com.habitai.notification.NotificationService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.util.List;

@Service
public class SchedulerService {

    private final HabitRepository habitRepository;
    private final NotificationService notificationService;

    public SchedulerService(HabitRepository habitRepository, NotificationService notificationService) {
        this.habitRepository = habitRepository;
        this.notificationService = notificationService;
    }

    @Scheduled(cron = "0 45 * * * *")
    public void sendHabitReminder() {
        LocalTime start = LocalTime.now();
        LocalTime end = start.plusMinutes(30);
        List<Habit> habits;
        if(start.isBefore(end)){
            habits = habitRepository.findByTargetTimeBetween(start, end);
        } else {
            habits = habitRepository.findByTargetTimeAfter(start);
            habits.addAll(habitRepository.findByTargetTimeBefore(end));
        }
        for (Habit habit : habits) {
            notificationService.notify(habit.getUserId(), habit.getTitle(), habit.getTargetTime());
        }
    }
}
