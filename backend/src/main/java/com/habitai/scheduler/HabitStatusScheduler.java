package com.habitai.scheduler;

import com.habitai.habit.Habit;
import com.habitai.habit.HabitRepository;
import com.habitai.habit.HabitScheduleService;
import com.habitai.habitlog.HabitLog;
import com.habitai.habitlog.HabitLogRepository;
import com.habitai.habitlog.HabitStatus;
import com.habitai.user.User;
import com.habitai.user.UserRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class HabitStatusScheduler {

    private final HabitScheduleService habitScheduleService;
    private final HabitRepository habitRepository;
    private final HabitLogRepository habitLogRepository;
    private final UserRepository userRepository;

    public HabitStatusScheduler(HabitScheduleService habitScheduleService,
                                HabitRepository habitRepository,
                                HabitLogRepository habitLogRepository,
                                UserRepository userRepository) {
        this.habitScheduleService = habitScheduleService;
        this.habitRepository = habitRepository;
        this.habitLogRepository = habitLogRepository;
        this.userRepository = userRepository;
    }

    /**
     * Runs every 5 minutes (UTC). Marks overdue habits as MISSED.
     *
     * FIX: Previously used a single hardcoded IST clock, which incorrectly
     * marked habits missed for users in other timezones. Now each habit is
     * evaluated against its owner's stored timezone so that "overdue" means
     * past the target time *in the user's local time*.
     *
     * Strategy:
     *  1. Load all active (non-paused) habits with their owner's timezone.
     *  2. For each habit, compute "now" and "today" in the user's zone.
     *  3. Mark MISSED only if targetTime has passed in that zone AND no log exists.
     */
    @Transactional
    @Scheduled(cron = "0 */5 * * * *")
    public void updateMissedHabits() {
        // FIX: was habitRepository.findAll() — loads every habit in the system on every
        // 5-minute tick regardless of paused state. findByPausedFalse() scopes the query
        // to only active habits, cutting memory and query cost as the user base grows.
        List<Habit> allActiveHabits = habitRepository.findByPausedFalse();

        if (allActiveHabits.isEmpty()) return;

        // Batch-load all users whose habits we're examining (avoids N+1)
        Set<Long> userIds = allActiveHabits.stream()
                .map(Habit::getUserId)
                .collect(Collectors.toSet());

        Map<Long, User> userMap = userRepository.findByIdIn(userIds)
                .stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));

        // Pre-load already-logged keys for today across all relevant user-dates.
        // We collect the distinct (date, userId) combos needed after timezone resolution.
        // For simplicity, load logs for all potentially relevant dates (yesterday UTC
        // through tomorrow UTC covers any user timezone).
        LocalDate utcToday = LocalDate.now(ZoneId.of("UTC"));
        Set<String> alreadyLoggedKeys = habitLogRepository
                .findByDateBetween(utcToday.minusDays(1), utcToday.plusDays(1))
                .stream()
                .map(log -> log.getHabitId() + ":" + log.getUserId() + ":" + log.getDate())
                .collect(Collectors.toSet());

        List<HabitLog> toInsert = new ArrayList<>();

        for (Habit habit : allActiveHabits) {
            User user = userMap.get(habit.getUserId());
            if (user == null) continue;

            ZoneId zone = parseZone(user.getTimezone());
            LocalDate today = LocalDate.now(zone);
            LocalTime now = LocalTime.now(zone);

            // Only mark missed if the habit's target time has already passed today
            if (!now.isAfter(habit.getTargetTime())) continue;

            // Only mark missed if scheduled for today in the user's calendar
            if (!habitScheduleService.isScheduledForDate(habit, today)) continue;

            // Skip if already logged today (any status)
            String key = habit.getId() + ":" + habit.getUserId() + ":" + today;
            if (alreadyLoggedKeys.contains(key)) continue;

            HabitLog log = new HabitLog();
            log.setHabitId(habit.getId());
            log.setUserId(habit.getUserId());
            log.setDate(today);
            log.setStatus(HabitStatus.MISSED);
            toInsert.add(log);

            // Add key to set so duplicates within the same run are skipped
            alreadyLoggedKeys.add(key);
        }

        if (!toInsert.isEmpty()) {
            habitLogRepository.saveAll(toInsert);
        }
    }

    private ZoneId parseZone(String timezone) {
        try {
            return ZoneId.of(timezone);
        } catch (Exception e) {
            return ZoneId.of("UTC");
        }
    }
}