package com.habitai.user;

import com.habitai.common.security.CurrentUser;
import com.habitai.exception.UserNotFoundException;
import com.habitai.habit.Habit;
import com.habitai.habit.HabitRepository;
import com.habitai.habitlog.HabitLog;
import com.habitai.habitlog.HabitLogRepository;
import com.habitai.habitlog.HabitStatus;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class UserStatsService {

    private final HabitRepository habitRepository;
    private final HabitLogRepository habitLogRepository;
    private final CurrentUser currentUser;
    private final UserRepository userRepository;

    public UserStatsService(HabitRepository habitRepository, HabitLogRepository habitLogRepository, CurrentUser currentUser, UserRepository userRepository) {
        this.habitRepository = habitRepository;
        this.habitLogRepository = habitLogRepository;
        this.currentUser = currentUser;
        this.userRepository = userRepository;
    }

    public UserStatsResponse getStats() {
        long userId = currentUser.getId();

        List<Habit> allHabits = habitRepository.findByUserId(userId);
        int totalHabits = allHabits.size();

        List<HabitLog> allLogs = habitLogRepository.findByUserId(userId);

        // All time stats
        int totalCompleted = (int) allLogs.stream()
                .filter(l -> l.getStatus() == HabitStatus.COMPLETED)
                .count();

        int totalMissed = (int) allLogs.stream()
                .filter(l -> l.getStatus() == HabitStatus.MISSED)
                .count();

        int totalDaysTracked = (int) allLogs.stream()
                .map(HabitLog::getDate)
                .distinct()
                .count();

        // Overall consistency
        int totalLogs = totalCompleted + totalMissed;
        int overallConsistency = totalLogs > 0
                ? (int) Math.round((totalCompleted * 100.0) / totalLogs)
                : 0;

        // Streaks
        int currentStreak = calculateCurrentStreak(allLogs);
        int longestStreak = calculateLongestStreak(allLogs);

        // Top habits
        List<UserStatsResponse.TopHabit> topHabits = getTopHabits(allHabits, allLogs);

        // Member since
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

    private int calculateCurrentStreak(List<HabitLog> allLogs) {
        Map<LocalDate, Long> completedPerDay = allLogs.stream()
                .filter(l -> l.getStatus() == HabitStatus.COMPLETED)
                .collect(Collectors.groupingBy(HabitLog::getDate, Collectors.counting()));

        LocalDate date = LocalDate.now();
        int streak = 0;

        while (completedPerDay.containsKey(date) && completedPerDay.get(date) > 0) {
            streak++;
            date = date.minusDays(1);
        }

        return streak;
    }

    private int calculateLongestStreak(List<HabitLog> allLogs) {
        List<LocalDate> completedDates = allLogs.stream()
                .filter(l -> l.getStatus() == HabitStatus.COMPLETED)
                .map(HabitLog::getDate)
                .distinct()
                .sorted()
                .toList();

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

    private List<UserStatsResponse.TopHabit> getTopHabits(List<Habit> habits, List<HabitLog> allLogs) {
        if (habits.isEmpty()) return List.of();

        Map<Long, Long> completedPerHabit = allLogs.stream()
                .filter(l -> l.getStatus() == HabitStatus.COMPLETED)
                .collect(Collectors.groupingBy(HabitLog::getHabitId, Collectors.counting()));

        Map<Long, Long> totalPerHabit = allLogs.stream()
                .filter(l -> l.getStatus() == HabitStatus.COMPLETED || l.getStatus() == HabitStatus.MISSED)
                .collect(Collectors.groupingBy(HabitLog::getHabitId, Collectors.counting()));

        return habits.stream()
                .sorted((a, b) -> {
                    long countA = completedPerHabit.getOrDefault(a.getId(), 0L);
                    long countB = completedPerHabit.getOrDefault(b.getId(), 0L);
                    return Long.compare(countB, countA);
                })
                .limit(3)
                .map(h -> {
                    int completions = completedPerHabit.getOrDefault(h.getId(), 0L).intValue();
                    int total = totalPerHabit.getOrDefault(h.getId(), 0L).intValue();
                    int consistency = total > 0 ? (int) Math.round((completions * 100.0) / total) : 0;
                    return new UserStatsResponse.TopHabit(h.getTitle(), completions, consistency);
                })
                .toList();
    }
}