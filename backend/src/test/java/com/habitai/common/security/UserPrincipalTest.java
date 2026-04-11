package com.habitai.common.security;

import org.junit.jupiter.api.Test;
import org.springframework.security.core.GrantedAuthority;

import java.util.Collection;

import static org.junit.jupiter.api.Assertions.*;

class UserPrincipalTest {

    @Test
    void testConstructorAndGetUserId() {
        long userId = 123L;
        UserPrincipal userPrincipal = new UserPrincipal(userId, "UTC");
        assertEquals(userId, userPrincipal.getUserId());
    }

    @Test
    void testGetUsername() {
        long userId = 456L;
        UserPrincipal userPrincipal = new UserPrincipal(userId, "UTC");
        assertEquals("456", userPrincipal.getUsername());
    }

    @Test
    void testGetAuthorities() {
        UserPrincipal userPrincipal = new UserPrincipal(1L, "UTC");
        Collection<? extends GrantedAuthority> authorities = userPrincipal.getAuthorities();
        assertNotNull(authorities);
        assertTrue(authorities.isEmpty());
    }

    @Test
    void testGetPassword() {
        UserPrincipal userPrincipal = new UserPrincipal(1L, "UTC");
        assertNull(userPrincipal.getPassword());
    }

    @Test
    void testIsAccountNonExpired() {
        UserPrincipal userPrincipal = new UserPrincipal(1L, "UTC");
        assertTrue(userPrincipal.isAccountNonExpired());
    }

    @Test
    void testIsAccountNonLocked() {
        UserPrincipal userPrincipal = new UserPrincipal(1L, "UTC");
        assertTrue(userPrincipal.isAccountNonLocked());
    }

    @Test
    void testIsCredentialsNonExpired() {
        UserPrincipal userPrincipal = new UserPrincipal(1L, "UTC");
        assertTrue(userPrincipal.isCredentialsNonExpired());
    }

    @Test
    void testIsEnabled() {
        UserPrincipal userPrincipal = new UserPrincipal(1L, "UTC");
        assertTrue(userPrincipal.isEnabled());
    }
}