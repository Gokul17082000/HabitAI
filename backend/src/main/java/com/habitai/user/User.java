package com.habitai.user;

import com.habitai.common.AppConstants;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

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

    // Stores the user's IANA timezone string (e.g. "Asia/Kolkata", "America/New_York").
    // Defaults to "Asia/Kolkata" for existing users who were created before this column was added.
    @Column(nullable = false, length = 100)
    private String timezone = "Asia/Kolkata";

    @PrePersist
    public void prePersist(){
        createdAt = LocalDateTime.now(AppConstants.APP_ZONE);
    }
}