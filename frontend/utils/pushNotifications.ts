import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { getToken } from "./authStorage";
import { API_ENDPOINTS } from "../constants/api";

export async function registerForPushNotifications(): Promise<void> {

  if (Platform.OS === "web") {
      console.log("Push notifications not supported on web — skipping");
      return;
  }
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Push notification permission denied");
      return;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    await savePushToken(tokenData.data);

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
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
  } catch (e) {
    console.error("Failed to save push token", e);
  }
}