package com.habitai.security;

import com.habitai.common.security.UserPrincipal;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class AiRateLimitFilter extends OncePerRequestFilter {

    private static final int EVICTION_INTERVAL = 200;

    private final Map<Long, RequestWindow> windowMap = new ConcurrentHashMap<>();
    private final AtomicInteger requestsSinceEviction = new AtomicInteger(0);

    @Value("${ai-rate-limit.max-requests:20}")
    private int maxRequests;

    @Value("${ai-rate-limit.window-ms:60000}")
    private long windowMs;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/ai/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserPrincipal principal)) {
            filterChain.doFilter(request, response);
            return;
        }

        long userId = principal.getUserId();
        long now = Instant.now().toEpochMilli();

        if (requestsSinceEviction.incrementAndGet() >= EVICTION_INTERVAL) {
            requestsSinceEviction.set(0);
            windowMap.entrySet().removeIf(e -> now - e.getValue().windowStart > windowMs);
        }

        AtomicInteger countRef = new AtomicInteger();
        windowMap.compute(userId, (k, existing) -> {
            RequestWindow w = (existing == null || now - existing.windowStart > windowMs)
                    ? new RequestWindow(now) : existing;
            countRef.set(w.count.incrementAndGet());
            return w;
        });

        if (countRef.get() > maxRequests) {
            response.setStatus(429);
            response.setContentType("application/json");
            response.getWriter().write(
                    "{\"message\":\"AI rate limit exceeded. Please wait before making more requests.\",\"status\":429,\"code\":\"AI_RATE_LIMITED\"}"
            );
            return;
        }

        filterChain.doFilter(request, response);
    }

    private static class RequestWindow {
        final long windowStart;
        final AtomicInteger count = new AtomicInteger(0);

        RequestWindow(long windowStart) {
            this.windowStart = windowStart;
        }
    }
}
