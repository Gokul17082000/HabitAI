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
  TextInput,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { getAllHabitsApi, deleteHabitApi, pauseHabitApi, resumeHabitApi, archiveHabitApi, getArchivedHabitsApi, unarchiveHabitApi } from "../../../services/habitService";
import { HabitDTO, CreateHabitRequest } from "../../../types/habit";
import { Colors } from "../../../constants/colors";
import { UnauthorizedError } from "../../../utils/apiHandler";
import { formatDate } from "../../../utils/formatters";
import SkeletonCard from "../../../components/SkeletonCard";
import ManageHabitCard from "../../../components/ManageHabitCard";
import { suggestHabitsApi } from "../../../services/aiService";

export default function MasterHabitsScreen() {
  const [habits, setHabits] = useState<HabitDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [pausingId, setPausingId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [goal, setGoal] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [goalError, setGoalError] = useState("");
  const [archivingId, setArchivingId] = useState<number | null>(null);
  const [archivedHabits, setArchivedHabits] = useState<HabitDTO[]>([]);
  const [showArchived, setShowArchived] = useState(false);

  const activeHabits = habits
    .filter((h) => !h.paused)
    .sort((a, b) => a.targetTime.localeCompare(b.targetTime));

  const pausedHabits = habits
    .filter((h) => h.paused)
    .sort((a, b) => a.targetTime.localeCompare(b.targetTime));


  /* ---------------- Load all habits ---------------- */
  const loadHabits = useCallback(async () => {
    setError("");
    try {
      const [data, archived] = await Promise.all([
        getAllHabitsApi(),
        getArchivedHabitsApi(),
      ]);
      setHabits(data);
      setArchivedHabits(archived);
    } catch (e) {
      if (e instanceof UnauthorizedError) return;
      setError("Failed to load habits.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleArchive = async (habitId: number) => {
    setArchivingId(habitId);
    try {
      await archiveHabitApi(habitId);
      // Use functional updater so we always read the latest habits state,
      // not the value captured in the closure when this handler was created.
      setHabits((prev) => {
        const archived = prev.find((h) => h.id === habitId);
        if (archived) {
          setArchivedHabits((prevArchived) => [
            ...prevArchived,
            { ...archived, archived: true },
          ]);
        }
        return prev.filter((h) => h.id !== habitId);
      });
    } catch {
      loadHabits();
    } finally {
      setArchivingId(null);
    }
  };

  const handleUnarchive = async (habitId: number) => {
    setArchivingId(habitId);
    try {
      await unarchiveHabitApi(habitId);
      // Use functional updater so we always read the latest archivedHabits,
      // not the value captured in the closure when this handler was created.
      setArchivedHabits((prev) => {
        const habit = prev.find((h) => h.id === habitId);
        if (habit) {
          setHabits((prevHabits) => [...prevHabits, { ...habit, archived: false }]);
        }
        return prev.filter((h) => h.id !== habitId);
      });
    } catch {
      loadHabits();
    } finally {
      setArchivingId(null);
    }
  };

  const confirmArchive = (habitId: number) => {
    if (Platform.OS === "web") {
      if (window.confirm("Archive Habit — It will be hidden but history is preserved.")) {
        handleArchive(habitId);
      }
    } else {
      Alert.alert(
        "Archive Habit",
        "This habit will be hidden from your active list. All history is preserved and you can unarchive it anytime.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Archive", onPress: () => handleArchive(habitId) },
        ]
      );
    }
  };

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

  /* ---------------- AI Suggest ---------------- */
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
          // FIX: use local date arithmetic instead of toISOString() which converts
          // to UTC first. For users east of UTC (e.g. UTC+5:30), toISOString() after
          // 6:30 PM local time returns tomorrow's UTC date, making pausedUntil appear
          // one day too far ahead in the UI. formatDate() uses en-CA locale
          // (YYYY-MM-DD) which respects the device's local calendar date.
          const pausedUntilDate = new Date();
          pausedUntilDate.setDate(pausedUntilDate.getDate() + days);
          return { ...h, paused: true, pausedUntil: formatDate(pausedUntilDate) };
        })
      );
    } catch {
      loadHabits();
    } finally {
      setPausingId(null);
    }
  };

  const confirmPause = (habitId: number) => {
    if (Platform.OS === "web") {
      const input = window.prompt(
        "Pause Habit\nHow many days? Enter 3, 7, 14, or 30."
      );
      if (input === null) return; // user cancelled
      const days = parseInt(input, 10);
      if (![3, 7, 14, 30].includes(days)) {
        window.alert("Please enter 3, 7, 14, or 30.");
        return;
      }
      handlePause(habitId, days);
    } else {
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
    }
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

  const isActioning = (habitId: number) =>
    deletingId === habitId || pausingId === habitId || archivingId === habitId;

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
              Tell the AI your goal and get a personalised habit plan in seconds.
            </Text>
            <TextInput
              style={aiBannerStyles.input}
              placeholder='e.g. "I want to sleep better"'
              placeholderTextColor={Colors.subtext}
              value={goal}
              onChangeText={setGoal}
            />
            {goalError ? <Text style={aiBannerStyles.error}>{goalError}</Text> : null}
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
              onPress={() => router.navigate("/(tabs)/habits/create")}
            >
              <Text style={styles.secondaryBtnText}>Create manually instead</Text>
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
                      isArchiving={archivingId === habit.id}
                      onDelete={confirmDelete}
                      onPause={confirmPause}
                      onResume={handleResume}
                      onArchive={confirmArchive}
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
                      isArchiving={archivingId === habit.id}
                      onDelete={confirmDelete}
                      onPause={confirmPause}
                      onResume={handleResume}
                      onArchive={confirmArchive}
                    />
                  ))}
                </>
              )}

              {/* Archived section — always shown when there are archived habits,
                  regardless of whether there are any paused habits */}
              {archivedHabits.length > 0 && (
                <>
                  <Pressable
                    style={styles.archivedHeader}
                    onPress={() => setShowArchived(!showArchived)}
                  >
                    <Text style={[styles.sectionTitle, styles.sectionTitleArchived]}>
                      Archived ({archivedHabits.length})
                    </Text>
                    <Text style={styles.chevron}>{showArchived ? "▲" : "▼"}</Text>
                  </Pressable>

                  {showArchived && archivedHabits.map((habit) => (
                    <View key={habit.id} style={styles.archivedCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.archivedTitle}>{habit.title}</Text>
                        <Text style={styles.archivedMeta}>
                          {habit.category} • {habit.frequency}
                        </Text>
                      </View>
                      <View style={styles.archivedActions}>
                        <Pressable
                          onPress={() => router.navigate(`/(tabs)/habits/${habit.id}/activity`)}
                        >
                          <Text>📊</Text>
                        </Pressable>
                        <Pressable
                          disabled={archivingId === habit.id}
                          onPress={() => handleUnarchive(habit.id)}
                        >
                          <Text style={{ opacity: archivingId === habit.id ? 0.4 : 1 }}>
                            {archivingId === habit.id ? "⏳" : "📤"}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
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
  emptySubtitle: { fontSize: 14, color: Colors.subtext, textAlign: "center", marginBottom: 16 },
  createBtn: { backgroundColor: Colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, alignItems: "center", width: "100%" },
  createBtnText: { color: Colors.white, fontWeight: "600", fontSize: 14 },
  secondaryBtn: { marginTop: 10, paddingVertical: 10, paddingHorizontal: 24 },
  secondaryBtnText: { color: Colors.subtext, fontSize: 13 },
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
  archivedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitleArchived: {
    color: Colors.subtext,
  },
  chevron: {
    fontSize: 12,
    color: Colors.subtext,
  },
  archivedCard: {
    backgroundColor: Colors.card,
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    opacity: 0.6,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: "dashed",
  },
  archivedTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },
  archivedMeta: {
    fontSize: 12,
    color: Colors.subtext,
    marginTop: 4,
  },
  archivedActions: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
});

const aiBannerStyles = StyleSheet.create({
  card: { backgroundColor: "#f0f0ff", borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#ddd9ff" },
  heading: { fontSize: 14, fontWeight: "600", color: Colors.text, marginBottom: 4 },
  sub: { fontSize: 13, color: Colors.subtext, marginBottom: 10 },
  input: { borderWidth: 1, borderColor: "#ddd9ff", borderRadius: 8, padding: 10, fontSize: 14, backgroundColor: "#fff", color: Colors.text, marginBottom: 8, width: "100%" },
  btn: { backgroundColor: Colors.primary, borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  error: { fontSize: 12, color: "#ef4444", marginBottom: 6 },
});