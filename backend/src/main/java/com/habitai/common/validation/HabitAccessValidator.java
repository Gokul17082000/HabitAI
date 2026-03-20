package com.habitai.common.validation;

import com.habitai.common.security.CurrentUser;
import com.habitai.exception.AccessDeniedException;
import com.habitai.exception.HabitNotFoundException;
import com.habitai.habit.Habit;
import com.habitai.habit.HabitRepository;
import org.springframework.stereotype.Component;

@Component
public class HabitAccessValidator {

    private final HabitRepository habitRepository;
    private final CurrentUser currentUser;

    public HabitAccessValidator(HabitRepository habitRepository, CurrentUser currentUser) {
        this.habitRepository = habitRepository;
        this.currentUser = currentUser;
    }

    public Habit getAndValidate(long habitId){
        long userId = currentUser.getId();
        Habit habit = habitRepository.findById(habitId)
                .orElseThrow(() -> new HabitNotFoundException("Habit not found"));

        if (habit.getUserId() != userId) {
            throw new AccessDeniedException("Unauthorized habit access");
        }

        return habit;
    }
}
