package com.habitai.ai;

import com.habitai.habit.HabitRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/ai")
public class AiController {

    private final AiService aiService;

    public AiController(AiService aiService) {
        this.aiService = aiService;
    }

    @PostMapping("/suggest")
    public List<HabitRequest> suggestHabits(@Valid @RequestBody GoalRequest request) {
        return aiService.suggestHabits(request.goal());
    }

    @GetMapping("/insights")
    public InsightResponse getInsights() {
        return aiService.getInsights();
    }
}