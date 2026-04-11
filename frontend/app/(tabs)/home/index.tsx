import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { getHabitsForDateApi, getAllHabitsApi } from "../../../services/habitService";
import { HabitResponse, HabitStatus } from "../../../types/habit";
import { formatDate } from "../../../utils/formatters";
import { Colors } from "../../../constants/colors";
import HabitCard from "../../../components/HabitCard";
import { UnauthorizedError } from "../../../utils/apiHandler";
import SkeletonCard from "../../../components/SkeletonCard";
import { suggestHabitsApi } from "../../../services/aiService";

export default function HomeScreen() {
  const [habits, setHabits] = useState<HabitResponse[]>([]);
  // MINOR FIX: track total habit count (including paused) separately from the
  // visible list. When habits=[] but totalHabits>0, all habits are paused —
  // we show a dedicated message instead of the "No habits yet" onboarding state.
  const [totalHabits, setTotalHabits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [goal, setGoal] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [goalError, setGoalError] = useState("");

  const loadHabits = useCallback(async () => {
    setError("");
    try {
      const today = formatDate(new Date());
      // Fetch today's visible habits and total habit count in parallel
      const [data, all] = await Promise.all([
        getHabitsForDateApi(today),
        getAllHabitsApi(),
      ]);
      setHabits(data);
      setTotalHabits(all.length);
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

  const handleSuggest = async () => {
    if (!goal.trim()) return;
    if (goal.trim().length > 500) {
      setGoalError("Goal must be 500 characters or fewer");
      return;
    }
    setSuggesting(true);
    setGoalError("");
    try {
      const suggested = await suggestHabitsApi(goal.trim());
      setGoal("");
      router.push({
        pathname: "/(tabs)/habits/ai-review",
        params: { habits: JSON.stringify(suggested) },
      });
    } catch (e: any) {
      setGoalError(e.message || "Failed to get suggestions");
    } finally {
      setSuggesting(false);
    }
  };

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
        ) : habits.length === 0 && totalHabits === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No habits yet 👋</Text>
            <Text style={styles.emptySubtitle}>
              Tell the AI your goal and get a personalised plan in seconds.
            </Text>
            <TextInput
              style={styles.goalInput}
              placeholder='e.g. "I want to sleep better"'
              placeholderTextColor={Colors.subtext}
              value={goal}
              onChangeText={setGoal}
            />
            {goalError ? <Text style={styles.goalError}>{goalError}</Text> : null}
            <Pressable
              style={[styles.createBtn, suggesting && { opacity: 0.6 }]}
              onPress={handleSuggest}
              disabled={suggesting}
            >
              {suggesting
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.createBtnText}>✨ Ask AI Coach →</Text>
              }
            </Pressable>
            <Pressable
              style={styles.secondaryBtn}
              onPress={() => router.push("/(tabs)/habits/create")}
            >
              <Text style={styles.secondaryBtnText}>Create manually instead</Text>
            </Pressable>
          </View>
        ) : habits.length === 0 && totalHabits > 0 ? (
          // All habits are paused — show a clear message instead of a blank screen
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>All habits paused ⏸️</Text>
            <Text style={styles.emptySubtitle}>
              Your habits are taking a break. Head to the Habits tab to resume them.
            </Text>
            <Pressable
              style={styles.createBtn}
              onPress={() => router.push("/(tabs)/habits")}
            >
              <Text style={styles.createBtnText}>Go to Habits →</Text>
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
    paddingHorizontal: 20,
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
    maxWidth: 280,
    marginBottom: 16,
  },
  goalInput: {
    borderWidth: 1,
    borderColor: "#ddd9ff",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: "#fff",
    color: Colors.text,
    marginBottom: 8,
    width: "100%",
  },
  goalError: {
    fontSize: 12,
    color: "#ef4444",
    marginBottom: 6,
  },
  createBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    width: "100%",
  },
  createBtnText: {
    color: Colors.white,
    fontWeight: "600",
    fontSize: 14,
  },
  secondaryBtn: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  secondaryBtnText: {
    color: Colors.subtext,
    fontSize: 13,
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