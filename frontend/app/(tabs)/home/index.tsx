import { useCallback, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { getToken, removeToken } from "../../../utils/authStorage";
import HabitCard from "../../../components/HabitCard";

export default function HomeScreen() {
  const [habits, setHabits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  /* ---------------- Load habits ---------------- */
  const loadHabits = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      router.replace("/");
      return;
    }

    const today = new Date().toLocaleDateString("en-CA");
    try {
      const res = await fetch(`http://localhost:8080/habits?date=${today}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      setHabits(data);
    } catch (e) {
      console.log("Failed to load habits");
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

  /* ---------------- Logout ---------------- */
  const handleLogout = async () => {
    await removeToken();
    router.replace("/");
  };

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
        <Text style={{ color: "#666", textAlign: "center" }}>
          Loading habits...
        </Text>
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
            <HabitCard key={habit.id} habit={habit} onLogged={loadHabits}/>
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
    backgroundColor: "#f8f9fa",
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
  },

  today: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
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
  },

  emptySubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    maxWidth: 240,
  },

  addButton: {
    position: "absolute",
    right: 20,
    bottom: 30,
    backgroundColor: "#4f46e5",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },

  addButtonText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
  },

  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginBottom: 16,
  },

});
