package com.habitai.scheduler;

import com.habitai.auth.RefreshTokenRepository;
import com.habitai.common.AppConstants;
import com.habitai.habit.Habit;
import com.habitai.habit.HabitPauseHistory;
import com.habitai.habit.HabitPauseHistoryRepository;
import com.habitai.habit.HabitRepository;
import com.habitai.habit.HabitScheduleService;
import com.habitai.habitlog.HabitLog;
import com.habitai.habitlog.HabitLogRepository;
import com.habitai.habitlog.HabitStatus;
import com.habitai.notification.NotificationService;
import com.habitai.user.StreakFreezeService;
import com.habitai.user.StreakFreezeUsageRepository;
import com.habitai.user.User;
import com.habitai.user.UserRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
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
    private final RefreshTokenRepository refreshTokenRepository;
    private final HabitPauseHistoryRepository habitPauseHistoryRepository;

    public SchedulerService(HabitRepository habitRepository,
                            HabitLogRepository habitLogRepository,
                            UserRepository userRepository,
                            NotificationService notificationService,
                            HabitScheduleService habitScheduleService,
                            StreakFreezeService streakFreezeService,
                            RefreshTokenRepository refreshTokenRepository,
                            HabitPauseHistoryRepository habitPauseHistoryRepository) {
        this.habitRepository = habitRepository;
        this.habitLogRepository = habitLogRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.habitScheduleService = habitScheduleService;
        this.streakFreezeService = streakFreezeService;
        this.refreshTokenRepository = refreshTokenRepository;
        this.habitPauseHistoryRepository = habitPauseHistoryRepository;
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

        // Batch-load today's logs across all timezone-possible dates (UTC ±1 covers every zone).
        // Grouped by userId → date → set of habitIds so the per-user loop can look up its
        // local "today" without hitting the DB again.
        LocalDate utcToday = LocalDate.now(ZoneId.of("UTC"));
        Map<Long, Map<LocalDate, Set<Long>>> logsByUserAndDate = habitLogRepository
                .findByUserIdInAndDateBetween(new java.util.HashSet<>(userIds),
                        utcToday.minusDays(1), utcToday.plusDays(1))
                .stream()
                .collect(Collectors.groupingBy(
                        HabitLog::getUserId,
                        Collectors.groupingBy(
                                HabitLog::getDate,
                                Collectors.mapping(HabitLog::getHabitId, Collectors.toSet())
                        )
                ));

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

            Set<Long> loggedTodayIds = logsByUserAndDate
                    .getOrDefault(user.getId(), Map.of())
                    .getOrDefault(today, Set.of());

            habits.stream()
                    .filter(h -> !h.isPaused())
                    .filter(h -> !h.isArchived())
                    .filter(Habit::isNotificationsEnabled)
                    .filter(h -> h.getTargetTime() != null)
                    .filter(h -> habitScheduleService.isScheduledForDate(h, today))
                    .filter(h -> isInWindow(h.getTargetTime(), now, windowEnd, wrapsAroundMidnight))
                    .filter(h -> !loggedTodayIds.contains(h.getId()))
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

    // Runs nightly at 00:30 IST — purges expired refresh tokens to prevent unbounded table growth
    @Transactional
    @Scheduled(cron = "0 30 0 * * *", zone = "Asia/Kolkata")
    public void purgeExpiredRefreshTokens() {
        refreshTokenRepository.deleteExpiredTokens(Instant.now());
    }

    /**
     * Runs at midnight IST daily. Auto-resumes habits whose pause window has expired.
     * NOTE: intentionally IST-anchored — pause durations are in whole days and the
     * resume fires once per day. Document this if the app ever becomes multi-region.
     */
    @Transactional
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

    @Transactional
    @Scheduled(cron = "0 0 0 * * *", zone = "Asia/Kolkata")
    public void awardStreakFreezes() {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Kolkata"));
        // Window: the 7 fully-elapsed days ending yesterday. Today is excluded because
        // this runs at midnight — no completions exist for the day that just started.
        LocalDate yesterday = today.minusDays(1);
        LocalDate sevenDaysAgo = today.minusDays(7);

        // Single query: load all (userId, date) pairs for completed logs in the window,
        // then group in-memory.
        Map<Long, Set<LocalDate>> datesByUser = habitLogRepository
                .findCompletedUserDatesInRange(sevenDaysAgo, yesterday)
                .stream()
                .collect(Collectors.groupingBy(
                        row -> ((Number) row[0]).longValue(),
                        Collectors.mapping(row -> (LocalDate) row[1], Collectors.toSet())
                ));

        if (datesByUser.isEmpty()) return;

        // Build the 7-day window as a list for schedule checking below.
        List<LocalDate> window = new java.util.ArrayList<>();
        for (LocalDate d = sevenDaysAgo; !d.isAfter(yesterday); d = d.plusDays(1)) {
            window.add(d);
        }

        // Pre-load habits for all candidate users in one query.
        List<Habit> allHabits = habitRepository.findByUserIdIn(new java.util.ArrayList<>(datesByUser.keySet()));
        Map<Long, List<Habit>> habitsByUser = allHabits.stream()
                .collect(Collectors.groupingBy(Habit::getUserId));

        // Bulk-load pause histories for all relevant habits so we can evaluate
        // historical pause state per date rather than using the live isPaused() flag.
        Set<Long> allHabitIds = allHabits.stream().map(Habit::getId).collect(Collectors.toSet());
        Map<Long, List<HabitPauseHistory>> pausesByHabitId = habitPauseHistoryRepository
                .findByHabitIdIn(allHabitIds)
                .stream()
                .collect(Collectors.groupingBy(HabitPauseHistory::getHabitId));

        for (Map.Entry<Long, Set<LocalDate>> entry : datesByUser.entrySet()) {
            long userId = entry.getKey();
            Set<LocalDate> completedDays = entry.getValue();
            List<Habit> userHabits = habitsByUser.getOrDefault(userId, List.of());

            // A day counts as satisfied if the user had a completed log on it,
            // OR if they had no active (non-paused) habits scheduled on that day.
            boolean earnedFreeze = window.stream().allMatch(date ->
                completedDays.contains(date) ||
                userHabits.stream().noneMatch(h ->
                    !date.isBefore(h.getCreatedAt()) &&
                    !h.isArchived() &&
                    habitScheduleService.isScheduledForDate(h, date) &&
                    !isPausedOnDate(pausesByHabitId.getOrDefault(h.getId(), List.of()), date)
                )
            );

            if (earnedFreeze) {
                streakFreezeService.awardFreezeIfEarned(userId, today);
            }
        }
    }

    private boolean isPausedOnDate(List<HabitPauseHistory> pauses, LocalDate date) {
        return pauses.stream()
                .anyMatch(p -> !date.isBefore(p.getPausedFrom()) && !date.isAfter(p.getPausedUntil()));
    }
}