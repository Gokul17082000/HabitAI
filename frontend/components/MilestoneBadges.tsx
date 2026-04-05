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

            return (
              <View
                key={milestone.days}
                style={[
                  styles.badge,
                  achieved && styles.badgeAchieved,
                  active   && styles.badgeActive,
                ]}
              >
                <Text style={[styles.emoji, !achieved && styles.locked]}>
                  {achieved ? milestone.emoji : "🔒"}
                </Text>
                <Text style={[styles.label, achieved && styles.labelAchieved]}>
                  {milestone.label}
                </Text>
                <Text style={[styles.title, achieved && styles.titleAchieved]}>
                  {milestone.title}
                </Text>
                {active && (
                  <View style={styles.activePill}>
                    <Text style={styles.activePillText}>Active</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { marginTop: 20 },
  heading:         { fontSize: 15, fontWeight: "600", color: "#333", marginBottom: 10 },
  row:             { flexDirection: "row", gap: 10, paddingBottom: 4 },
  badge:           { width: 100, borderRadius: 12, padding: 12, alignItems: "center", backgroundColor: "#f3f4f6", borderWidth: 1, borderColor: "#e5e7eb" },
  badgeAchieved:   { backgroundColor: "#fefce8", borderColor: "#fde047" },
  badgeActive:     { backgroundColor: "#f0fdf4", borderColor: "#16a34a" },
  emoji:           { fontSize: 26, marginBottom: 6 },
  locked:          { opacity: 0.35 },
  label:           { fontSize: 12, fontWeight: "700", color: "#9ca3af" },
  labelAchieved:   { color: "#854d0e" },
  title:           { fontSize: 10, color: "#9ca3af", marginTop: 2, textAlign: "center" },
  titleAchieved:   { color: "#92400e" },
  activePill:      { marginTop: 6, backgroundColor: "#16a34a", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  activePillText:  { fontSize: 9, color: "#fff", fontWeight: "600" },
});