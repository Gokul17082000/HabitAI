import { Stack } from "expo-router";

export default function HabitsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="create" options={{ presentation: "modal" }} />
      <Stack.Screen name="[habitId]/edit" />
      <Stack.Screen name="[habitId]/activity" />
    </Stack>
  );
}