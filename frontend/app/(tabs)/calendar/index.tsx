import { useCallback, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, SafeAreaView, StatusBar, ActivityIndicator } from "react-native";
import { useFocusEffect } from "expo-router";
import { getHabitsForDateApi, getMonthSummaryApi } from "../../../services/habitService";
import { HabitResponse, HabitStatus } from "../../../types/habit";
import { formatDate, formatTime } from "../../../utils/formatters";
import { useTheme } from "../../../context/ThemeContext";
import { AppColors } from "../../../constants/colors";
import { UnauthorizedError } from "../../../utils/apiHandler";

const makeStatusConfig = (c: AppColors): Record<HabitStatus, { color: string; emoji: string; label: string }> => ({
  COMPLETED: { color: c.completed, emoji: "✅", label: "COMPLETED" },
  MISSED: { color: c.missed, emoji: "❌", label: "MISSED" },
  PENDING: { color: c.pending, emoji: "⏳", label: "PENDING" },
  PARTIALLY_COMPLETED: { color: c.partial, emoji: "🔶", label: "PARTIAL" },
});

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
  const { colors } = useTheme();
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
  // Month overview only re-fetches when the visible month changes, not on day tap
  useFocusEffect(
    useCallback(() => {
      loadMonthOverview();
    }, [currentYear, currentMonth])
  );

  // Day habits re-fetch whenever the selected date changes or screen gains focus
  useFocusEffect(
    useCallback(() => {
      loadHabitsForDate(selectedDate);
    }, [selectedDate])
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

  const KNOWN_STATUSES = new Set<string>(["COMPLETED", "MISSED", "PENDING", "PARTIALLY_COMPLETED"]);

  const loadMonthOverview = async () => {
    try {
      const data = await getMonthSummaryApi(currentYear, currentMonth + 1);
      const newMap = new Map<string, HabitStatus[]>();
      Object.entries(data).forEach(([date, statuses]) => {
        const safe = (statuses as string[]).filter((s) => KNOWN_STATUSES.has(s)) as HabitStatus[];
        newMap.set(date, safe);
      });
      setMonthStatusMap(newMap);
    } catch (e) {
      if (e instanceof UnauthorizedError) return;
      console.error("Failed to load month overview", e);
    }
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
  const STATUS_CONFIG = makeStatusConfig(colors);

  const getDotColor = (dateStr: string): string | null => {
    const statuses = monthStatusMap.get(dateStr);
    if (!statuses || statuses.length === 0) return null;
    if (statuses.every((s) => s === "COMPLETED")) return colors.completed;
    if (statuses.some((s) => s === "COMPLETED")) return colors.partial;
    if (statuses.some((s) => s === "MISSED")) return colors.missed;
    return colors.pending;
  };

  /* ---------------- Render ---------------- */
  const styles = makeStyles(colors);

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
                    onPress={() => setSelectedDate(dateStr)}
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
            <View style={styles.badgeFuture}>
              <Text style={styles.badgeFutureText}>🔒 Future</Text>
            </View>
          )}
          {isPast && (
            <View style={styles.badgePast}>
              <Text style={styles.badgePastText}>📅 Past</Text>
            </View>
          )}
          {isToday && (
            <View style={styles.badgeToday}>
              <Text style={styles.badgeTodayText}>Today</Text>
            </View>
          )}
        </View>

        {/* Habits for selected date */}
        {loading ? (
          <ActivityIndicator
            color={colors.primary}
            size="small"
            style={{ marginTop: 24 }}
          />
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
            { color: colors.completed, label: "All completed" },
            { color: colors.partial, label: "Partial" },
            { color: colors.missed, label: "Missed" },
            { color: colors.pending, label: "Pending" },
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
const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: c.background,
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
      color: c.text,
    },
    divider: {
      height: 1,
      backgroundColor: c.border,
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
      backgroundColor: c.card,
      justifyContent: "center",
      alignItems: "center",
    },
    navBtnText: {
      fontSize: 22,
      color: c.text,
      fontWeight: "600",
    },
    monthTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: c.text,
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
      color: c.subtext,
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
      backgroundColor: c.primary,
      borderRadius: 8,
    },
    todayCell: {
      borderWidth: 1.5,
      borderColor: c.primary,
      borderRadius: 8,
    },
    cellText: {
      fontSize: 14,
      color: c.text,
      fontWeight: "400",
    },
    selectedCellText: {
      color: c.white,
      fontWeight: "600",
    },
    todayCellText: {
      color: c.primary,
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
      color: c.text,
      flex: 1,
    },
    badgeFuture:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: c.primaryLight },
    badgeFutureText: { fontSize: 12, fontWeight: "500", color: c.primary },
    badgePast:       { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: c.streakLight },
    badgePastText:   { fontSize: 12, fontWeight: "500", color: c.pending },
    badgeToday:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: c.completedLight },
    badgeTodayText:  { fontSize: 12, fontWeight: "500", color: c.completed },
    errorText: {
      color: c.error,
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
      color: c.text,
    },
    emptySubtitle: {
      fontSize: 14,
      color: c.subtext,
      textAlign: "center",
      maxWidth: 260,
    },
    card: {
      backgroundColor: c.card,
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
      color: c.text,
      marginBottom: 6,
    },
    cardMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    cardCategory: {
      fontSize: 12,
      color: c.subtext,
    },
    cardDot: {
      fontSize: 12,
      color: c.subtext,
    },
    cardTime: {
      fontSize: 12,
      color: c.primary,
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
      color: c.subtext,
    },
  });