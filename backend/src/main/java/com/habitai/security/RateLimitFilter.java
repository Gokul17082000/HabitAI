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
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final int MAX_REQUESTS = 10;
    private static final long WINDOW_MS = 60_000L;
    private static final int EVICTION_INTERVAL = 500;

    private final Map<String, RequestWindow> windowMap = new ConcurrentHashMap<>();
    // Thread-safe eviction counter (was a plain int — minor fix also applied here)
    private final AtomicInteger requestsSinceEviction = new AtomicInteger(0);

    private final RateLimitProperties rateLimitProperties;

    public RateLimitFilter(RateLimitProperties rateLimitProperties) {
        this.rateLimitProperties = rateLimitProperties;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
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

        if (requestsSinceEviction.incrementAndGet() >= EVICTION_INTERVAL) {
            requestsSinceEviction.set(0);
            long now = Instant.now().toEpochMilli();
            windowMap.entrySet().removeIf(e -> now - e.getValue().windowStart > WINDOW_MS);
        }

        long now = Instant.now().toEpochMilli();
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
            return;
        }

        filterChain.doFilter(request, response);
    }

    /**
     * SECURITY FIX: X-Forwarded-For is only trusted when the request arrives
     * from a known trusted proxy IP (configured via rate-limit.trusted-proxies).
     *
     * Without this check, any client can send:
     *   X-Forwarded-For: 1.2.3.4
     * and rotate through infinite fake IPs, bypassing the rate limiter entirely.
     *
     * When no trusted proxies are configured (e.g. local dev), the header is
     * ignored and remoteAddr is used directly — safe default.
     */
    private String resolveClientIp(HttpServletRequest request) {
        Set<String> trustedProxies = rateLimitProperties.getTrustedProxies();
        String remoteAddr = request.getRemoteAddr();

        if (trustedProxies != null
                && !trustedProxies.isEmpty()
                && trustedProxies.contains(remoteAddr)) {
            String forwarded = request.getHeader("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) {
                // The leftmost IP is the original client; subsequent entries are proxies
                return forwarded.split(",")[0].trim();
            }
        }

        return remoteAddr;
    }

    private static class RequestWindow {
        final long windowStart;
        final AtomicInteger count = new AtomicInteger(0);

        RequestWindow(long windowStart) {
            this.windowStart = windowStart;
        }
    }
}