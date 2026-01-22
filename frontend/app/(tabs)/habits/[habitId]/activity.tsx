import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { getToken } from "../../../../utils/authStorage";

/* ---------------- Types ---------------- */
type ActivityItem = {
  date: string;
  habitStatus: "COMPLETED" | "MISSED" | "PENDING";
};

/* ---------------- Screen ---------------- */
export default function HabitActivityScreen() {
  const { habitId } = useLocalSearchParams<{ habitId: string }>();

  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!habitId) return;
    loadActivity();
  }, [habitId]);

  const loadActivity = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 90); // last 90 days

      const res = await fetch(
        `http://localhost:8080/habits/${habitId}/activity?startDate=${fmt(
          start
        )}&endDate=${fmt(end)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = await res.json();
      setActivity(data);
    } catch {
      console.log("Failed to load activity");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- Stats ---------------- */
  const completed = activity.filter(a => a.habitStatus === "COMPLETED").length;
  const missed = activity.filter(a => a.habitStatus === "MISSED").length;
  const total = activity.length;
  const percent = total ? Math.round((completed / total) * 100) : 0;

  /* ---------------- Render ---------------- */
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Activity</Text>

      {/* Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryMain}>{percent}% consistency</Text>
        <Text style={styles.summarySub}>
          {completed} completed · {missed} missed (last 90 days)
        </Text>
      </View>

      {/* Heatmap */}
      <Text style={styles.sectionTitle}>Consistency</Text>
      <Heatmap activity={activity} />

      {/* Recent */}
      <Text style={styles.sectionTitle}>Recent Activity</Text>
      {activity.slice(-7).reverse().map((a, i) => (
        <View key={i} style={styles.recentRow}>
          <Text>{prettyDate(a.date)}</Text>
          <Text style={styles.statusText}>
            {emoji(a.habitStatus)} {a.habitStatus}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

/* ---------------- Heatmap ---------------- */
function Heatmap({ activity }: { activity: ActivityItem[] }) {
  const map = new Map(activity.map(a => [a.date, a.habitStatus]));

  const days = Array.from({ length: 90 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (89 - i));
    return d;
  });

  return (
    <View style={styles.heatmap}>
      {days.map((d, i) => {
        const status = map.get(fmt(d));
        return (
          <View
            key={i}
            style={[
              styles.cell,
              status === "COMPLETED" && styles.completed,
              status === "MISSED" && styles.missed,
            ]}
          />
        );
      })}
    </View>
  );
}

/* ---------------- Helpers ---------------- */
const fmt = (d: Date) => d.toISOString().split("T")[0];

const prettyDate = (date: string) =>
  new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

const emoji = (s: string) =>
  s === "COMPLETED" ? "✅" : s === "MISSED" ? "❌" : "⏳";

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f8f9fa",
  },

  header: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 16,
  },

  summaryCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },

  summaryMain: {
    fontSize: 24,
    fontWeight: "700",
  },

  summarySub: {
    marginTop: 6,
    color: "#6b7280",
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },

  heatmap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 24,
  },

  cell: {
    width: 14,
    height: 14,
    borderRadius: 3,
    backgroundColor: "#e5e7eb",
  },

  completed: {
    backgroundColor: "#16a34a",
  },

  missed: {
    backgroundColor: "#dc2626",
  },

  recentRow: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  statusText: {
    fontWeight: "600",
  },
});
