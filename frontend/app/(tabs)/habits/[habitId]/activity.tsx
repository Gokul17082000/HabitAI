import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, StatusBar } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { ActivityItem } from "../../../../types/habit";
import { formatDate, formatDisplayDate } from "../../../../utils/formatters";
import { Colors } from "../../../../constants/colors";
import { getHabitActivityApi, getHabitStreakApi, getLongestStreakApi } from "../../../../services/habitService";
import { UnauthorizedError } from "../../../../utils/apiHandler";
import MilestoneBadges from "../../../../components/MilestoneBadges";

/* ---------------- Range Options ---------------- */
type RangeOption = "1W" | "1M" | "3M" | "6M" | "1Y" | "ALL";

const RANGE_OPTIONS: { label: string; value: RangeOption }[] = [
  { label: "1W", value: "1W" },
  { label: "1M", value: "1M" },
  { label: "3M", value: "3M" },
  { label: "6M", value: "6M" },
  { label: "1Y", value: "1Y" },
  { label: "All", value: "ALL" },
];

const getRangeDays = (range: RangeOption): number => {
  switch (range) {
    case "1W": return 7;
    case "1M": return 30;
    case "3M": return 90;
    case "6M": return 180;
    case "1Y": return 365;
    case "ALL": return 1825;
  }
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/* ---------------- Screen ---------------- */
export default function HabitActivityScreen() {
  const { habitId } = useLocalSearchParams<{ habitId: string }>();

  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState<RangeOption>("3M");
  const [showRecent, setShowRecent] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);

  useEffect(() => {
    if (!habitId) return;
    loadActivity(range);
    loadStreaks();
  }, [habitId, range]);

  const loadActivity = async (selectedRange: RangeOption) => {
    setError("");
    setLoading(true);
    try {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - getRangeDays(selectedRange));

      const data = await getHabitActivityApi(
        Number(habitId),
        formatDate(start),
        formatDate(end)
      );
      setActivity(data);
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        return;
      }
      setError("Failed to load activity.");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- Stats ---------------- */
  const completed = activity.filter((a) => a.habitStatus === "COMPLETED").length;
  const missed = activity.filter((a) => a.habitStatus === "MISSED").length;
  const total = activity.length;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const recentActivity = [...activity]
    .reverse()
    .filter((a) => a.habitStatus !== "PENDING");

  const loadStreaks = async () => {
    try {
      const [current, longest] = await Promise.all([
        getHabitStreakApi(Number(habitId)),
        getLongestStreakApi(Number(habitId)),
      ]);
      setCurrentStreak(current.streak);
      setLongestStreak(longest.streak);
    } catch {
      // silently fail — streaks are non-critical
    }
  };

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>

      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.header}>Activity</Text>
        <Pressable
          onPress={() => {
            router.dismissAll();
            router.replace("/(tabs)/habits");
          }}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          style={styles.closeBtn}
        >
          <Text style={styles.close}>✕ Close</Text>
        </Pressable>
      </View>
      <View style={styles.divider} />

      {/* Range Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.rangeStrip}
      >
        {RANGE_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => setRange(option.value)}
            style={[
              styles.rangeChip,
              range === option.value && styles.rangeChipActive,
            ]}
          >
            <Text
              style={[
                styles.rangeChipText,
                range === option.value && styles.rangeChipTextActive,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Loading activity...</Text>
        </View>
      ) : (
        <>
          {/* Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryMain}>{percent}% consistency</Text>
            <Text style={styles.summarySub}>
              {completed} completed · {missed} missed
            </Text>

            <View style={styles.streakRow}>
              <View style={styles.streakItem}>
                <Text style={styles.streakValue}>🔥 {currentStreak}</Text>
                <Text style={styles.streakLabel}>Current Streak</Text>
              </View>
              <View style={styles.streakDivider} />
              <View style={styles.streakItem}>
                <Text style={styles.streakValue}>🏆 {longestStreak}</Text>
                <Text style={styles.streakLabel}>Longest Streak</Text>
              </View>
            </View>
          </View>

          <MilestoneBadges
              currentStreak={currentStreak}
              longestStreak={longestStreak}
          />

          {/* GitHub-style Heatmap */}
          <Text style={styles.sectionTitle}>Consistency</Text>
          <GitHubHeatmap activity={activity} />

          {/* Legend */}
          <View style={styles.legend}>
            <Text style={styles.legendLabel}>Less</Text>
            <View style={[styles.legendCell, { backgroundColor: "#e5e7eb" }]} />
            <View style={[styles.legendCell, { backgroundColor: "#dc2626" }]} />
            <View style={[styles.legendCell, { backgroundColor: "#16a34a" }]} />
            <Text style={styles.legendLabel}>More</Text>
          </View>

          {/* Collapsible Recent Activity */}
          <Pressable
            style={styles.recentHeader}
            onPress={() => setShowRecent(!showRecent)}
          >
            <Text style={styles.sectionTitle}>
              Recent Activity ({recentActivity.length})
            </Text>
            <Text style={styles.chevron}>
              {showRecent ? "▲" : "▼"}
            </Text>
          </Pressable>

          {showRecent && (
            <>
              {recentActivity.length === 0 ? (
                <Text style={styles.emptyText}>No activity recorded yet.</Text>
              ) : (
                recentActivity.map((a) => (
                  <View key={a.date} style={styles.recentRow}>
                    <Text style={styles.dateText}>
                      {formatDisplayDate(a.date)}
                    </Text>
                    <Text style={styles.statusText}>
                      {statusEmoji(a.habitStatus)} {a.habitStatus}
                    </Text>
                  </View>
                ))
              )}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

/* ---------------- GitHub Heatmap ---------------- */
function GitHubHeatmap({ activity }: { activity: ActivityItem[] }) {
  const statusMap = new Map(activity.map((a) => [a.date, a.habitStatus]));

  const today = new Date();
  const todayStr = formatDate(today);

  // Get day of week for today (Monday = 0, Sunday = 6)
  const dayOfWeek = (today.getDay() + 6) % 7;

  // Go back enough days to show all activity
  // Add dayOfWeek to align to Monday
  const totalDays = activity.length + dayOfWeek;

  const startDate = new Date(today);
  startDate.setDate(today.getDate() - totalDays + 1);

  // Build all days from start to today
  const allDays: Date[] = [];
  const current = new Date(startDate);
  while (formatDate(current) <= todayStr) {
    allDays.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  // Pad start to align to Monday
  const firstDayOfWeek = (allDays[0].getDay() + 6) % 7;
  for (let i = 0; i < firstDayOfWeek; i++) {
    const padDay = new Date(allDays[0]);
    padDay.setDate(allDays[0].getDate() - (firstDayOfWeek - i));
    allDays.unshift(padDay);
  }

  // Group into weeks of 7
  const weeks: Date[][] = [];
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7));
  }

  // Month labels
  const monthLabels: { label: string; colIndex: number }[] = [];
  weeks.forEach((week, i) => {
    const firstDay = week[0];
    if (firstDay) {
      const isJanuary = firstDay.getMonth() === 0;
      const label = firstDay.toLocaleDateString("en-US", {
        month: "short",
        year: isJanuary ? "numeric" : undefined,
      });
      const lastLabel = monthLabels[monthLabels.length - 1];
      if (!lastLabel || lastLabel.label !== label) {
        monthLabels.push({ label, colIndex: i });
      }
    }
  });

  const cellSize = 12;
  const cellGap = 3;
  const dayLabelWidth = 32;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        {/* Month labels */}
        <View style={{ flexDirection: "row", marginLeft: dayLabelWidth, marginBottom: 4 }}>
          {weeks.map((_, i) => {
            const label = monthLabels.find((m) => m.colIndex === i);
            return (
              <View
                key={i}
                style={{ width: cellSize + cellGap, alignItems: "flex-start" }}
              >
                {label && (
                  <Text style={styles.monthLabel}>{label.label}</Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Grid */}
        <View style={{ flexDirection: "row" }}>
          {/* Day labels */}
          <View style={{ width: dayLabelWidth, marginRight: 2 }}>
            {DAY_LABELS.map((day, i) => (
              <View
                key={day}
                style={{
                  height: cellSize + cellGap,
                  justifyContent: "center",
                }}
              >
                {i % 2 === 0 && (
                  <Text style={styles.dayLabel}>{day}</Text>
                )}
              </View>
            ))}
          </View>

          {/* Weeks */}
          {weeks.map((week, wi) => (
            <View key={wi} style={{ marginRight: cellGap }}>
              {Array.from({ length: 7 }, (_, di) => {
                const day = week[di];
                if (!day) {
                  return (
                    <View
                      key={di}
                      style={{
                        width: cellSize,
                        height: cellSize,
                        marginBottom: cellGap,
                      }}
                    />
                  );
                }
                const dateStr = formatDate(day);
                const status = statusMap.get(dateStr);
                const isToday = dateStr === todayStr;
                const isFuture = dateStr > todayStr;

                return (
                  <View
                    key={di}
                    style={[
                      styles.heatCell,
                      { width: cellSize, height: cellSize, marginBottom: cellGap },
                      !isFuture && status === "COMPLETED" && styles.cellCompleted,
                      !isFuture && status === "MISSED" && styles.cellMissed,
                      isToday && styles.cellToday,
                      isFuture && { backgroundColor: "transparent" },
                    ]}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

/* ---------------- Helpers ---------------- */
function statusEmoji(status: string) {
  if (status === "COMPLETED") return "✅";
  if (status === "MISSED") return "❌";
  return "⏳";
}

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },
  loadingText: {
    color: Colors.subtext,
    fontSize: 15,
  },
  errorText: {
    color: Colors.error,
    fontSize: 15,
  },
  container: {
    flex: 1,
    padding: 20,
    paddingLeft: 24,
    backgroundColor: Colors.background,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingTop: StatusBar.currentHeight ?? 20,
  },
  header: {
    fontSize: 22,
    fontWeight: "600",
    color: Colors.text,
  },
  close: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginBottom: 16,
  },
  rangeStrip: {
    marginBottom: 16,
  },
  rangeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
    backgroundColor: Colors.card,
  },
  rangeChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  rangeChipText: {
    fontSize: 13,
    color: Colors.text,
  },
  rangeChipTextActive: {
    color: Colors.white,
    fontWeight: "600",
  },
  summaryCard: {
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  summaryMain: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.text,
  },
  summarySub: {
    marginTop: 6,
    color: Colors.subtext,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
    color: Colors.text,
  },
  monthLabel: {
    fontSize: 9,
    color: Colors.subtext,
    width: 28,
  },
  dayLabel: {
    fontSize: 10,
    color: Colors.subtext,
  },
  heatCell: {
    borderRadius: 3,
    backgroundColor: "#e5e7eb",
  },
  cellCompleted: {
    backgroundColor: "#16a34a",
  },
  cellMissed: {
    backgroundColor: "#dc2626",
  },
  cellToday: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 24,
    marginTop: 8,
  },
  legendCell: {
    width: 13,
    height: 13,
    borderRadius: 3,
  },
  legendLabel: {
    fontSize: 11,
    color: Colors.subtext,
  },
  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  chevron: {
    fontSize: 12,
    color: Colors.subtext,
  },
  recentRow: {
    backgroundColor: Colors.card,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dateText: {
    fontSize: 14,
    color: Colors.text,
  },
  statusText: {
    fontWeight: "600",
    color: Colors.text,
  },
  emptyText: {
    color: Colors.subtext,
    textAlign: "center",
    marginTop: 20,
  },
  streakRow: {
    flexDirection: "row",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  streakItem: {
    flex: 1,
    alignItems: "center",
  },
  streakDivider: {
    width: 1,
    backgroundColor: "#e5e7eb",
  },
  streakValue: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
  },
  streakLabel: {
    fontSize: 12,
    color: Colors.subtext,
    marginTop: 4,
  },
  closeBtn: {
    padding: 12,
    borderRadius: 8,
  },
});