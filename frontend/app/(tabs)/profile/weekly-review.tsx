import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  Pressable, ActivityIndicator, StatusBar
} from "react-native";
import { router } from "expo-router";
import { getWeeklyReviewApi, WeeklyReviewResponse } from "../../../services/authService";
import { Colors } from "../../../constants/colors";
import { UnauthorizedError } from "../../../utils/apiHandler";

export default function WeeklyReviewScreen() {
  const [review, setReview] = useState<WeeklyReviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadReview();
  }, []);

  const loadReview = async () => {
    setError("");
    setLoading(true);
    try {
      const data = await getWeeklyReviewApi();
      setReview(data);
    } catch (e) {
      if (e instanceof UnauthorizedError) return;
      setError("Failed to load weekly review.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.header}>Weekly Review</Text>
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          style={styles.closeBtn}
        >
          <Text style={styles.close}>✕ Close</Text>
        </Pressable>
      </View>
      <View style={styles.divider} />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.loadingText}>Generating your review...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={loadReview}>
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      ) : review ? (
        <>
          {/* Date Range */}
          <Text style={styles.dateRange}>
            {new Date(review.weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            {" — "}
            {new Date(review.weekEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </Text>

          {/* Overall */}
          <View style={styles.overallCard}>
            <Text style={styles.overallPercent}>{review.overallPercent}%</Text>
            <Text style={styles.overallLabel}>Overall this week</Text>
          </View>

          {/* Per Habit */}
          {review.habitStats.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📋 Habit Breakdown</Text>
              {review.habitStats.map((habit) => (
                <View key={habit.title} style={styles.habitRow}>
                  <View style={styles.habitHeader}>
                    <Text style={styles.habitTitle}>{habit.title}</Text>
                    <Text style={styles.habitCount}>
                      {habit.completed}/{habit.total}
                    </Text>
                  </View>
                  {/* Progress Bar */}
                  <View style={styles.progressBg}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${habit.consistencyPercent}%`,
                          backgroundColor:
                            habit.consistencyPercent >= 80 ? "#16a34a"
                            : habit.consistencyPercent >= 50 ? "#f59e0b"
                            : "#dc2626",
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.habitPct}>{habit.consistencyPercent}%</Text>
                </View>
              ))}
            </View>
          )}

          {/* AI Insight */}
          <View style={styles.insightCard}>
            <Text style={styles.insightTitle}>🧠 AI Coach</Text>
            <Text style={styles.insightText}>{review.aiInsight}</Text>
          </View>
        </>
      ) : null}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: Colors.background,
    paddingTop: StatusBar.currentHeight ?? 20,
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
    color: Colors.text,
  },
  close: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  closeBtn: {
    padding: 12,
    borderRadius: 8,
  },
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginBottom: 16,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  loadingText: {
    color: Colors.subtext,
    fontSize: 14,
    marginTop: 12,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
  },
  retryBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryText: {
    color: Colors.white,
    fontWeight: "600",
  },
  dateRange: {
    fontSize: 13,
    color: Colors.subtext,
    textAlign: "center",
    marginBottom: 16,
  },
  overallCard: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  overallPercent: {
    fontSize: 48,
    fontWeight: "700",
    color: Colors.white,
  },
  overallLabel: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.85,
    marginTop: 4,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 16,
  },
  habitRow: {
    marginBottom: 16,
  },
  habitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  habitTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.text,
    flex: 1,
  },
  habitCount: {
    fontSize: 13,
    color: Colors.subtext,
  },
  progressBg: {
    height: 8,
    backgroundColor: "#e5e7eb",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 4,
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
  },
  habitPct: {
    fontSize: 12,
    color: Colors.subtext,
    textAlign: "right",
  },
  insightCard: {
    backgroundColor: "#f0f0ff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ddd9ff",
    marginBottom: 16,
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
  },
  insightText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
  },
});