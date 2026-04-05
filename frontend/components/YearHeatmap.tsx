import { View, Text, StyleSheet, ScrollView } from "react-native";

const CELL_SIZE = 11;
const CELL_GAP = 2;
const WEEK_WIDTH = CELL_SIZE + CELL_GAP; // 13px per week column
const DAY_LABEL_WIDTH = 20;

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 364);

  // Align to Monday
  const dayOfWeek = (startDate.getDay() + 6) % 7;
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

  const formatKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // Month labels — track where each month first appears
  const monthLabels: { label: string; weekIndex: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const firstDay = week.find((d) => d !== null);
    if (!firstDay) return;
    const month = firstDay.getMonth();
    if (month !== lastMonth) {
      monthLabels.push({
        label: firstDay.toLocaleString("default", { month: "short" }),
        weekIndex: wi,
      });
      lastMonth = month;
    }
  });

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>

          {/* Month labels row */}
          <View style={[styles.monthRow, { marginLeft: DAY_LABEL_WIDTH + 4 }]}>
            {weeks.map((_, wi) => {
              const label = monthLabels.find((m) => m.weekIndex === wi);
              return (
                <View key={wi} style={{ width: WEEK_WIDTH, overflow: "visible" }}>
                  {label ? (
                    <Text style={styles.monthLabel} numberOfLines={1}>
                      {label.label}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>

          {/* Grid row */}
          <View style={styles.gridRow}>

            {/* Day labels */}
            <View style={{ width: DAY_LABEL_WIDTH, marginRight: 4 }}>
              {DAYS.map((d, i) => (
                <View key={i} style={{ height: CELL_SIZE + CELL_GAP, justifyContent: "center" }}>
                  {/* Only show Mon, Wed, Fri, Sun to avoid crowding */}
                  {[0, 2, 4, 6].includes(i) ? (
                    <Text style={styles.dayLabel}>{d[0]}</Text>
                  ) : null}
                </View>
              ))}
            </View>

            {/* Week columns */}
            {weeks.map((week, wi) => (
              <View key={wi} style={{ width: WEEK_WIDTH }}>
                {week.map((date, di) => {
                  if (!date) {
                    return <View key={di} style={styles.emptyCell} />;
                  }
                  const key = formatKey(date);
                  const status = pixels[key];
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
  monthRow:    { flexDirection: "row", marginBottom: 4 },
  monthLabel:  { fontSize: 10, color: "#6b7280", fontWeight: "500", width: 28 },
  gridRow:     { flexDirection: "row" },
  dayLabel:    { fontSize: 9, color: "#9ca3af" },
  cell:        { width: CELL_SIZE, height: CELL_SIZE, borderRadius: 2, marginBottom: CELL_GAP },
  emptyCell:   { width: CELL_SIZE, height: CELL_SIZE, marginBottom: CELL_GAP },
  legend:      { flexDirection: "row", gap: 12, marginTop: 12, flexWrap: "wrap" },
  legendItem:  { flexDirection: "row", alignItems: "center", gap: 4 },
  legendCell:  { width: 10, height: 10, borderRadius: 2 },
  legendLabel: { fontSize: 11, color: "#6b7280" },
});