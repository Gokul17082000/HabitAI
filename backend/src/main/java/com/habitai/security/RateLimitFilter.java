package com.habitai.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final int MAX_REQUESTS = 10;
    private static final long WINDOW_MS = 60_000L;
    // Evict stale entries every N filtered requests to prevent unbounded map growth
    private static final int EVICTION_INTERVAL = 500;

    private final Map<String, RequestWindow> windowMap = new ConcurrentHashMap<>();
    private int requestsSinceEviction = 0;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        // Only apply to auth endpoints — all other paths skip this filter entirely
        String path = request.getRequestURI();
        return !path.startsWith("/auth/login")
                && !path.startsWith("/auth/register")
                && !path.startsWith("/auth/refresh");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String clientIp = resolveClientIp(request);
        String key = clientIp + ":" + request.getRequestURI();

        // Periodically evict expired windows to prevent unbounded map growth
        if (++requestsSinceEviction >= EVICTION_INTERVAL) {
            requestsSinceEviction = 0;
            long now = Instant.now().toEpochMilli();
            windowMap.entrySet().removeIf(e -> now - e.getValue().windowStart > WINDOW_MS);
        }

        long now = Instant.now().toEpochMilli();
        // compute() is atomic; AtomicInteger.incrementAndGet() is the atomic increment inside.
        // This replaces the old non-atomic existing.count++ which allowed races under burst traffic.
        RequestWindow window = windowMap.compute(key, (k, existing) -> {
            if (existing == null || now - existing.windowStart > WINDOW_MS) {
                return new RequestWindow(now);
            }
            return existing;
        });

        int count = window.count.incrementAndGet();

        if (count > MAX_REQUESTS) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json");
            response.getWriter().write(
                    "{\"message\":\"Too many requests. Please try again later.\",\"status\":429}"
            );
            return; // stops the chain — no further filters or controllers run
        }

        filterChain.doFilter(request, response);
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private static class RequestWindow {
        final long windowStart;
        // AtomicInteger replaces the plain int — safe for concurrent increments
        final AtomicInteger count = new AtomicInteger(0);

        RequestWindow(long windowStart) {
            this.windowStart = windowStart;
        }
    }
}