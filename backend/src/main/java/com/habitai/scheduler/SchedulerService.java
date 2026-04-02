package com.habitai.scheduler;

import com.habitai.habit.Habit;
import com.habitai.habit.HabitRepository;
import com.habitai.notification.NotificationService;
import com.habitai.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class SchedulerService {

    private static final Logger logger = LoggerFactory.getLogger(SchedulerService.class);

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

        logger.info("Scheduler running at: {}", start);  // ← add this
        logger.info("Looking for habits between: {} and {}", start, end);  // ← add this

        boolean wrapsAroundMidnight = end.isBefore(start);

        List<Habit> habits;
        if (!wrapsAroundMidnight) {
            habits = habitRepository.findByTargetTimeBetween(start, end);
        } else {
            habits = new ArrayList<>(habitRepository.findByTargetTimeAfter(start));
            habits.addAll(habitRepository.findByTargetTimeBefore(end));
        }

        logger.info("Found {} habits to notify", habits.size());  // ← add this

        habits.stream()
                .collect(Collectors.groupingBy(Habit::getUserId))
                .forEach((userId, userHabits) -> {
                    userRepository.findById(userId).ifPresent(user -> {
                        String token = user.getPushToken();
                        logger.info("User {} push token present: {}", userId, token != null && !token.isBlank());  // ← add this
                        if (token != null && !token.isBlank()) {
                            userHabits.forEach(h ->
                                    notificationService.notify(token, h.getTitle(), h.getTargetTime())
                            );
                        }
                    });
                });
    }
}