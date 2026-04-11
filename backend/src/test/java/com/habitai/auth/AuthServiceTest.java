package com.habitai.auth;

import com.habitai.exception.DatabaseException;
import com.habitai.exception.PasswordDoesNotMatchException;
import com.habitai.exception.UserAlreadyExistException;
import com.habitai.exception.UserNotFoundException;
import com.habitai.user.User;
import com.habitai.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @InjectMocks
    private AuthService authService;

    private RegisterRequest authRequest;
    private LoginRequest loginRequest;
    private User mockUser;

    @BeforeEach
    void setUp() {
        authRequest = new RegisterRequest("test@example.com", "password123");
        loginRequest = new LoginRequest("test@example.com", "password123");

        mockUser = new User();
        mockUser.setId(1L);
        mockUser.setEmail("test@example.com");
        mockUser.setPassword("encodedPassword123");
    }

    // --- TESTS FOR REGISTER ---

    @Test
    void register_WhenUserDoesNotExist_ShouldRegisterSuccessfully() {
        when(userRepository.findByEmail(authRequest.email())).thenReturn(Optional.empty());
        when(passwordEncoder.encode(authRequest.password())).thenReturn("encodedPassword");
        
        RegisterResponse response = authService.register(authRequest);
        
        assertNotNull(response);
        assertEquals("User Successfully created!", response.message());
        
        verify(userRepository).save(any(User.class));
    }

    @Test
    void register_WhenUserAlreadyExists_ShouldThrowUserAlreadyExistException() {
        when(userRepository.findByEmail(authRequest.email())).thenReturn(Optional.of(mockUser));
        
        assertThrows(UserAlreadyExistException.class, () -> authService.register(authRequest));
        
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void register_WhenDatabaseThrowsUniqueConstraintViolation_ShouldThrowUserAlreadyExistException() {
        when(userRepository.findByEmail(authRequest.email())).thenReturn(Optional.empty());
        when(passwordEncoder.encode(authRequest.password())).thenReturn("encodedPassword");
        
        DataIntegrityViolationException dbException = new DataIntegrityViolationException(
                "Error", new Throwable("duplicate key value violates unique constraint"));
        
        when(userRepository.save(any(User.class))).thenThrow(dbException);
        
        assertThrows(UserAlreadyExistException.class, () -> authService.register(authRequest));
    }
    
    @Test
    void register_WhenDatabaseThrowsOtherViolation_ShouldThrowDatabaseException() {
        when(userRepository.findByEmail(authRequest.email())).thenReturn(Optional.empty());
        when(passwordEncoder.encode(authRequest.password())).thenReturn("encodedPassword");
        
        DataIntegrityViolationException dbException = new DataIntegrityViolationException(
                "Error", new Throwable("some other db error constraint"));
        
        when(userRepository.save(any(User.class))).thenThrow(dbException);
        
        assertThrows(DatabaseException.class, () -> authService.register(authRequest));
    }

    // --- TESTS FOR LOGIN ---

    @Test
    void login_WithValidCredentials_ShouldReturnJwtToken() {
        when(userRepository.findByEmail(authRequest.email())).thenReturn(Optional.of(mockUser));
        when(passwordEncoder.matches(authRequest.password(), mockUser.getPassword())).thenReturn(true);
        when(jwtService.generateToken(mockUser)).thenReturn("mock.access.token");
        when(jwtService.generateRefreshToken(mockUser)).thenReturn("mock.refresh.token");
        // login() always invalidates existing refresh tokens and stores the new one
        doNothing().when(refreshTokenRepository).deleteByUserId(mockUser.getId());
        lenient().when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(inv -> inv.getArgument(0));

        LoginResponse response = authService.login(loginRequest);

        assertNotNull(response);
        assertEquals("mock.access.token", response.accessToken());
        assertEquals("mock.refresh.token", response.refreshToken());
    }

    @Test
    void login_WhenUserNotFound_ShouldThrowUserNotFoundException() {
        when(userRepository.findByEmail(authRequest.email())).thenReturn(Optional.empty());
        
        assertThrows(UserNotFoundException.class, () -> authService.login(loginRequest));
        
        verify(passwordEncoder, never()).matches(anyString(), anyString());
        verify(jwtService, never()).generateToken(any(User.class));
    }

    @Test
    void login_WithInvalidPassword_ShouldThrowPasswordDoesNotMatchException() {
        when(userRepository.findByEmail(authRequest.email())).thenReturn(Optional.of(mockUser));
        when(passwordEncoder.matches(authRequest.password(), mockUser.getPassword())).thenReturn(false);
        
        assertThrows(PasswordDoesNotMatchException.class, () -> authService.login(loginRequest));
        
        verify(jwtService, never()).generateToken(any(User.class));
    }
}