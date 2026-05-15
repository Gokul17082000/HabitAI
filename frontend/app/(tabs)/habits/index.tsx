import { useCallback, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { getAllHabitsApi, deleteHabitApi, pauseHabitApi, resumeHabitApi, archiveHabitApi, getArchivedHabitsApi, unarchiveHabitApi, reorderHabitApi } from "../../../services/habitService";
import { HabitDTO } from "../../../types/habit";
import { UnauthorizedError } from "../../../utils/apiHandler";
import { formatDate } from "../../../utils/formatters";
import SkeletonCard from "../../../components/SkeletonCard";
import ManageHabitCard from "../../../components/ManageHabitCard";
import { suggestHabitsApi } from "../../../services/aiService";
import { useTheme } from "../../../context/ThemeContext";
import { AppColors } from "../../../constants/colors";

export default function MasterHabitsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors, insets.bottom);
  const aiBannerSt = makeAiBannerStyles(colors);

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
  const [search, setSearch] = useState("");

  const sortedHabits = [...habits].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.id - b.id
  );

  const activeHabits = sortedHabits.filter((h) => !h.paused);
  const pausedHabits = sortedHabits.filter((h) => h.paused);

  const filteredActive = search.trim()
    ? activeHabits.filter((h) =>
        h.title.toLowerCase().includes(search.trim().toLowerCase()) ||
        h.category.toLowerCase().includes(search.trim().toLowerCase())
      )
    : activeHabits;

  const filteredPaused = search.trim()
    ? pausedHabits.filter((h) =>
        h.title.toLowerCase().includes(search.trim().toLowerCase()) ||
        h.category.toLowerCase().includes(search.trim().toLowerCase())
      )
    : pausedHabits;

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

  /* ---------------- Reorder ---------------- */
  const handleMoveUp = async (habitId: number) => {
    const idx = sortedHabits.findIndex((h) => h.id === habitId);
    if (idx <= 0) return;
    const above = sortedHabits[idx - 1];
    const current = sortedHabits[idx];
    const newOrderCurrent = above.sortOrder;
    const newOrderAbove = current.sortOrder === above.sortOrder
      ? current.sortOrder + 1
      : current.sortOrder;

    setHabits((prev) =>
      prev.map((h) => {
        if (h.id === current.id) return { ...h, sortOrder: newOrderCurrent };
        if (h.id === above.id) return { ...h, sortOrder: newOrderAbove };
        return h;
      })
    );
    try {
      await Promise.all([
        reorderHabitApi(current.id, newOrderCurrent),
        reorderHabitApi(above.id, newOrderAbove),
      ]);
    } catch {
      loadHabits();
    }
  };

  const handleMoveDown = async (habitId: number) => {
    const idx = sortedHabits.findIndex((h) => h.id === habitId);
    if (idx >= sortedHabits.length - 1) return;
    const below = sortedHabits[idx + 1];
    const current = sortedHabits[idx];
    const newOrderCurrent = below.sortOrder;
    const newOrderBelow = current.sortOrder === below.sortOrder
      ? current.sortOrder + 1
      : current.sortOrder;

    setHabits((prev) =>
      prev.map((h) => {
        if (h.id === current.id) return { ...h, sortOrder: newOrderCurrent };
        if (h.id === below.id) return { ...h, sortOrder: newOrderBelow };
        return h;
      })
    );
    try {
      await Promise.all([
        reorderHabitApi(current.id, newOrderCurrent),
        reorderHabitApi(below.id, newOrderBelow),
      ]);
    } catch {
      loadHabits();
    }
  };

  const handleArchive = async (habitId: number) => {
    setArchivingId(habitId);
    try {
      await archiveHabitApi(habitId);
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
      if (input === null) return;
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
              style={aiBannerSt.input}
              placeholder='e.g. "I want to sleep better"'
              placeholderTextColor={colors.subtext}
              value={goal}
              onChangeText={setGoal}
              editable={!suggesting}
              maxLength={500}
            />
            {goalError ? <Text style={aiBannerSt.error}>{goalError}</Text> : null}
            <Pressable
              style={[styles.createBtn, suggesting && { opacity: 0.6 }]}
              onPress={handleSuggest}
              disabled={suggesting}
            >
              {suggesting
                ? <ActivityIndicator color={colors.white} size="small" />
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
            {/* Search bar */}
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search habits..."
                placeholderTextColor={colors.placeholder}
                value={search}
                onChangeText={setSearch}
                clearButtonMode="while-editing"
              />
              {search.length > 0 && Platform.OS !== "ios" && (
                <Pressable
                  style={styles.searchClear}
                  onPress={() => setSearch("")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Clear search"
                >
                  <Text style={styles.searchClearText}>✕</Text>
                </Pressable>
              )}
            </View>

            {/* AI Banner */}
            <View style={aiBannerSt.card}>
              <Text style={aiBannerSt.heading}>✨ Not sure what habits to build?</Text>
              <Text style={aiBannerSt.sub}>Tell the AI your goal and get a plan in seconds.</Text>
              <TextInput
                style={aiBannerSt.input}
                placeholder='e.g. "I want to sleep better"'
                placeholderTextColor={colors.subtext}
                value={goal}
                onChangeText={setGoal}
                editable={!suggesting}
                maxLength={500}
              />
              {goalError ? <Text style={aiBannerSt.error}>{goalError}</Text> : null}
              <Pressable
                style={[aiBannerSt.btn, suggesting && { opacity: 0.6 }]}
                onPress={handleSuggest}
                disabled={suggesting}
              >
                {suggesting
                  ? <ActivityIndicator color={colors.white} size="small" />
                  : <Text style={aiBannerSt.btnText}>Ask AI Coach →</Text>
                }
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={{ paddingBottom: 100 }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[colors.primary]}
                  tintColor={colors.primary}
                />
              }
            >
              {filteredActive.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Active ({filteredActive.length})</Text>
                  {filteredActive.map((habit) => (
                    <ManageHabitCard
                      key={habit.id}
                      habit={habit}
                      isActioning={isActioning(habit.id)}
                      isDeleting={deletingId === habit.id}
                      isPausing={pausingId === habit.id}
                      isArchiving={archivingId === habit.id}
                      isFirst={activeHabits[0]?.id === habit.id}
                      isLast={activeHabits[activeHabits.length - 1]?.id === habit.id}
                      onDelete={confirmDelete}
                      onPause={confirmPause}
                      onResume={handleResume}
                      onArchive={confirmArchive}
                      onMoveUp={handleMoveUp}
                      onMoveDown={handleMoveDown}
                    />
                  ))}
                </>
              )}

              {filteredPaused.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, styles.sectionTitlePaused]}>
                    Paused ({filteredPaused.length})
                  </Text>
                  {filteredPaused.map((habit) => (
                    <ManageHabitCard
                      key={habit.id}
                      habit={habit}
                      isActioning={isActioning(habit.id)}
                      isDeleting={deletingId === habit.id}
                      isPausing={pausingId === habit.id}
                      isArchiving={archivingId === habit.id}
                      isFirst={pausedHabits[0]?.id === habit.id}
                      isLast={pausedHabits[pausedHabits.length - 1]?.id === habit.id}
                      onDelete={confirmDelete}
                      onPause={confirmPause}
                      onResume={handleResume}
                      onArchive={confirmArchive}
                      onMoveUp={handleMoveUp}
                      onMoveDown={handleMoveDown}
                    />
                  ))}
                </>
              )}

              {search.trim() && filteredActive.length === 0 && filteredPaused.length === 0 && (
                <Text style={styles.noResults}>No habits match "{search}"</Text>
              )}

              {/* Archived section */}
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
                          style={styles.archivedActionBtn}
                          onPress={() => router.navigate(`/(tabs)/habits/${habit.id}/activity`)}
                        >
                          <Text style={styles.archivedActionText}>📊</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.archivedActionBtn, archivingId === habit.id && { opacity: 0.4 }]}
                          disabled={archivingId === habit.id}
                          onPress={() => handleUnarchive(habit.id)}
                        >
                          <Text style={styles.archivedActionText}>
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

