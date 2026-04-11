package com.habitai.security;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "rate-limit")
public class RateLimitProperties {

    /**
     * Set of trusted reverse-proxy IP addresses that are allowed to forward
     * the real client IP via the X-Forwarded-For header.
     *
     * Configure in application.yml:
     *
     *   rate-limit:
     *     trusted-proxies:
     *       - 10.0.0.1        # nginx / load balancer internal IP
     *       - 172.16.0.5      # another proxy tier
     *
     * Leave empty (the default) when running without a reverse proxy — in that
     * case X-Forwarded-For is ignored entirely and remoteAddr is used directly.
     */
    private Set<String> trustedProxies = new HashSet<>();
}