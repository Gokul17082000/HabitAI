package com.habitai.habitlog;

import com.habitai.common.security.CurrentUser;
import com.habitai.common.validation.HabitAccessValidator;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class HabitLogService {

    private final HabitLogRepository habitLogRepository;
    private final HabitAccessValidator habitAccessValidator;
    private final CurrentUser currentUser;

    public HabitLogService(HabitLogRepository habitLogRepository, HabitAccessValidator habitAccessValidator, CurrentUser currentUser) {
        this.habitLogRepository = habitLogRepository;
        this.habitAccessValidator = habitAccessValidator;
        this.currentUser = currentUser;
    }

    public void updateTodayHabitStatus(long habitId, HabitLogRequest habitLogRequest) {
        habitAccessValidator.validate(habitId);
        long userId = currentUser.getId();

        LocalDate date = LocalDate.now();
        HabitLog habitLog = habitLogRepository.findByHabitIdAndUserIdAndDate(habitId, userId, date);

        if(habitLog == null){
            habitLog = new HabitLog();
            habitLog.setHabitId(habitId);
            habitLog.setUserId(userId);
            habitLog.setDate(date);
        }
        habitLog.setStatus(habitLogRequest.habitStatus());
        habitLogRepository.save(habitLog);
    }

    public HabitStreakResponse getCurrentStreak(long habitId) {
        habitAccessValidator.validate(habitId);
        long userId = currentUser.getId();

        List<HabitLog> habitLogs = habitLogRepository.findByHabitIdAndUserIdOrderByDateDesc(habitId,userId);
        if(habitLogs.isEmpty()){
            return new HabitStreakResponse(0);
        }
        LocalDate date = LocalDate.now();
        int streak = 0;
        for(HabitLog habitLog : habitLogs){
            if((HabitStatus.COMPLETED == habitLog.getStatus()) && habitLog.getDate().isEqual(date)){
                streak++;
            } else {
                break;
            }
            date = date.minusDays(1);
        }
        return new HabitStreakResponse(streak);
    }

    public List<HabitActivityStatus> getHabitActivity(long habitId, LocalDate startDate, LocalDate endDate) {
        habitAccessValidator.validate(habitId);
        long userId = currentUser.getId();

        List<HabitLog> habitLogs = habitLogRepository.findByHabitIdAndUserIdAndDateBetweenOrderByDateAsc(habitId, userId, startDate,endDate);
        List<HabitActivityStatus> habitActivityStatusList = new ArrayList<>();
        LocalDate today = LocalDate.now();
        LocalDate currentDate = startDate;
        LocalDate effectiveEndDate = endDate.isAfter(today) ? today : endDate;

        int i = 0;
        while (!currentDate.isAfter(effectiveEndDate)){
            HabitActivityStatus habitActivityStatus;
            if(i < habitLogs.size() && habitLogs.get(i).getDate().isEqual(currentDate)){
                habitActivityStatus = new HabitActivityStatus(currentDate, habitLogs.get(i).getStatus());
                i++;
            } else if (currentDate.isEqual(today)){
                habitActivityStatus = new HabitActivityStatus(currentDate, HabitStatus.PENDING);
            } else {
                habitActivityStatus = new HabitActivityStatus(currentDate, HabitStatus.MISSED);
            }
            habitActivityStatusList.add(habitActivityStatus);
            currentDate = currentDate.plusDays(1);
        }
        return habitActivityStatusList;
    }
}
