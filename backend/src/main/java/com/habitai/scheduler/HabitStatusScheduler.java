package com.habitai.scheduler;

import com.habitai.habit.Habit;
import com.habitai.habit.HabitRepository;
import com.habitai.habit.HabitService;
import com.habitai.habitlog.HabitLogRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Service
public class HabitStatusScheduler {

    private final HabitService habitService;
    private final HabitRepository habitRepository;
    private final HabitLogRepository habitLogRepository;
    private final HabitStatusSystemService habitStatusSystemService;

    public HabitStatusScheduler(HabitService habitService, HabitRepository habitRepository, HabitLogRepository habitLogRepository, HabitStatusSystemService habitStatusSystemService) {
        this.habitService = habitService;
        this.habitRepository = habitRepository;
        this.habitLogRepository = habitLogRepository;
        this.habitStatusSystemService = habitStatusSystemService;
    }

    @Transactional
    @Scheduled(cron = "0 */5 * * * *")
    public void updateMissedHabits() {
        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();

        List<Habit> overdueHabits = habitRepository.findByTargetTimeBefore(now);

        for (Habit habit : overdueHabits) {
            if (!habitService.isScheduledForDate(habit, today)) {
                continue;
            }

            boolean alreadyLogged = habitLogRepository
                    .findByHabitIdAndUserIdAndDate(habit.getId(), habit.getUserId(), today)
                    .isPresent();

            if (!alreadyLogged) {
                habitStatusSystemService.updateTodayHabitStatus(habit.getId(), habit.getUserId());
            }
        }
    }
}