package com.habitai.habitlog;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Validated
@RestController
@RequestMapping("/habits")
public class HabitLogController {

    private final HabitLogService habitLogService;

    public HabitLogController(HabitLogService habitLogService) {
        this.habitLogService = habitLogService;
    }

    @PostMapping("/{habitId}/log")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void updateTodayHabitStatus(@PathVariable long habitId, @Valid @RequestBody HabitLogRequest habitLogRequest) {
        habitLogService.updateTodayHabitStatus(habitId, habitLogRequest);
    }

    @GetMapping("/{habitId}/streak")
    public HabitStreakResponse getCurrentStreak(@PathVariable long habitId) {
        return habitLogService.getCurrentStreak(habitId);
    }

    @GetMapping("/{habitId}/streak/longest")
    public HabitStreakResponse getLongestStreak(@PathVariable long habitId) {
        return habitLogService.getLongestStreak(habitId);
    }

    @GetMapping("/{habitId}/activity")
    public List<HabitActivityStatus> getHabitActivity(
            @PathVariable long habitId,
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate) {
        if (startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("startDate must not be after endDate");
        }
        if (ChronoUnit.DAYS.between(startDate, endDate) > 365) {
            throw new IllegalArgumentException("Date range must not exceed 366 days");
        }
        return habitLogService.getHabitActivity(habitId, startDate, endDate);
    }
}