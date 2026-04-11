package com.habitai.auth;

import com.habitai.common.validation.ValidPassword;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record AuthRequest(
        @Email @NotBlank String email,
        // SECURITY FIX: @Size(min=8) only checked length — frontend's strong-password
        // rule (uppercase + lowercase + digit + special char) was never enforced here.
        // @ValidPassword mirrors the frontend regex so the rule holds for all clients.
        @NotBlank @ValidPassword String password
) {}