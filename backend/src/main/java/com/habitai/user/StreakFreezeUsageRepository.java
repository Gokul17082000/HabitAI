package com.habitai.user;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Set;

public interface StreakFreezeUsageRepository extends JpaRepository<StreakFreezeUsage, Long> {

    Set<LocalDate> findUsedOnByUserId(Long userId);

    boolean existsByUserIdAndUsedOn(Long userId, LocalDate usedOn);
}