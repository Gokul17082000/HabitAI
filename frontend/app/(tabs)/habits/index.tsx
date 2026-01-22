import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { getToken } from "../../../utils/authStorage";
import { Alert } from "react-native";

export default function MasterHabitsScreen() {
  const [habits, setHabits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  /* ---------------- Load all habits ---------------- */
  const loadHabits = useCallback(async () => {
    const token = await getToken();
    if (!token) return;

    try {
      const res = await fetch("http://localhost:8080/habits/all", {
        headers: { Authorization: `Bearer ${token}` },
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

  const handleDelete = async(habitId: number) => {
      const token = await getToken();
      if (!token) return;

      setDeletingId(habitId);

      try {
          await fetch(`http://localhost:8080/habits/${habitId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          setHabits(prev => prev.filter(h => h.id !== habitId))
      } catch {
          loadHabits();
      } finally {
          setDeletingId(null);
      }
  }

  const confirmDelete = (habitId: number) => {
    Alert.alert(
      "Delete Habit",
      "This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => handleDelete(habitId) },
      ]
    );
  };

  /* ---------------- Render ---------------- */
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Habits</Text>

      <View style={styles.divider} />

      {loading ? (
        <Text>Loading habits...</Text>
      ) : habits.length === 0 ? (
        <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🧠</Text>
            <Text style={styles.emptyTitle}>No habits yet</Text>
            <Text style={styles.emptySubtitle}>
              Create habits to stay consistent and build better routines.
            </Text>

          </View>
        ) : (
        <ScrollView>
          {habits.map((habit) => (
            <View key={habit.id} style={styles.card}>
              {/* Left */}
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{habit.title}</Text>
                <Text style={styles.meta}>
                  {habit.category} • {habit.frequency}
                </Text>
                <Text style={styles.time}>
                  ⏰ {formatTime(habit.targetTime)}
                </Text>
              </View>

              <View style={styles.actions}>
                <Pressable onPress={() => router.push(`/(tabs)/habits/${habit.id}/edit`)}>
                    <Text style={{ opacity: deletingId === habit.id ? 0.4 : 1 }}>✏️</Text>
                </Pressable>
                <Pressable disabled={deletingId === habit.id} onPress={() => confirmDelete(habit.id)}>
                    <Text style={{ opacity: deletingId === habit.id ? 0.4 : 1 }}> {deletingId === habit.id ? "⏳" : "🗑️"}</Text>
                </Pressable>
                <Pressable onPress={() => router.push(`/(tabs)/habits/${habit.id}/activity`)}>
                  <Text>📊</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Pressable
        style={styles.addButton}
        onPress={() => router.push("(tabs)/habits/create")}
      >
        <Text style={styles.addButtonText}>＋</Text>
      </Pressable>
    </View>
  );
}

/* ---------------- Helpers ---------------- */
function formatTime(time: string) {
  if (!time) return "";
  const [h, m] = time.split(":");
  const hour = Number(h);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f8f9fa",
  },

  header: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 16,
  },

  empty: {
    textAlign: "center",
    color: "#666",
    marginTop: 40,
  },

  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  title: {
    fontSize: 16,
    fontWeight: "600",
  },

  meta: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },

  time: {
    fontSize: 13,
    color: "#4f46e5",
    marginTop: 6,
  },

  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
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

  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 6,
  },

  emptySubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 20,
  },

});
