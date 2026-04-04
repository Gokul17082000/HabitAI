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

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public RegisterResponse register(AuthRequest authRequest) {
        if (userRepository.findByEmail(authRequest.email()).isPresent()) {
            throw new UserAlreadyExistException("User already exists!");
        }
        try {
            User user = new User();
            user.setEmail(authRequest.email());
            user.setPassword(passwordEncoder.encode(authRequest.password()));
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

    public LoginResponse login(AuthRequest authRequest) {
        User user = userRepository.findByEmail(authRequest.email())
                .orElseThrow(() -> new UserNotFoundException("User Not Found!"));

        if (!passwordEncoder.matches(authRequest.password(), user.getPassword())) {
            throw new PasswordDoesNotMatchException("Invalid credentials!");
        }

        return new LoginResponse(
                jwtService.generateToken(user),
                jwtService.generateRefreshToken(user)
        );
    }

    public LoginResponse refresh(RefreshRequest request) {
        String token = request.refreshToken();
        if (!jwtService.isValidRefreshToken(token)) {
            throw new IllegalStateException("Invalid or expired refresh token.");
        }
        String userId = jwtService.extractUserId(token);
        User user = userRepository.findById(Long.parseLong(userId))
                .orElseThrow(() -> new UserNotFoundException("User Not Found!"));

        return new LoginResponse(
                jwtService.generateToken(user),
                jwtService.generateRefreshToken(user)
        );
    }
}
