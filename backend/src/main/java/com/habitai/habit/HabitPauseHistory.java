package com.habitai.habit;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "habit_pause_history")
public class HabitPauseHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long habitId;

    @Column(nullable = false)
    private LocalDate pausedFrom;

    @Column(nullable = false)
    private LocalDate pausedUntil;
}