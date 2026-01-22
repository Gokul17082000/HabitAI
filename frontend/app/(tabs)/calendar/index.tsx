import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useEffect, useState } from "react";
import { getToken } from "../../utils/authStorage";

export default function CalendarScreen() {
  const today = new Date().toISOString().split("T")[0];

  const [selectedDate, setSelectedDate] = useState(today);
  const [habits, setHabits] = useState<any[]>([]);

  const isFuture = selectedDate > today;
  const isPast = selectedDate < today;

  useEffect(() => {
    loadHabitsForDate(selectedDate);
  }, [selectedDate]);

  const loadHabitsForDate = async (date: string) => {
    const token = await getToken();
    if (!token) return;

    const res = await fetch(
      `http://localhost:8080/habits?date=${date}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const data = await res.json();
    setHabits(data);
  };

  /* ---------- Generate dates ---------- */
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + i);
    return d.toISOString().split("T")[0];
  });

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Calendar</Text>

      {/* Date Strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dateStrip}
      >
        {dates.map((date) => {
          const isSelected = date === selectedDate;
          const isToday = date === today;

          return (
            <Pressable
              key={date}
              onPress={() => setSelectedDate(date)}
              style={[
                styles.dateChip,
                isSelected && styles.selectedChip,
              ]}
            >
              <Text style={styles.day}>
                {new Date(date).toLocaleDateString("en-US", { weekday: "short" })}
              </Text>
              <Text style={styles.dayNum}>
                {new Date(date).getDate()}
              </Text>
              {isToday && <Text style={styles.todayDot}>•</Text>}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Info */}
      {isFuture && (
        <Text style={styles.info}>🔒 Future habits cannot be completed</Text>
      )}
      {isPast && (
        <Text style={styles.info}>📅 Past habits are read-only</Text>
      )}

      {/* Habits */}
      <ScrollView>
        {habits.length === 0 ? (
          <Text style={styles.empty}>No habits scheduled</Text>
        ) : (
          habits.map((h) => (
            <View
              key={h.id}
              style={[
                styles.card,
                isFuture && styles.futureCard
              ]}
            >
              <Text style={styles.title}>{h.title}</Text>
              <Text style={styles.status}>
                {statusEmoji(h.habitStatus)} {h.habitStatus}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

/* ---------- Helpers ---------- */

function statusEmoji(status: string) {
  if (status === "COMPLETED") return "✅";
  if (status === "MISSED") return "❌";
  return "⏳";
}

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f8f9fa",
  },

  header: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 12,
  },

  dateStrip: {
    marginBottom: 14,
  },

  dateChip: {
    width: 56,
    height: 72,
    marginRight: 10,
    borderRadius: 12,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },

  selectedChip: {
    backgroundColor: "#4f46e5",
  },

  day: {
    fontSize: 12,
    color: "#666",
  },

  dayNum: {
    fontSize: 18,
    fontWeight: "600",
  },

  todayDot: {
    fontSize: 18,
    color: "#16a34a",
    marginTop: -4,
  },

  info: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginBottom: 10,
  },

  empty: {
    textAlign: "center",
    color: "#666",
    marginTop: 40,
  },

  card: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  futureCard: {
    opacity: 0.5,
  },

  title: {
    fontSize: 15,
    fontWeight: "600",
  },

  status: {
    fontSize: 14,
  },
});
