package com.habitai.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.habitai.habit.Habit;
import com.habitai.habit.HabitRequest;
import com.habitai.habit.HabitRepository;
import com.habitai.common.security.CurrentUser;
import com.habitai.user.UserStatsService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Service
public class AiService {

    @Value("${grok.api.key}")
    private String apiKey;

    @Value("${grok.api.url}")
    private String apiUrl;

    private final HabitRepository habitRepository;
    private final CurrentUser currentUser;
    private final UserStatsService userStatsService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AiService(HabitRepository habitRepository,
                     CurrentUser currentUser,
                     UserStatsService userStatsService) {
        this.habitRepository = habitRepository;
        this.currentUser = currentUser;
        this.userStatsService = userStatsService;
    }

    public List<HabitRequest> suggestHabits(String goal) {
        List<String> existingTitles = habitRepository
                .findByUserId(currentUser.getId())
                .stream().map(Habit::getTitle).toList();

        String systemPrompt = """
            You are a habit coach. Return ONLY a valid JSON array of habits, no explanation.
            Each object must have exactly these fields:
            title (string), description (string), category (one of: GENERAL, HEALTH, FITNESS, WORK, LEARNING),
            frequency (one of: DAILY, WEEKLY, MONTHLY), targetTime (HH:mm:ss format),
            targetCount (integer 1-100), isCountable (boolean),
            daysOfWeek (array of MONDAY-SUNDAY, only if WEEKLY, else null),
            daysOfMonth (array of integers 1-31, only if MONTHLY, else null).
            """;

        String userMessage = String.format("""
            Goal: %s
            User's existing habits: %s
            Suggest 3 to 5 new habits that complement and avoid duplicating existing ones.
            """, goal, existingTitles.isEmpty() ? "none" : String.join(", ", existingTitles));

        String response = callGrok(systemPrompt, userMessage);

        try {
            return objectMapper.readValue(response,
                    objectMapper.getTypeFactory().constructCollectionType(List.class, HabitRequest.class));
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse Grok response: " + e.getMessage());
        }
    }

    public InsightResponse getInsights() {
        var stats = userStatsService.getStats();

        String systemPrompt = """
            You are a habit coach giving a weekly insight. Be specific, concise, and actionable.
            Write 2-3 sentences max. No bullet points. Talk directly to the user.
            """;

        String userMessage = String.format("""
            Total habits: %d
            Overall consistency: %d%%
            Current streak: %d days
            Longest streak: %d days
            Total completed: %d
            Total missed: %d
            Top habits: %s
            Give a personalised coaching insight based on this data.
            """,
                stats.totalHabits(), stats.overallConsistency(),
                stats.currentStreak(), stats.longestStreak(),
                stats.totalCompleted(), stats.totalMissed(),
                stats.topHabits().stream().map(h -> h.title() + " (" + h.consistencyPercent() + "%)").toList()
        );

        String insight = callGrok(systemPrompt, userMessage);
        return new InsightResponse(insight);
    }

    private String callGrok(String systemPrompt, String userMessage) {
        RestClient client = RestClient.create();

        Map<String, Object> body = Map.of(
                "model", "grok-3-mini",
                "max_tokens", 1000,
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userMessage)
                )
        );

        String responseBody = client.post()
                .uri(apiUrl)
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .body(body)
                .retrieve()
                .body(String.class);

        try {
            JsonNode root = objectMapper.readTree(responseBody);
            return root.path("choices").get(0).path("message").path("content").asText();
        } catch (Exception e) {
            throw new RuntimeException("Failed to read Grok response");
        }
    }

    public String generateWeeklyDigest(String habitSummary,
                                       long totalCompleted,
                                       long totalScheduled,
                                       int overallPct) {
        String systemPrompt = """
        You are a habit coach sending a Sunday weekly recap notification.
        Write exactly 2-3 sentences. Be specific, warm, and actionable.
        Mention the weakest habit by name and suggest one concrete fix.
        No bullet points. No emojis. Plain text only — it's a push notification body.
        Keep it under 200 characters so it doesn't get truncated.
        """;

        String userMessage = String.format("""
        This week's summary:
        %s
        Overall: %d of %d habits completed (%d%%).
        Write a personalised coaching recap for this user.
        """, habitSummary, totalCompleted, totalScheduled, overallPct);

        return callGrok(systemPrompt, userMessage);
    }
}