package com.habitai.security;

import com.habitai.auth.JwtService;
import com.habitai.common.security.UserPrincipal;
import com.habitai.user.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository userRepository;

    public JwtAuthenticationFilter(JwtService jwtService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String token = extractBearerToken(request);

        if (token == null || !jwtService.isValidJwtToken(token)) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            long userId = Long.parseLong(jwtService.extractUserId(token));

            // Load the user's timezone from DB so date calculations respect their local time.
            // This is a single indexed PK lookup — negligible overhead per request.
            String timezone = userRepository.findById(userId)
                    .map(u -> u.getTimezone())
                    .orElse("UTC");

            UserPrincipal principal = new UserPrincipal(userId, timezone);
            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(principal, null, List.of());
            SecurityContextHolder.getContext().setAuthentication(authentication);
        } catch (NumberFormatException e) {
            filterChain.doFilter(request, response);
            return;
        }

        filterChain.doFilter(request, response);
    }

    private String extractBearerToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}