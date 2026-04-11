package com.habitai.auth;

import com.habitai.common.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;
    private final CurrentUser currentUser;

    public AuthController(AuthService authService, CurrentUser currentUser) {
        this.authService = authService;
        this.currentUser = currentUser;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public RegisterResponse register(@Valid @RequestBody AuthRequest authRequest) {
        return authService.register(authRequest);
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody AuthRequest authRequest) {
        return authService.login(authRequest);
    }

    @PostMapping("/refresh")
    public LoginResponse refresh(@Valid @RequestBody RefreshRequest request) {
        return authService.refresh(request);
    }

    /**
     * Logout: invalidates all refresh tokens for the authenticated user.
     * The access token remains technically valid until it expires (JWT is stateless),
     * but with all refresh tokens gone the session cannot be extended — it naturally
     * expires within the access token TTL (default 15 minutes).
     *
     * Requires a valid access token (authenticated endpoint).
     */
    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout() {
        authService.logout(currentUser.getId());
    }
}