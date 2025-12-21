package com.habitai.habitlog;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;

@Data
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
    private long id;

    @Column(nullable = false)
    private long habitId;

    @Column(nullable = false)
    private long userId;

    @Column(nullable = false)
    private LocalDate date;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private HabitStatus status;
}
