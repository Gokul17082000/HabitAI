import { Platform } from "react-native";
import { getToken } from "./authStorage";
import { API_ENDPOINTS } from "../constants/api";

export async function registerForPushNotifications(): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    const messaging = (await import("@react-native-firebase/messaging")).default;

    // Request permission
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === 1 || // AUTHORIZED
      authStatus === 2;   // PROVISIONAL

    if (!enabled) {
      console.log("Push notification permission denied");
      return;
    }

    // Get FCM token directly
    const fcmToken = await messaging().getToken();
    console.log("FCM Token:", fcmToken);
    await savePushToken(fcmToken);

    if (Platform.OS === "android") {
      const { default: notifee } = await import("@react-native-firebase/messaging");
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

    await fetch(API_ENDPOINTS.pushToken, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: pushToken }),
    });
    console.log("Push token saved successfully");
  } catch (e) {
    console.error("Failed to save push token", e);
  }
}