const makeStyles = (c: AppColors, bottomInset: number) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: c.background,
      paddingTop: StatusBar.currentHeight ?? 12,
    },
    container: { flex: 1, padding: 20 },
    header: { fontSize: 22, fontWeight: "600", marginBottom: 8, color: c.text },
    divider: { height: 1, backgroundColor: c.border, marginBottom: 16 },
    sectionTitle: { fontSize: 14, fontWeight: "600", color: c.text, marginBottom: 10, marginTop: 4 },
    sectionTitlePaused: { color: c.subtext, marginTop: 20 },
    emptyState: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 20, fontWeight: "600", marginBottom: 6, color: c.text },
    emptySubtitle: { fontSize: 14, color: c.subtext, textAlign: "center", marginBottom: 16 },
    createBtn: { backgroundColor: c.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, alignItems: "center", width: "100%" },
    createBtnText: { color: c.white, fontWeight: "600", fontSize: 14 },
    secondaryBtn: { marginTop: 10, paddingVertical: 10, paddingHorizontal: 24 },
    secondaryBtnText: { color: c.subtext, fontSize: 13 },
    addButton: {
      position: "absolute",
      right: 20,
      bottom: Math.max(30, bottomInset + 16),
      backgroundColor: c.primary,
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: c.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 8,
    },
    addButtonText: { color: c.white, fontSize: 28, fontWeight: "bold" },
    searchRow: {
      marginBottom: 12,
      flexDirection: "row",
      alignItems: "center",
    },
    searchInput: {
      flex: 1,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 14,
      color: c.text,
    },
    searchClear: {
      position: "absolute",
      right: 12,
      padding: 4,
    },
    searchClearText: {
      fontSize: 14,
      color: c.subtext,
    },
    noResults: {
      textAlign: "center",
      color: c.subtext,
      fontSize: 14,
      marginTop: 24,
    },
    archivedHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 20,
      marginBottom: 10,
    },
    sectionTitleArchived: {
      color: c.subtext,
    },
    chevron: {
      fontSize: 12,
      color: c.subtext,
    },
    archivedCard: {
      backgroundColor: c.card,
      padding: 14,
      borderRadius: 10,
      marginBottom: 8,
      flexDirection: "row",
      alignItems: "center",
      opacity: 0.6,
      borderWidth: 1,
      borderColor: c.border,
      borderStyle: "dashed",
    },
    archivedTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: c.text,
    },
    archivedMeta: {
      fontSize: 12,
      color: c.subtext,
      marginTop: 4,
    },
    archivedActions: {
      flexDirection: "row",
      gap: 8,
      alignItems: "center",
    },
    archivedActionBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    archivedActionText: {
      fontSize: 15,
    },
  });

const makeAiBannerStyles = (c: AppColors) =>
  StyleSheet.create({
    card: { backgroundColor: c.primaryLight, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: c.border },
    heading: { fontSize: 14, fontWeight: "600", color: c.text, marginBottom: 4 },
    sub: { fontSize: 13, color: c.subtext, marginBottom: 10 },
    input: { borderWidth: 1, borderColor: c.border, borderRadius: 8, padding: 10, fontSize: 14, backgroundColor: c.card, color: c.text, marginBottom: 8, width: "100%" },
    btn: { backgroundColor: c.primary, borderRadius: 8, paddingVertical: 10, alignItems: "center" },
    btnText: { color: c.white, fontWeight: "600", fontSize: 13 },
    error: { fontSize: 12, color: c.error, marginBottom: 6 },
  });
