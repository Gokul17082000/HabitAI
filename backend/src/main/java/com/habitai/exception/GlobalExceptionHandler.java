package com.habitai.exception;

import lombok.NonNull;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.time.LocalDateTime;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private ApiErrorResponse error(String message, HttpStatus status) {
        return new ApiErrorResponse(message, status.value(), LocalDateTime.now());
    }

    @ExceptionHandler(UserAlreadyExistException.class)
    public ResponseEntity<ApiErrorResponse> handlerUserAlreadyExist(UserAlreadyExistException userAlreadyExistException){
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error(userAlreadyExistException.getMessage(), HttpStatus.CONFLICT));
    }

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handlerUserNotFound(UserNotFoundException userNotFoundException){
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error(userNotFoundException.getMessage(), HttpStatus.NOT_FOUND));
    }

    @ExceptionHandler(PasswordDoesNotMatchException.class)
    public ResponseEntity<ApiErrorResponse> handlePasswordMismatch(PasswordDoesNotMatchException passwordDoesNotMatchException){
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error(passwordDoesNotMatchException.getMessage(), HttpStatus.UNAUTHORIZED));
    }

    @ExceptionHandler(HabitNotFoundException.class)
    public ResponseEntity<@NonNull ApiErrorResponse> handlerHabitNotFound(HabitNotFoundException habitNotFoundException){
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error(habitNotFoundException.getMessage(), HttpStatus.NOT_FOUND));
    }

    @ExceptionHandler(HabitLogNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handlerHabitLogNotFound(HabitLogNotFoundException habitLogNotFoundException){
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error(habitLogNotFoundException.getMessage(), HttpStatus.NOT_FOUND));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiErrorResponse> handlerAccessDenied(AccessDeniedException accessDeniedException){
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error(accessDeniedException.getMessage(), HttpStatus.FORBIDDEN));
    }

    @ExceptionHandler(HabitDayOfWeekNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handlerDayOfWeekNotFound(HabitDayOfWeekNotFoundException habitDayOfWeekNotFoundException){
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error(habitDayOfWeekNotFoundException.getMessage(), HttpStatus.NOT_FOUND));
    }

    @ExceptionHandler(HabitDayOfMonthNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handlerDayOfMonthNotFound(HabitDayOfMonthNotFoundException habitDayOfMonthNotFoundException){
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error(habitDayOfMonthNotFoundException.getMessage(), HttpStatus.NOT_FOUND));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleGenericException(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error("Something went wrong", HttpStatus.INTERNAL_SERVER_ERROR));
    }
}
