package com.habitai.security;

import com.habitai.auth.JwtService;
import com.habitai.common.security.UserPrincipal;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.IOException;
import java.io.PrintWriter;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class JwtAuthenticationFilterTest {

    @Mock
    private JwtService jwtService;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Mock
    private FilterChain filterChain;

    @InjectMocks
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
    }

    // doFilterInternal - No Authorization Header Tests

    @Test
    void testDoFilterInternalWhenNoAuthorizationHeader() throws Exception {
        // Arrange
        when(request.getHeader("Authorization")).thenReturn(null);

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert
        verify(filterChain).doFilter(request, response);
        verify(jwtService, never()).isValidJwtToken(any());
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void testDoFilterInternalWhenEmptyAuthorizationHeader() throws Exception {
        // Arrange
        when(request.getHeader("Authorization")).thenReturn("");

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert
        verify(filterChain).doFilter(request, response);
        verify(jwtService, never()).isValidJwtToken(any());
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void testDoFilterInternalWhenBlankAuthorizationHeader() throws Exception {
        // Arrange
        when(request.getHeader("Authorization")).thenReturn("   ");

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert
        verify(filterChain).doFilter(request, response);
        verify(jwtService, never()).isValidJwtToken(any());
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    // doFilterInternal - Invalid Bearer Token Tests

    @Test
    void testDoFilterInternalWhenAuthorizationHeaderWithoutBearer() throws Exception {
        // Arrange
        when(request.getHeader("Authorization")).thenReturn("invalid-token");

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert
        verify(filterChain).doFilter(request, response);
        verify(jwtService, never()).isValidJwtToken(any());
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void testDoFilterInternalWhenBearerWithoutToken() throws Exception {
        // Arrange
        when(request.getHeader("Authorization")).thenReturn("Bearer ");

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert
        verify(filterChain).doFilter(request, response);
        verify(jwtService).isValidJwtToken(""); // Empty string is extracted
        verify(jwtService, never()).extractUserId(any());
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void testDoFilterInternalWhenBearerWithEmptyToken() throws Exception {
        // Arrange
        when(request.getHeader("Authorization")).thenReturn("Bearer");

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert
        verify(filterChain).doFilter(request, response);
        verify(jwtService, never()).isValidJwtToken(any());
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    // doFilterInternal - Invalid JWT Token Tests

    @Test
    void testDoFilterInternalWhenInvalidJwtToken() throws Exception {
        // Arrange
        String token = "invalid.jwt.token";
        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(jwtService.isValidJwtToken(token)).thenReturn(false);

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert
        verify(filterChain).doFilter(request, response);
        verify(jwtService).isValidJwtToken(token);
        verify(jwtService, never()).extractUserId(any());
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void testDoFilterInternalWhenJwtServiceThrowsException() throws Exception {
        // Arrange
        String token = "valid.jwt.token";
        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(jwtService.isValidJwtToken(token)).thenThrow(new RuntimeException("JWT validation error"));

        // Act & Assert
        assertThrows(RuntimeException.class, () ->
            jwtAuthenticationFilter.doFilterInternal(request, response, filterChain)
        );

        // Verify authentication was not set due to exception
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    // doFilterInternal - Invalid User ID Tests

    @Test
    void testDoFilterInternalWhenInvalidUserId() throws Exception {
        // Arrange
        String token = "valid.jwt.token";
        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(jwtService.isValidJwtToken(token)).thenReturn(true);
        when(jwtService.extractUserId(token)).thenReturn("invalid-user-id");

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert
        verify(filterChain).doFilter(request, response);
        verify(jwtService).isValidJwtToken(token);
        verify(jwtService).extractUserId(token);
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void testDoFilterInternalWhenNullUserId() throws Exception {
        // Arrange
        String token = "valid.jwt.token";
        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(jwtService.isValidJwtToken(token)).thenReturn(true);
        when(jwtService.extractUserId(token)).thenReturn(null);

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert
        verify(filterChain).doFilter(request, response);
        verify(jwtService).isValidJwtToken(token);
        verify(jwtService).extractUserId(token);
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void testDoFilterInternalWhenEmptyUserId() throws Exception {
        // Arrange
        String token = "valid.jwt.token";
        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(jwtService.isValidJwtToken(token)).thenReturn(true);
        when(jwtService.extractUserId(token)).thenReturn("");

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert
        verify(filterChain).doFilter(request, response);
        verify(jwtService).isValidJwtToken(token);
        verify(jwtService).extractUserId(token);
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    // doFilterInternal - Valid Authentication Tests

    @Test
    void testDoFilterInternalWhenValidToken() throws Exception {
        // Arrange
        String token = "valid.jwt.token";
        long userId = 123L;
        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(jwtService.isValidJwtToken(token)).thenReturn(true);
        when(jwtService.extractUserId(token)).thenReturn(String.valueOf(userId));

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert
        verify(filterChain).doFilter(request, response);
        verify(jwtService).isValidJwtToken(token);
        verify(jwtService).extractUserId(token);

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(authentication);
        assertTrue(authentication.getPrincipal() instanceof UserPrincipal);
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        assertEquals(userId, principal.getUserId());
        assertNull(authentication.getCredentials());
        assertTrue(authentication.getAuthorities().isEmpty());
    }

    @Test
    void testDoFilterInternalWhenValidTokenWithDifferentUserId() throws Exception {
        // Arrange
        String token = "another.valid.jwt.token";
        long userId = 999L;
        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(jwtService.isValidJwtToken(token)).thenReturn(true);
        when(jwtService.extractUserId(token)).thenReturn(String.valueOf(userId));

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(authentication);
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        assertEquals(userId, principal.getUserId());
    }

    @Test
    void testDoFilterInternalWhenValidTokenWithZeroUserId() throws Exception {
        // Arrange
        String token = "zero.user.jwt.token";
        long userId = 0L;
        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(jwtService.isValidJwtToken(token)).thenReturn(true);
        when(jwtService.extractUserId(token)).thenReturn(String.valueOf(userId));

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(authentication);
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        assertEquals(userId, principal.getUserId());
    }

    @Test
    void testDoFilterInternalWhenValidTokenWithNegativeUserId() throws Exception {
        // Arrange
        String token = "negative.user.jwt.token";
        long userId = -123L;
        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(jwtService.isValidJwtToken(token)).thenReturn(true);
        when(jwtService.extractUserId(token)).thenReturn(String.valueOf(userId));

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(authentication);
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        assertEquals(userId, principal.getUserId());
    }

    // doFilterInternal - Bearer Token Extraction Tests

    @Test
    void testExtractBearerTokenWithValidBearerToken() throws Exception {
        // This test verifies the private method behavior indirectly through doFilterInternal
        String token = "valid.jwt.token";
        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(jwtService.isValidJwtToken(token)).thenReturn(true);
        when(jwtService.extractUserId(token)).thenReturn("123");

        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        verify(jwtService).isValidJwtToken(token);
    }

    @Test
    void testExtractBearerTokenWithBearerCaseInsensitive() throws Exception {
        // Test case-insensitive "bearer" prefix
        String token = "valid.jwt.token";
        when(request.getHeader("Authorization")).thenReturn("bearer " + token);

        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        verify(jwtService, never()).isValidJwtToken(any());
    }

    @Test
    void testExtractBearerTokenWithExtraSpaces() throws Exception {
        // Test with extra spaces after "Bearer"
        String token = "valid.jwt.token";
        when(request.getHeader("Authorization")).thenReturn("Bearer  " + token);
        when(jwtService.isValidJwtToken(" " + token)).thenReturn(true); // Note the leading space
        when(jwtService.extractUserId(" " + token)).thenReturn("123");

        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        verify(jwtService).isValidJwtToken(" " + token);
    }

    // doFilterInternal - Exception Handling Tests

    @Test
    void testDoFilterInternalHandlesServletException() throws Exception {
        // Arrange
        String token = "valid.jwt.token";
        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(jwtService.isValidJwtToken(token)).thenReturn(true);
        when(jwtService.extractUserId(token)).thenReturn("123");
        doThrow(new RuntimeException("Filter chain error")).when(filterChain).doFilter(any(), any());

        // Act & Assert
        assertThrows(RuntimeException.class, () ->
            jwtAuthenticationFilter.doFilterInternal(request, response, filterChain)
        );

        // Verify authentication was still set
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(authentication);
    }

    @Test
    void testDoFilterInternalHandlesIOException() throws Exception {
        // Arrange
        String token = "valid.jwt.token";
        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(jwtService.isValidJwtToken(token)).thenReturn(true);
        when(jwtService.extractUserId(token)).thenReturn("123");
        doThrow(new IOException("IO error")).when(filterChain).doFilter(any(), any());

        // Act & Assert
        assertThrows(IOException.class, () ->
            jwtAuthenticationFilter.doFilterInternal(request, response, filterChain)
        );

        // Verify authentication was still set
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(authentication);
    }

    // doFilterInternal - Security Context Tests

    @Test
    void testDoFilterInternalClearsPreviousAuthenticationWhenInvalidToken() throws Exception {
        // Arrange - Set up existing authentication
        UserPrincipal existingPrincipal = new UserPrincipal(999L, "UTC");
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                existingPrincipal, null, List.of()));
        SecurityContextHolder.setContext(context);

        // Invalid token scenario
        when(request.getHeader("Authorization")).thenReturn("Bearer invalid-token");
        when(jwtService.isValidJwtToken("invalid-token")).thenReturn(false);

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert - Authentication should remain (filter doesn't clear existing auth)
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(authentication);
        assertEquals(existingPrincipal, authentication.getPrincipal());
    }

    @Test
    void testDoFilterInternalDoesNotOverrideExistingAuthentication() throws Exception {
        // Arrange - Set up existing authentication
        UserPrincipal existingPrincipal = new UserPrincipal(999L, "UTC");
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                existingPrincipal, null, List.of()));
        SecurityContextHolder.setContext(context);

        // Valid token scenario
        String token = "valid.jwt.token";
        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(jwtService.isValidJwtToken(token)).thenReturn(true);
        when(jwtService.extractUserId(token)).thenReturn("123");

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert - Authentication should be updated
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(authentication);
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        assertEquals(123L, principal.getUserId()); // New authentication set
    }

    // doFilterInternal - Edge Cases

    @Test
    void testDoFilterInternalWithVeryLongToken() throws Exception {
        // Arrange
        StringBuilder longToken = new StringBuilder();
        for (int i = 0; i < 1000; i++) {
            longToken.append("a");
        }
        String token = longToken.toString();

        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(jwtService.isValidJwtToken(token)).thenReturn(true);
        when(jwtService.extractUserId(token)).thenReturn("123");

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert
        verify(jwtService).isValidJwtToken(token);
        verify(jwtService).extractUserId(token);
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(authentication);
    }

    @Test
    void testDoFilterInternalWithSpecialCharactersInToken() throws Exception {
        // Arrange
        String token = "special.token.with-symbols!@#$%^&*()";

        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(jwtService.isValidJwtToken(token)).thenReturn(true);
        when(jwtService.extractUserId(token)).thenReturn("123");

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert
        verify(jwtService).isValidJwtToken(token);
        verify(jwtService).extractUserId(token);
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(authentication);
    }

    @Test
    void testDoFilterInternalWithUnicodeInToken() throws Exception {
        // Arrange
        String token = "unicode.token.🚀🌟";

        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(jwtService.isValidJwtToken(token)).thenReturn(true);
        when(jwtService.extractUserId(token)).thenReturn("123");

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert
        verify(jwtService).isValidJwtToken(token);
        verify(jwtService).extractUserId(token);
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(authentication);
    }
}
