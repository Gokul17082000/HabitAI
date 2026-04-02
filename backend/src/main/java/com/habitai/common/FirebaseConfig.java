package com.habitai.common;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Lazy;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;

@Lazy(false)
@Configuration
public class FirebaseConfig {

    private static final Logger logger = LoggerFactory.getLogger(FirebaseConfig.class);

    @Value("${firebase.service-account}")
    private String serviceAccountPath;

    @PostConstruct
    public void initialize() {
        try {
            File file = new File(serviceAccountPath);
            logger.info("Firebase service account path: {}", serviceAccountPath);
            logger.info("Firebase service account file exists: {}", file.exists());  // ← add this

            if (FirebaseApp.getApps().isEmpty()) {
                FileInputStream serviceAccount = new FileInputStream(serviceAccountPath);
                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                        .build();
                FirebaseApp.initializeApp(options);
                logger.info("Firebase initialized successfully");
            }
        } catch (IOException e) {
            throw new RuntimeException("Failed to initialize Firebase — check service account path: " + serviceAccountPath, e);
        }
    }
}