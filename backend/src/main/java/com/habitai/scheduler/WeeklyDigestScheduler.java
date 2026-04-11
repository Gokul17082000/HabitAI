package com.habitai.scheduler;

import com.habitai.ai.AiService;
import com.habitai.common.AppConstants;
import com.habitai.habit.Habit;
import com.habitai.habit.HabitRepository;
import com.habitai.habitlog.HabitLogRepository;
import com.habitai.notification.NotificationService;
import com.habitai.user.User;
import com.habitai.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class WeeklyDigestScheduler {

    private static final Logger logger = LoggerFactory.getLogger(WeeklyDigestScheduler.class);

    private final UserRepository userRepository;
    private final HabitRepository habitRepository;
    private final HabitLogRepository habitLogRepository;
    private final NotificationService notificationService;
    private final AiService aiService;

    public WeeklyDigestScheduler(UserRepository userRepository,
                                 HabitRepository habitRepository,
                                 HabitLogRepository habitLogRepository,
                                 NotificationService notificationService,
                                 AiService aiService) {
        this.userRepository = userRepository;
        this.habitRepository = habitRepository;
        this.habitLogRepository = habitLogRepository;
        this.notificationService = notificationService;
        this.aiService = aiService;
    }

    // Every Sunday at 8:00 AM IST
    @Scheduled(cron = "0 0 8 * * SUN", zone = "Asia/Kolkata")
    public void sendWeeklyDigest() {
        LocalDate today = LocalDate.now(AppConstants.APP_ZONE);
        LocalDate weekStart = today.minusDays(6); // Mon–Sun

        // Only load users who have a push token — avoids a full table scan
        List<User> users = userRepository.findByPushTokenNotNull();
        if (users.isEmpty()) return;

        // SUGGESTION FIX: batch-load ALL habits for these users in one query
        // instead of calling habitRepository.findByUserId() inside the loop (N+1).
        Set<Long> userIds = users.stream()
                .map(User::getId)
                .collect(Collectors.toSet());

        Map<Long, List<Habit>> habitsByUser = habitRepository.findByUserIdIn(userIds)
                .stream()
                .collect(Collectors.groupingBy(Habit::getUserId));

        for (User user : users) {
            try {
                processUserDigest(user, weekStart, today, habitsByUser);
            } catch (Exception e) {
                logger.error("Failed weekly digest for user {}: {}", user.getId(), e.getMessage());
            }
        }
    }

    private void processUserDigest(User user, LocalDate weekStart, LocalDate weekEnd,
                                   Map<Long, List<Habit>> habitsByUser) {
        List<Habit> habits = habitsByUser.getOrDefault(user.getId(), List.of());
        if (habits.isEmpty()) return;

        // Pull week logs
        List<Object[]> weekStats = habitLogRepository
                .findWeeklyStatsByUserId(user.getId(), weekStart, weekEnd);

        // Map habitId -> [completed, missed]
        Map<Long, long[]> statsByHabit = weekStats.stream()
                .collect(Collectors.toMap(
                        row -> ((Number) row[0]).longValue(),
                        row -> new long[]{
                                ((Number) row[1]).longValue(),
                                ((Number) row[2]).longValue()
                        }
                ));

        // Build habit summary lines for the prompt
        long totalCompleted = 0;
        long totalScheduled = 0;
        StringBuilder habitSummary = new StringBuilder();

        for (Habit habit : habits) {
            long[] stats = statsByHabit.getOrDefault(habit.getId(), new long[]{0, 0});
            long completed = stats[0];
            long missed = stats[1];
            long total = completed + missed;
            totalCompleted += completed;
            totalScheduled += total;

            if (total > 0) {
                int pct = (int) Math.round((completed * 100.0) / total);
                habitSummary.append(String.format("- %s: %d/%d (%d%%)%n",
                        habit.getTitle(), completed, total, pct));
            }
        }

        if (totalScheduled == 0) return; // no activity this week, skip

        int overallPct = (int) Math.round((totalCompleted * 100.0) / totalScheduled);

        // Generate digest via Grok
        String digest = aiService.generateWeeklyDigest(
                habitSummary.toString(), totalCompleted, totalScheduled, overallPct);

        notificationService.sendDigest(user.getPushToken(), digest);
    }
}