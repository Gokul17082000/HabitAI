import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { View, Text, StyleSheet, Pressable, ScrollView, SafeAreaView, StatusBar } from "react-native";
import { router } from "expo-router";
import { removeToken } from "../../../utils/authStorage";
import { getUserApi, getUserStatsApi, UserStats } from "../../../services/authService";
import { Colors } from "../../../constants/colors";
import { UnauthorizedError } from "../../../utils/apiHandler";
import { getInsightsApi, InsightResponse } from "../../../services/aiService";
import YearHeatmap from "../../../components/YearHeatmap";
import { getYearPixelsApi } from "../../../services/authService";

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

  useFocusEffect(
    useCallback(() => {
      loadProfile();
      loadInsight()
    }, [])
  );

  const loadProfile = async () => {
    setError("");
    try {
      const [userData, statsData] = await Promise.all([
        getUserApi(),
        getUserStatsApi(),
        getYearPixelsApi(),
      ]);
      setUser(userData);
      setStats(statsData);
      setPixels(pixelsData);
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        return;
      }
      setError("Failed to load profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await removeToken();
    router.replace("/");
  };

  const formatMemberSince = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  const loadInsight = async () => {
    setInsightLoading(true);
    try {
      const data = await getInsightsApi();
      setInsight(data);
    } catch (_) {
      // fail silently — insights are non-critical
    } finally {
      setInsightLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <Text style={styles.header}>Profile</Text>
          <View style={styles.divider} />

          {/* Profile Card */}
          <View style={styles.profileCard}>
            <Text style={styles.avatar}>👤</Text>
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
                      <View key={habit.title} style={styles.topHabitRow}>
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
            </>
          )}

          <View style={coachStyles.card}>
            <Text style={coachStyles.heading}>🧠 Your AI Coach</Text>
            {insightLoading ? (
              <ActivityIndicator color={Colors.primary} style={{ marginTop: 8 }} />
            ) : insight ? (
              <Text style={coachStyles.insight}>{insight.insight}</Text>
            ) : (
              <Pressable onPress={loadInsight} style={coachStyles.btn}>
                <Text style={coachStyles.btnText}>Get your weekly insight</Text>
              </Pressable>
            )}
          </View>

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
    fontSize: 48,
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
  mostConsistentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  mostConsistentEmoji: {
    fontSize: 24,
  },
  mostConsistentHabit: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
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
});

const coachStyles = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginTop: 16, borderWidth: 1, borderColor: "#e5e7eb" },
  heading: { fontSize: 15, fontWeight: "600", color: Colors.text, marginBottom: 8 },
  insight: { fontSize: 14, color: Colors.text, lineHeight: 22 },
  btn: { backgroundColor: Colors.primary, borderRadius: 8, paddingVertical: 10, alignItems: "center", marginTop: 4 },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
});
