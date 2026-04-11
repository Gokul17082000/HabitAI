package com.habitai.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.habitai.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false) // Disables Spring Security filters for this isolated unit test
@Import(GlobalExceptionHandler.class)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private AuthService authService;

    @Test
    void register_WithValidRequest_ShouldReturnCreated() throws Exception {
        RegisterRequest validRequest = new RegisterRequest("test@habitai.com", "password123");
        RegisterResponse mockResponse = new RegisterResponse("User Successfully created!");
        
        when(authService.register(any(RegisterRequest.class))).thenReturn(mockResponse);

        mockMvc.perform(post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(validRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value("User Successfully created!"));
    }

    @Test
    void login_WithValidRequest_ShouldReturnOk() throws Exception {
        LoginRequest validRequest = new LoginRequest("test@habitai.com", "password123");
        LoginResponse mockResponse = new LoginResponse("mock.access.token", "mock.refresh.token");

        when(authService.login(any(LoginRequest.class))).thenReturn(mockResponse);

        mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(validRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("mock.access.token"))
                .andExpect(jsonPath("$.refreshToken").value("mock.refresh.token"));
    }

    @Test
    void register_WithInvalidEmail_ShouldReturnBadRequest() throws Exception {
        // Email is not a valid format
        RegisterRequest invalidRequest = new RegisterRequest("not-an-email", "password123");

        mockMvc.perform(post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void register_WithShortPassword_ShouldReturnBadRequest() throws Exception {
        // Password is less than 8 characters (violates @Size in AuthRequest)
        RegisterRequest invalidRequest = new RegisterRequest("test@habitai.com", "short");

        mockMvc.perform(post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest());
    }
    
    @Test
    void login_WithMissingEmail_ShouldReturnBadRequest() throws Exception {
        // Email is blank (violates @NotBlank)
        LoginRequest invalidRequest = new LoginRequest("", "password123");

        mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest());
    }
}