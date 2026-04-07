package com.habitai.common.security;

import com.habitai.common.AppConstants;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.annotation.RequestScope;

import java.time.ZoneId;

@Component
@RequestScope
public class CurrentUser {

    public long getId() {
        return getPrincipal().getUserId();
    }

    /**
     * Returns the authenticated user's timezone as a ZoneId.
     * Falls back to the global APP_ZONE if the stored value is invalid or missing.
     */
    public ZoneId getZone() {
        String tz = getPrincipal().getTimezone();
        try {
            return ZoneId.of(tz);
        } catch (Exception e) {
            return AppConstants.APP_ZONE;
        }
    }

    private UserPrincipal getPrincipal() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new IllegalStateException("User not authenticated");
        }
        if (authentication.getPrincipal() instanceof UserPrincipal userPrincipal) {
            return userPrincipal;
        }
        throw new IllegalStateException("User not authenticated");
    }
}