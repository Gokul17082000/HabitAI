import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { getUserApi, getUserStatsApi, UserStats, getYearPixelsApi, logoutApi, getStreakFreezeApi, StreakFreezeResponse } from "../../../services/authService";
import { Colors } from "../../../constants/colors";
import { UnauthorizedError } from "../../../utils/apiHandler";
import { getInsightsApi, InsightResponse } from "../../../services/aiService";
import YearHeatmap from "../../../components/YearHeatmap";

type UserDTO = {
  email: string;
};

export default function ProfileScreen() {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [insight, setInsight] = useState<InsightResponse | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [pixels, setPixels] = useState<Record<string, string>>({});
  const [freezeStatus, setFreezeStatus] = useState<StreakFreezeResponse | null>(null);

  // Standalone fetch for the manual "Get your weekly insight" button.
  // Defined at component scope so it is accessible from the JSX button handler.
  const fetchInsight = async () => {
    if (insight) return;
    setInsightLoading(true);
    try {
      const data = await getInsightsApi();
      setInsight(data);
    } catch {
      // fail silently — insights are non-critical
    } finally {
      setInsightLoading(false);
    }
  };

  // loadProfile and loadInsight are defined inside useCallback so the dep
  // array is stable (empty) without creating a stale closure over state.
  // Previously they were defined outside, which meant the callback captured
  // them at mount and would use stale state if dependencies ever changed.
  useFocusEffect(
    useCallback(() => {
      const loadProfile = async () => {
        setLoading(true);
        setError("");
        try {
          const [userData, statsData, pixelsData, freezeData] = await Promise.all([
            getUserApi(),
            getUserStatsApi(),
            getYearPixelsApi(),
            getStreakFreezeApi(),
          ]);
          setFreezeStatus(freezeData);
          setUser(userData);
          setStats(statsData);
          setPixels(pixelsData);
        } catch (e) {
          if (e instanceof UnauthorizedError) return;
          setError("Failed to load profile.");
        } finally {
          setLoading(false);
        }
      };

      const loadInsight = async () => {
        // Use functional updater to read latest insight without closing over it
        setInsight((current) => {
          if (current) return current; // already loaded — skip
          // Kick off the fetch outside the updater (updater must be synchronous)
          setInsightLoading(true);
          getInsightsApi()
            .then((data) => setInsight(data))
            .catch(() => { /* fail silently — insights are non-critical */ })
            .finally(() => setInsightLoading(false));
          return current;
        });
      };

      loadProfile();
      loadInsight();
    }, [])
  );

  const handleLogout = async () => {
    // logoutApi invalidates server-side refresh tokens AND clears local storage
    await logoutApi();
    router.replace("/");
  };

  const formatMemberSince = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <Text style={styles.header}>Profile</Text>
        <View style={styles.divider} />

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <Text style={styles.avatar}>
            {user?.email?.slice(0, 2).toUpperCase() ?? "?"}
          </Text>
          {loading ? (
            <Text style={styles.email}>Loading...</Text>
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <>
              <Text style={styles.email}>{user?.email}</Text>
              {stats && (
                <Text style={styles.memberSince}>
                  Member since {formatMemberSince(stats.memberSince)}
                </Text>
              )}
            </>
          )}
        </View>

        {!loading && stats && (
          <>
            {/* Overview */}
            <View style={styles.overviewRow}>
              <View style={styles.overviewCard}>
                <Text style={styles.overviewValue}>{stats.totalHabits}</Text>
                <Text style={styles.overviewLabel}>Total{"\n"}Habits</Text>
              </View>
              <View style={styles.overviewCard}>
                <Text style={styles.overviewValue}>{stats.overallConsistency}%</Text>
                <Text style={styles.overviewLabel}>Overall{"\n"}Consistency</Text>
              </View>
              <View style={styles.overviewCard}>
                <Text style={styles.overviewValue}>{stats.totalDaysTracked}</Text>
                <Text style={styles.overviewLabel}>Days{"\n"}Tracked</Text>
              </View>
            </View>

            {/* All Time */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>All Time</Text>
              <View style={styles.allTimeRow}>
                <View style={styles.allTimeItem}>
                  <Text style={styles.allTimeEmoji}>✅</Text>
                  <Text style={styles.allTimeValue}>{stats.totalCompleted}</Text>
                  <Text style={styles.allTimeLabel}>Completed</Text>
                </View>
                <View style={styles.allTimeDivider} />
                <View style={styles.allTimeItem}>
                  <Text style={styles.allTimeEmoji}>❌</Text>
                  <Text style={styles.allTimeValue}>{stats.totalMissed}</Text>
                  <Text style={styles.allTimeLabel}>Missed</Text>
                </View>
                <View style={styles.allTimeDivider} />
                <View style={styles.allTimeItem}>
                  <Text style={styles.allTimeEmoji}>📅</Text>
                  <Text style={styles.allTimeValue}>{stats.totalDaysTracked}</Text>
                  <Text style={styles.allTimeLabel}>Days</Text>
                </View>
              </View>
            </View>

            {/* Streaks */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Streaks</Text>
              <View style={styles.streakRow}>
                <View style={styles.streakItem}>
                  <Text style={styles.streakEmoji}>🔥</Text>
                  <Text style={styles.streakValue}>{stats.currentStreak}</Text>
                  <Text style={styles.streakLabel}>Current Streak</Text>
                  <Text style={styles.streakSub}>days</Text>
                </View>
                <View style={styles.streakDivider} />
                <View style={styles.streakItem}>
                  <Text style={styles.streakEmoji}>🏆</Text>
                  <Text style={styles.streakValue}>{stats.longestStreak}</Text>
                  <Text style={styles.streakLabel}>Longest Streak</Text>
                  <Text style={styles.streakSub}>days</Text>
                </View>
              </View>

              {/* Freeze count */}
              {freezeStatus && (
                <View style={styles.freezeRow}>
                  <Text style={styles.freezeText}>
                    🧊 {freezeStatus.availableFreezes}/{freezeStatus.maxFreezes} streak freezes
                  </Text>
                  <Pressable
                    style={styles.freezeBtn}
                    onPress={() => router.push("/(tabs)/profile/use-freeze")}
                  >
                    <Text style={styles.freezeBtnText}>Use Freeze</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Year in pixels */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📅 Year in pixels</Text>
              <YearHeatmap pixels={pixels} />
            </View>

            {/* Top Habits */}
            {stats.topHabits && stats.topHabits.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>🏅 Top Habits</Text>
                {stats.topHabits.map((habit, index) => {
                  const medals = ["🥇", "🥈", "🥉"];
                  return (
                    <View key={index} style={styles.topHabitRow}>
                      <Text style={styles.topHabitMedal}>{medals[index]}</Text>
                      <View style={styles.topHabitInfo}>
                        <Text style={styles.topHabitTitle}>{habit.title}</Text>
                        <Text style={styles.topHabitSub}>
                          {habit.completions} completions · {habit.consistencyPercent}% consistency
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* AI Coach Card */}
            <View style={coachStyles.card}>
              <Text style={coachStyles.heading}>🧠 Your AI Coach</Text>
              {insightLoading ? (
                <ActivityIndicator color={Colors.primary} style={{ marginTop: 8 }} />
              ) : insight ? (
                <Text style={coachStyles.insight}>{insight.insight}</Text>
              ) : (
                <Pressable onPress={fetchInsight} style={coachStyles.btn}>
                  <Text style={coachStyles.btnText}>Get your weekly insight</Text>
                </Pressable>
              )}
            </View>
          </>
        )}

        {/* Weekly Review */}
        <Pressable
          style={styles.weeklyReviewBtn}
          onPress={() => router.push("/(tabs)/profile/weekly-review")}
        >
          <Text style={styles.weeklyReviewText}>📊 View Weekly Review</Text>
        </Pressable>

        {/* Logout */}
        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

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
  profileCard: {
    backgroundColor: Colors.card,
    padding: 24,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 16,
  },
  avatar: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.white,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    textAlign: "center",
    lineHeight: 64,
    marginBottom: 10,
  },
  email: {
    fontSize: 15,
    fontWeight: "500",
    color: "#374151",
  },
  memberSince: {
    fontSize: 12,
    color: Colors.subtext,
    marginTop: 4,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
  },
  overviewRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  overviewValue: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.primary,
    marginBottom: 4,
  },
  overviewLabel: {
    fontSize: 11,
    color: Colors.subtext,
    textAlign: "center",
  },
  card: {
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 16,
  },
  allTimeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  allTimeItem: {
    flex: 1,
    alignItems: "center",
  },
  allTimeDivider: {
    width: 1,
    height: 50,
    backgroundColor: "#e5e7eb",
  },
  allTimeEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  allTimeValue: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text,
  },
  allTimeLabel: {
    fontSize: 11,
    color: Colors.subtext,
    marginTop: 2,
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  streakItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  streakDivider: {
    width: 1,
    height: 60,
    backgroundColor: "#e5e7eb",
  },
  streakEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  streakValue: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.text,
  },
  streakLabel: {
    fontSize: 12,
    color: Colors.subtext,
    marginTop: 2,
  },
  streakSub: {
    fontSize: 11,
    color: Colors.subtext,
  },
  logoutBtn: {
    backgroundColor: "#ef4444",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  logoutText: {
    color: Colors.white,
    fontWeight: "600",
    fontSize: 15,
  },
  topHabitRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  topHabitMedal: {
    fontSize: 24,
  },
  topHabitInfo: {
    flex: 1,
  },
  topHabitTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  topHabitSub: {
    fontSize: 12,
    color: Colors.subtext,
    marginTop: 2,
  },
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: StatusBar.currentHeight ?? 12,
  },
  weeklyReviewBtn: {
    backgroundColor: Colors.card,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  weeklyReviewText: {
    color: Colors.primary,
    fontWeight: "600",
    fontSize: 15,
  },
  freezeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  freezeText: {
    fontSize: 14,
    color: Colors.text,
  },
  freezeBtn: {
    backgroundColor: "#e0f2fe",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  freezeBtnText: {
    color: "#0284c7",
    fontWeight: "600",
    fontSize: 13,
  },
});

const coachStyles = StyleSheet.create({
  card: { backgroundColor: Colors.card, borderRadius: 14, padding: 16, marginBottom: 16 },
  heading: { fontSize: 15, fontWeight: "600", color: Colors.text, marginBottom: 8 },
  insight: { fontSize: 14, color: Colors.text, lineHeight: 22 },
  btn: { backgroundColor: Colors.primary, borderRadius: 8, paddingVertical: 10, alignItems: "center", marginTop: 4 },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
});