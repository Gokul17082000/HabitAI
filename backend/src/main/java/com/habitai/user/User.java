package com.habitai.user;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@Entity
@NoArgsConstructor
// The uk_user_email unique constraint is now enforced by the case-insensitive
// index uk_user_email_ci (lower(email)) added in V3 migration.
// The JPA-level constraint here is kept for schema documentation only.
@Table(name = "users", uniqueConstraints = {@UniqueConstraint(name = "uk_user_email", columnNames = "email")})
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String email;

    @Column(nullable = false)
    private String password;

    /**
     * MINOR FIX: was LocalDateTime populated with LocalDateTime.now(APP_ZONE).
     * LocalDateTime has no timezone information — if the server timezone ever
     * changed, stored timestamps would become ambiguous.
     *
     * Instant is an absolute UTC moment, unambiguous regardless of server config.
     * Mapped to TIMESTAMPTZ in Postgres (see V4 migration).
     */
    @Column(nullable = false)
    private Instant createdAt;

    @Column
    private String pushToken;

    @Column(nullable = false, length = 100)
    private String timezone = "Asia/Kolkata";

    @PrePersist
    public void prePersist() {
        createdAt = Instant.now();
    }
}