package com.habitai.user;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.habitai.exception.GlobalExceptionHandler;
import com.habitai.notification.PushTokenRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandler.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());

    @MockitoBean
    private UserService userService;

    @MockitoBean
    private UserStatsService userStatsService;

    @Test
    void getUserDetails_ReturnsUserDTO() throws Exception {
        when(userService.getUserDetails()).thenReturn(new UserDTO("user@example.com"));

        mockMvc.perform(get("/user"))
                .andExpect(status().isOk())
                .andExpect(content().json("{\"email\":\"user@example.com\"}"));

        verify(userService).getUserDetails();
    }

    @Test
    void getStats_ReturnsUserStatsResponse() throws Exception {
        UserStatsResponse.TopHabit topHabit = new UserStatsResponse.TopHabit("Read", 4, 80);
        UserStatsResponse statsResponse = new UserStatsResponse(
                3,
                4,
                1,
                2,
                80,
                1,
                4,
                List.of(topHabit),
                LocalDate.of(2024, 1, 2)
        );

        when(userStatsService.getStats()).thenReturn(statsResponse);

        mockMvc.perform(get("/user/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalHabits").value(3))
                .andExpect(jsonPath("$.totalCompleted").value(4))
                .andExpect(jsonPath("$.currentStreak").value(1))
                .andExpect(jsonPath("$.memberSince").value("2024-01-02"));

        verify(userStatsService).getStats();
    }

    @Test
    void savePushToken_ReturnsNoContent() throws Exception {
        doNothing().when(userService).savePushToken("abc-token");

        PushTokenRequest request = new PushTokenRequest("abc-token");
        mockMvc.perform(post("/user/push-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        verify(userService).savePushToken("abc-token");
    }
}
