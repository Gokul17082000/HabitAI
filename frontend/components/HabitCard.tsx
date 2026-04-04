import { View, Text, StyleSheet, Pressable } from "react-native";
import { useEffect, useState } from "react";
import { getHabitStreakApi, logHabitApi } from "../services/habitService";
import { formatDate, formatTime } from "../utils/formatters";
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
  const [localCount, setLocalCount] = useState<number>(habit.currentCount);

  // Sync when habit prop changes
  useEffect(() => {
    setLocalStatus(habit.habitStatus);
    setLocalCount(habit.currentCount);
  }, [habit.habitStatus, habit.currentCount]);

  const today = formatDate(new Date());
  const isMissed = localStatus === "MISSED";
  const isCompleted = localStatus === "COMPLETED";

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

  // ---------- Binary habit handler ----------
  const handleBinaryLog = async () => {
    if (isMissed || logging) return;

    const newStatus: HabitStatus = isCompleted ? "PENDING" : "COMPLETED";
    setLocalStatus(newStatus);
    onLogged?.(habit.id, newStatus);

    setLogging(true);
    try {
      await logHabitApi(habit.id, today, newStatus, 0);
      await loadStreak();
    } catch {
      setLocalStatus(habit.habitStatus);
      onLogged?.(habit.id, habit.habitStatus);
    } finally {
      setLogging(false);
    }
  };

  // ---------- Countable habit handler ----------
  const handleCountLog = async (delta: number) => {
    if (isMissed || logging) return;

    const newCount = Math.max(0, Math.min(habit.targetCount, localCount + delta));
    if (newCount === localCount) return; // no change

    // Compute optimistic status
    const newStatus: HabitStatus =
      newCount === 0 ? "PENDING"
      : newCount >= habit.targetCount ? "COMPLETED"
      : "PARTIALLY_COMPLETED";

    setLocalCount(newCount);
    setLocalStatus(newStatus);
    onLogged?.(habit.id, newStatus);

    setLogging(true);
    try {
      await logHabitApi(habit.id, today, newStatus, newCount);
      await loadStreak();
    } catch {
      // Revert on error
      setLocalCount(habit.currentCount);
      setLocalStatus(habit.habitStatus);
      onLogged?.(habit.id, habit.habitStatus);
    } finally {
      setLogging(false);
    }
  };

  const statusColor = STATUS_COLORS[localStatus] ?? STATUS_COLORS.PENDING;

  return (
    <View style={styles.card}>
      {/* Left side — same for both */}
      <View style={styles.left}>
        <Text style={styles.title}>{habit.title}</Text>
        <Text style={styles.category}>{habit.category}</Text>
        <Text style={styles.time}>⏰ {formatTime(habit.targetTime)}</Text>
      </View>

      {/* Right side — different for binary vs countable */}
      <View style={styles.right}>
        {habit.isCountable ? (
          // ---------- Countable UI ----------
          <>
            <View style={styles.progressRow}>
              <Text style={[styles.progressText, { color: statusColor }]}>
                {localCount}/{habit.targetCount}
              </Text>
            </View>

            {/* Progress bar */}
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.round((localCount / habit.targetCount) * 100)}%`,
                    backgroundColor: statusColor,
                  },
                ]}
              />
            </View>

            {/* + / - buttons — hidden when missed */}
            {!isMissed && (
              <View style={styles.countControls}>
                <Pressable
                  style={[styles.countBtn, logging && { opacity: 0.5 }]}
                  disabled={logging || localCount <= 0}
                  onPress={() => handleCountLog(-1)}
                >
                  <Text style={styles.countBtnText}>−</Text>
                </Pressable>

                <Pressable
                  style={[styles.countBtn, logging && { opacity: 0.5 }]}
                  disabled={logging || localCount >= habit.targetCount}
                  onPress={() => handleCountLog(1)}
                >
                  <Text style={styles.countBtnText}>+</Text>
                </Pressable>
              </View>
            )}

            {isCompleted && (
              <Text style={styles.undoHint}>target reached 🎯</Text>
            )}
          </>
        ) : (
          // ---------- Binary UI (unchanged) ----------
          <>
            <Pressable
              disabled={isMissed || logging}
              style={({ pressed }) => [
                styles.button,
                pressed && !isMissed && { opacity: 0.7 },
                (isMissed || logging) && { opacity: 0.5 },
              ]}
              onPress={handleBinaryLog}
            >
              <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                <Text style={styles.statusText}>
                  {logging ? "..." : isCompleted ? "✓ DONE" : localStatus ?? "PENDING"}
                </Text>
              </View>
            </Pressable>

            {isCompleted && (
              <Text style={styles.undoHint}>tap to undo</Text>
            )}
          </>
        )}

        {/* Streak — shown for both */}
        {streak !== null && streak > 0 && (
          <Text style={styles.streak}>🔥 {streak}</Text>
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
  right: {
    alignItems: "flex-end",
    minWidth: 90,
  },
  // Binary styles
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
  // Countable styles
  progressRow: {
    marginBottom: 4,
  },
  progressText: {
    fontSize: 16,
    fontWeight: "700",
  },
  progressTrack: {
    width: 90,
    height: 6,
    backgroundColor: "#e5e7eb",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  countControls: {
    flexDirection: "row",
    gap: 8,
  },
  countBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  countBtnText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: "600",
  },
  // Shared
  streak: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "600",
    color: Colors.streak,
    textAlign: "center",
  },
  undoHint: {
    fontSize: 10,
    color: Colors.subtext,
    marginTop: 4,
  },
});