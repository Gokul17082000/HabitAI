import { Stack } from "expo-router";

export default function HabitsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />        {/* Master habits */}
      <Stack.Screen name="create" options={{ presentation: "modal" }} />
      <Stack.Screen name="[id]/edit" />
    </Stack>
  );
}
