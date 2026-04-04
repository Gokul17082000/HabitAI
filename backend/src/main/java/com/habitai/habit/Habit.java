package com.habitai.habit;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.Set;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "habits",
        indexes = {
                @Index(name = "idx_habit_user", columnList = "userId"),
                @Index(name = "idx_habit_time", columnList = "targetTime")
        })
public class Habit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(length = 100)
    private String description;

    @Column(nullable = false, length = 100)
    private String category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private HabitFrequency frequency;

    @ElementCollection(fetch = FetchType.EAGER)
    @Enumerated(EnumType.STRING)
    @CollectionTable(
            name = "habit_days_of_week",
            joinColumns = @JoinColumn(name = "habit_id")
    )
    private Set<DayOfWeek> daysOfWeek;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
            name = "habit_days_of_month",
            joinColumns = @JoinColumn(name = "habit_id")
    )
    private Set<Integer> daysOfMonth;

    @Column(nullable = false)
    private LocalTime targetTime;

    @Column(nullable = false)
    private int targetCount = 1;

    @Column(nullable = false)
    private boolean isCountable = false;

    @Column(nullable = false)
    private boolean paused = false;

    @Column
    private LocalDate pausedUntil;

    @Column(nullable = false)
    private LocalDate createdAt;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDate.now(ZoneId.of("Asia/Kolkata"));
    }
}