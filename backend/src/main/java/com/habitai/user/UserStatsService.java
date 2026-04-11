package com.habitai.user;

import com.habitai.ai.AiService;
import com.habitai.common.AppConstants;
import com.habitai.common.security.CurrentUser;
import com.habitai.exception.UserNotFoundException;
import com.habitai.habit.HabitScheduleService;
import com.habitai.habit.Habit;
import com.habitai.habit.HabitRepository;
import com.habitai.habitlog.HabitLog;
import com.habitai.habitlog.HabitLogRepository;
import com.habitai.habitlog.HabitStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class UserStatsService {

    private final HabitRepository habitRepository;
    private final HabitLogRepository habitLogRepository;
    private final CurrentUser currentUser;
    private final UserRepository userRepository;
    private final HabitScheduleService habitScheduleService;
    private final AiService aiService;
    private final StreakFreezeUsageRepository streakFreezeUsageRepository;

    public UserStatsService(HabitRepository habitRepository,
                            HabitLogRepository habitLogRepository,
                            CurrentUser currentUser,
                            UserRepository userRepository,
                            HabitScheduleService habitScheduleService,
                            AiService aiService,
                            StreakFreezeUsageRepository streakFreezeUsageRepository) {
        this.habitRepository = habitRepository;
        this.habitLogRepository = habitLogRepository;
        this.currentUser = currentUser;
        this.userRepository = userRepository;
        this.habitScheduleService = habitScheduleService;
        this.aiService = aiService;
        this.streakFreezeUsageRepository = streakFreezeUsageRepository;
    }

    @Transactional(readOnly = true)
    public UserStatsResponse getStats() {
        long userId = currentUser.getId();
        ZoneId zone = currentUser.getZone();

        List<Habit> allHabits = habitRepository.findByUserId(userId)
                .stream()
                .filter(h -> !h.isArchived())
                .toList();
        int totalHabits = allHabits.size();

        int totalCompleted = (int) habitLogRepository.countByUserIdAndStatus(userId, HabitStatus.COMPLETED);
        int totalMissed    = (int) habitLogRepository.countByUserIdAndStatus(userId, HabitStatus.MISSED);
        int totalDaysTracked = (int) habitLogRepository.countDistinctDatesByUserId(userId);
        int totalPartial    = (int) habitLogRepository.countByUserIdAndStatus(userId, HabitStatus.PARTIALLY_COMPLETED);

        int totalLogs = totalCompleted + totalMissed + totalPartial;
        int overallConsistency = totalLogs > 0
                ? (int) Math.round((totalCompleted * 100.0) / totalLogs)
                : 0;

        int currentStreak = calculateCurrentStreak(userId, zone);
        int longestStreak = calculateLongestStreak(userId);

        List<UserStatsResponse.TopHabit> topHabits = getTopHabits(allHabits, userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found"));
        LocalDate memberSince = user.getCreatedAt().atZone(zone).toLocalDate();

        return new UserStatsResponse(
                totalHabits,
                totalCompleted,
                totalMissed,
                totalDaysTracked,
                overallConsistency,
                currentStreak,
                longestStreak,
                topHabits,
                memberSince
        );
    }

    private int calculateCurrentStreak(long userId, ZoneId zone) {
        List<LocalDate> allLogDates = habitLogRepository.findDistinctLogDatesDescByUserId(userId);
        if (allLogDates.isEmpty()) return 0;

        LocalDate today = LocalDate.now(zone);

        // FIX: load both sets in bulk — 2 queries total instead of 2 queries per date (N+1)
        Set<LocalDate> completedDates = habitLogRepository.findDatesByUserIdAndStatus(userId, HabitStatus.COMPLETED);
        Set<LocalDate> missedDates    = habitLogRepository.findDatesByUserIdAndStatus(userId, HabitStatus.MISSED);

        Set<LocalDate> frozenDates = streakFreezeUsageRepository.findUsedOnByUserId(userId);

        LocalDate cursor = today;
        int streak = 0;

        for (LocalDate date : allLogDates) {
            if (!date.equals(cursor) && !date.equals(cursor.minusDays(1))) break;

            boolean hasCompleted = completedDates.contains(date);
            boolean hasMissed    = missedDates.contains(date);

            if (hasCompleted && !hasMissed) {
                streak++;
                cursor = date.minusDays(1);
            } else if (date.equals(today)) {
                // Today is still in progress — don't break, just skip it
                cursor = date.minusDays(1);
            } else if (frozenDates.contains(date)) {
                // frozen date — skip without breaking streak
                cursor = date.minusDays(1);
            } else {
                break;
            }
        }
        return streak;
    }

    private int calculateLongestStreak(long userId) {
        List<LocalDate> allLogDates = habitLogRepository.findDistinctLogDatesByUserId(userId);
        if (allLogDates.isEmpty()) return 0;

        // FIX: load both sets in bulk — 2 queries total instead of 2 per date (N+1)
        Set<LocalDate> completedDates = habitLogRepository.findDatesByUserIdAndStatus(userId, HabitStatus.COMPLETED);
        Set<LocalDate> missedDates    = habitLogRepository.findDatesByUserIdAndStatus(userId, HabitStatus.MISSED);

        Set<LocalDate> frozenDates = streakFreezeUsageRepository.findUsedOnByUserId(userId);

        int longest = 0;
        int current = 0;

        for (LocalDate date : allLogDates) {
            boolean hasCompleted = completedDates.contains(date);
            boolean hasMissed    = missedDates.contains(date);

            if (hasCompleted && !hasMissed
                    || frozenDates.contains(date)) {
                current++;
                longest = Math.max(longest, current);
            } else {
                current = 0;
            }
        }
        return longest;
    }

    private List<UserStatsResponse.TopHabit> getTopHabits(List<Habit> habits, long userId) {
        if (habits.isEmpty()) return List.of();

        List<Object[]> rows = habitLogRepository.findHabitCompletionStatsByUserId(userId);

        Map<Long, long[]> statsByHabitId = new HashMap<>();
        for (Object[] row : rows) {
            long habitId   = ((Number) row[0]).longValue();
            long completed = ((Number) row[1]).longValue();
            long total     = ((Number) row[2]).longValue();
            statsByHabitId.put(habitId, new long[]{completed, total});
        }

        return habits.stream()
                .sorted((a, b) -> {
                    long countA = statsByHabitId.getOrDefault(a.getId(), new long[]{0, 0})[0];
                    long countB = statsByHabitId.getOrDefault(b.getId(), new long[]{0, 0})[0];
                    return Long.compare(countB, countA);
                })
                .limit(3)
                .map(h -> {
                    long[] stats = statsByHabitId.getOrDefault(h.getId(), new long[]{0, 0});
                    int completions = (int) stats[0];
                    int total       = (int) stats[1];
                    int consistency = total > 0 ? (int) Math.round((completions * 100.0) / total) : 0;
                    return new UserStatsResponse.TopHabit(h.getTitle(), completions, consistency);
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public Map<String, String> getYearPixels() {
        long userId = currentUser.getId();
        ZoneId zone = currentUser.getZone();
        LocalDate today = LocalDate.now(zone);
        LocalDate yearStart = today.minusDays(364);

        List<Habit> habits = habitRepository.findByUserId(userId);
        if (habits.isEmpty()) return Map.of();

        List<HabitLog> logs = habitLogRepository
                .findByUserIdAndDateBetween(userId, yearStart, today);

        Map<LocalDate, List<HabitLog>> logsByDate = logs.stream()
                .collect(Collectors.groupingBy(HabitLog::getDate));

        Map<String, String> result = new HashMap<>();
        LocalDate cursor = yearStart;

        while (!cursor.isAfter(today)) {
            final LocalDate date = cursor;

            // FIX: use isHabitPausedOnDate instead of h.isPaused() so the pixel
            // for a given date reflects whether the habit was paused *on that date*,
            // not just whether it is paused right now. Consistent with getMonthSummary.
            boolean anyScheduled = habits.stream()
                    .anyMatch(h -> !date.isBefore(h.getCreatedAt())
                            && !habitScheduleService.isHabitPausedOnDate(h.getId(), date)
                            && habitScheduleService.isScheduledForDate(h, date));

            if (anyScheduled) {
                List<HabitLog> dayLogs = logsByDate.getOrDefault(date, List.of());

                long completed = dayLogs.stream()
                        .filter(l -> l.getStatus() == HabitStatus.COMPLETED).count();
                long partial = dayLogs.stream()
                        .filter(l -> l.getStatus() == HabitStatus.PARTIALLY_COMPLETED).count();
                long missed = dayLogs.stream()
                        .filter(l -> l.getStatus() == HabitStatus.MISSED).count();
                long total = completed + partial + missed;

                String pixel;
                if (total == 0) {
                    pixel = date.isBefore(today) ? "MISSED" : "PENDING";
                } else if (completed == total) {
                    pixel = "COMPLETED";
                } else if (missed == total) {
                    pixel = "MISSED";
                } else {
                    pixel = "PARTIAL";
                }

                result.put(date.toString(), pixel);
            }

            cursor = cursor.plusDays(1);
        }

        return result;
    }

    @Transactional(readOnly = true)
    public WeeklyReviewResponse getWeeklyReview() {
        long userId = currentUser.getId();
        ZoneId zone = currentUser.getZone();

        LocalDate today = LocalDate.now(zone);
        LocalDate weekStart = today.minusDays(6);

        List<Habit> habits = habitRepository.findByUserId(userId)
                .stream()
                .filter(h -> !h.isArchived())
                .toList();
        List<Object[]> weekStats = habitLogRepository
                .findWeeklyStatsByUserId(userId, weekStart, today);

        Map<Long, long[]> statsByHabit = weekStats.stream()
                .collect(Collectors.toMap(
                        row -> ((Number) row[0]).longValue(),
                        row -> new long[]{
                                ((Number) row[1]).longValue(),
                                ((Number) row[2]).longValue()
                        }
                ));

        long totalCompleted = 0;
        long totalScheduled = 0;
        StringBuilder habitSummary = new StringBuilder();
        List<WeeklyReviewResponse.HabitWeekStat> habitStatsList = new ArrayList<>();

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
                habitStatsList.add(new WeeklyReviewResponse.HabitWeekStat(
                        habit.getTitle(), (int) completed, (int) total, pct));
            }
        }

        int overallPct = totalScheduled > 0
                ? (int) Math.round((totalCompleted * 100.0) / totalScheduled)
                : 0;

        String insight = totalScheduled > 0
                ? aiService.generateWeeklyDigest(
                habitSummary.toString(), totalCompleted, totalScheduled, overallPct)
                : "No activity this week yet. Start logging your habits!";

        return new WeeklyReviewResponse(weekStart, today, overallPct, habitStatsList, insight);
    }
}