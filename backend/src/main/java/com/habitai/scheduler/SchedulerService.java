package com.habitai.scheduler;

import com.habitai.habit.Habit;
import com.habitai.habit.HabitRepository;
import com.habitai.notification.NotificationService;
import com.habitai.user.UserRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class SchedulerService {

    private final HabitRepository habitRepository;
    private final NotificationService notificationService;
    private final UserRepository userRepository;

    public SchedulerService(HabitRepository habitRepository, UserRepository userRepository, NotificationService notificationService) {
        this.habitRepository = habitRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    @Scheduled(cron = "0 0/15 * * * *")
    public void sendHabitReminder() {
        LocalTime start = LocalTime.now();
        LocalTime end = start.plusMinutes(15);

        boolean wrapsAroundMidnight = end.isBefore(start);

        List<Habit> habits;
        if (!wrapsAroundMidnight) {
            habits = habitRepository.findByTargetTimeBetween(start, end);
        } else {
            habits = new ArrayList<>(habitRepository.findByTargetTimeAfter(start));
            habits.addAll(habitRepository.findByTargetTimeBefore(end));
        }

        habits.stream()
                .collect(Collectors.groupingBy(Habit::getUserId))
                .forEach((userId, userHabits) -> {
                    userRepository.findById(userId).ifPresent(user -> {
                        String token = user.getPushToken();
                        if (token != null && !token.isBlank()) {
                            userHabits.forEach(h ->
                                    notificationService.notify(token, h.getTitle(), h.getTargetTime())
                            );
                        }
                    });
                });
    }
}