import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Alert,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { getAllHabitsApi, deleteHabitApi, pauseHabitApi, resumeHabitApi } from "../../../services/habitService";
import { HabitDTO } from "../../../types/habit";
import { formatTime } from "../../../utils/formatters";
import { Colors } from "../../../constants/colors";
import { UnauthorizedError } from "../../../utils/apiHandler";
import SkeletonCard from "../../../components/SkeletonCard";

export default function MasterHabitsScreen() {
  const [habits, setHabits] = useState<HabitDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [pausingId, setPausingId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  /* ---------------- Derived state ---------------- */
  const activeHabits = habits.filter((h) => !h.paused);
  const pausedHabits = habits.filter((h) => h.paused);

  /* ---------------- Load all habits ---------------- */
  const loadHabits = useCallback(async () => {
    setError("");
    try {
      const data = await getAllHabitsApi();
      setHabits(data);
    } catch (e) {
      if (e instanceof UnauthorizedError) return;
      setError("Failed to load habits.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /* ---------------- Refresh on focus ---------------- */
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadHabits();
    }, [loadHabits])
  );

  /* ---------------- Pull to refresh ---------------- */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHabits();
  }, [loadHabits]);

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
      if (confirmed) handleDelete(habitId);
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

  /* ---------------- Pause ---------------- */
  const handlePause = async (habitId: number, days: number) => {
    setPausingId(habitId);
    try {
      await pauseHabitApi(habitId, days);
      // Optimistically update local state
      setHabits((prev) =>
        prev.map((h) => {
          if (h.id !== habitId) return h;
          const pausedUntil = new Date();
          pausedUntil.setDate(pausedUntil.getDate() + days);
          return {
            ...h,
            paused: true,
            pausedUntil: pausedUntil.toISOString().split("T")[0],
          };
        })
      );
    } catch {
      loadHabits();
    } finally {
      setPausingId(null);
    }
  };

  const confirmPause = (habitId: number) => {
    Alert.alert(
      "Pause Habit",
      "How long do you want to pause this habit? It will auto-resume after the selected period.",
      [
        { text: "3 days",  onPress: () => handlePause(habitId, 3)  },
        { text: "7 days",  onPress: () => handlePause(habitId, 7)  },
        { text: "14 days", onPress: () => handlePause(habitId, 14) },
        { text: "30 days", onPress: () => handlePause(habitId, 30) },
        { text: "Cancel",  style: "cancel" },
      ]
    );
  };

  /* ---------------- Resume ---------------- */
  const handleResume = async (habitId: number) => {
    setPausingId(habitId);
    try {
      await resumeHabitApi(habitId);
      // Optimistically update local state
      setHabits((prev) =>
        prev.map((h) =>
          h.id === habitId ? { ...h, paused: false, pausedUntil: null } : h
        )
      );
    } catch {
      loadHabits();
    } finally {
      setPausingId(null);
    }
  };

  /* ---------------- Helpers ---------------- */
  const formatPausedUntil = (dateStr: string | null): string => {
    if (!dateStr) return "";
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const isActioning = (habitId: number) =>
    deletingId === habitId || pausingId === habitId;

  /* ---------------- Render habit card ---------------- */
  const renderCard = (habit: HabitDTO) => (
    <View
      key={habit.id}
      style={[styles.card, habit.paused && styles.cardPaused]}
    >
      {/* Left */}
      <View style={{ flex: 1 }}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{habit.title}</Text>
          {habit.paused && (
            <View style={styles.pausedBadge}>
              <Text style={styles.pausedBadgeText}>⏸ Paused</Text>
            </View>
          )}
        </View>

        <Text style={styles.meta}>
          {habit.category} • {habit.frequency}
          {habit.isCountable ? ` • Target: ${habit.targetCount}` : ""}
        </Text>

        <Text style={styles.time}>⏰ {formatTime(habit.targetTime)}</Text>

        {habit.paused && habit.pausedUntil && (
          <Text style={styles.pausedUntilText}>
            Resumes on {formatPausedUntil(habit.pausedUntil)}
          </Text>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {/* Edit */}
        <Pressable
          disabled={isActioning(habit.id)}
          onPress={() => router.navigate(`/(tabs)/habits/${habit.id}/edit`)}
        >
          <Text style={{ opacity: isActioning(habit.id) ? 0.4 : 1 }}>✏️</Text>
        </Pressable>

        {/* Delete */}
        <Pressable
          disabled={isActioning(habit.id)}
          onPress={() => confirmDelete(habit.id)}
        >
          <Text style={{ opacity: isActioning(habit.id) ? 0.4 : 1 }}>
            {deletingId === habit.id ? "⏳" : "🗑️"}
          </Text>
        </Pressable>

        {/* Activity */}
        <Pressable
          disabled={isActioning(habit.id)}
          onPress={() => router.navigate(`/(tabs)/habits/${habit.id}/activity`)}
        >
          <Text style={{ opacity: isActioning(habit.id) ? 0.4 : 1 }}>📊</Text>
        </Pressable>

        {/* Pause / Resume */}
        {habit.paused ? (
          <Pressable
            disabled={isActioning(habit.id)}
            onPress={() => handleResume(habit.id)}
          >
            <Text style={{ opacity: isActioning(habit.id) ? 0.4 : 1 }}>
              {pausingId === habit.id ? "⏳" : "▶️"}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            disabled={isActioning(habit.id)}
            onPress={() => confirmPause(habit.id)}
          >
            <Text style={{ opacity: isActioning(habit.id) ? 0.4 : 1 }}>
              {pausingId === habit.id ? "⏳" : "⏸️"}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  /* ---------------- Main render ---------------- */
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.header}>Habits</Text>
        <View style={styles.divider} />

        {loading ? (
          <View>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
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
            <Pressable
              style={styles.createBtn}
              onPress={() => router.navigate("/(tabs)/habits/create")}
            >
              <Text style={styles.createBtnText}>Create your first habit →</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingBottom: 100 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[Colors.primary]}
                tintColor={Colors.primary}
              />
            }
          >
            {/* Active habits */}
            {activeHabits.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>
                  Active ({activeHabits.length})
                </Text>
                {activeHabits.map(renderCard)}
              </>
            )}

            {/* Paused habits — only shown when at least one is paused */}
            {pausedHabits.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, styles.sectionTitlePaused]}>
                  Paused ({pausedHabits.length})
                </Text>
                {pausedHabits.map(renderCard)}
              </>
            )}
          </ScrollView>
        )}

        {/* Floating Add Button */}
        <Pressable
          style={styles.addButton}
          onPress={() => router.navigate("/(tabs)/habits/create")}
        >
          <Text style={styles.addButtonText}>＋</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: StatusBar.currentHeight ?? 12,
  },
  container: {
    flex: 1,
    padding: 20,
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitlePaused: {
    color: Colors.subtext,
    marginTop: 20,
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
  createBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  createBtnText: {
    color: Colors.white,
    fontWeight: "600",
    fontSize: 14,
  },
  card: {
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  cardPaused: {
    opacity: 0.6,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: "dashed",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  pausedBadge: {
    backgroundColor: Colors.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  pausedBadgeText: {
    fontSize: 11,
    color: Colors.subtext,
    fontWeight: "600",
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
  pausedUntilText: {
    fontSize: 12,
    color: Colors.subtext,
    marginTop: 4,
    fontStyle: "italic",
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