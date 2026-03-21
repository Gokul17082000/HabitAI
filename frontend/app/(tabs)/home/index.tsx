import { useCallback, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { removeToken } from "../../../utils/authStorage";
import { getHabitsForDateApi } from "../../../services/habitService";
import { HabitResponse } from "../../../types/habit";
import { formatDate } from "../../../utils/formatters";
import { Colors } from "../../../constants/colors";
import HabitCard from "../../../components/HabitCard";
import { UnauthorizedError } from "../../../utils/apiHandler";

export default function HomeScreen() {
  const [habits, setHabits] = useState<HabitResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ---------------- Load habits ---------------- */
  const loadHabits = useCallback(async () => {
    setError("");
    try {
      const today = formatDate(new Date());
      const data = await getHabitsForDateApi(today);
      setHabits(data);
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        return;
      }
      setError("Failed to load habits. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  /* ---------------- Refresh on focus ---------------- */
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadHabits();
    }, [loadHabits])
  );

  /* ---------------- UI helpers ---------------- */
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? "Good Morning 👋"
      : hour < 18
      ? "Good Afternoon 👋"
      : "Good Evening 👋";

  /* ---------------- Render ---------------- */
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>{greeting}</Text>
      </View>

      <View style={styles.divider} />

      {/* Date */}
      <Text style={styles.today}>Today · {today}</Text>

      {/* Content */}
      {loading ? (
        <Text style={styles.loadingText}>Loading habits...</Text>
      ) : error ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Something went wrong</Text>
          <Text style={styles.emptySubtitle}>{error}</Text>
        </View>
      ) : habits.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No habits yet 👋</Text>
          <Text style={styles.emptySubtitle}>
            Start by creating your first habit.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          {habits.map((habit) => (
            <HabitCard key={habit.id} habit={habit} onLogged={loadHabits} />
          ))}
        </ScrollView>
      )}

      {/* Floating Add Button */}
      <Pressable
        style={styles.addButton}
        onPress={() => router.push("/(tabs)/habits/create")}
      >
        <Text style={styles.addButtonText}>＋</Text>
      </Pressable>
    </View>
  );
}

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  greeting: {
    fontSize: 22,
    fontWeight: "600",
    color: Colors.text,
  },
  today: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    color: Colors.text,
  },
  loadingText: {
    color: Colors.subtext,
    textAlign: "center",
    marginTop: 40,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.subtext,
    textAlign: "center",
    maxWidth: 240,
  },
  addButton: {
    position: "absolute",
    right: 20,
    bottom: 30,
    backgroundColor: Colors.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  addButtonText: {
    color: Colors.white,
    fontSize: 28,
    fontWeight: "bold",
  },
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginBottom: 16,
  },
});