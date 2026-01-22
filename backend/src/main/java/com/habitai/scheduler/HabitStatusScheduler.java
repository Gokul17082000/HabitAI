package com.habitai.scheduler;

import com.habitai.habit.Habit;
import com.habitai.habit.HabitRepository;
import com.habitai.habit.HabitService;
import com.habitai.habitlog.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

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

    @Scheduled(cron = "0 * * * * *")
    public void updateMissedHabits() {
        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();

        List<Habit> overdueHabits =
                habitRepository.findByTargetTimeBefore(now);

        for (Habit habit : overdueHabits) {

            if (!habitService.isScheduledForDate(habit, today)) {
                continue;
            }

            HabitLog alreadyLogged =
                    habitLogRepository.findByHabitIdAndUserIdAndDate(
                            habit.getId(),
                            habit.getUserId(),
                            today
                    );

            if (alreadyLogged == null) {
                habitStatusSystemService.updateTodayHabitStatus(
                        habit.getId(),
                        habit.getUserId()
                );
            }
        }
    }

}
