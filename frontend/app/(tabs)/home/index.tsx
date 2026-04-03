import { useCallback, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, SafeAreaView, StatusBar, RefreshControl } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { getHabitsForDateApi } from "../../../services/habitService";
import { HabitResponse, HabitStatus } from "../../../types/habit";
import { formatDate } from "../../../utils/formatters";
import { Colors } from "../../../constants/colors";
import HabitCard from "../../../components/HabitCard";
import { UnauthorizedError } from "../../../utils/apiHandler";
import SkeletonCard from "../../../components/SkeletonCard";

export default function HomeScreen() {
  const [habits, setHabits] = useState<HabitResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadHabits = useCallback(async () => {
    setError("");
    try {
      const today = formatDate(new Date());
      const data = await getHabitsForDateApi(today);
      setHabits(data);
    } catch (e) {
      if (e instanceof UnauthorizedError) return;
      setError("Failed to load habits. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadHabits();
    }, [loadHabits])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHabits();
  }, [loadHabits]);

  const handleLogged = useCallback((habitId: number, newStatus: HabitStatus) => {
    setHabits(prev =>
      prev.map(h =>
        h.id === habitId ? { ...h, habitStatus: newStatus } : h
      )
    );
  }, []);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning 👋"
    : hour < 18 ? "Good Afternoon 👋"
    : "Good Evening 👋";

  const completed = habits.filter(h => h.habitStatus === "COMPLETED").length;
  const total = habits.length;
  const progress = total > 0 ? completed / total : 0;
  const progressPercent = Math.round(progress * 100);

  const progressMessage =
    progressPercent === 100 ? "All done! Great work 🎉"
    : progressPercent >= 50 ? "Keep going 💪"
    : progressPercent > 0 ? "Good start! 🌱"
    : "Let's get started! 🚀";

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{greeting}</Text>
        </View>

        <View style={styles.divider} />

        {/* Date */}
        <Text style={styles.today}>Today · {today}</Text>

        {!loading && !error && total > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>{progressMessage}</Text>
              <Text style={styles.progressCount}>{completed}/{total}</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>
          </View>
        )}

        {/* Content */}
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
            <Text style={styles.emptyTitle}>No habits yet 👋</Text>
            <Text style={styles.emptySubtitle}>
              Start by creating your first habit.
            </Text>
            <Pressable
              style={styles.createBtn}
              onPress={() => router.push("/(tabs)/habits/create")}
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
            {habits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                onLogged={handleLogged}
              />
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
    </SafeAreaView>
  );
}

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
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginBottom: 16,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 13,
    color: Colors.subtext,
    fontWeight: "500",
  },
  progressCount: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
  },
  progressTrack: {
    height: 8,
    backgroundColor: "#e5e7eb",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: 8,
    backgroundColor: Colors.primary,
    borderRadius: 4,
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