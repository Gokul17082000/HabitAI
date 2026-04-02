import { Platform } from "react-native";
import { getToken } from "./authStorage";
import { API_ENDPOINTS } from "../constants/api";

export async function registerForPushNotifications(): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    const messaging = (await import("@react-native-firebase/messaging")).default;

    const authStatus = await messaging().requestPermission();
    const enabled = authStatus === 1 || authStatus === 2;

    if (!enabled) {
      console.log("Push notification permission denied");
      return;
    }

    const fcmToken = await messaging().getToken();
    console.log("FCM Token:", fcmToken);
    await savePushToken(fcmToken);

    messaging().onTokenRefresh(async (newToken) => {
      console.log("FCM token refreshed");
      await savePushToken(newToken);
    });

    if (Platform.OS === "android") {
      await messaging().setBackgroundMessageHandler(async remoteMessage => {
        console.log("Background message:", remoteMessage);
      });
    }

  } catch (e) {
    console.error("Failed to register for push notifications", e);
  }
}

async function savePushToken(pushToken: string): Promise<void> {
  try {
    const authToken = await getToken();
    if (!authToken) return;

    const res = await fetch(API_ENDPOINTS.pushToken, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: pushToken }),
    });

    if (!res.ok) {
      console.error("Push token save failed, status:", res.status);
    } else {
      console.log("Push token saved successfully");
    }
  } catch (e) {
    console.error("Network error saving push token:", e);
  }
}