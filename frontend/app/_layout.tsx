import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />      {/* Login */}
      <Stack.Screen name="auth" />       {/* Register */}
      <Stack.Screen name="(tabs)" />     {/* Main App */}
    </Stack>
  );
}
