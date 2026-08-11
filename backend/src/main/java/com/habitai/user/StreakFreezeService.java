package com.habitai.user;

import com.habitai.common.security.CurrentUser;
import com.habitai.exception.UserNotFoundException;
import com.habitai.habit.HabitPauseHistory;
import com.habitai.habit.HabitPauseHistoryRepository;
import com.habitai.habit.HabitRepository;
import com.habitai.habit.HabitScheduleService;
import com.habitai.habitlog.HabitLog;
import com.habitai.habitlog.HabitLogRepository;
import com.habitai.habitlog.HabitStatus;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class StreakFreezeService {

    private static final int MAX_FREEZES = 2;

    private final UserRepository userRepository;
    private final StreakFreezeUsageRepository freezeUsageRepository;
    private final HabitLogRepository habitLogRepository;
    private final HabitRepository habitRepository;
    private final HabitScheduleService habitScheduleService;
    private final HabitPauseHistoryRepository habitPauseHistoryRepository;
    private final CurrentUser currentUser;

    public StreakFreezeService(UserRepository userRepository,
                               StreakFreezeUsageRepository freezeUsageRepository,
                               HabitLogRepository habitLogRepository,
                               HabitRepository habitRepository,
                               HabitScheduleService habitScheduleService,
                               HabitPauseHistoryRepository habitPauseHistoryRepository,
                               CurrentUser currentUser) {
        this.userRepository = userRepository;
        this.freezeUsageRepository = freezeUsageRepository;
        this.habitLogRepository = habitLogRepository;
        this.habitRepository = habitRepository;
        this.habitScheduleService = habitScheduleService;
        this.habitPauseHistoryRepository = habitPauseHistoryRepository;
        this.currentUser = currentUser;
    }

    @Transactional(readOnly = true)
    public StreakFreezeResponse getFreezeStatus() {
        long userId = currentUser.getId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found"));
        return new StreakFreezeResponse(user.getStreakFreezes(), MAX_FREEZES);
    }

    @Transactional
    public StreakFreezeResponse useFreeze(LocalDate date) {
        long userId = currentUser.getId();
        ZoneId zone = currentUser.getZone();
        LocalDate today = LocalDate.now(zone);
        LocalDate yesterday = today.minusDays(1);

        // Only allow freezing yesterday or today
        if (!date.isEqual(today) && !date.isEqual(yesterday)) {
            throw new IllegalStateException(
                    "Freeze can only be applied to today or yesterday.");
        }

        // Check already frozen
        if (freezeUsageRepository.existsByUserIdAndUsedOn(userId, date)) {
            throw new IllegalStateException("This date is already frozen.");
        }

        // A freeze is warranted if any scheduled habit was not completed on that date.
        // We check two ways to handle the scheduler's 5-minute lag window:
        //   1. A MISSED log already exists (scheduler has run), or
        //   2. It's today, a habit's targetTime has passed, and it has no completion log yet.
        boolean freezeNeeded = habitLogRepository
                .existsByUserIdAndDateAndStatus(userId, date, HabitStatus.MISSED);

        if (!freezeNeeded) {
            // Fallback for scheduler lag: the MISSED log may not exist yet if the scheduler
            // hasn't fired since the habit's targetTime passed. For today, compare against the
            // current time. For yesterday, all targetTimes have definitionally passed (LocalTime.MAX).
            LocalTime now = date.isEqual(today) ? LocalTime.now(zone) : LocalTime.MAX;
            Set<Long> completedIds = habitLogRepository.findByUserIdAndDate(userId, date)
                    .stream()
                    .filter(l -> l.getStatus() == HabitStatus.COMPLETED
                              || l.getStatus() == HabitStatus.PARTIALLY_COMPLETED)
                    .map(HabitLog::getHabitId)
                    .collect(Collectors.toSet());

            List<com.habitai.habit.Habit> userHabits = habitRepository.findByUserId(userId);

            // Bulk-load pause history so we evaluate historical pause state on `date`,
            // not the live isPaused() flag. A habit paused today but active yesterday
            // must still be considered when checking if yesterday had a miss.
            Set<Long> habitIds = userHabits.stream()
                    .map(com.habitai.habit.Habit::getId)
                    .collect(Collectors.toSet());
            java.util.Map<Long, List<HabitPauseHistory>> pausesByHabitId =
                    habitPauseHistoryRepository.findByHabitIdIn(habitIds)
                            .stream()
                            .collect(Collectors.groupingBy(HabitPauseHistory::getHabitId));

            freezeNeeded = userHabits.stream()
                    .filter(h -> !h.isArchived())
                    .filter(h -> h.getTargetTime() != null && now.isAfter(h.getTargetTime()))
                    .filter(h -> !date.isBefore(h.getCreatedAt()))
                    .filter(h -> habitScheduleService.isScheduledForDate(h, date))
                    .filter(h -> !isPausedOnDate(pausesByHabitId.getOrDefault(h.getId(), List.of()), date))
                    .anyMatch(h -> !completedIds.contains(h.getId()));
        }

        if (!freezeNeeded) {
            throw new IllegalStateException("No missed habits on this date. Freeze not needed.");
        }

        User user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        if (user.getStreakFreezes() <= 0) {
            throw new IllegalStateException("No streak freezes available.");
        }

        user.setStreakFreezes(user.getStreakFreezes() - 1);
        userRepository.save(user);

        // A concurrent request for the same date can slip past the existsBy check above
        // (it runs before this transaction takes the user-row lock). The uq_freeze_user_date
        // constraint is the real guard; surface it as a friendly error instead of a 500.
        // saveAndFlush forces the violation to surface here rather than at commit.
        try {
            freezeUsageRepository.saveAndFlush(new StreakFreezeUsage(userId, date));
        } catch (DataIntegrityViolationException e) {
            throw new IllegalStateException("This date is already frozen.");
        }

        return new StreakFreezeResponse(user.getStreakFreezes(), MAX_FREEZES);
    }

    /**
     * Called by the scheduler after every 7 consecutive completed days.
     * Awards 1 freeze up to the MAX_FREEZES cap.
     */
    @Transactional
    public void awardFreezeIfEarned(long userId, java.time.LocalDate today) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        // Only award once per 7-day window — prevents daily re-award for sustained streaks
        if (user.getLastFreezeAwardedAt() != null
                && !today.isAfter(user.getLastFreezeAwardedAt().plusDays(6))) {
            return;
        }

        if (user.getStreakFreezes() < MAX_FREEZES) {
            user.setStreakFreezes(user.getStreakFreezes() + 1);
            user.setLastFreezeAwardedAt(today);
            userRepository.save(user);
        }
    }

    private boolean isPausedOnDate(List<HabitPauseHistory> pauses, LocalDate date) {
        return pauses.stream()
                .anyMatch(p -> !date.isBefore(p.getPausedFrom()) && !date.isAfter(p.getPausedUntil()));
    }
}