package com.habitai.scheduler;

import com.habitai.habitlog.HabitLog;
import com.habitai.habitlog.HabitLogRepository;
import com.habitai.habitlog.HabitLogRequest;
import com.habitai.habitlog.HabitStatus;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
public class HabitStatusSystemService {

    private final HabitLogRepository habitLogRepository;

    public HabitStatusSystemService(HabitLogRepository habitLogRepository) {
        this.habitLogRepository = habitLogRepository;
    }

    public void updateTodayHabitStatus(long habitId, long userId) {

        LocalDate date = LocalDate.now();
        HabitLog habitLog = habitLogRepository.findByHabitIdAndUserIdAndDate(habitId, userId, date);

        if (habitLog != null) {
            return;
        }

        habitLog = new HabitLog();
        habitLog.setHabitId(habitId);
        habitLog.setUserId(userId);
        habitLog.setDate(date);
        habitLog.setStatus(HabitStatus.MISSED);
        habitLogRepository.save(habitLog);
    }
}
