package com.habitai.user;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "streak_freeze_usage",
        uniqueConstraints = @UniqueConstraint(name = "uq_freeze_user_date", columnNames = {"userId", "usedOn"}))
public class StreakFreezeUsage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false)
    private LocalDate usedOn;

    public StreakFreezeUsage(Long userId, LocalDate usedOn) {
        this.userId = userId;
        this.usedOn = usedOn;
    }
}