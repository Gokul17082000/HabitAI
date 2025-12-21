package com.habitai.habit;

import com.habitai.common.validation.HabitAccessValidator;
import com.habitai.common.security.CurrentUser;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class HabitService {

    private final HabitRepository habitRepository;
    private final CurrentUser currentUser;
    private final HabitAccessValidator habitAccessValidator;

    public HabitService(HabitRepository habitRepository, CurrentUser currentUser, HabitAccessValidator habitAccessValidator) {
        this.habitRepository = habitRepository;
        this.currentUser = currentUser;
        this.habitAccessValidator = habitAccessValidator;
    }

    public List<HabitDTO> getAllHabits() {
        return habitRepository.findByUserId(currentUser.getId()).stream().map(this::toDTO).toList();
    }

    public HabitDTO createHabit(HabitRequest habitRequest) {
        Habit habit = new Habit();
        habit.setTitle(habitRequest.title());
        habit.setDescription(habitRequest.description());
        habit.setCategory(habitRequest.category());
        habit.setFrequency(habitRequest.frequency());
        habit.setUserId(currentUser.getId());
        habit.setTargetTime(habitRequest.targetTime());
        Habit saved = habitRepository.save(habit);
        return toDTO(saved);
    }

    public void updateHabit(long habitId, HabitRequest habitRequest) {
        Habit habit = habitAccessValidator.validate(habitId);
        habit.setTitle(habitRequest.title());
        habit.setDescription(habitRequest.category());
        habit.setCategory(habitRequest.category());
        habit.setFrequency(habitRequest.frequency());
        habit.setTargetTime(habitRequest.targetTime());
        habitRepository.save(habit);
    }

    public void deleteHabit(long habitId) {
        Habit habit = habitAccessValidator.validate(habitId);
        habitRepository.delete(habit);
    }

    private HabitDTO toDTO(Habit habit) {
        return new HabitDTO(habit.getId(), habit.getTitle(), habit.getDescription(), habit.getCategory(), habit.getFrequency(), habit.getTargetTime());
    }
}
