package com.habitai.habit;

import com.habitai.common.validation.HabitAccessValidator;
import com.habitai.common.security.CurrentUser;
import com.habitai.exception.HabitDayOfMonthNotFoundException;
import com.habitai.exception.HabitDayOfWeekNotFoundException;
import com.habitai.exception.HabitNotFoundException;
import com.habitai.habitlog.HabitLog;
import com.habitai.habitlog.HabitLogRepository;
import com.habitai.habitlog.HabitStatus;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Service
public class HabitService {

    private final HabitRepository habitRepository;
    private final CurrentUser currentUser;
    private final HabitAccessValidator habitAccessValidator;
    private final HabitLogRepository  habitLogRepository;

    public HabitService(HabitRepository habitRepository, CurrentUser currentUser, HabitAccessValidator habitAccessValidator, HabitLogRepository habitLogRepository) {
        this.habitRepository = habitRepository;
        this.currentUser = currentUser;
        this.habitAccessValidator = habitAccessValidator;
        this.habitLogRepository = habitLogRepository;
    }

    public List<HabitDTO> getAllHabits() {
        return habitRepository.findByUserId(currentUser.getId()).stream().map(this::toDTO).toList();
    }

    public List<HabitResponse> getHabitsForDate(LocalDate date) {
        long userId = currentUser.getId();
        LocalTime now = LocalTime.now();
        LocalDate today = LocalDate.now();
        return habitRepository.findByUserId(currentUser.getId())
                .stream()
                .filter(habit -> isScheduledForDate(habit, date))
                .map(habit -> {
                    HabitLog habitLog = habitLogRepository.findByHabitIdAndUserIdAndDate(habit.getId(), userId, date);
                    HabitStatus status;
                    if (habitLog != null) {
                        status = habitLog.getStatus();
                    } else if (date.isBefore(today)) {
                        status = HabitStatus.MISSED;
                    } else if (date.isAfter(today)) {
                        status = HabitStatus.PENDING;
                    } else {
                        // today
                        status = now.isBefore(habit.getTargetTime())
                                ? HabitStatus.PENDING
                                : HabitStatus.MISSED;
                    }
                    return new HabitResponse(habit.getId(), habit.getTitle(), habit.getDescription(), habit.getCategory(), habit.getTargetTime(), status);
                })
                .toList();
    }

    public HabitDTO getHabitById(long habitId) {
        Habit habit =  habitRepository.findById(habitId).orElseThrow(() -> new HabitNotFoundException("Habit not found"));
        return toDTO(habit);
    }
    public boolean isScheduledForDate(Habit habit, LocalDate date) {
        return switch (habit.getFrequency()) {

            case DAILY -> true;

            case WEEKLY ->
                    isWeeklyMatch(habit, date);

            case MONTHLY ->
                    isMonthlyMatch(habit, date);

        };
    }


    private boolean isWeeklyMatch(Habit habit, LocalDate date) {

        if(habit.getDaysOfWeek() != null && !habit.getDaysOfWeek().isEmpty()) {
            DayOfWeek dayOfWeek = date.getDayOfWeek();
            return habit.getDaysOfWeek().contains(dayOfWeek);
        }

        return false;
    }

    private boolean isMonthlyMatch(Habit habit, LocalDate date) {

        if (habit.getDaysOfMonth() != null && !habit.getDaysOfMonth().isEmpty()) {
            return habit.getDaysOfMonth().contains(date.getDayOfMonth());
        }

        return false;
    }


    public HabitDTO createHabit(HabitRequest habitRequest) {
        validateSchedule(habitRequest);

        Habit habit = new Habit();
        habit.setTitle(habitRequest.title());
        habit.setDescription(habitRequest.description());
        habit.setCategory(habitRequest.category());
        habit.setFrequency(habitRequest.frequency());
        habit.setDaysOfWeek(habitRequest.daysOfWeek());
        habit.setDaysOfMonth(habitRequest.daysOfMonth());
        habit.setUserId(currentUser.getId());
        habit.setTargetTime(habitRequest.targetTime());

        normalizeSchedule(habit);

        Habit saved = habitRepository.save(habit);
        return toDTO(saved);
    }

    public void updateHabit(long habitId, HabitRequest habitRequest) {
        validateSchedule(habitRequest);

        Habit habit = habitAccessValidator.validate(habitId);
        habit.setTitle(habitRequest.title());
        habit.setDescription(habitRequest.description());
        habit.setCategory(habitRequest.category());
        habit.setFrequency(habitRequest.frequency());
        habit.setDaysOfWeek(habitRequest.daysOfWeek());
        habit.setDaysOfMonth(habitRequest.daysOfMonth());
        habit.setTargetTime(habitRequest.targetTime());

        normalizeSchedule(habit);
        habitRepository.save(habit);
    }


    public void deleteHabit(long habitId) {
        Habit habit = habitAccessValidator.validate(habitId);
        habitRepository.delete(habit);
    }

    private HabitDTO toDTO(Habit habit) {
        return new HabitDTO(habit.getId(), habit.getTitle(), habit.getDescription(), habit.getCategory(), habit.getFrequency(), habit.getDaysOfWeek(), habit.getDaysOfMonth(), habit.getTargetTime());
    }

    private void validateSchedule(HabitRequest habitRequest) {
        switch (habitRequest.frequency()) {
            case WEEKLY -> {
                if (habitRequest.daysOfWeek() == null || habitRequest.daysOfWeek().isEmpty()) {
                    throw new HabitDayOfWeekNotFoundException("At least one day of week required");
                }
            }
            case MONTHLY -> {

                if (habitRequest.daysOfMonth() == null || habitRequest.daysOfMonth().isEmpty()) {
                    throw new HabitDayOfMonthNotFoundException("At least one day of month is required");
                }

                for (Integer d : habitRequest.daysOfMonth()) {
                    if (d < 1 || d > 31)
                        throw new HabitDayOfMonthNotFoundException("Invalid day: " + d);
                }
            }
        }
    }

    private void normalizeSchedule(Habit habit) {

        switch (habit.getFrequency()) {

            case DAILY -> {
                habit.setDaysOfWeek(null);
                habit.setDaysOfMonth(null);
            }

            case WEEKLY -> habit.setDaysOfMonth(null);

            case MONTHLY -> habit.setDaysOfWeek(null);
        }
    }
}
