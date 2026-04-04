package com.habitai.scheduler;

import com.habitai.habit.Habit;
import com.habitai.habit.HabitRepository;
import com.habitai.habit.HabitScheduleService;
import com.habitai.habitlog.HabitLog;
import com.habitai.habitlog.HabitLogRepository;
import com.habitai.habitlog.HabitStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class HabitStatusScheduler {

    private final HabitScheduleService habitScheduleService;
    private final HabitRepository habitRepository;
    private final HabitLogRepository habitLogRepository;

    public HabitStatusScheduler(HabitScheduleService habitScheduleService, HabitRepository habitRepository, HabitLogRepository habitLogRepository) {
        this.habitScheduleService = habitScheduleService;
        this.habitRepository = habitRepository;
        this.habitLogRepository = habitLogRepository;
    }

    @Transactional
    @Scheduled(cron = "0 */5 * * * *")
    public void updateMissedHabits() {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Kolkata"));
        LocalTime now = LocalTime.now(ZoneId.of("Asia/Kolkata"));

        List<Habit> overdueHabits = habitRepository.findByTargetTimeBefore(now);
        if (overdueHabits.isEmpty()) return;

        Set<String> alreadyLoggedKeys = habitLogRepository.findByDate(today)
                .stream()
                .map(log -> log.getHabitId() + ":" + log.getUserId())
                .collect(Collectors.toSet());

        List<HabitLog> toInsert = new ArrayList<>();

        for (Habit habit : overdueHabits) {
            if (habit.isPaused()) continue;
            if (!habitScheduleService.isScheduledForDate(habit, today)) continue;

            String key = habit.getId() + ":" + habit.getUserId();
            if (alreadyLoggedKeys.contains(key)) continue;

            HabitLog log = new HabitLog();
            log.setHabitId(habit.getId());
            log.setUserId(habit.getUserId());
            log.setDate(today);
            log.setStatus(HabitStatus.MISSED);
            toInsert.add(log);
        }

        if (!toInsert.isEmpty()) {
            habitLogRepository.saveAll(toInsert);
        }
    }
}