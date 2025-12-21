package com.habitai.exception;


public class HabitNotFoundException extends RuntimeException{

    public HabitNotFoundException(String message){
        super(message);
    }
}
