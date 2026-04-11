package com.habitai.scheduler;

import com.habitai.common.AppConstants;
import com.habitai.habit.Habit;
import com.habitai.habit.HabitRepository;
import com.habitai.habit.HabitScheduleService;
import com.habitai.habitlog.HabitLogRepository;
import com.habitai.habitlog.HabitStatus;
import com.habitai.notification.NotificationService;
import com.habitai.user.StreakFreezeService;
import com.habitai.user.StreakFreezeUsageRepository;
import com.habitai.user.User;
import com.habitai.user.UserRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class SchedulerService {

    private final HabitRepository habitRepository;
    private final HabitLogRepository habitLogRepository;
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final HabitScheduleService habitScheduleService;
    private final StreakFreezeService streakFreezeService;

    public SchedulerService(HabitRepository habitRepository,
                            HabitLogRepository habitLogRepository,
                            UserRepository userRepository,
                            NotificationService notificationService,
                            HabitScheduleService habitScheduleService,
                            StreakFreezeService streakFreezeService) {
        this.habitRepository = habitRepository;
        this.habitLogRepository = habitLogRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.habitScheduleService = habitScheduleService;
        this.streakFreezeService = streakFreezeService;
    }

    /**
     * Runs every 15 minutes (UTC). Sends reminders for habits whose targetTime
     * falls within the current 15-minute window *in each user's own timezone*.
     *
     * FIX: Previously used a single APP_ZONE (IST) clock to query habits by
     * targetTime, so users in other timezones received notifications at the wrong
     * local time (or not at all). Now we:
     *   1. Load all users with a push token (one query).
     *   2. Load all their habits (one query).
     *   3. For each user, compute "now" and "today" in their timezone and
     *      filter habits whose targetTime falls in the upcoming 15-minute window.
     * This is timezone-correct for every user regardless of where the server runs.
     */
    @Scheduled(cron = "0 0/15 * * * *")
    public void sendHabitReminder() {
        List<User> users = userRepository.findByPushTokenNotNull();
        if (users.isEmpty()) return;

        // Batch-load all habits for these users in one query
        List<Long> userIds = users.stream().map(User::getId).toList();
        Map<Long, List<Habit>> habitsByUser = habitRepository.findByUserIdIn(userIds)
                .stream()
                .collect(Collectors.groupingBy(Habit::getUserId));

        for (User user : users) {
            String token = user.getPushToken();
            if (token == null || token.isBlank()) continue;

            List<Habit> habits = habitsByUser.getOrDefault(user.getId(), List.of());
            if (habits.isEmpty()) continue;

            ZoneId zone = parseZone(user.getTimezone());
            LocalTime now = LocalTime.now(zone);
            LocalDate today = LocalDate.now(zone);
            LocalTime windowEnd = now.plusMinutes(15);
            boolean wrapsAroundMidnight = windowEnd.isBefore(now);

            habits.stream()
                    .filter(h -> !h.isPaused())
                    .filter(h -> !h.isArchived())
                    .filter(h -> habitScheduleService.isScheduledForDate(h, today))
                    .filter(h -> isInWindow(h.getTargetTime(), now, windowEnd, wrapsAroundMidnight))
                    .forEach(h -> notificationService.notify(token, h.getTitle(), h.getTargetTime()));
        }
    }

    /**
     * Returns true if targetTime falls within [windowStart, windowEnd).
     * Handles the midnight wrap-around case (e.g. window is 23:50–00:05).
     */
    private boolean isInWindow(LocalTime targetTime, LocalTime start, LocalTime end, boolean wraps) {
        if (!wraps) {
            return !targetTime.isBefore(start) && targetTime.isBefore(end);
        } else {
            return !targetTime.isBefore(start) || targetTime.isBefore(end);
        }
    }

    private ZoneId parseZone(String timezone) {
        try {
            return ZoneId.of(timezone);
        } catch (Exception e) {
            return ZoneId.of("UTC");
        }
    }

    /**
     * Runs at midnight IST daily. Auto-resumes habits whose pause window has expired.
     * NOTE: intentionally IST-anchored — pause durations are in whole days and the
     * resume fires once per day. Document this if the app ever becomes multi-region.
     */
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

    @Scheduled(cron = "0 0 0 * * *", zone = "Asia/Kolkata")
    public void awardStreakFreezes() {
        LocalDate today = LocalDate.now(AppConstants.APP_ZONE);
        LocalDate sevenDaysAgo = today.minusDays(6);

        // Find users who completed at least one habit every day for 7 days
        List<User> users = userRepository.findAll();
        for (User user : users) {
            Set<LocalDate> completedDates = habitLogRepository
                    .findDatesByUserIdAndStatus(user.getId(), HabitStatus.COMPLETED);

            boolean sevenDayStreak = true;
            for (LocalDate d = sevenDaysAgo; !d.isAfter(today); d = d.plusDays(1)) {
                if (!completedDates.contains(d)) {
                    sevenDayStreak = false;
                    break;
                }
            }

            if (sevenDayStreak) {
                streakFreezeService.awardFreezeIfEarned(user.getId());
            }
        }
    }
}