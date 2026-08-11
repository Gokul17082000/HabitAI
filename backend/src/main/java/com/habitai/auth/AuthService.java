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

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;

@Service
public class AuthService {

    // A valid BCrypt hash used only to perform a constant-time dummy comparison when the
    // supplied email doesn't exist. Without this, an unknown email returns much faster than a
    // known email with a wrong password, leaking account existence via a timing side-channel.
    private static final String DUMMY_BCRYPT_HASH =
            "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

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
            // Covers the concurrent-registration race that the findByEmail check above can't prevent.
            // Hibernate translates PostgreSQL unique-constraint violations to DataIntegrityViolationException
            // (not DuplicateKeyException, which is only thrown by Spring's JDBC template layer).
            String cause = ex.getMostSpecificCause().getMessage();
            if (cause != null) {
                String lower = cause.toLowerCase();
                if (lower.contains("unique") || lower.contains("duplicate") || lower.contains("uk_user_email")) {
                    throw new UserAlreadyExistException("User already exists!");
                }
            }
            throw new DatabaseException("A database error occurred. Please try again.");
        }
        return new RegisterResponse("User Successfully created!");
    }

    @Transactional
    public LoginResponse login(LoginRequest loginRequest) {
        // Normalise to lowercase — matches how email is stored at registration
        String email = loginRequest.email().trim().toLowerCase();

        // Return an identical error for both "unknown email" and "wrong password" so an attacker
        // cannot enumerate which emails are registered. When the email is unknown we still run a
        // password comparison against a dummy hash to keep the response time constant.
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            passwordEncoder.matches(loginRequest.password(), DUMMY_BCRYPT_HASH);
            throw new PasswordDoesNotMatchException("Invalid email or password.");
        }

        User user = userOpt.get();
        if (!passwordEncoder.matches(loginRequest.password(), user.getPassword())) {
            throw new PasswordDoesNotMatchException("Invalid email or password.");
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

        RefreshToken stored = refreshTokenRepository.findByToken(hashToken(incomingToken))
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
        // Store only the SHA-256 hash — a leaked DB dump then contains no usable tokens.
        // The raw token lives only on the client. Tokens are high-entropy JWTs, so an
        // unsalted cryptographic hash is sufficient (no offline guessing is feasible).
        refreshTokenRepository.save(new RefreshToken(hashToken(rawToken), userId, expiresAt));
    }

    private static String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            // SHA-256 is guaranteed present on every JVM — this can never happen.
            throw new IllegalStateException("SHA-256 algorithm not available", e);
        }
    }
}