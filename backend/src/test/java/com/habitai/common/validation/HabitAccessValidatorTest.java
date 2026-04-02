package com.habitai.common.validation;

import com.habitai.common.security.CurrentUser;
import com.habitai.exception.AccessDeniedException;
import com.habitai.exception.HabitNotFoundException;
import com.habitai.habit.Habit;
import com.habitai.habit.HabitRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HabitAccessValidatorTest {

    @Mock
    private HabitRepository habitRepository;

    @Mock
    private CurrentUser currentUser;

    @InjectMocks
    private HabitAccessValidator habitAccessValidator;

    private Habit habit;
    private long habitId = 1L;
    private long userId = 100L;

    @BeforeEach
    void setUp() {
        habit = new Habit();
        habit.setId(habitId);
        habit.setUserId(userId);
    }

    @Test
    void getAndValidate_shouldReturnHabit_whenHabitExistsAndBelongsToUser() {
        // Arrange
        when(currentUser.getId()).thenReturn(userId);
        when(habitRepository.findById(habitId)).thenReturn(Optional.of(habit));

        // Act
        Habit result = habitAccessValidator.getAndValidate(habitId);

        // Assert
        assertEquals(habit, result);
    }

    @Test
    void getAndValidate_shouldThrowHabitNotFoundException_whenHabitDoesNotExist() {
        // Arrange
        when(currentUser.getId()).thenReturn(userId);
        when(habitRepository.findById(habitId)).thenReturn(Optional.empty());

        // Act & Assert
        HabitNotFoundException exception = assertThrows(HabitNotFoundException.class,
                () -> habitAccessValidator.getAndValidate(habitId));
        assertEquals("Habit not found", exception.getMessage());
    }

    @Test
    void getAndValidate_shouldThrowAccessDeniedException_whenHabitBelongsToDifferentUser() {
        // Arrange
        long differentUserId = 200L;
        when(currentUser.getId()).thenReturn(differentUserId);
        when(habitRepository.findById(habitId)).thenReturn(Optional.of(habit));

        // Act & Assert
        AccessDeniedException exception = assertThrows(AccessDeniedException.class,
                () -> habitAccessValidator.getAndValidate(habitId));
        assertEquals("Unauthorized habit access", exception.getMessage());
    }
}