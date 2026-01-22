import { View, Text, StyleSheet, Pressable } from "react-native";
import { getToken } from "../utils/authStorage";
import { useEffect, useState } from "react";

export default function HabitCard({ habit, onLogged }) {
  const statusColor = {
    PENDING: "#f59e0b",
    COMPLETED: "#16a34a",
    MISSED: "#dc2626",
  }[habit.habitStatus || "PENDING"];

  const today = new Date().toISOString().split("T")[0];

  const [streak, setStreak] = useState<number | null>(null);

  const loadStreak = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(
        `http://localhost:8080/habits/${habit.id}/streak`,
         {
          headers: { Authorization: `Bearer ${token}` },
         }
      );

      const data = await res.json();
      setStreak(data.streak);
    } catch {
      setStreak(0);
    }
  };

  useEffect(() => {
    loadStreak();
  }, [habit.id]);

  const handleLog = async() => {
      if (habit.habitStatus == "COMPLETED") {
          return;
      }

      try {
          const token = await getToken();
          if (!token) return;

          const res = await fetch(
            `http://localhost:8080/habits/${habit.id}/log`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                date: today,
                habitStatus: "COMPLETED",
              }),
            }
          );

          if (!res.ok) {
            throw new Error("Failed to log habit");
          }

          // Let parent refresh
          onLogged?.();
          await loadStreak();
      } catch (error) {
          console.log("Failed to log habit");
      }
  };

  return (
    <View style={styles.card}>
      {/* Left */}
      <View style={styles.left}>
        <Text style={styles.title}>{habit.title}</Text>

        <Text style={styles.category}>
          {habit.category}
        </Text>

        <Text style={styles.time}>
          ⏰ {formatTime(habit.targetTime)}
        </Text>
      </View>

      {/* Right */}

      <View style={styles.right}>
        <Pressable
          disabled={habit.habitStatus === "COMPLETED"}
          style={({ pressed }) => [
            styles.button,
            pressed && habit.habitStatus !== "COMPLETED" && { opacity: 0.7 },
            habit.habitStatus === "COMPLETED" && { opacity: 0.6 },
          ]}
          onPress={handleLog}
        >
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>
              {habit.habitStatus || "PENDING"}
            </Text>
          </View>
        </Pressable>

        {streak !== null && streak > 0 && (
          <Text style={styles.streak}>🔥 {streak}</Text>
        )}
      </View>

    </View>
  );
}

/* -------- Time formatter -------- */
function formatTime(time) {
  if (!time) return "";

  const [hour, minute] = time.split(":");
  const h = Number(hour);
  const ampm = h >= 12 ? "PM" : "AM";
  const formattedHour = h % 12 || 12;

  return `${formattedHour}:${minute} ${ampm}`;
}

/* -------- Styles -------- */
const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
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
  },

  category: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },

  time: {
    fontSize: 13,
    color: "#4f46e5",
    marginTop: 6,
  },

  statusBadge: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
  },

  statusText: {
    color: "#fff",
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
    color: "#f97316",
    textAlign: "center",
  },
  right: {
    alignItems: "flex-end",
  },
});
