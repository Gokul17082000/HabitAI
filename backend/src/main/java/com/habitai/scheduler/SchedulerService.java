package com.habitai.scheduler;

import com.habitai.habit.Habit;
import com.habitai.habit.HabitRepository;
import com.habitai.habit.HabitScheduleService;
import com.habitai.notification.NotificationService;
import com.habitai.user.UserRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class SchedulerService {

    private final HabitRepository habitRepository;
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final HabitScheduleService habitScheduleService;

    public SchedulerService(HabitRepository habitRepository, UserRepository userRepository, NotificationService notificationService, HabitScheduleService habitScheduleService) {
        this.habitRepository = habitRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.habitScheduleService = habitScheduleService;
    }

    protected LocalTime getCurrentTime() {
        return LocalTime.now(ZoneId.of("Asia/Kolkata"));
    }

    @Scheduled(cron = "0 0/15 * * * *")
    public void sendHabitReminder() {
        LocalTime start = getCurrentTime();
        LocalTime end = start.plusMinutes(15);
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Kolkata"));

        boolean wrapsAroundMidnight = end.isBefore(start);

        List<Habit> habits;
        if (!wrapsAroundMidnight) {
            habits = habitRepository.findByTargetTimeBetween(start, end);
        } else {
            habits = new ArrayList<>(habitRepository.findByTargetTimeAfter(start));
            habits.addAll(habitRepository.findByTargetTimeBefore(end));
        }

        habits.stream()
                .filter(h -> !h.isPaused())
                .filter(h -> habitScheduleService.isScheduledForDate(h, today))
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

    @Scheduled(cron = "0 0 0 * * *", zone = "Asia/Kolkata")
    public void autoResumeHabits() {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Kolkata"));
        List<Habit> toResume = habitRepository.findByPausedTrueAndPausedUntilLessThanEqual(today);
        toResume.forEach(habit -> {
            habit.setPaused(false);
            habit.setPausedUntil(null);
        });
        habitRepository.saveAll(toResume);
    }
}