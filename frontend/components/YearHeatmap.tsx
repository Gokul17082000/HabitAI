import { View, Text, StyleSheet, ScrollView } from "react-native";

type PixelStatus = "COMPLETED" | "PARTIAL" | "MISSED" | "PENDING";

const CELL_SIZE = 10;
const CELL_GAP = 2;
const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: "#16a34a",
  PARTIAL:   "#f97316",
  MISSED:    "#dc2626",
  PENDING:   "#e5e7eb",
};

interface Props {
  pixels: Record<string, string>;
}

export default function YearHeatmap({ pixels }: Props) {
  // Build 52 weeks x 7 days grid starting from 364 days ago
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 364);

  // Align to Monday
  const dayOfWeek = (startDate.getDay() + 6) % 7; // 0=Mon
  startDate.setDate(startDate.getDate() - dayOfWeek);

  const weeks: (Date | null)[][] = [];
  const cursor = new Date(startDate);

  for (let w = 0; w < 53; w++) {
    const week: (Date | null)[] = [];
    for (let d = 0; d < 7; d++) {
      const cell = new Date(cursor);
      week.push(cell > today ? null : cell);
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  const formatKey = (date: Date) => date.toISOString().split("T")[0];

  // Month labels — find where each month starts
  const monthLabels: { label: string; weekIndex: number }[] = [];
  weeks.forEach((week, wi) => {
    const firstDay = week.find((d) => d !== null);
    if (!firstDay) return;
    if (firstDay.getDate() <= 7) {
      monthLabels.push({
        label: firstDay.toLocaleString("default", { month: "short" }),
        weekIndex: wi,
      });
    }
  });

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Month labels */}
          <View style={styles.monthRow}>
            {weeks.map((_, wi) => {
              const label = monthLabels.find((m) => m.weekIndex === wi);
              return (
                <View key={wi} style={styles.weekCol}>
                  <Text style={styles.monthLabel}>{label ? label.label : ""}</Text>
                </View>
              );
            })}
          </View>

          {/* Grid */}
          <View style={styles.gridRow}>
            {/* Day labels */}
            <View style={styles.dayLabels}>
              {DAYS.map((d, i) => (
                <Text key={i} style={styles.dayLabel}>{i % 2 === 0 ? d : ""}</Text>
              ))}
            </View>

            {/* Weeks */}
            {weeks.map((week, wi) => (
              <View key={wi} style={styles.weekCol}>
                {week.map((date, di) => {
                  if (!date) return <View key={di} style={styles.emptyCell} />;
                  const status = pixels[formatKey(date)];
                  const color = status ? STATUS_COLOR[status] : "#f3f4f6";
                  return (
                    <View
                      key={di}
                      style={[styles.cell, { backgroundColor: color }]}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        {Object.entries(STATUS_COLOR).map(([status, color]) => (
          <View key={status} style={styles.legendItem}>
            <View style={[styles.legendCell, { backgroundColor: color }]} />
            <Text style={styles.legendLabel}>
              {status.charAt(0) + status.slice(1).toLowerCase()}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  monthRow:   { flexDirection: "row", marginBottom: 2, marginLeft: 18 },
  monthLabel: { fontSize: 9, color: "#9ca3af", width: CELL_SIZE + CELL_GAP },
  gridRow:    { flexDirection: "row" },
  dayLabels:  { marginRight: 2 },
  dayLabel:   { fontSize: 9, color: "#9ca3af", height: CELL_SIZE + CELL_GAP, lineHeight: CELL_SIZE + CELL_GAP },
  weekCol:    { marginRight: CELL_GAP },
  cell:       { width: CELL_SIZE, height: CELL_SIZE, borderRadius: 2, marginBottom: CELL_GAP },
  emptyCell:  { width: CELL_SIZE, height: CELL_SIZE, marginBottom: CELL_GAP },
  legend:     { flexDirection: "row", gap: 12, marginTop: 10, flexWrap: "wrap" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendCell: { width: 10, height: 10, borderRadius: 2 },
  legendLabel:{ fontSize: 11, color: "#6b7280" },
});