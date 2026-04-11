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

    public UserController(UserService userService, UserStatsService userStatsService) {
        this.userService = userService;
        this.userStatsService = userStatsService;
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
}