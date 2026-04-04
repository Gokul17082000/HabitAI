package com.habitai.habitlog;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.habitai.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(HabitLogController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandler.class)
class HabitLogControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private HabitLogService habitLogService;

    private ObjectMapper objectMapper;
    private LocalDate today;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        today = LocalDate.now();
    }

    // updateTodayHabitStatus Tests

    @Test
    void testUpdateTodayHabitStatusCompleted() throws Exception {
        // Arrange
        long habitId = 1L;
        HabitLogRequest request = new HabitLogRequest(today, HabitStatus.COMPLETED, 1);

        // Act & Assert
        mockMvc.perform(post("/habits/{habitId}/log", habitId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        verify(habitLogService).updateTodayHabitStatus(habitId, request);
    }

    @Test
    void testUpdateTodayHabitStatusMissed() throws Exception {
        // Arrange
        long habitId = 1L;
        HabitLogRequest request = new HabitLogRequest(today, HabitStatus.MISSED, 0);

        // Act & Assert
        mockMvc.perform(post("/habits/{habitId}/log", habitId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        verify(habitLogService).updateTodayHabitStatus(habitId, request);
    }

    @Test
    void testUpdateTodayHabitStatusPartiallyCompleted() throws Exception {
        // Arrange
        long habitId = 1L;
        HabitLogRequest request = new HabitLogRequest(today, HabitStatus.PARTIALLY_COMPLETED, 1);

        // Act & Assert
        mockMvc.perform(post("/habits/{habitId}/log", habitId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        verify(habitLogService).updateTodayHabitStatus(habitId, request);
    }

    @Test
    void testUpdateTodayHabitStatusPending() throws Exception {
        // Arrange
        long habitId = 1L;
        HabitLogRequest request = new HabitLogRequest(today, HabitStatus.PENDING, 1);

        // Act & Assert
        mockMvc.perform(post("/habits/{habitId}/log", habitId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        verify(habitLogService).updateTodayHabitStatus(habitId, request);
    }

    @Test
    void testUpdateTodayHabitStatusInvalidRequest() throws Exception {
        // Arrange - valid JSON; @Min(0) violated on currentCount (null/missing count causes parse errors → 500)
        long habitId = 1L;
        String invalidJson = String.format(
                "{\"date\": \"%s\", \"habitStatus\": \"COMPLETED\", \"currentCount\": -1}",
                today);

        // Act & Assert
        mockMvc.perform(post("/habits/{habitId}/log", habitId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidJson))
                .andExpect(status().isBadRequest());

        verify(habitLogService, never()).updateTodayHabitStatus(anyLong(), any());
    }

    @Test
    void testUpdateTodayHabitStatusPastDateCausesBadRequest() throws Exception {
        // Arrange
        long habitId = 1L;
        HabitLogRequest request = new HabitLogRequest(today.minusDays(1), HabitStatus.COMPLETED, 1);
        
        // Since the service is mocked, we can simulate the exception it would throw
        doThrow(new IllegalStateException("Cannot update past or future habits"))
                .when(habitLogService).updateTodayHabitStatus(habitId, request);

        // Act & Assert
        mockMvc.perform(post("/habits/{habitId}/log", habitId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    // getCurrentStreak Tests

    @Test
    void testGetCurrentStreakZero() throws Exception {
        // Arrange
        long habitId = 1L;
        HabitStreakResponse response = new HabitStreakResponse(0);
        when(habitLogService.getCurrentStreak(habitId)).thenReturn(response);

        // Act & Assert
        mockMvc.perform(get("/habits/{habitId}/streak", habitId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.streak").value(0));

        verify(habitLogService).getCurrentStreak(habitId);
    }

    @Test
    void testGetCurrentStreakOne() throws Exception {
        // Arrange
        long habitId = 1L;
        HabitStreakResponse response = new HabitStreakResponse(1);
        when(habitLogService.getCurrentStreak(habitId)).thenReturn(response);

        // Act & Assert
        mockMvc.perform(get("/habits/{habitId}/streak", habitId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.streak").value(1));

        verify(habitLogService).getCurrentStreak(habitId);
    }

    @Test
    void testGetCurrentStreakMultipleDays() throws Exception {
        // Arrange
        long habitId = 1L;
        HabitStreakResponse response = new HabitStreakResponse(7);
        when(habitLogService.getCurrentStreak(habitId)).thenReturn(response);

        // Act & Assert
        mockMvc.perform(get("/habits/{habitId}/streak", habitId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.streak").value(7));

        verify(habitLogService).getCurrentStreak(habitId);
    }

    @Test
    void testGetCurrentStreakHighValue() throws Exception {
        // Arrange
        long habitId = 1L;
        HabitStreakResponse response = new HabitStreakResponse(365);
        when(habitLogService.getCurrentStreak(habitId)).thenReturn(response);

        // Act & Assert
        mockMvc.perform(get("/habits/{habitId}/streak", habitId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.streak").value(365));

        verify(habitLogService).getCurrentStreak(habitId);
    }

    // getLongestStreak Tests

    @Test
    void testGetLongestStreakZero() throws Exception {
        // Arrange
        long habitId = 1L;
        HabitStreakResponse response = new HabitStreakResponse(0);
        when(habitLogService.getLongestStreak(habitId)).thenReturn(response);

        // Act & Assert
        mockMvc.perform(get("/habits/{habitId}/streak/longest", habitId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.streak").value(0));

        verify(habitLogService).getLongestStreak(habitId);
    }

    @Test
    void testGetLongestStreakOne() throws Exception {
        // Arrange
        long habitId = 1L;
        HabitStreakResponse response = new HabitStreakResponse(1);
        when(habitLogService.getLongestStreak(habitId)).thenReturn(response);

        // Act & Assert
        mockMvc.perform(get("/habits/{habitId}/streak/longest", habitId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.streak").value(1));

        verify(habitLogService).getLongestStreak(habitId);
    }

    @Test
    void testGetLongestStreakMultipleDays() throws Exception {
        // Arrange
        long habitId = 1L;
        HabitStreakResponse response = new HabitStreakResponse(30);
        when(habitLogService.getLongestStreak(habitId)).thenReturn(response);

        // Act & Assert
        mockMvc.perform(get("/habits/{habitId}/streak/longest", habitId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.streak").value(30));

        verify(habitLogService).getLongestStreak(habitId);
    }

    @Test
    void testGetLongestStreakHighValue() throws Exception {
        // Arrange
        long habitId = 1L;
        HabitStreakResponse response = new HabitStreakResponse(500);
        when(habitLogService.getLongestStreak(habitId)).thenReturn(response);

        // Act & Assert
        mockMvc.perform(get("/habits/{habitId}/streak/longest", habitId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.streak").value(500));

        verify(habitLogService).getLongestStreak(habitId);
    }

    // getHabitActivity Tests

    @Test
    void testGetHabitActivitySingleDay() throws Exception {
        // Arrange
        long habitId = 1L;
        LocalDate startDate = today;
        LocalDate endDate = today;

        HabitActivityStatus activity = new HabitActivityStatus(today, HabitStatus.COMPLETED);
        List<HabitActivityStatus> activities = List.of(activity);

        when(habitLogService.getHabitActivity(habitId, startDate, endDate))
                .thenReturn(activities);

        // Act & Assert
        mockMvc.perform(get("/habits/{habitId}/activity", habitId)
                .param("startDate", startDate.toString())
                .param("endDate", endDate.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].habitStatus").value("COMPLETED"));

        verify(habitLogService).getHabitActivity(habitId, startDate, endDate);
    }

    @Test
    void testGetHabitActivityWeek() throws Exception {
        // Arrange
        long habitId = 1L;
        LocalDate startDate = today.minusDays(6);
        LocalDate endDate = today;

        List<HabitActivityStatus> activities = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            activities.add(new HabitActivityStatus(today.minusDays(i), HabitStatus.COMPLETED));
        }

        when(habitLogService.getHabitActivity(habitId, startDate, endDate))
                .thenReturn(activities);

        // Act & Assert
        mockMvc.perform(get("/habits/{habitId}/activity", habitId)
                .param("startDate", startDate.toString())
                .param("endDate", endDate.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(7)))
                .andExpect(jsonPath("$[0].habitStatus").value("COMPLETED"))
                .andExpect(jsonPath("$[6].habitStatus").value("COMPLETED"));

        verify(habitLogService).getHabitActivity(habitId, startDate, endDate);
    }

    @Test
    void testGetHabitActivityMonth() throws Exception {
        // Arrange
        long habitId = 1L;
        LocalDate startDate = today.minusDays(29);
        LocalDate endDate = today;

        List<HabitActivityStatus> activities = new ArrayList<>();
        for (int i = 29; i >= 0; i--) {
            activities.add(new HabitActivityStatus(today.minusDays(i), HabitStatus.COMPLETED));
        }

        when(habitLogService.getHabitActivity(habitId, startDate, endDate))
                .thenReturn(activities);

        // Act & Assert
        mockMvc.perform(get("/habits/{habitId}/activity", habitId)
                .param("startDate", startDate.toString())
                .param("endDate", endDate.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(30)));

        verify(habitLogService).getHabitActivity(habitId, startDate, endDate);
    }

    @Test
    void testGetHabitActivityMixedStatuses() throws Exception {
        // Arrange
        long habitId = 1L;
        LocalDate startDate = today.minusDays(2);
        LocalDate endDate = today;

        List<HabitActivityStatus> activities = List.of(
                new HabitActivityStatus(today.minusDays(2), HabitStatus.COMPLETED),
                new HabitActivityStatus(today.minusDays(1), HabitStatus.MISSED),
                new HabitActivityStatus(today, HabitStatus.PENDING)
        );

        when(habitLogService.getHabitActivity(habitId, startDate, endDate))
                .thenReturn(activities);

        // Act & Assert
        mockMvc.perform(get("/habits/{habitId}/activity", habitId)
                .param("startDate", startDate.toString())
                .param("endDate", endDate.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[0].habitStatus").value("COMPLETED"))
                .andExpect(jsonPath("$[1].habitStatus").value("MISSED"))
                .andExpect(jsonPath("$[2].habitStatus").value("PENDING"));

        verify(habitLogService).getHabitActivity(habitId, startDate, endDate);
    }

    @Test
    void testGetHabitActivityEmpty() throws Exception {
        // Arrange
        long habitId = 1L;
        LocalDate startDate = today.minusDays(1);
        LocalDate endDate = today.minusDays(1);

        when(habitLogService.getHabitActivity(habitId, startDate, endDate))
                .thenReturn(new ArrayList<>());

        // Act & Assert
        mockMvc.perform(get("/habits/{habitId}/activity", habitId)
                .param("startDate", startDate.toString())
                .param("endDate", endDate.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        verify(habitLogService).getHabitActivity(habitId, startDate, endDate);
    }

    @Test
    void testGetHabitActivityInvalidDateRange() throws Exception {
        // Arrange
        long habitId = 1L;
        LocalDate startDate = today;
        LocalDate endDate = today.minusDays(1);

        // Act & Assert
        mockMvc.perform(get("/habits/{habitId}/activity", habitId)
                .param("startDate", startDate.toString())
                .param("endDate", endDate.toString()))
                .andExpect(status().isBadRequest());

        verify(habitLogService, never()).getHabitActivity(anyLong(), any(), any());
    }

    @Test
    void testGetHabitActivityVariousStatuses() throws Exception {
        // Arrange
        long habitId = 1L;
        LocalDate startDate = today.minusDays(3);
        LocalDate endDate = today;

        List<HabitActivityStatus> activities = List.of(
                new HabitActivityStatus(today.minusDays(3), HabitStatus.COMPLETED),
                new HabitActivityStatus(today.minusDays(2), HabitStatus.PARTIALLY_COMPLETED),
                new HabitActivityStatus(today.minusDays(1), HabitStatus.MISSED),
                new HabitActivityStatus(today, HabitStatus.PENDING)
        );

        when(habitLogService.getHabitActivity(habitId, startDate, endDate))
                .thenReturn(activities);

        // Act & Assert
        mockMvc.perform(get("/habits/{habitId}/activity", habitId)
                .param("startDate", startDate.toString())
                .param("endDate", endDate.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(4)))
                .andExpect(jsonPath("$[0].habitStatus").value("COMPLETED"))
                .andExpect(jsonPath("$[1].habitStatus").value("PARTIALLY_COMPLETED"))
                .andExpect(jsonPath("$[2].habitStatus").value("MISSED"))
                .andExpect(jsonPath("$[3].habitStatus").value("PENDING"));

        verify(habitLogService).getHabitActivity(habitId, startDate, endDate);
    }

    @Test
    void testGetHabitActivitySameStartAndEndDate() throws Exception {
        // Arrange
        long habitId = 1L;
        LocalDate sameDate = today;

        HabitActivityStatus activity = new HabitActivityStatus(sameDate, HabitStatus.COMPLETED);
        when(habitLogService.getHabitActivity(habitId, sameDate, sameDate))
                .thenReturn(List.of(activity));

        // Act & Assert
        mockMvc.perform(get("/habits/{habitId}/activity", habitId)
                .param("startDate", sameDate.toString())
                .param("endDate", sameDate.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].date").value(sameDate.toString()))
                .andExpect(jsonPath("$[0].habitStatus").value("COMPLETED"));

        verify(habitLogService).getHabitActivity(habitId, sameDate, sameDate);
    }

    @Test
    void testGetHabitActivityLongDateRange() throws Exception {
        // Arrange — API allows at most 90 days between start and end (inclusive span)
        long habitId = 1L;
        LocalDate startDate = today.minusDays(89);
        LocalDate endDate = today;

        List<HabitActivityStatus> activities = new ArrayList<>();
        for (int i = 89; i >= 0; i--) {
            activities.add(new HabitActivityStatus(today.minusDays(i), HabitStatus.COMPLETED));
        }

        when(habitLogService.getHabitActivity(habitId, startDate, endDate))
                .thenReturn(activities);

        // Act & Assert
        mockMvc.perform(get("/habits/{habitId}/activity", habitId)
                .param("startDate", startDate.toString())
                .param("endDate", endDate.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(90)));

        verify(habitLogService).getHabitActivity(habitId, startDate, endDate);
    }

}
