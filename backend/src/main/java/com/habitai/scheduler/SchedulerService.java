package com.habitai.scheduler;

import com.habitai.common.AppConstants;
import com.habitai.habit.Habit;
import com.habitai.habit.HabitRepository;
import com.habitai.habit.HabitScheduleService;
import com.habitai.notification.NotificationService;
import com.habitai.user.User;
import com.habitai.user.UserRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class SchedulerService {

    private final HabitRepository habitRepository;
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final HabitScheduleService habitScheduleService;

    public SchedulerService(HabitRepository habitRepository,
                            UserRepository userRepository,
                            NotificationService notificationService,
                            HabitScheduleService habitScheduleService) {
        this.habitRepository = habitRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.habitScheduleService = habitScheduleService;
    }

    protected LocalTime getCurrentTime() {
        return LocalTime.now(AppConstants.APP_ZONE);
    }

    @Scheduled(cron = "0 0/15 * * * *")
    public void sendHabitReminder() {
        LocalTime start = getCurrentTime();
        LocalTime end = start.plusMinutes(15);
        LocalDate today = LocalDate.now(AppConstants.APP_ZONE);

        boolean wrapsAroundMidnight = end.isBefore(start);

        List<Habit> habits;
        if (!wrapsAroundMidnight) {
            habits = habitRepository.findByTargetTimeBetween(start, end);
        } else {
            habits = new ArrayList<>(habitRepository.findByTargetTimeAfter(start));
            habits.addAll(habitRepository.findByTargetTimeBefore(end));
        }

        // Group relevant habits by userId
        Map<Long, List<Habit>> habitsByUser = habits.stream()
                .filter(h -> !h.isPaused())
                .filter(h -> habitScheduleService.isScheduledForDate(h, today))
                .collect(Collectors.groupingBy(Habit::getUserId));

        if (habitsByUser.isEmpty()) return;

        // Fix 7: Batch-load all affected users in ONE query instead of N queries
        Set<Long> userIds = habitsByUser.keySet();
        Map<Long, User> userMap = userRepository.findByIdIn(userIds)
                .stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));

        habitsByUser.forEach((userId, userHabits) -> {
            User user = userMap.get(userId);
            if (user == null) return;
            String token = user.getPushToken();
            if (token == null || token.isBlank()) return;
            userHabits.forEach(h -> notificationService.notify(token, h.getTitle(), h.getTargetTime()));
        });
    }

    @Scheduled(cron = "0 0 0 * * *", zone = "Asia/Kolkata")
    public void autoResumeHabits() {
        LocalDate today = LocalDate.now(AppConstants.APP_ZONE);
        List<Habit> toResume = habitRepository.findByPausedTrueAndPausedUntilLessThanEqual(today);
        toResume.forEach(habit -> {
            habit.setPaused(false);
            habit.setPausedUntil(null);
        });
        habitRepository.saveAll(toResume);
    }
}
