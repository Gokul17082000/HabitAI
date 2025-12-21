package com.habitai.exception;

public class PasswordDoesNotMatchException extends RuntimeException{

    public PasswordDoesNotMatchException(String message){
        super(message);
    }
}
