import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

// Keep the splash visible until index.tsx finishes its auth/onboarding check.
// hideAsync() is called there, after we know where to navigate.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
      <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
      <Stack.Screen name="index" options={{ gestureEnabled: false }} />
      <Stack.Screen name="auth" options={{ gestureEnabled: false }} />
      <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
    </Stack>
  );
}