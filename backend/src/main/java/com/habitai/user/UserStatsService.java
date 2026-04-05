package com.habitai.user;

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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class UserStatsService {

    private final HabitRepository habitRepository;
    private final HabitLogRepository habitLogRepository;
    private final CurrentUser currentUser;
    private final UserRepository userRepository;
    private final HabitScheduleService habitScheduleService;

    public UserStatsService(HabitRepository habitRepository,
                            HabitLogRepository habitLogRepository,
                            CurrentUser currentUser,
                            UserRepository userRepository,
                            HabitScheduleService habitScheduleService) {
        this.habitRepository = habitRepository;
        this.habitLogRepository = habitLogRepository;
        this.currentUser = currentUser;
        this.userRepository = userRepository;
        this.habitScheduleService = habitScheduleService;
    }

    @Transactional(readOnly = true)
    public UserStatsResponse getStats() {
        long userId = currentUser.getId();

        List<Habit> allHabits = habitRepository.findByUserId(userId);
        int totalHabits = allHabits.size();

        // Aggregate queries — no full table scan into memory
        int totalCompleted = (int) habitLogRepository.countByUserIdAndStatus(userId, HabitStatus.COMPLETED);
        int totalMissed    = (int) habitLogRepository.countByUserIdAndStatus(userId, HabitStatus.MISSED);
        int totalDaysTracked = (int) habitLogRepository.countDistinctDatesByUserId(userId);

        int totalLogs = totalCompleted + totalMissed;
        int overallConsistency = totalLogs > 0
                ? (int) Math.round((totalCompleted * 100.0) / totalLogs)
                : 0;

        int currentStreak = calculateCurrentStreak(userId);
        int longestStreak = calculateLongestStreak(userId);

        List<UserStatsResponse.TopHabit> topHabits = getTopHabits(allHabits, userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found"));
        LocalDate memberSince = user.getCreatedAt().toLocalDate();

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

    private int calculateCurrentStreak(long userId) {
        // Fetch only distinct completed dates descending — stops as soon as streak breaks
        List<LocalDate> completedDates = habitLogRepository.findDistinctCompletedDatesDescByUserId(userId);
        if (completedDates.isEmpty()) return 0;

        LocalDate cursor = LocalDate.now(AppConstants.APP_ZONE);
        int streak = 0;

        for (LocalDate date : completedDates) {
            if (date.equals(cursor) || date.equals(cursor.minusDays(1))) {
                // Allow today being incomplete without breaking streak
                streak++;
                cursor = date.minusDays(1);
            } else {
                break;
            }
        }
        return streak;
    }

    private int calculateLongestStreak(long userId) {
        List<LocalDate> completedDates = habitLogRepository.findDistinctCompletedDatesByUserId(userId);
        if (completedDates.isEmpty()) return 0;

        int longest = 1;
        int current = 1;
        for (int i = 1; i < completedDates.size(); i++) {
            if (completedDates.get(i).equals(completedDates.get(i - 1).plusDays(1))) {
                current++;
                longest = Math.max(longest, current);
            } else {
                current = 1;
            }
        }
        return longest;
    }

    private List<UserStatsResponse.TopHabit> getTopHabits(List<Habit> habits, long userId) {
        if (habits.isEmpty()) return List.of();

        // Single aggregate query — no row-by-row streaming
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
        LocalDate today = LocalDate.now(AppConstants.APP_ZONE);
        LocalDate yearStart = today.minusDays(364); // 52 weeks back

        List<Habit> habits = habitRepository.findByUserId(userId);
        if (habits.isEmpty()) return Map.of();

        List<HabitLog> logs = habitLogRepository
                .findByUserIdAndDateBetween(userId, yearStart, today);

        // Group logs by date
        Map<LocalDate, List<HabitLog>> logsByDate = logs.stream()
                .collect(Collectors.groupingBy(HabitLog::getDate));

        Map<String, String> result = new HashMap<>();
        LocalDate cursor = yearStart;

        while (!cursor.isAfter(today)) {
            final LocalDate date = cursor;

            // Only show a pixel if at least one habit was actually scheduled on this day.
            // Must call isScheduledForDate() — checking only createdAt/isPaused misses
            // weekly/monthly habits and marks their off-days as MISSED incorrectly.
            boolean anyScheduled = habits.stream()
                    .anyMatch(h -> !date.isBefore(h.getCreatedAt())
                            && !h.isPaused()
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
}