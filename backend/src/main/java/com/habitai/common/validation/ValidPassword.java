package com.habitai.common.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * SECURITY FIX: Password strength was previously only enforced on the frontend.
 * Anyone calling the API directly could register with a weak password (e.g.
 * "password1234" — no uppercase or special character).
 *
 * This annotation enforces the same rule as the frontend's isStrongPassword():
 *   - Minimum 8 characters
 *   - At least one uppercase letter
 *   - At least one lowercase letter
 *   - At least one digit
 *   - At least one special character (@$!%*?&)
 *
 * Usage: add @ValidPassword to any String field in a Bean Validation-enabled class.
 */
@Documented
@Constraint(validatedBy = PasswordStrengthValidator.class)
@Target({ ElementType.FIELD, ElementType.PARAMETER })
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidPassword {

    String message() default
            "Password must be at least 8 characters and include uppercase, lowercase, a digit, and a special character (@$!%*?&)";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}