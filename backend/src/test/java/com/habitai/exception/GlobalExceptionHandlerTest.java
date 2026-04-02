package com.habitai.exception;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler globalExceptionHandler;

    @BeforeEach
    void setUp() {
        globalExceptionHandler = new GlobalExceptionHandler();
    }

    @Test
    void handleUserAlreadyExist_shouldReturn409Conflict() {
        // Arrange
        String message = "User already exists";
        UserAlreadyExistException exception = new UserAlreadyExistException(message);

        // Act
        ResponseEntity<ApiErrorResponse> response = globalExceptionHandler.handleUserAlreadyExist(exception);

        // Assert
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(message, response.getBody().message());
        assertEquals(HttpStatus.CONFLICT.value(), response.getBody().status());
        assertNotNull(response.getBody().timestamp());
    }

    @Test
    void handleUserNotFound_shouldReturn404NotFound() {
        // Arrange
        String message = "User not found";
        UserNotFoundException exception = new UserNotFoundException(message);

        // Act
        ResponseEntity<ApiErrorResponse> response = globalExceptionHandler.handleUserNotFound(exception);

        // Assert
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(message, response.getBody().message());
        assertEquals(HttpStatus.NOT_FOUND.value(), response.getBody().status());
        assertNotNull(response.getBody().timestamp());
    }

    @Test
    void handlePasswordMismatch_shouldReturn401Unauthorized() {
        // Arrange
        String message = "Password does not match";
        PasswordDoesNotMatchException exception = new PasswordDoesNotMatchException(message);

        // Act
        ResponseEntity<ApiErrorResponse> response = globalExceptionHandler.handlePasswordMismatch(exception);

        // Assert
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(message, response.getBody().message());
        assertEquals(HttpStatus.UNAUTHORIZED.value(), response.getBody().status());
        assertNotNull(response.getBody().timestamp());
    }

    @Test
    void handleHabitNotFound_shouldReturn404NotFound() {
        // Arrange
        String message = "Habit not found";
        HabitNotFoundException exception = new HabitNotFoundException(message);

        // Act
        ResponseEntity<ApiErrorResponse> response = globalExceptionHandler.handleHabitNotFound(exception);

        // Assert
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(message, response.getBody().message());
        assertEquals(HttpStatus.NOT_FOUND.value(), response.getBody().status());
        assertNotNull(response.getBody().timestamp());
    }

    @Test
    void handleHabitLogNotFound_shouldReturn404NotFound() {
        // Arrange
        String message = "Habit log not found";
        HabitLogNotFoundException exception = new HabitLogNotFoundException(message);

        // Act
        ResponseEntity<ApiErrorResponse> response = globalExceptionHandler.handleHabitLogNotFound(exception);

        // Assert
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(message, response.getBody().message());
        assertEquals(HttpStatus.NOT_FOUND.value(), response.getBody().status());
        assertNotNull(response.getBody().timestamp());
    }

    @Test
    void handleAccessDenied_shouldReturn403Forbidden() {
        // Arrange
        String message = "Unauthorized habit access";
        AccessDeniedException exception = new AccessDeniedException(message);

        // Act
        ResponseEntity<ApiErrorResponse> response = globalExceptionHandler.handleAccessDenied(exception);

        // Assert
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(message, response.getBody().message());
        assertEquals(HttpStatus.FORBIDDEN.value(), response.getBody().status());
        assertNotNull(response.getBody().timestamp());
    }

    @Test
    void handleDatabaseException_shouldReturn500InternalServerError() {
        // Arrange
        String message = "Database error occurred";
        DatabaseException exception = new DatabaseException(message);

        // Act
        ResponseEntity<ApiErrorResponse> response = globalExceptionHandler.handleDatabaseException(exception);

        // Assert
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(message, response.getBody().message());
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR.value(), response.getBody().status());
        assertNotNull(response.getBody().timestamp());
    }

    @Test
    void handleIllegalState_shouldReturn400BadRequest() {
        // Arrange
        String message = "Invalid state";
        IllegalStateException exception = new IllegalStateException(message);

        // Act
        ResponseEntity<ApiErrorResponse> response = globalExceptionHandler.handleIllegalState(exception);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(message, response.getBody().message());
        assertEquals(HttpStatus.BAD_REQUEST.value(), response.getBody().status());
        assertNotNull(response.getBody().timestamp());
    }

    @Test
    void handleIllegalArgument_shouldReturn400BadRequest() {
        // Arrange
        String message = "Invalid argument";
        IllegalArgumentException exception = new IllegalArgumentException(message);

        // Act
        ResponseEntity<ApiErrorResponse> response = globalExceptionHandler.handleIllegalArgument(exception);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(message, response.getBody().message());
        assertEquals(HttpStatus.BAD_REQUEST.value(), response.getBody().status());
        assertNotNull(response.getBody().timestamp());
    }

    @Test
    void handleValidationExceptions_shouldReturn400BadRequest() {
        // Arrange
        MethodArgumentNotValidException exception = mock(MethodArgumentNotValidException.class);

        // Act
        ResponseEntity<ApiErrorResponse> response = globalExceptionHandler.handleValidationExceptions(exception);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(HttpStatus.BAD_REQUEST.value(), response.getBody().status());
        assertNotNull(response.getBody().timestamp());
    }

    @Test
    void handleGenericException_shouldReturn500InternalServerError() {
        // Arrange
        Exception exception = new RuntimeException("Unexpected error");

        // Act
        ResponseEntity<ApiErrorResponse> response = globalExceptionHandler.handleGenericException(exception);

        // Assert
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("Something went wrong", response.getBody().message());
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR.value(), response.getBody().status());
        assertNotNull(response.getBody().timestamp());
    }
}