import { useCallback, useRef, useState } from "react";
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
import { UnauthorizedError } from "../../../utils/apiHandler";
import { getInsightsApi, InsightResponse } from "../../../services/aiService";
import YearHeatmap from "../../../components/YearHeatmap";
import { useTheme } from "../../../context/ThemeContext";
import { AppColors } from "../../../constants/colors";
import SkeletonCard from "../../../components/SkeletonCard";

type UserDTO = {
  email: string;
};

export default function ProfileScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const coachSt = makeCoachStyles(colors);

  const [user, setUser] = useState<UserDTO | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [insight, setInsight] = useState<InsightResponse | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [pixels, setPixels] = useState<Record<string, string>>({});
  const [freezeStatus, setFreezeStatus] = useState<StreakFreezeResponse | null>(null);

  const insightFetched = useRef(false);

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

      if (!insightFetched.current) {
        insightFetched.current = true;
        setInsightLoading(true);
        getInsightsApi()
          .then((data) => setInsight(data))
          .catch(() => {})
          .finally(() => setInsightLoading(false));
      }

      loadProfile();
    }, [])
  );

  const handleLogout = async () => {
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
        <View style={styles.headerRow}>
          <Text style={styles.header}>Profile</Text>
          <Pressable
            style={styles.settingsBtn}
            onPress={() => router.push("/(tabs)/profile/settings")}
          >
            <Text style={[styles.settingsBtnText, { color: colors.primary }]}>⚙️ Settings</Text>
          </Pressable>
        </View>
        <View style={styles.divider} />

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <Text style={styles.avatar}>
            {user?.email
              ? user.email.split("@")[0].slice(0, 2).toUpperCase()
              : "?"}
          </Text>
          {loading ? (
            <ActivityIndicator color={colors.primary} size="small" style={{ marginTop: 8 }} />
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

        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : !loading && stats && (
          <>
            {/* Overview */}
            <View style={styles.overviewRow}>
              <View style={styles.overviewCard}>
                <View style={[styles.overviewAccent, { backgroundColor: colors.primaryLight }]} />
                <Text style={[styles.overviewValue, { color: colors.primary }]}>{stats.totalHabits}</Text>
                <Text style={styles.overviewLabel}>Total{"\n"}Habits</Text>
              </View>
              <View style={styles.overviewCard}>
                <View style={[styles.overviewAccent, { backgroundColor: colors.completedLight }]} />
                <Text style={[styles.overviewValue, { color: colors.completed }]}>{stats.overallConsistency}%</Text>
                <Text style={styles.overviewLabel}>Overall{"\n"}Consistency</Text>
              </View>
              <View style={styles.overviewCard}>
                <View style={[styles.overviewAccent, { backgroundColor: colors.streakLight }]} />
                <Text style={[styles.overviewValue, { color: colors.streak }]}>{stats.totalDaysTracked}</Text>
                <Text style={styles.overviewLabel}>Days{"\n"}Tracked</Text>
              </View>
            </View>

            {/* All Time */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>All Time</Text>
              <View style={styles.allTimeRow}>
                <View style={styles.allTimeItem}>
                  <Text style={styles.allTimeEmoji}>✅</Text>
                  <Text style={[styles.allTimeValue, { color: colors.completed }]}>{stats.totalCompleted}</Text>
                  <Text style={styles.allTimeLabel}>Completed</Text>
                </View>
                <View style={styles.allTimeDivider} />
                <View style={styles.allTimeItem}>
                  <Text style={styles.allTimeEmoji}>❌</Text>
                  <Text style={[styles.allTimeValue, { color: colors.missed }]}>{stats.totalMissed}</Text>
                  <Text style={styles.allTimeLabel}>Missed</Text>
                </View>
                <View style={styles.allTimeDivider} />
                <View style={styles.allTimeItem}>
                  <Text style={styles.allTimeEmoji}>📅</Text>
                  <Text style={[styles.allTimeValue, { color: colors.primary }]}>{stats.totalDaysTracked}</Text>
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
                  <Text style={[styles.streakValue, { color: colors.streak }]}>{stats.currentStreak}</Text>
                  <Text style={styles.streakLabel}>Current Streak</Text>
                  <Text style={styles.streakSub}>days</Text>
                </View>
                <View style={styles.streakDivider} />
                <View style={styles.streakItem}>
                  <Text style={styles.streakEmoji}>🏆</Text>
                  <Text style={[styles.streakValue, { color: colors.primary }]}>{stats.longestStreak}</Text>
                  <Text style={styles.streakLabel}>Longest Streak</Text>
                  <Text style={styles.streakSub}>days</Text>
                </View>
              </View>

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
              <YearHeatmap pixels={pixels} colors={colors} />
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
            <View style={coachSt.card}>
              <Text style={coachSt.heading}>🧠 Your AI Coach</Text>
              {insightLoading ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />
              ) : insight ? (
                <Text style={coachSt.insight}>{insight.insight}</Text>
              ) : (
                <Pressable onPress={fetchInsight} style={coachSt.btn}>
                  <Text style={coachSt.btnText}>Get your weekly insight</Text>
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
          <Text style={[styles.weeklyReviewText, { color: colors.primary }]}>📊 View Weekly Review</Text>
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

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      backgroundColor: c.background,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    header: {
      fontSize: 22,
      fontWeight: "600",
      color: c.text,
    },
    settingsBtn: {
      padding: 8,
      borderRadius: 8,
    },
    settingsBtnText: {
      fontSize: 14,
      fontWeight: "500",
    },
    divider: {
      height: 1,
      backgroundColor: c.border,
      marginBottom: 16,
    },
    profileCard: {
      backgroundColor: c.card,
      padding: 24,
      borderRadius: 16,
      alignItems: "center",
      marginBottom: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    avatar: {
      fontSize: 22,
      fontWeight: "700",
      color: c.white,
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: c.primary,
      textAlign: "center",
      lineHeight: 64,
      marginBottom: 10,
    },
    email: {
      fontSize: 15,
      fontWeight: "500",
      color: c.text,
    },
    memberSince: {
      fontSize: 12,
      color: c.subtext,
      marginTop: 4,
    },
    errorText: {
      fontSize: 14,
      color: c.error,
    },
    overviewRow: {
      flexDirection: "row",
      gap: 12,
      marginBottom: 16,
    },
    overviewCard: {
      flex: 1,
      backgroundColor: c.card,
      padding: 16,
      borderRadius: 14,
      alignItems: "center",
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    overviewAccent: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 4,
    },
    overviewValue: {
      fontSize: 22,
      fontWeight: "700",
      marginBottom: 4,
      marginTop: 8,
    },
    overviewLabel: {
      fontSize: 11,
      color: c.subtext,
      textAlign: "center",
    },
    card: {
      backgroundColor: c.card,
      padding: 16,
      borderRadius: 16,
      marginBottom: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: c.text,
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
      backgroundColor: c.border,
    },
    allTimeEmoji: {
      fontSize: 20,
      marginBottom: 4,
    },
    allTimeValue: {
      fontSize: 22,
      fontWeight: "700",
      color: c.text,
    },
    allTimeLabel: {
      fontSize: 11,
      color: c.subtext,
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
      backgroundColor: c.border,
    },
    streakEmoji: {
      fontSize: 24,
      marginBottom: 4,
    },
    streakValue: {
      fontSize: 28,
      fontWeight: "700",
      color: c.text,
    },
    streakLabel: {
      fontSize: 12,
      color: c.subtext,
      marginTop: 2,
    },
    streakSub: {
      fontSize: 11,
      color: c.subtext,
    },
    logoutBtn: {
      backgroundColor: c.error,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
      marginBottom: 16,
    },
    logoutText: {
      color: c.white,
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
      color: c.text,
    },
    topHabitSub: {
      fontSize: 12,
      color: c.subtext,
      marginTop: 2,
    },
    safeArea: {
      flex: 1,
      backgroundColor: c.background,
      paddingTop: StatusBar.currentHeight ?? 12,
    },
    weeklyReviewBtn: {
      backgroundColor: c.card,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
      marginBottom: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    weeklyReviewText: {
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
      borderTopColor: c.border,
    },
    freezeText: {
      fontSize: 14,
      color: c.text,
    },
    freezeBtn: {
      backgroundColor: c.primaryLight,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 8,
    },
    freezeBtnText: {
      color: c.primary,
      fontWeight: "600",
      fontSize: 13,
    },
  });

const makeCoachStyles = (c: AppColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    heading: { fontSize: 15, fontWeight: "600", color: c.text, marginBottom: 8 },
    insight: { fontSize: 14, color: c.text, lineHeight: 22 },
    btn: { backgroundColor: c.primary, borderRadius: 8, paddingVertical: 10, alignItems: "center", marginTop: 4 },
    btnText: { color: c.white, fontWeight: "600", fontSize: 13 },
  });
