package com.habitai.habitlog;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "habitlogs",
        uniqueConstraints = @UniqueConstraint(columnNames = {"habitId", "userId", "date"}),
        indexes = {
                @Index(name = "idx_habitlog_habit_user_date", columnList = "habitId, userId, date"),
                @Index(name = "idx_habitlog_habit_user", columnList = "habitId, userId")
        })
public class HabitLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long habitId;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false)
    private LocalDate date;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private HabitStatus status;
}