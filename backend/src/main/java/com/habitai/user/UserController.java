package com.habitai.user;

import com.habitai.notification.PushTokenRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/user")
public class UserController {

    private final UserService userService;
    private final UserStatsService userStatsService;
    private final StreakFreezeService  streakFreezeService;

    public UserController(UserService userService, UserStatsService userStatsService,  StreakFreezeService streakFreezeService) {
        this.userService = userService;
        this.userStatsService = userStatsService;
        this.streakFreezeService = streakFreezeService;
    }

    @GetMapping
    public UserDTO getUserDetails() {
        return userService.getUserDetails();
    }

    @GetMapping("/stats")
    public UserStatsResponse getStats() {
        return userStatsService.getStats();
    }

    @PostMapping("/push-token")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void savePushToken(@Valid @RequestBody PushTokenRequest request) {
        userService.savePushToken(request.token());
    }

    @GetMapping("/year-pixels")
    public Map<String, String> getYearPixels() {
        return userStatsService.getYearPixels();
    }

    @GetMapping("/weekly-review")
    public WeeklyReviewResponse getWeeklyReview() {
        return userStatsService.getWeeklyReview();
    }

    @GetMapping("/streak-freeze")
    public StreakFreezeResponse getFreezeStatus() {
        return streakFreezeService.getFreezeStatus();
    }

    @PostMapping("/streak-freeze/use")
    public StreakFreezeResponse useFreeze(@RequestBody @Valid UseFreezeRequest request) {
        return streakFreezeService.useFreeze(request.date());
    }
}