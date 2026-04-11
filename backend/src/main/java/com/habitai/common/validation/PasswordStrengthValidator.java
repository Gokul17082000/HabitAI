package com.habitai.common.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.regex.Pattern;

/**
 * Validates that a password meets the strength requirements defined in @ValidPassword.
 *
 * The regex mirrors frontend/utils/validation.ts isStrongPassword() exactly so
 * the rule is enforced consistently regardless of which client calls the API.
 *
 * Pattern breakdown:
 *   (?=.*[a-z])        — at least one lowercase letter
 *   (?=.*[A-Z])        — at least one uppercase letter
 *   (?=.*\d)           — at least one digit
 *   (?=.*[@$!%*?&])    — at least one special character
 *   [A-Za-z\d@$!%*?&]{8,}  — only allowed characters, min 8 length
 */
public class PasswordStrengthValidator implements ConstraintValidator<ValidPassword, String> {

    private static final Pattern STRONG_PASSWORD = Pattern.compile(
            "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$"
    );

    @Override
    public boolean isValid(String password, ConstraintValidatorContext context) {
        if (password == null) return false;
        return STRONG_PASSWORD.matcher(password).matches();
    }
}