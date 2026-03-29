import { View, Text, StyleSheet, Pressable } from "react-native";
import { useEffect, useState } from "react";
import { getHabitStreakApi, logHabitApi } from "../services/habitService";
import { formatTime } from "../utils/formatters";
import { HabitResponse, HabitStatus } from "../types/habit";
import { Colors } from "../constants/colors";

interface HabitCardProps {
  habit: HabitResponse;
  onLogged?: (habitId: number, newStatus: HabitStatus) => void;
}

const STATUS_COLORS: Record<HabitStatus, string> = {
  PENDING: Colors.pending,
  COMPLETED: Colors.completed,
  MISSED: Colors.missed,
  PARTIALLY_COMPLETED: Colors.partial,
};

export default function HabitCard({ habit, onLogged }: HabitCardProps) {
  const [streak, setStreak] = useState<number | null>(null);
  const [logging, setLogging] = useState(false);
  const [localStatus, setLocalStatus] = useState<HabitStatus>(habit.habitStatus);

  // Sync local status when habit prop changes
  useEffect(() => {
    setLocalStatus(habit.habitStatus);
  }, [habit.habitStatus]);

  const statusColor = STATUS_COLORS[localStatus] ?? STATUS_COLORS.PENDING;
  const today = new Date().toISOString().split("T")[0];
  const isCompleted = localStatus === "COMPLETED";
  const isMissed = localStatus === "MISSED";

  useEffect(() => {
    loadStreak();
  }, [habit.id]);

  const loadStreak = async () => {
    try {
      const data = await getHabitStreakApi(habit.id);
      setStreak(data.streak);
    } catch {
      setStreak(0);
    }
  };

  const handleLog = async () => {
    if (isMissed || logging) return;

    const newStatus: HabitStatus = isCompleted ? "PENDING" : "COMPLETED";

    // Update UI immediately
    setLocalStatus(newStatus);
    onLogged?.(habit.id, newStatus);

    setLogging(true);
    try {
      await logHabitApi(habit.id, today, newStatus);
      await loadStreak();
    } catch (error) {
      // Revert on error
      setLocalStatus(habit.habitStatus);
      onLogged?.(habit.id, habit.habitStatus);
      console.error("Failed to log habit", error);
    } finally {
      setLogging(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.left}>
        <Text style={styles.title}>{habit.title}</Text>
        <Text style={styles.category}>{habit.category}</Text>
        <Text style={styles.time}>⏰ {formatTime(habit.targetTime)}</Text>
      </View>

      <View style={styles.right}>
        <Pressable
          disabled={isMissed || logging}
          style={({ pressed }) => [
            styles.button,
            pressed && !isMissed && { opacity: 0.7 },
            (isMissed || logging) && { opacity: 0.5 },
          ]}
          onPress={handleLog}
        >
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>
              {logging
                ? "..."
                : isCompleted
                ? "✓ DONE"
                : localStatus ?? "PENDING"}
            </Text>
          </View>
        </Pressable>

        {streak !== null && streak > 0 && (
          <Text style={styles.streak}>🔥 {streak}</Text>
        )}

        {isCompleted && (
          <Text style={styles.undoHint}>tap to undo</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  left: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  category: {
    fontSize: 12,
    color: Colors.subtext,
    marginTop: 4,
  },
  time: {
    fontSize: 13,
    color: Colors.primary,
    marginTop: 6,
  },
  statusBadge: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  statusText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "600",
  },
  button: {
    padding: 4,
  },
  streak: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "600",
    color: Colors.streak,
    textAlign: "center",
  },
  right: {
    alignItems: "flex-end",
  },
  undoHint: {
    fontSize: 10,
    color: Colors.subtext,
    marginTop: 4,
  },
});