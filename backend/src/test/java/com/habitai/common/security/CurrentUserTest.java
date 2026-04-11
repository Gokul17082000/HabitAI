package com.habitai.common.security;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CurrentUserTest {

    private CurrentUser currentUser;

    @Mock
    private SecurityContext securityContext;

    @Mock
    private Authentication authentication;

    @BeforeEach
    void setUp() {
        currentUser = new CurrentUser();

        // Inject our mocked SecurityContext into the static holder
        SecurityContextHolder.setContext(securityContext);
    }

    @AfterEach
    void tearDown() {
        // Vital: Clear the context to avoid state leaking to other tests!
        SecurityContextHolder.clearContext();
    }

    @Test
    void getId_WhenAuthenticatedWithUserPrincipal_ShouldReturnUserId() {
        UserPrincipal userPrincipal = new UserPrincipal(100L, "UTC");

        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn(userPrincipal);

        long userId = currentUser.getId();

        assertEquals(100L, userId);
    }

    @Test
    void getId_WhenAuthenticationIsNull_ShouldThrowException() {
        when(securityContext.getAuthentication()).thenReturn(null);

        assertThrows(IllegalStateException.class, () -> currentUser.getId());
    }

    @Test
    void getId_WhenNotAuthenticated_ShouldThrowException() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(false);

        assertThrows(IllegalStateException.class, () -> currentUser.getId());
    }

    @Test
    void getId_WhenPrincipalIsNotUserPrincipal_ShouldThrowException() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn("anonymousUser"); // Not a UserPrincipal

        assertThrows(IllegalStateException.class, () -> currentUser.getId());
    }
}
