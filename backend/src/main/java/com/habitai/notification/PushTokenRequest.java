package com.habitai.notification;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PushTokenRequest(
        // FCM tokens are typically ~163 chars; 512 gives headroom for APNs and future formats
        @NotBlank @Size(max = 512) String token
) {}