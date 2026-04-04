package com.habitai.user;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    /** Batch-loads users by a set of IDs — avoids N+1 in the notification scheduler. */
    List<User> findByIdIn(Collection<Long> ids);
}
