package com.habitai.habitlog;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "habit_log",
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

    @Column(nullable = false)
    private int currentCount = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private HabitStatus status;

    @Column(length = 300)
    private String note;
}