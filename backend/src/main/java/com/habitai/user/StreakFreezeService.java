package com.habitai.user;

import com.habitai.common.security.CurrentUser;
import com.habitai.exception.UserNotFoundException;
import com.habitai.habitlog.HabitLogRepository;
import com.habitai.habitlog.HabitStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;

@Service
public class StreakFreezeService {

    private static final int MAX_FREEZES = 2;

    private final UserRepository userRepository;
    private final StreakFreezeUsageRepository freezeUsageRepository;
    private final HabitLogRepository habitLogRepository;
    private final CurrentUser currentUser;

    public StreakFreezeService(UserRepository userRepository,
                               StreakFreezeUsageRepository freezeUsageRepository,
                               HabitLogRepository habitLogRepository,
                               CurrentUser currentUser) {
        this.userRepository = userRepository;
        this.freezeUsageRepository = freezeUsageRepository;
        this.habitLogRepository = habitLogRepository;
        this.currentUser = currentUser;
    }

    @Transactional(readOnly = true)
    public StreakFreezeResponse getFreezeStatus() {
        long userId = currentUser.getId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found"));
        return new StreakFreezeResponse(user.getStreakFreezes(), MAX_FREEZES);
    }

    @Transactional
    public StreakFreezeResponse useFreeze(LocalDate date) {
        long userId = currentUser.getId();
        ZoneId zone = currentUser.getZone();
        LocalDate today = LocalDate.now(zone);
        LocalDate yesterday = today.minusDays(1);

        // Only allow freezing yesterday or today
        if (!date.isEqual(today) && !date.isEqual(yesterday)) {
            throw new IllegalStateException(
                    "Freeze can only be applied to today or yesterday.");
        }

        // Check already frozen
        if (freezeUsageRepository.existsByUserIdAndUsedOn(userId, date)) {
            throw new IllegalStateException("This date is already frozen.");
        }

        // Only allow freeze if the user actually missed a habit on that date
        if (!habitLogRepository.existsByUserIdAndDateAndStatus(userId, date, HabitStatus.MISSED)) {
            throw new IllegalStateException("No missed habits on this date. Freeze not needed.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        if (user.getStreakFreezes() <= 0) {
            throw new IllegalStateException("No streak freezes available.");
        }

        user.setStreakFreezes(user.getStreakFreezes() - 1);
        userRepository.save(user);
        freezeUsageRepository.save(new StreakFreezeUsage(userId, date));

        return new StreakFreezeResponse(user.getStreakFreezes(), MAX_FREEZES);
    }

    /**
     * Called by the scheduler after every 7 consecutive completed days.
     * Awards 1 freeze up to the MAX_FREEZES cap.
     */
    @Transactional
    public void awardFreezeIfEarned(long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        if (user.getStreakFreezes() < MAX_FREEZES) {
            user.setStreakFreezes(user.getStreakFreezes() + 1);
            userRepository.save(user);
        }
    }
}