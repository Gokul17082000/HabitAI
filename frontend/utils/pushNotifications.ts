import { PermissionsAndroid, Platform, Alert, Linking } from "react-native";
import { API_ENDPOINTS } from "../constants/api";
import { buildAuthHeaders, handleResponse, retryPost } from "./apiHandler";

if (Platform.OS === "android") {
  import("@react-native-firebase/messaging").then(({ default: messaging }) => {
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log("Background message:", remoteMessage);
    });
  });
}

export async function registerForPushNotifications(): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    if (Platform.OS === "android") {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );

      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert(
          "Notifications Disabled",
          "Please enable notifications for HabitAI in your phone settings to receive habit reminders.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }
    }

    const messaging = (await import("@react-native-firebase/messaging")).default;

    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === 1 || // AUTHORIZED
      authStatus === 2;   // PROVISIONAL

    if (!enabled) {
      console.log("Push notification permission denied");
      return;
    }

    const fcmToken = await messaging().getToken();
    await savePushToken(fcmToken);

    messaging().onTokenRefresh(async (newToken) => {
      await savePushToken(newToken);
    });

    messaging().onMessage(async remoteMessage => {
      Alert.alert(
        remoteMessage.notification?.title ?? "HabitAI Reminder 🔔",
        remoteMessage.notification?.body ?? "You have a habit reminder",
        [{ text: "OK" }]
      );
    });

  } catch (e) {
    console.error("Failed to register for push notifications", e);
  }
}

async function savePushToken(pushToken: string): Promise<void> {
  try {
    const url = API_ENDPOINTS.pushToken;
    const body = JSON.stringify({ token: pushToken });
    const headers = await buildAuthHeaders();
    const response = await fetch(url, { method: "POST", headers, body });
    await handleResponse<void>(response, retryPost(url, "POST", body));
  } catch (e) {
    console.error("Failed to save push token:", e);
  }
}