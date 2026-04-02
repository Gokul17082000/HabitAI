package com.habitai.auth;

import com.habitai.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    private JwtService jwtService;
    private User mockUser;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        
        String testSecret = "dGhpc2lzYXZlcnlzZWN1cmVzZWNyZXRrZXl0aGF0aXMzMmJ5dGVzbG9uZw==";
        
        ReflectionTestUtils.setField(jwtService, "secretKey", testSecret);
        ReflectionTestUtils.setField(jwtService, "expiration", 1000 * 60 * 60L); // 1 hour

        mockUser = new User();
        mockUser.setId(100L);
        mockUser.setEmail("test@habitai.com");
    }

    @Test
    void generateToken_ShouldReturnValidJwtString() {
        String token = jwtService.generateToken(mockUser);
        assertNotNull(token);
        assertFalse(token.isBlank());
    }

    @Test
    void extractUserId_ShouldReturnCorrectId() {
        String token = jwtService.generateToken(mockUser);
        String extractedUserId = jwtService.extractUserId(token);
        
        assertEquals("100", extractedUserId);
    }

    @Test
    void isValidJwtToken_WithValidToken_ShouldReturnTrue() {
        String token = jwtService.generateToken(mockUser);
        assertTrue(jwtService.isValidJwtToken(token));
    }

    @Test
    void isValidJwtToken_WithInvalidToken_ShouldReturnFalse() {
        assertFalse(jwtService.isValidJwtToken("this.is.not.a.valid.token"));
    }

    @Test
    void isValidJwtToken_WithExpiredToken_ShouldReturnFalse() throws InterruptedException {
        ReflectionTestUtils.setField(jwtService, "expiration", 1L);
        String token = jwtService.generateToken(mockUser);
        
        Thread.sleep(10);
        
        assertFalse(jwtService.isValidJwtToken(token));
    }
}