import { useCallback, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Platform } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Alert } from "react-native";
import { getAllHabitsApi, deleteHabitApi } from "../../../services/habitService";
import { HabitDTO } from "../../../types/habit";
import { formatTime } from "../../../utils/formatters";
import { Colors } from "../../../constants/colors";

export default function MasterHabitsScreen() {
  const [habits, setHabits] = useState<HabitDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  /* ---------------- Load all habits ---------------- */
  const loadHabits = useCallback(async () => {
    setError("");
    try {
      const data = await getAllHabitsApi();
      setHabits(data);
    } catch (e) {
      if (e instanceof Error && e.message === "Not authenticated") {
        router.replace("/");
        return;
      }
      setError("Failed to load habits.");
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

  /* ---------------- Delete ---------------- */
  const handleDelete = async (habitId: number) => {
    setDeletingId(habitId);
    try {
      await deleteHabitApi(habitId);
      setHabits((prev) => prev.filter((h) => h.id !== habitId));
    } catch {
      loadHabits();
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDelete = (habitId: number) => {
    if (Platform.OS === "web") {
        const confirmed = window.confirm("Delete Habit - This action cannot be undone.");
        if (confirmed) {
          handleDelete(habitId);
        }
    } else {
        Alert.alert(
          "Delete Habit",
          "This action cannot be undone.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: () => handleDelete(habitId),
            },
          ]
        );
    }
  };

  /* ---------------- Render ---------------- */
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Habits</Text>
      <View style={styles.divider} />

      {loading ? (
        <Text style={styles.loadingText}>Loading habits...</Text>
      ) : error ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Something went wrong</Text>
          <Text style={styles.emptySubtitle}>{error}</Text>
        </View>
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

              {/* Actions */}
              <View style={styles.actions}>
                <Pressable
                  disabled={deletingId === habit.id}
                  onPress={() =>
                    router.push(`/(tabs)/habits/${habit.id}/edit`)
                  }
                >
                  <Text
                    style={{ opacity: deletingId === habit.id ? 0.4 : 1 }}
                  >
                    ✏️
                  </Text>
                </Pressable>

                <Pressable
                  disabled={deletingId === habit.id}
                  onPress={() => confirmDelete(habit.id)}
                >
                  <Text
                    style={{ opacity: deletingId === habit.id ? 0.4 : 1 }}
                  >
                    {deletingId === habit.id ? "⏳" : "🗑️"}
                  </Text>
                </Pressable>

                <Pressable
                  disabled={deletingId === habit.id}
                  onPress={() =>
                    router.push(`/(tabs)/habits/${habit.id}/activity`)
                  }
                >
                  <Text
                    style={{ opacity: deletingId === habit.id ? 0.4 : 1 }}
                  >
                    📊
                  </Text>
                </Pressable>
              </View>
            </View>
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
    padding: 20,
    backgroundColor: Colors.background,
  },
  header: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 8,
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginBottom: 16,
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
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.subtext,
    textAlign: "center",
    marginBottom: 20,
  },
  card: {
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  meta: {
    fontSize: 12,
    color: Colors.subtext,
    marginTop: 4,
  },
  time: {
    fontSize: 13,
    color: Colors.primary,
    marginTop: 6,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
});