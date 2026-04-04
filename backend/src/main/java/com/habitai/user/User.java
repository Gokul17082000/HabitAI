package com.habitai.user;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.time.ZoneId;

@Getter
@Setter
@Entity
@NoArgsConstructor
@Table(name = "users", uniqueConstraints = {@UniqueConstraint(name = "uk_user_email", columnNames = "email")})
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column
    private String pushToken;

    @PrePersist
    public void prePersist(){
        createdAt = LocalDateTime.now(ZoneId.of("Asia/Kolkata"));
    }
}
