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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { getHabitsForDateApi, getAllHabitsApi } from "../../../services/habitService";
import { HabitResponse, HabitStatus, HabitCategory, HABIT_CATEGORIES } from "../../../types/habit";
import { formatDate } from "../../../utils/formatters";
import { useTheme } from "../../../context/ThemeContext";
import { AppColors } from "../../../constants/colors";
import HabitCard from "../../../components/HabitCard";
import { UnauthorizedError } from "../../../utils/apiHandler";
import SkeletonCard from "../../../components/SkeletonCard";
import { suggestHabitsApi } from "../../../services/aiService";

type CategoryFilter = HabitCategory | "ALL";

export default function HomeScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [habits, setHabits] = useState<HabitResponse[]>([]);
  const [totalHabits, setTotalHabits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [goal, setGoal] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [goalError, setGoalError] = useState("");
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>("ALL");

  const loadHabits = useCallback(async () => {
    setError("");
    try {
      const today = formatDate(new Date());
      const data = await getHabitsForDateApi(today);
      setHabits(data);

      if (data.length === 0) {
        const all = await getAllHabitsApi();
        setTotalHabits(all.length);
      } else {
        setTotalHabits(data.length);
      }
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

  const visibleCategories = Array.from(new Set(habits.map((h) => h.category)));
  const showFilter = visibleCategories.length > 1;

  const filteredHabits = activeFilter === "ALL"
    ? habits
    : habits.filter((h) => h.category === activeFilter);

  const completed = filteredHabits.filter(h => h.habitStatus === "COMPLETED").length;
  const total = filteredHabits.length;
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

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
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.today}>{today}</Text>
          </View>
        </View>

        {!loading && !error && habits.length > 0 && (
          <>
            {/* Progress card */}
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>{progressMessage}</Text>
                <Text style={styles.progressCount}>
                  <Text style={styles.progressCountBold}>{completed}</Text>
                  <Text style={styles.progressCountTotal}>/{total}</Text>
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progressPercent}%` },
                    progressPercent === 100 && { backgroundColor: colors.completed },
                  ]}
                />
              </View>
            </View>

            {/* Category filter chips */}
            {showFilter && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterStrip}
                contentContainerStyle={styles.filterContent}
              >
                <Pressable
                  style={[styles.filterChip, activeFilter === "ALL" && styles.filterChipActive]}
                  onPress={() => setActiveFilter("ALL")}
                >
                  <Text style={[styles.filterChipText, activeFilter === "ALL" && styles.filterChipTextActive]}>
                    All
                  </Text>
                </Pressable>
                {visibleCategories.map((cat) => (
                  <Pressable
                    key={cat}
                    style={[styles.filterChip, activeFilter === cat && styles.filterChipActive]}
                    onPress={() => setActiveFilter(cat)}
                  >
                    <Text style={[styles.filterChipText, activeFilter === cat && styles.filterChipTextActive]}>
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </>
        )}

        {/* Content */}
        {loading ? (
          <View>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
          >
            {error ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Something went wrong</Text>
                <Text style={styles.emptySubtitle}>{error}</Text>
              </View>
            ) : habits.length === 0 && totalHabits === 0 ? (
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.emptyState}
              >
                <Text style={styles.emptyTitle}>No habits yet 👋</Text>
                <Text style={styles.emptySubtitle}>
                  Tell the AI your goal and get a personalised plan in seconds.
                </Text>
                <TextInput
                  style={styles.goalInput}
                  placeholder='e.g. "I want to sleep better"'
                  placeholderTextColor={colors.subtext}
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
                    ? <ActivityIndicator color={colors.white} size="small" />
                    : <Text style={styles.createBtnText}>✨ Ask AI Coach →</Text>
                  }
                </Pressable>
                <Pressable
                  style={styles.secondaryBtn}
                  onPress={() => router.push("/(tabs)/habits/create")}
                >
                  <Text style={styles.secondaryBtnText}>Create manually instead</Text>
                </Pressable>
              </KeyboardAvoidingView>
            ) : habits.length === 0 && totalHabits > 0 ? (
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
            ) : filteredHabits.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptySubtitle}>No {activeFilter} habits today.</Text>
              </View>
            ) : (
              filteredHabits.map((habit) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  onLogged={handleLogged}
                />
              ))
            )}
          </ScrollView>
        )}

        {!loading && totalHabits > 0 && (
          <Pressable
            style={styles.addButton}
            onPress={() => router.push("/(tabs)/habits/create")}
          >
            <Text style={styles.addButtonText}>＋</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: c.background,
      paddingTop: StatusBar.currentHeight ?? 12,
    },
    container: {
      flex: 1,
      padding: 20,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 20,
    },
    greeting: {
      fontSize: 26,
      fontWeight: "700",
      color: c.text,
      letterSpacing: -0.3,
    },
    today: {
      fontSize: 13,
      color: c.subtext,
      marginTop: 3,
      fontWeight: "500",
    },
    progressContainer: {
      backgroundColor: c.card,
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    progressHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    },
    progressLabel: {
      fontSize: 13,
      color: c.subtext,
      fontWeight: "500",
    },
    progressCount: {
      fontSize: 13,
    },
    progressCountBold: {
      fontWeight: "700",
      color: c.text,
      fontSize: 15,
    },
    progressCountTotal: {
      fontWeight: "500",
      color: c.subtext,
      fontSize: 13,
    },
    progressTrack: {
      height: 10,
      backgroundColor: c.border,
      borderRadius: 5,
      overflow: "hidden",
    },
    progressFill: {
      height: 10,
      backgroundColor: c.primary,
      borderRadius: 5,
    },
    filterStrip: {
      marginBottom: 12,
    },
    filterContent: {
      gap: 8,
      paddingRight: 4,
    },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    filterChipActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    filterChipText: {
      fontSize: 12,
      color: c.text,
      fontWeight: "500",
    },
    filterChipTextActive: {
      color: c.white,
      fontWeight: "600",
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
      color: c.text,
    },
    emptySubtitle: {
      fontSize: 14,
      color: c.subtext,
      textAlign: "center",
      maxWidth: 280,
      marginBottom: 16,
    },
    goalInput: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      padding: 10,
      fontSize: 14,
      backgroundColor: c.card,
      color: c.text,
      marginBottom: 8,
      width: "100%",
    },
    goalError: {
      fontSize: 12,
      color: c.error,
      marginBottom: 6,
    },
    createBtn: {
      backgroundColor: c.primary,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      alignItems: "center",
      width: "100%",
    },
    createBtnText: {
      color: c.white,
      fontWeight: "600",
      fontSize: 14,
    },
    secondaryBtn: {
      marginTop: 10,
      paddingVertical: 10,
      paddingHorizontal: 24,
    },
    secondaryBtnText: {
      color: c.subtext,
      fontSize: 13,
    },
    addButton: {
      position: "absolute",
      right: 20,
      bottom: 30,
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
    addButtonText: {
      color: c.white,
      fontSize: 28,
      fontWeight: "bold",
    },
  });
