import { useCallback, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, SafeAreaView, StatusBar } from "react-native";
import { useFocusEffect } from "expo-router";
import { getHabitsForDateApi } from "../../../services/habitService";
import { HabitResponse } from "../../../types/habit";
import { formatDate, formatTime } from "../../../utils/formatters";
import { Colors } from "../../../constants/colors";
import { UnauthorizedError } from "../../../utils/apiHandler";

/* ---------------- Types ---------------- */
type HabitStatus = "COMPLETED" | "MISSED" | "PENDING" | "PARTIALLY_COMPLETED";

const STATUS_CONFIG: Record<HabitStatus, { color: string; emoji: string; label: string }> = {
  COMPLETED: { color: "#16a34a", emoji: "✅", label: "COMPLETED" },
  MISSED: { color: "#dc2626", emoji: "❌", label: "MISSED" },
  PENDING: { color: "#f59e0b", emoji: "⏳", label: "PENDING" },
  PARTIALLY_COMPLETED: { color: "#f97316", emoji: "🔶", label: "PARTIAL" },
};

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/* ---------------- Helpers ---------------- */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return (day + 6) % 7; // Monday = 0
}

/* ---------------- Screen ---------------- */
export default function CalendarScreen() {
  const todayDate = new Date();
  const today = formatDate(todayDate);

  const [currentYear, setCurrentYear] = useState(todayDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(todayDate.getMonth());
  const [selectedDate, setSelectedDate] = useState(today);
  const [habits, setHabits] = useState<HabitResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [monthStatusMap, setMonthStatusMap] = useState<Map<string, HabitStatus[]>>(new Map());

  const isFuture = selectedDate > today;
  const isPast = selectedDate < today;
  const isToday = selectedDate === today;

  /* ---------------- Refresh on focus ---------------- */
  useFocusEffect(
    useCallback(() => {
      loadHabitsForDate(selectedDate);
      loadMonthOverview();
    }, [selectedDate, currentYear, currentMonth])
  );

  const loadHabitsForDate = async (date: string) => {
    setError("");
    setLoading(true);
    try {
      const data = await getHabitsForDateApi(date);
      setHabits(data);
    } catch (e) {
      if (e instanceof UnauthorizedError) return;
      setError("Failed to load habits.");
    } finally {
      setLoading(false);
    }
  };

  const loadMonthOverview = async () => {
    const newMap = new Map<string, HabitStatus[]>();
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);

    const promises = Array.from({ length: daysInMonth }, (_, i) => {
      const date = formatDate(new Date(currentYear, currentMonth, i + 1));
      return getHabitsForDateApi(date).then((habits) => {
        if (habits.length > 0) {
          newMap.set(date, habits.map((h) => h.habitStatus as HabitStatus));
        }
      }).catch(() => {});
    });

    await Promise.all(promises);
    setMonthStatusMap(new Map(newMap));
  };

  /* ---------------- Navigation ---------------- */
  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const goToToday = () => {
    setCurrentYear(todayDate.getFullYear());
    setCurrentMonth(todayDate.getMonth());
    setSelectedDate(today);
  };

  /* ---------------- Build calendar grid ---------------- */
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const calendarCells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  while (calendarCells.length % 7 !== 0) {
    calendarCells.push(null);
  }

  const monthName = new Date(currentYear, currentMonth).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  /* ---------------- Get dot color for a day ---------------- */
  const getDotColor = (dateStr: string): string | null => {
    const statuses = monthStatusMap.get(dateStr);
    if (!statuses || statuses.length === 0) return null;
    if (statuses.every((s) => s === "COMPLETED")) return "#16a34a";
    if (statuses.some((s) => s === "COMPLETED")) return "#f97316";
    if (statuses.some((s) => s === "MISSED")) return "#dc2626";
    return "#f59e0b";
  };

  /* ---------------- Render ---------------- */
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={styles.header}>Calendar</Text>
        <View style={styles.divider} />

        {/* Month navigation */}
        <View style={styles.monthNav}>
          <Pressable onPress={goToPrevMonth} style={styles.navBtn}>
            <Text style={styles.navBtnText}>‹</Text>
          </Pressable>
          <Pressable onPress={goToToday}>
            <Text style={styles.monthTitle}>{monthName}</Text>
          </Pressable>
          <Pressable onPress={goToNextMonth} style={styles.navBtn}>
            <Text style={styles.navBtnText}>›</Text>
          </Pressable>
        </View>

        {/* Week day headers */}
        <View style={styles.weekRow}>
          {WEEK_DAYS.map((day) => (
            <Text key={day} style={styles.weekDay}>{day}</Text>
          ))}
        </View>

        {/* Calendar grid — proper rows of 7 */}
        <View style={styles.grid}>
          {Array.from({ length: Math.ceil(calendarCells.length / 7) }, (_, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              {calendarCells.slice(rowIndex * 7, rowIndex * 7 + 7).map((day, colIndex) => {
                if (day === null) {
                  return <View key={`empty-${colIndex}`} style={styles.cell} />;
                }

                const dateStr = formatDate(new Date(currentYear, currentMonth, day));
                const isSelected = dateStr === selectedDate;
                const isTodayCell = dateStr === today;
                const dotColor = getDotColor(dateStr);

                return (
                  <Pressable
                    key={dateStr}
                    style={[
                      styles.cell,
                      isSelected && styles.selectedCell,
                      isTodayCell && !isSelected && styles.todayCell,
                    ]}
                    onPress={() => {
                      setSelectedDate(dateStr);
                      loadHabitsForDate(dateStr);
                    }}
                  >
                    <Text
                      style={[
                        styles.cellText,
                        isSelected && styles.selectedCellText,
                        isTodayCell && !isSelected && styles.todayCellText,
                      ]}
                    >
                      {day}
                    </Text>
                    {dotColor && (
                      <View style={[styles.dot, { backgroundColor: dotColor }]} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        {/* Selected date label */}
        <View style={styles.selectedDateRow}>
          <Text style={styles.selectedDateLabel}>
            {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </Text>
          {isFuture && (
            <View style={[styles.badge, { backgroundColor: "#eff6ff" }]}>
              <Text style={[styles.badgeText, { color: "#3b82f6" }]}>🔒 Future</Text>
            </View>
          )}
          {isPast && (
            <View style={[styles.badge, { backgroundColor: "#fef3c7" }]}>
              <Text style={[styles.badgeText, { color: "#d97706" }]}>📅 Past</Text>
            </View>
          )}
          {isToday && (
            <View style={[styles.badge, { backgroundColor: "#f0fdf4" }]}>
              <Text style={[styles.badgeText, { color: "#16a34a" }]}>Today</Text>
            </View>
          )}
        </View>

        {/* Habits for selected date */}
        {loading ? (
          <Text style={styles.loadingText}>Loading habits...</Text>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : habits.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🗓️</Text>
            <Text style={styles.emptyTitle}>No habits scheduled</Text>
            <Text style={styles.emptySubtitle}>
              There are no habits planned for this day.
            </Text>
          </View>
        ) : (
          habits.map((h) => {
            const config = STATUS_CONFIG[h.habitStatus as HabitStatus] ?? STATUS_CONFIG.PENDING;
            return (
              <View
                key={h.id}
                style={[
                  styles.card,
                  { borderLeftColor: config.color },
                  isFuture && styles.futureCard,
                ]}
              >
                <View style={styles.cardLeft}>
                  <Text style={styles.cardTitle}>{h.title}</Text>
                  <View style={styles.cardMeta}>
                    <Text style={styles.cardCategory}>{h.category}</Text>
                    <Text style={styles.cardDot}>·</Text>
                    <Text style={styles.cardTime}>⏰ {formatTime(h.targetTime)}</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: config.color + "20" }]}>
                  <Text style={styles.statusEmoji}>{config.emoji}</Text>
                  <Text style={[styles.statusLabel, { color: config.color }]}>
                    {config.label}
                  </Text>
                </View>
              </View>
            );
          })
        )}

        {/* Legend */}
        <View style={styles.legend}>
          {[
            { color: "#16a34a", label: "All completed" },
            { color: "#f97316", label: "Partial" },
            { color: "#dc2626", label: "Missed" },
            { color: "#f59e0b", label: "Pending" },
          ].map((item) => (
            <View key={item.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={styles.legendLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: StatusBar.currentHeight ?? 12,
  },
  container: {
    flex: 1,
    padding: 20,
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
  monthNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.card,
    justifyContent: "center",
    alignItems: "center",
  },
  navBtnText: {
    fontSize: 22,
    color: Colors.text,
    fontWeight: "600",
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekDay: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    color: Colors.subtext,
    paddingVertical: 4,
  },
  grid: {
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
  },
  cell: {
    flex: 1,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    padding: 2,
  },
  selectedCell: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  todayCell: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 8,
  },
  cellText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: "400",
  },
  selectedCellText: {
    color: Colors.white,
    fontWeight: "600",
  },
  todayCellText: {
    color: Colors.primary,
    fontWeight: "600",
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 2,
  },
  selectedDateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  selectedDateLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "500",
  },
  loadingText: {
    color: Colors.subtext,
    textAlign: "center",
    marginTop: 20,
  },
  errorText: {
    color: Colors.error,
    textAlign: "center",
    marginTop: 20,
  },
  emptyState: {
    marginTop: 30,
    alignItems: "center",
  },
  emptyIcon: {
    fontSize: 42,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.subtext,
    textAlign: "center",
    maxWidth: 260,
  },
  card: {
    backgroundColor: Colors.card,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderLeftWidth: 4,
  },
  futureCard: {
    opacity: 0.7,
  },
  cardLeft: {
    flex: 1,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 6,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardCategory: {
    fontSize: 12,
    color: Colors.subtext,
  },
  cardDot: {
    fontSize: 12,
    color: Colors.subtext,
  },
  cardTime: {
    fontSize: 12,
    color: Colors.primary,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  statusEmoji: {
    fontSize: 12,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 20,
    marginBottom: 30,
    justifyContent: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
    color: Colors.subtext,
  },
});