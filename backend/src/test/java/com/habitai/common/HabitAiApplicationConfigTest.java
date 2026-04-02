package com.habitai.common;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.*;

class HabitAiApplicationConfigTest {

    private final HabitAiApplicationConfig config = new HabitAiApplicationConfig();

    @Test
    void testPasswordEncoderBeanIsCreated() {
        PasswordEncoder passwordEncoder = config.passwordEncoder();
        assertNotNull(passwordEncoder);
    }

    @Test
    void testPasswordEncoderIsBCryptPasswordEncoder() {
        PasswordEncoder passwordEncoder = config.passwordEncoder();
        assertInstanceOf(BCryptPasswordEncoder.class, passwordEncoder);
    }

    @Test
    void testPasswordEncoderCanEncodePassword() {
        PasswordEncoder passwordEncoder = config.passwordEncoder();
        String rawPassword = "testPassword123";
        String encodedPassword = passwordEncoder.encode(rawPassword);
        assertTrue(passwordEncoder.matches(rawPassword, encodedPassword));
    }
}