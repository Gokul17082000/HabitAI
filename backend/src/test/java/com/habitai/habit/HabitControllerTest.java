package com.habitai.habit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.habitai.exception.GlobalExceptionHandler;
import com.habitai.habitlog.HabitStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(HabitController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandler.class)
class HabitControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private ObjectMapper objectMapper;

    @MockitoBean
    private HabitService habitService;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
    }

    @Test
    void getAllHabits_ShouldReturnListOfHabits() throws Exception {
        // Arrange
        List<HabitDTO> habits = List.of(
                new HabitDTO(1L, "Morning Run", "30 min run", HabitCategory.FITNESS, HabitFrequency.DAILY, null, null, LocalTime.of(6, 0), LocalDate.now(), false, 1, false, null, false),
                new HabitDTO(2L, "Gym", "Workout", HabitCategory.FITNESS, HabitFrequency.WEEKLY, Set.of(DayOfWeek.MONDAY), null, LocalTime.of(18, 0), LocalDate.now(), false, 1, false, null, false)
        );
        when(habitService.getAllHabits()).thenReturn(habits);

        // Act & Assert
        mockMvc.perform(get("/habits/all")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Morning Run"))
                .andExpect(jsonPath("$[1].title").value("Gym"))
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void getAllHabits_ShouldReturnEmptyList_WhenNoHabits() throws Exception {
        // Arrange
        when(habitService.getAllHabits()).thenReturn(Collections.emptyList());

        // Act & Assert
        mockMvc.perform(get("/habits/all")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void getHabitsForDate_WithValidDate_ShouldReturnHabits() throws Exception {
        // Arrange
        LocalDate date = LocalDate.of(2026, 4, 6);
        List<HabitResponse> habits = List.of(
                new HabitResponse(1L, "Morning Run", "30 min run", HabitCategory.FITNESS, LocalTime.of(6, 0), 1, false, 1, HabitStatus.COMPLETED)
        );
        when(habitService.getHabitsForDate(date)).thenReturn(habits);

        // Act & Assert
        mockMvc.perform(get("/habits")
                .param("date", "2026-04-06")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Morning Run"))
                .andExpect(jsonPath("$[0].habitStatus").value("COMPLETED"));
    }

    @Test
    void getHabitsForDate_WithoutDate_ShouldUseToday() throws Exception {
        // Arrange
        List<HabitResponse> habits = List.of();
        when(habitService.getHabitsForDate(any(LocalDate.class))).thenReturn(habits);

        // Act & Assert
        mockMvc.perform(get("/habits")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    void getHabitById_WithValidId_ShouldReturnHabit() throws Exception {
        // Arrange
        long habitId = 1L;
        HabitDTO habit = new HabitDTO(habitId, "Morning Run", "30 min run", HabitCategory.FITNESS, HabitFrequency.DAILY, null, null, LocalTime.of(6, 0), LocalDate.now(), false, 1, false, null, false);
        when(habitService.getHabitById(habitId)).thenReturn(habit);

        // Act & Assert
        mockMvc.perform(get("/habits/{habitId}", habitId)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Morning Run"))
                .andExpect(jsonPath("$.category").value("FITNESS"));
    }

    @Test
    void createHabit_WithValidRequest_ShouldReturnCreated() throws Exception {
        // Arrange
        HabitRequest request = new HabitRequest(
                "Morning Run",
                "30 min run",
                HabitCategory.FITNESS,
                HabitFrequency.DAILY,
                null,
                null,
                LocalTime.of(6, 0),
                1,
                false
        );
        HabitDTO response = new HabitDTO(1L, "Morning Run", "30 min run", HabitCategory.FITNESS, HabitFrequency.DAILY, null, null, LocalTime.of(6, 0), LocalDate.now(), false, 1, false, null, false);
        when(habitService.createHabit(any(HabitRequest.class))).thenReturn(response);

        // Act & Assert
        mockMvc.perform(post("/habits")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Morning Run"))
                .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    void createHabit_WithWeeklyFrequency_ShouldReturnCreated() throws Exception {
        // Arrange
        HabitRequest request = new HabitRequest(
                "Gym Day",
                "Workout",
                HabitCategory.FITNESS,
                HabitFrequency.WEEKLY,
                Set.of(DayOfWeek.MONDAY, DayOfWeek.FRIDAY),
                null,
                LocalTime.of(18, 0),
                1,
                false
        );
        HabitDTO response = new HabitDTO(2L, "Gym Day", "Workout", HabitCategory.FITNESS, HabitFrequency.WEEKLY, Set.of(DayOfWeek.MONDAY, DayOfWeek.FRIDAY), null, LocalTime.of(18, 0), LocalDate.now(), false, 1, false, null, false);
        when(habitService.createHabit(any(HabitRequest.class))).thenReturn(response);

        // Act & Assert
        mockMvc.perform(post("/habits")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Gym Day"));
    }

    @Test
    void createHabit_WithMissingTitle_ShouldReturnBadRequest() throws Exception {
        // Arrange - Title is required
        String jsonRequest = """
                {
                    "title": "",
                    "description": "30 min run",
                    "category": "FITNESS",
                    "frequency": "DAILY",
                    "targetTime": "06:00:00",
                    "targetCount": 1,
                    "isCountable": false
                }
                """;

        // Act & Assert
        mockMvc.perform(post("/habits")
                .contentType(MediaType.APPLICATION_JSON)
                .content(jsonRequest))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createHabit_WithMissingCategory_ShouldReturnBadRequest() throws Exception {
        // Arrange - @NotNull category (omit field; empty string is invalid enum JSON → 500)
        String jsonRequest = """
                {
                    "title": "Morning Run",
                    "description": "30 min run",
                    "frequency": "DAILY",
                    "targetTime": "06:00:00",
                    "targetCount": 1,
                    "isCountable": false
                }
                """;

        // Act & Assert
        mockMvc.perform(post("/habits")
                .contentType(MediaType.APPLICATION_JSON)
                .content(jsonRequest))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createHabit_WithMissingFrequency_ShouldReturnBadRequest() throws Exception {
        // Arrange - Frequency is required (omit field so @NotNull fails after JSON binds)
        String jsonRequest = """
                {
                    "title": "Morning Run",
                    "description": "30 min run",
                    "category": "FITNESS",
                    "targetTime": "06:00:00",
                    "targetCount": 1,
                    "isCountable": false
                }
                """;

        // Act & Assert
        mockMvc.perform(post("/habits")
                .contentType(MediaType.APPLICATION_JSON)
                .content(jsonRequest))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateHabit_WithValidId_ShouldReturnNoContent() throws Exception {
        // Arrange
        long habitId = 1L;
        HabitRequest request = new HabitRequest(
                "Updated Run",
                "Updated description",
                HabitCategory.FITNESS,
                HabitFrequency.DAILY,
                null,
                null,
                LocalTime.of(7, 0),
                1,
                false
        );
        doNothing().when(habitService).updateHabit(eq(habitId), any(HabitRequest.class));

        // Act & Assert
        mockMvc.perform(put("/habits/{habitId}", habitId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());
    }

    @Test
    void updateHabit_WithInvalidRequest_ShouldReturnBadRequest() throws Exception {
        // Arrange - @NotBlank title; include all fields so Jackson can bind (primitives cannot be null in JSON)
        long habitId = 1L;
        String jsonRequest = """
                {
                    "title": "",
                    "description": "30 min run",
                    "category": "FITNESS",
                    "frequency": "DAILY",
                    "targetTime": "06:00:00",
                    "targetCount": 1,
                    "isCountable": false
                }
                """;

        // Act & Assert
        mockMvc.perform(put("/habits/{habitId}", habitId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(jsonRequest))
                .andExpect(status().isBadRequest());
    }

    @Test
    void deleteHabit_WithValidId_ShouldReturnNoContent() throws Exception {
        // Arrange
        long habitId = 1L;
        doNothing().when(habitService).deleteHabit(habitId);

        // Act & Assert
        mockMvc.perform(delete("/habits/{habitId}", habitId)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNoContent());
    }

    @Test
    void getMonthSummary_WithValidYearAndMonth_ShouldReturnSummary() throws Exception {
        // Arrange
        Map<String, List<String>> summary = new HashMap<>();
        summary.put("2026-04-01", Arrays.asList("COMPLETED", "PENDING"));
        summary.put("2026-04-02", Arrays.asList("MISSED", "COMPLETED"));
        when(habitService.getMonthSummary(2026, 4)).thenReturn(summary);

        // Act & Assert
        mockMvc.perform(get("/habits/summary")
                .param("year", "2026")
                .param("month", "4")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$['2026-04-01'][0]").value("COMPLETED"))
                .andExpect(jsonPath("$['2026-04-02'][1]").value("COMPLETED"));
    }

    @Test
    void getMonthSummary_ShouldReturnEmptyMap_WhenNoHabitsInMonth() throws Exception {
        // Arrange
        when(habitService.getMonthSummary(2026, 4)).thenReturn(new HashMap<>());

        // Act & Assert
        mockMvc.perform(get("/habits/summary")
                .param("year", "2026")
                .param("month", "4")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isMap());
    }
}