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
  ActivityIndicator,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { getAllHabitsApi, deleteHabitApi, pauseHabitApi, resumeHabitApi } from "../../../services/habitService";
import { HabitDTO } from "../../../types/habit";
import { Colors } from "../../../constants/colors";
import { UnauthorizedError } from "../../../utils/apiHandler";
import SkeletonCard from "../../../components/SkeletonCard";
import ManageHabitCard from "../../../components/ManageHabitCard";
import { suggestHabitsApi } from "../../../services/aiService";
import { CreateHabitRequest } from "../../../types/habit";

export default function MasterHabitsScreen() {
  const [habits, setHabits] = useState<HabitDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [pausingId, setPausingId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const activeHabits = habits.filter((h) => !h.paused);
  const pausedHabits = habits.filter((h) => h.paused);

  const [goal, setGoal] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [goalError, setGoalError] = useState("");

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
      if (window.confirm("Delete Habit — This action cannot be undone.")) {
        handleDelete(habitId);
      }
    } else {
      Alert.alert("Delete Habit", "This action cannot be undone.", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => handleDelete(habitId) },
      ]);
    }
  };

  /* ---------------- Pause ---------------- */
  const handlePause = async (habitId: number, days: number) => {
    setPausingId(habitId);
    try {
      await pauseHabitApi(habitId, days);
      setHabits((prev) =>
        prev.map((h) => {
          if (h.id !== habitId) return h;
          const pausedUntil = new Date();
          pausedUntil.setDate(pausedUntil.getDate() + days);
          return { ...h, paused: true, pausedUntil: pausedUntil.toISOString().split("T")[0] };
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
        { text: "3 days",  onPress: () => handlePause(habitId, 3) },
        { text: "7 days",  onPress: () => handlePause(habitId, 7) },
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
      setHabits((prev) =>
        prev.map((h) => (h.id === habitId ? { ...h, paused: false, pausedUntil: null } : h))
      );
    } catch {
      loadHabits();
    } finally {
      setPausingId(null);
    }
  };

  const handleSuggest = async () => {
    if (!goal.trim()) return;
    setSuggesting(true);
    setGoalError("");
    try {
      const habits = await suggestHabitsApi(goal.trim());
      router.push({
        pathname: "/(tabs)/habits/ai-review",
        params: { habits: JSON.stringify(habits) },
      });
    } catch (e: any) {
      setGoalError(e.message || "Failed to get suggestions");
    } finally {
      setSuggesting(false);
      setGoal("");
    }
  };

  const isActioning = (habitId: number) =>
    deletingId === habitId || pausingId === habitId;

  /* ---------------- Render ---------------- */
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
          <>
              {/* AI Banner */}
              <View style={aiBannerStyles.card}>
                <Text style={aiBannerStyles.heading}>✨ Not sure what habits to build?</Text>
                <Text style={aiBannerStyles.sub}>Tell the AI your goal and get a plan in seconds.</Text>
                <TextInput
                  style={aiBannerStyles.input}
                  placeholder='e.g. "I want to sleep better"'
                  placeholderTextColor={Colors.subtext}
                  value={goal}
                  onChangeText={setGoal}
                />
                {goalError ? <Text style={aiBannerStyles.error}>{goalError}</Text> : null}
                <Pressable
                  style={[aiBannerStyles.btn, suggesting && { opacity: 0.6 }]}
                  onPress={handleSuggest}
                  disabled={suggesting}
                >
                  {suggesting
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={aiBannerStyles.btnText}>Ask AI Coach →</Text>
                  }
                </Pressable>
              </View>
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
                {activeHabits.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>Active ({activeHabits.length})</Text>
                    {activeHabits.map((habit) => (
                      <ManageHabitCard
                        key={habit.id}
                        habit={habit}
                        isActioning={isActioning(habit.id)}
                        isDeleting={deletingId === habit.id}
                        isPausing={pausingId === habit.id}
                        onDelete={confirmDelete}
                        onPause={confirmPause}
                        onResume={handleResume}
                      />
                    ))}
                  </>
                )}

                {pausedHabits.length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, styles.sectionTitlePaused]}>
                      Paused ({pausedHabits.length})
                    </Text>
                    {pausedHabits.map((habit) => (
                      <ManageHabitCard
                        key={habit.id}
                        habit={habit}
                        isActioning={isActioning(habit.id)}
                        isDeleting={deletingId === habit.id}
                        isPausing={pausingId === habit.id}
                        onDelete={confirmDelete}
                        onPause={confirmPause}
                        onResume={handleResume}
                      />
                    ))}
                  </>
                )}
              </ScrollView>
          </>
        )}

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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: StatusBar.currentHeight ?? 12,
  },
  container: { flex: 1, padding: 20 },
  header: { fontSize: 22, fontWeight: "600", marginBottom: 8, color: Colors.text },
  divider: { height: 1, backgroundColor: "#e5e7eb", marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: Colors.text, marginBottom: 10, marginTop: 4 },
  sectionTitlePaused: { color: Colors.subtext, marginTop: 20 },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: "600", marginBottom: 6, color: Colors.text },
  emptySubtitle: { fontSize: 14, color: Colors.subtext, textAlign: "center", marginBottom: 20 },
  createBtn: { backgroundColor: Colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  createBtnText: { color: Colors.white, fontWeight: "600", fontSize: 14 },
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
  addButtonText: { color: Colors.white, fontSize: 28, fontWeight: "bold" },
});

const aiBannerStyles = StyleSheet.create({
    card: { backgroundColor: "#f0f0ff", borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#ddd9ff" },
    heading: { fontSize: 14, fontWeight: "600", color: Colors.text, marginBottom: 4 },
    sub: { fontSize: 13, color: Colors.subtext, marginBottom: 10 },
    input: { borderWidth: 1, borderColor: "#ddd9ff", borderRadius: 8, padding: 10, fontSize: 14, backgroundColor: "#fff", color: Colors.text, marginBottom: 8 },
    btn: { backgroundColor: Colors.primary, borderRadius: 8, paddingVertical: 10, alignItems: "center" },
    btnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
    error: { fontSize: 12, color: "#ef4444", marginBottom: 6 },
  });
