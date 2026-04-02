package com.habitai.user;

import com.habitai.common.security.CurrentUser;
import com.habitai.habit.Habit;
import com.habitai.habit.HabitRepository;
import com.habitai.habitlog.HabitLog;
import com.habitai.habitlog.HabitLogRepository;
import com.habitai.habitlog.HabitStatus;
import com.habitai.exception.UserNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserStatsServiceTest {

    @Mock
    private HabitRepository habitRepository;

    @Mock
    private HabitLogRepository habitLogRepository;

    @Mock
    private CurrentUser currentUser;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserStatsService userStatsService;

    @Test
    void getStats_returnsAggregatedStatistics() {
        long userId = 42L;
        when(currentUser.getId()).thenReturn(userId);

        Habit habit1 = new Habit();
        habit1.setId(10L);
        habit1.setTitle("Read");

        Habit habit2 = new Habit();
        habit2.setId(20L);
        habit2.setTitle("Run");

        when(habitRepository.findByUserId(userId)).thenReturn(List.of(habit1, habit2));

        LocalDate today = LocalDate.now();
        HabitLog day1Completed = new HabitLog();
        day1Completed.setHabitId(10L);
        day1Completed.setUserId(userId);
        day1Completed.setDate(today);
        day1Completed.setStatus(HabitStatus.COMPLETED);

        HabitLog day2Completed = new HabitLog();
        day2Completed.setHabitId(20L);
        day2Completed.setUserId(userId);
        day2Completed.setDate(today.minusDays(1));
        day2Completed.setStatus(HabitStatus.COMPLETED);

        HabitLog day2Missed = new HabitLog();
        day2Missed.setHabitId(10L);
        day2Missed.setUserId(userId);
        day2Missed.setDate(today.minusDays(1));
        day2Missed.setStatus(HabitStatus.MISSED);

        when(habitLogRepository.findByUserId(userId)).thenReturn(List.of(day1Completed, day2Completed, day2Missed));

        User user = new User();
        user.setId(userId);
        user.setEmail("user@example.com");
        user.setPassword("pass");
        user.setCreatedAt(LocalDateTime.of(2024, 1, 2, 3, 4));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        UserStatsResponse response = userStatsService.getStats();

        assertThat(response.totalHabits()).isEqualTo(2);
        assertThat(response.totalCompleted()).isEqualTo(2);
        assertThat(response.totalMissed()).isEqualTo(1);
        assertThat(response.totalDaysTracked()).isEqualTo(2);
        assertThat(response.overallConsistency()).isEqualTo(67);
        assertThat(response.currentStreak()).isEqualTo(2);
        assertThat(response.longestStreak()).isEqualTo(2);
        assertThat(response.topHabits()).hasSize(2);
        assertThat(response.memberSince()).isEqualTo(LocalDate.of(2024, 1, 2));

        assertThat(response.topHabits())
                .extracting(UserStatsResponse.TopHabit::title, UserStatsResponse.TopHabit::completions, UserStatsResponse.TopHabit::consistencyPercent)
                .containsExactlyInAnyOrder(
                        tuple("Read", 1, 50),
                        tuple("Run", 1, 100)
                );
    }

    @Test
    void getStats_throwsUserNotFoundExceptionWhenMissingUser() {
        long userId = 42L;
        when(currentUser.getId()).thenReturn(userId);

        when(habitRepository.findByUserId(userId)).thenReturn(List.of());
        when(habitLogRepository.findByUserId(userId)).thenReturn(List.of());
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userStatsService.getStats())
                .isInstanceOf(UserNotFoundException.class)
                .hasMessage("User not found");
    }
}
