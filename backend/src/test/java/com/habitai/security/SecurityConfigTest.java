package com.habitai.security;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.security.web.SecurityFilterChain;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@WebMvcTest(controllers = SecurityConfigTest.TestController.class)
@Import({SecurityConfig.class, SecurityConfigTest.TestCorsProperties.class})
@AutoConfigureMockMvc(addFilters = true)
class SecurityConfigTest {

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Autowired
    private CorsProperties corsProperties;

    @TestConfiguration
    static class TestCorsProperties {
        @Bean
        CorsProperties corsProperties() {
            CorsProperties corsProperties = new CorsProperties();
            corsProperties.setAllowedOrigins(List.of("http://localhost"));
            return corsProperties;
        }
    }

    @RestController
    static class TestController {
        @GetMapping("/health")
        public ResponseEntity<String> health() {
            return ResponseEntity.ok("OK");
        }

        @GetMapping("/habits")
        public ResponseEntity<String> habits() {
            return ResponseEntity.ok("protected");
        }
    }

    @Autowired
    private SecurityConfig securityConfig;

    @Autowired
    private SecurityFilterChain securityFilterChain;

    @Autowired
    private CorsConfigurationSource corsConfigurationSource;

    @Test
    void testSecurityConfigBeanIsCreated() {
        assertNotNull(securityConfig);
        assertNotNull(securityFilterChain);
    }

    @Test
    void testCorsConfigurationSourceHasAllowedOrigins() {
        CorsConfiguration configuration = corsConfigurationSource.getCorsConfiguration(new MockHttpServletRequest());
        assertNotNull(configuration);
        assertTrue(configuration.getAllowedOrigins().contains("http://localhost:8081"));
        assertTrue(configuration.getAllowedOrigins().contains("http://192.168.1.2:8081"));
        assertTrue(configuration.getAllowedOrigins().contains("http://192.168.1.2:19006"));
        assertTrue(configuration.getAllowedMethods().contains("GET"));
        assertTrue(configuration.getAllowedMethods().contains("POST"));
    }

    @Test
    void testCorsPropertiesIsLoaded() {
        assertNotNull(corsProperties);
        assertTrue(corsProperties.getAllowedOrigins().contains("http://localhost:8081"));
        assertTrue(corsProperties.getAllowedOrigins().contains("http://192.168.1.2:8081"));
        assertTrue(corsProperties.getAllowedOrigins().contains("http://192.168.1.2:19006"));
    }
}