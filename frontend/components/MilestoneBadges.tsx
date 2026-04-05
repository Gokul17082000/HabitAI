import { View, Text, StyleSheet, ScrollView } from "react-native";

const MILESTONES = [
  { days: 7,    label: "7 days",    emoji: "🌱", title: "Getting started" },
  { days: 21,   label: "21 days",   emoji: "🔥", title: "Habit forming"   },
  { days: 66,   label: "66 days",   emoji: "⚡", title: "Automatic"       },
  { days: 100,  label: "100 days",  emoji: "🏆", title: "Century"         },
  { days: 180,  label: "180 days",  emoji: "💪", title: "Half year"       },
  { days: 365,  label: "1 year",    emoji: "🌟", title: "One year"        },
  { days: 500,  label: "500 days",  emoji: "🚀", title: "500 club"        },
  { days: 730,  label: "2 years",   emoji: "💎", title: "Two years"       },
  { days: 1000, label: "1000 days", emoji: "🔱", title: "Legendary"       },
  { days: 1095, label: "3 years",   emoji: "👑", title: "Three years"     },
  { days: 1460, label: "4 years",   emoji: "🌌", title: "Four years"      },
  { days: 1825, label: "5 years",   emoji: "🎖️", title: "Five years"      },
];

interface Props {
  currentStreak: number;
  longestStreak: number;
}

export default function MilestoneBadges({ currentStreak, longestStreak }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Milestones</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.row}>
          {MILESTONES.map((milestone) => {
            const achieved = longestStreak >= milestone.days;
            const active   = currentStreak >= milestone.days;

            // Three distinct states
            const badgeStyle = active
              ? styles.badgeActive      // green — current streak alive
              : achieved
              ? styles.badgeAchieved   // yellow — earned before, streak broke
              : styles.badge;          // gray — not yet reached

            return (
              <View key={milestone.days} style={[styles.badge, badgeStyle]}>
                <Text style={[styles.emoji, !achieved && styles.locked]}>
                  {achieved ? milestone.emoji : "🔒"}
                </Text>
                <Text style={[styles.label, active ? styles.labelActive : achieved ? styles.labelAchieved : null]}>
                  {milestone.label}
                </Text>
                <Text style={[styles.title, active ? styles.titleActive : achieved ? styles.titleAchieved : null]}>
                  {milestone.title}
                </Text>

                {/* Status pill */}
                {active ? (
                  <View style={styles.activePill}>
                    <Text style={styles.activePillText}>Active 🔥</Text>
                  </View>
                ) : achieved ? (
                  <View style={styles.pastPill}>
                    <Text style={styles.pastPillText}>Achieved</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#16a34a" }]} />
          <Text style={styles.legendText}>Active streak</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#ca8a04" }]} />
          <Text style={styles.legendText}>Previously achieved</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#d1d5db" }]} />
          <Text style={styles.legendText}>Locked</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { marginTop: 20 },
  heading:        { fontSize: 15, fontWeight: "600", color: "#333", marginBottom: 10 },
  row:            { flexDirection: "row", gap: 10, paddingBottom: 8 },

  badge:          { width: 100, borderRadius: 12, padding: 12, alignItems: "center", backgroundColor: "#f3f4f6", borderWidth: 1, borderColor: "#e5e7eb" },
  badgeAchieved:  { backgroundColor: "#fefce8", borderColor: "#fde047" },
  badgeActive:    { backgroundColor: "#f0fdf4", borderColor: "#16a34a", borderWidth: 2 },

  emoji:          { fontSize: 26, marginBottom: 6 },
  locked:         { opacity: 0.35 },

  label:          { fontSize: 12, fontWeight: "700", color: "#9ca3af", textAlign: "center" },
  labelAchieved:  { color: "#854d0e" },
  labelActive:    { color: "#14532d" },

  title:          { fontSize: 10, color: "#9ca3af", marginTop: 2, textAlign: "center" },
  titleAchieved:  { color: "#92400e" },
  titleActive:    { color: "#166534" },

  activePill:     { marginTop: 6, backgroundColor: "#16a34a", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  activePillText: { fontSize: 9, color: "#fff", fontWeight: "600" },

  pastPill:       { marginTop: 6, backgroundColor: "#fef3c7", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: "#fde047" },
  pastPillText:   { fontSize: 9, color: "#854d0e", fontWeight: "600" },

  legend:         { flexDirection: "row", gap: 16, marginTop: 8, flexWrap: "wrap" },
  legendItem:     { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot:      { width: 8, height: 8, borderRadius: 4 },
  legendText:     { fontSize: 11, color: "#6b7280" },
});