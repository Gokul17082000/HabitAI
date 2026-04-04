package com.habitai.user;

import com.habitai.common.AppConstants;
import com.habitai.common.security.CurrentUser;
import com.habitai.habit.Habit;
import com.habitai.habit.HabitRepository;
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
import static org.mockito.ArgumentMatchers.eq;
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

        LocalDate today = LocalDate.now(AppConstants.APP_ZONE);

        when(habitLogRepository.countByUserIdAndStatus(userId, HabitStatus.COMPLETED)).thenReturn(2L);
        when(habitLogRepository.countByUserIdAndStatus(userId, HabitStatus.MISSED)).thenReturn(1L);
        when(habitLogRepository.countDistinctDatesByUserId(userId)).thenReturn(2L);

        when(habitLogRepository.findDistinctCompletedDatesDescByUserId(userId))
                .thenReturn(List.of(today, today.minusDays(1)));
        when(habitLogRepository.findDistinctCompletedDatesByUserId(userId))
                .thenReturn(List.of(today.minusDays(1), today));

        when(habitLogRepository.findHabitCompletionStatsByUserId(userId)).thenReturn(List.of(
                new Object[]{10L, 1L, 2L},
                new Object[]{20L, 1L, 1L}
        ));

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
        when(habitLogRepository.countByUserIdAndStatus(eq(userId), eq(HabitStatus.COMPLETED))).thenReturn(0L);
        when(habitLogRepository.countByUserIdAndStatus(eq(userId), eq(HabitStatus.MISSED))).thenReturn(0L);
        when(habitLogRepository.countDistinctDatesByUserId(userId)).thenReturn(0L);
        when(habitLogRepository.findDistinctCompletedDatesDescByUserId(userId)).thenReturn(List.of());
        when(habitLogRepository.findDistinctCompletedDatesByUserId(userId)).thenReturn(List.of());
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userStatsService.getStats())
                .isInstanceOf(UserNotFoundException.class)
                .hasMessage("User not found");
    }
}
