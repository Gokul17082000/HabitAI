package com.habitai.auth;

import com.habitai.exception.DatabaseException;
import com.habitai.exception.PasswordDoesNotMatchException;
import com.habitai.exception.UserAlreadyExistException;
import com.habitai.exception.UserNotFoundException;
import com.habitai.user.User;
import com.habitai.user.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenRepository refreshTokenRepository;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       RefreshTokenRepository refreshTokenRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenRepository = refreshTokenRepository;
    }

    @Transactional
    public RegisterResponse register(RegisterRequest registerRequest) {
        // Normalise to lowercase so "User@Gmail.com" and "user@gmail.com" are the same account
        String email = registerRequest.email().trim().toLowerCase();

        if (userRepository.findByEmail(email).isPresent()) {
            throw new UserAlreadyExistException("User already exists!");
        }
        try {
            User user = new User();
            user.setEmail(email);
            user.setPassword(passwordEncoder.encode(registerRequest.password()));
            userRepository.save(user);
        } catch (DataIntegrityViolationException ex) {
            String message = ex.getMostSpecificCause().getMessage().toLowerCase();
            if (message.contains("unique") || message.contains("duplicate")) {
                throw new UserAlreadyExistException("User already exists!");
            }
            throw new DatabaseException("A database error occurred. Please try again.");
        }
        return new RegisterResponse("User Successfully created!");
    }

    @Transactional
    public LoginResponse login(LoginRequest loginRequest) {
        // Normalise to lowercase — matches how email is stored at registration
        String email = loginRequest.email().trim().toLowerCase();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("User Not Found!"));

        if (!passwordEncoder.matches(loginRequest.password(), user.getPassword())) {
            throw new PasswordDoesNotMatchException("Invalid credentials!");
        }

        // Invalidate any existing refresh tokens for this user on new login
        refreshTokenRepository.deleteByUserId(user.getId());

        String rawRefreshToken = jwtService.generateRefreshToken(user);
        persistRefreshToken(rawRefreshToken, user.getId());

        return new LoginResponse(jwtService.generateToken(user), rawRefreshToken);
    }

    @Transactional
    public LoginResponse refresh(RefreshRequest request) {
        String incomingToken = request.refreshToken();

        // Validate JWT signature and expiry first (cheap, no DB hit)
        if (!jwtService.isValidRefreshToken(incomingToken)) {
            throw new IllegalStateException("Invalid or expired refresh token.");
        }

        RefreshToken stored = refreshTokenRepository.findByToken(incomingToken)
                .orElseThrow(() -> new IllegalStateException("Refresh token not recognised."));

        if (stored.isUsed()) {
            // Token reuse detected — possible theft; invalidate all tokens for this user
            refreshTokenRepository.deleteByUserId(stored.getUserId());
            throw new IllegalStateException("Refresh token already used. Please log in again.");
        }

        if (stored.isExpired()) {
            refreshTokenRepository.delete(stored);
            throw new IllegalStateException("Refresh token expired. Please log in again.");
        }

        // Mark old token as used (rotation — one-time use)
        stored.setUsed(true);
        refreshTokenRepository.save(stored);

        User user = userRepository.findById(stored.getUserId())
                .orElseThrow(() -> new UserNotFoundException("User Not Found!"));

        String newRawRefreshToken = jwtService.generateRefreshToken(user);
        persistRefreshToken(newRawRefreshToken, user.getId());

        return new LoginResponse(jwtService.generateToken(user), newRawRefreshToken);
    }

    @Transactional
    public void logout(long userId) {
        // Invalidate all refresh tokens — access token expires naturally within its TTL
        refreshTokenRepository.deleteByUserId(userId);
    }

    private void persistRefreshToken(String rawToken, Long userId) {
        Instant expiresAt = Instant.now().plusMillis(jwtService.getRefreshExpiration());
        refreshTokenRepository.save(new RefreshToken(rawToken, userId, expiresAt));
    }
}