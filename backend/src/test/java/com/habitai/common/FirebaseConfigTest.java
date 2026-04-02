package com.habitai.common;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.io.InputStream;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FirebaseConfigTest {

    private FirebaseConfig firebaseConfig;

    @BeforeEach
    void setUp() {
        firebaseConfig = new FirebaseConfig();
    }

    @Test
    void initialize_shouldInitializeFirebase_whenAppsIsEmpty() throws IOException {
        // Arrange
        String serviceAccountPath = "src/test/resources/firebase-service-account.json";
        ReflectionTestUtils.setField(firebaseConfig, "serviceAccountPath", serviceAccountPath);

        try (MockedStatic<FirebaseApp> firebaseAppMock = Mockito.mockStatic(FirebaseApp.class);
             MockedStatic<GoogleCredentials> googleCredentialsMock = Mockito.mockStatic(GoogleCredentials.class)) {

            firebaseAppMock.when(FirebaseApp::getApps).thenReturn(Collections.emptyList());
            GoogleCredentials mockCredentials = mock(GoogleCredentials.class);
            googleCredentialsMock.when(() -> GoogleCredentials.fromStream(any(InputStream.class))).thenReturn(mockCredentials);

            // Act
            firebaseConfig.initialize();

            // Assert
            firebaseAppMock.verify(() -> FirebaseApp.initializeApp(any(FirebaseOptions.class)), times(1));
        }
    }

    @Test
    void initialize_shouldNotInitializeFirebase_whenAppsIsNotEmpty() throws IOException {
        // Arrange
        String serviceAccountPath = "src/test/resources/firebase-service-account.json";
        ReflectionTestUtils.setField(firebaseConfig, "serviceAccountPath", serviceAccountPath);

        try (MockedStatic<FirebaseApp> firebaseAppMock = Mockito.mockStatic(FirebaseApp.class)) {
            FirebaseApp mockApp = mock(FirebaseApp.class);
            firebaseAppMock.when(FirebaseApp::getApps).thenReturn(Collections.singletonList(mockApp));

            // Act
            firebaseConfig.initialize();

            // Assert
            firebaseAppMock.verify(() -> FirebaseApp.initializeApp(any(FirebaseOptions.class)), never());
        }
    }

    @Test
    void initialize_shouldThrowRuntimeException_whenIOExceptionOccurs() throws IOException {
        // Arrange
        String invalidPath = "/invalid/path/service-account.json";
        ReflectionTestUtils.setField(firebaseConfig, "serviceAccountPath", invalidPath);

        // Act & Assert
        RuntimeException exception = assertThrows(RuntimeException.class, () -> firebaseConfig.initialize());
        assertTrue(exception.getMessage().contains("Failed to initialize Firebase"));
        assertTrue(exception.getMessage().contains(invalidPath));
        assertInstanceOf(IOException.class, exception.getCause());
    }
}