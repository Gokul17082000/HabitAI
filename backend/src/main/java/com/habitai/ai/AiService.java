package com.habitai.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.habitai.habit.*;
import com.habitai.common.security.CurrentUser;
import com.habitai.user.UserStatsService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class AiService {

    @Value("${groq.api.key}")
    private String apiKey;

    @Value("${groq.api.url}")
    private String apiUrl;

    private final HabitRepository habitRepository;
    private final CurrentUser currentUser;
    private final UserStatsService userStatsService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // FIX: configure explicit connect + read timeouts so a slow or unresponsive
    // Groq API does not block the request thread indefinitely.
    // Connect timeout: 5s — fail fast if the host is unreachable.
    // Read timeout: 15s — enough for the LLM to stream a full response.
    private final RestClient restClient;

    public AiService(HabitRepository habitRepository,
                     CurrentUser currentUser,
                     UserStatsService userStatsService) {
        this.habitRepository = habitRepository;
        this.currentUser = currentUser;
        this.userStatsService = userStatsService;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);
        factory.setReadTimeout(15_000);
        this.restClient = RestClient.builder()
                .requestFactory(factory)
                .build();
    }

    public List<HabitRequest> suggestHabits(String goal) {
        List<String> existingTitles = habitRepository
                .findByUserId(currentUser.getId())
                .stream().map(Habit::getTitle).toList();

        String systemPrompt = """
            You are a habit coach. Return ONLY a valid JSON array, no explanation, no markdown.
            Each object must have exactly these fields:
            - title: string
            - description: string
            - category: one of GENERAL, HEALTH, FITNESS, WORK, LEARNING
            - frequency: one of DAILY, WEEKLY, MONTHLY
            - targetTime: string in HH:mm:ss format (e.g. "07:00:00")
            - targetCount: integer between 1 and 100
            - isCountable: boolean
            - daysOfWeek: array of day names (e.g. ["MONDAY","WEDNESDAY"]) only if WEEKLY, else null
            - daysOfMonth: array of integers only if MONTHLY, else null
            
            Important rules for isCountable and targetCount:
            - Most habits should be isCountable: false with targetCount: 1 (simple yes/no completion)
            - Only use isCountable: true when the habit naturally involves counting repetitions
              (e.g. "Do 20 pushups" → targetCount: 20, "Drink 8 glasses of water" → targetCount: 8)
            - Never use large targetCount values (like 30 or 60) for time-based habits
              (e.g. "Meditate for 10 minutes" should be isCountable: false, not targetCount: 10)
            - For sleep, reading, journaling, stretching — always use isCountable: false
            Return only the JSON array. No text before or after it.
            """;

        String userMessage = String.format("""
            Goal: %s
            User's existing habits: %s
            Suggest 3 to 5 new habits that complement and avoid duplicating existing ones.
            """, goal, existingTitles.isEmpty() ? "none" : String.join(", ", existingTitles));

        String response = callGroq(systemPrompt, userMessage);
        String json = stripMarkdownFences(response);

        try {
            JsonNode array = objectMapper.readTree(json);
            if (!array.isArray()) {
                throw new RuntimeException("AI returned an unexpected response format. Please try again.");
            }

            List<HabitRequest> result = new java.util.ArrayList<>();
            for (JsonNode node : array) {
                String title        = node.path("title").asText();
                String description  = node.path("description").asText();
                String categoryStr  = node.path("category").asText("GENERAL");
                String freqStr      = node.path("frequency").asText("DAILY");
                String timeStr      = node.path("targetTime").asText("08:00:00");
                int targetCount     = node.path("targetCount").asInt(1);
                boolean isCountable = node.path("isCountable").asBoolean(false);

                HabitCategory category;
                try { category = HabitCategory.valueOf(categoryStr); }
                catch (Exception e) { category = HabitCategory.GENERAL; }

                HabitFrequency frequency;
                try { frequency = HabitFrequency.valueOf(freqStr); }
                catch (Exception e) { frequency = HabitFrequency.DAILY; }

                LocalTime targetTime;
                try { targetTime = LocalTime.parse(timeStr); }
                catch (Exception e) { targetTime = LocalTime.of(8, 0); }

                Set<DayOfWeek> daysOfWeek = null;
                if (frequency == HabitFrequency.WEEKLY
                        && node.has("daysOfWeek")
                        && node.path("daysOfWeek").isArray()) {
                    daysOfWeek = new HashSet<>();
                    for (JsonNode d : node.path("daysOfWeek")) {
                        try { daysOfWeek.add(DayOfWeek.valueOf(d.asText())); }
                        catch (Exception ignored) {}
                    }
                }

                Set<Integer> daysOfMonth = null;
                if (frequency == HabitFrequency.MONTHLY
                        && node.has("daysOfMonth")
                        && node.path("daysOfMonth").isArray()) {
                    daysOfMonth = new java.util.HashSet<>();
                    for (JsonNode d : node.path("daysOfMonth")) {
                        daysOfMonth.add(d.asInt());
                    }
                }

                result.add(new HabitRequest(
                        title, description, category, frequency,
                        daysOfWeek, daysOfMonth, targetTime, targetCount, isCountable
                ));
            }
            return result;

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("AI returned an unexpected response format. Please try again.");
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

        String insight = callGroq(systemPrompt, userMessage);
        return new InsightResponse(insight);
    }

    private String callGroq(String systemPrompt, String userMessage) {
        Map<String, Object> body = Map.of(
                "model", "llama-3.3-70b-versatile",
                "max_tokens", 1000,
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userMessage)
                )
        );

        // Retry up to 3 attempts with exponential backoff (500ms → 1000ms → give up).
        // LLM API endpoints are inherently flakier than internal services — a single
        // transient network blip should not surface as a user-visible error.
        int maxAttempts = 3;
        long delayMs = 500;

        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                String responseBody = restClient.post()
                        .uri(apiUrl)
                        .header("Authorization", "Bearer " + apiKey)
                        .header("Content-Type", "application/json")
                        .body(body)
                        .retrieve()
                        .body(String.class);

                JsonNode root = objectMapper.readTree(responseBody);
                return root.path("choices").get(0).path("message").path("content").asText();

            } catch (ResourceAccessException e) {
                // Timeout or network failure — retry if attempts remain
                if (attempt == maxAttempts) {
                    throw new RuntimeException(
                            "The AI service is currently unavailable. Please try again in a moment.");
                }
                try {
                    Thread.sleep(delayMs);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException(
                            "The AI service is currently unavailable. Please try again in a moment.");
                }
                delayMs *= 2; // exponential backoff

            } catch (RestClientResponseException e) {
                // FIX: RestClient throws RestClientResponseException for HTTP error status codes
                // (e.g. 429 Too Many Requests, 503 Service Unavailable). These were previously
                // swallowed by the generic catch block and never retried, even though they are
                // the most common transient Groq API failures.
                int status = e.getStatusCode().value();
                boolean isTransient = status == 429 || status >= 500;
                if (!isTransient || attempt == maxAttempts) {
                    // 4xx (except 429) are permanent — bad API key, malformed request, etc.
                    throw new RuntimeException(
                            "The AI service is currently unavailable. Please try again in a moment.");
                }
                try {
                    Thread.sleep(delayMs);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException(
                            "The AI service is currently unavailable. Please try again in a moment.");
                }
                delayMs *= 2;

            } catch (Exception e) {
                // Non-transient error (bad JSON, unexpected response shape) — don't retry
                throw new RuntimeException("Failed to read AI response. Please try again.");
            }
        }

        // Unreachable — loop always returns or throws — but compiler requires it
        throw new RuntimeException("The AI service is currently unavailable. Please try again in a moment.");
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

        return callGroq(systemPrompt, userMessage);
    }

    /**
     * LLMs sometimes wrap JSON in markdown code fences (```json ... ```) despite being told not to.
     * Strip them before parsing to avoid a JsonParseException.
     */
    private String stripMarkdownFences(String text) {
        if (text == null) return "";
        String trimmed = text.strip();
        if (trimmed.startsWith("```")) {
            trimmed = trimmed.replaceFirst("^```[a-zA-Z]*\\n?", "");
            if (trimmed.endsWith("```")) {
                trimmed = trimmed.substring(0, trimmed.lastIndexOf("```")).stripTrailing();
            }
        }
        return trimmed;
    }
}