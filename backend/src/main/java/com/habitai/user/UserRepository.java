package com.habitai.user;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM User u WHERE u.id = :id")
    Optional<User> findByIdForUpdate(@Param("id") Long id);

    /** Batch-loads users by a set of IDs — avoids N+1 in the notification scheduler. */
    List<User> findByIdIn(Collection<Long> ids);

    /** Only loads users with a registered push token — used by the weekly digest scheduler. */
    List<User> findByPushTokenNotNull();
}