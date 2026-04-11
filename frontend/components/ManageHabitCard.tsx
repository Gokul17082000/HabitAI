import React, { memo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { HabitDTO } from "../types/habit";
import { formatTime } from "../utils/formatters";
import { Colors } from "../constants/colors";

interface Props {
  habit: HabitDTO;
  isActioning: boolean;
  isDeleting: boolean;
  isPausing: boolean;
  isArchiving: boolean;
  onDelete: (id: number) => void;
  onPause: (id: number) => void;
  onResume: (id: number) => void;
  onArchive: (id: number) => void;
}

function formatPausedUntil(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Card used in the habits management screen (list all / pause / delete).
 * Extracted from habits/index.tsx renderCard() to enable React.memo and
 * eliminate re-creation of the function on every parent render.
 */
function ManageHabitCard({
  habit,
  isActioning,
  isDeleting,
  isPausing,
  onDelete,
  onPause,
  onResume,
}: Props) {
  return (
    <View style={[styles.card, habit.paused && styles.cardPaused]}>
      {/* Left */}
      <View style={{ flex: 1 }}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>{habit.title}</Text>
          {habit.paused && (
            <View style={styles.pausedBadge}>
              <Text style={styles.pausedBadgeText}>⏸ Paused</Text>
            </View>
          )}
        </View>

        <Text style={styles.meta}>
          {habit.category} • {habit.frequency}
          {habit.isCountable ? ` • Target: ${habit.targetCount}` : ""}
        </Text>

        <Text style={styles.time}>⏰ {formatTime(habit.targetTime)}</Text>

        {habit.paused && habit.pausedUntil && (
          <Text style={styles.pausedUntilText}>
            Resumes on {formatPausedUntil(habit.pausedUntil)}
          </Text>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {/* Edit */}
        <Pressable
          disabled={isActioning}
          onPress={() => router.navigate(`/(tabs)/habits/${habit.id}/edit`)}
        >
          <Text style={{ opacity: isActioning ? 0.4 : 1 }}>✏️</Text>
        </Pressable>

        {/* Delete */}
        <Pressable disabled={isActioning} onPress={() => onDelete(habit.id)}>
          <Text style={{ opacity: isActioning ? 0.4 : 1 }}>
            {isDeleting ? "⏳" : "🗑️"}
          </Text>
        </Pressable>

        {/* Activity */}
        <Pressable
          disabled={isActioning}
          onPress={() => router.navigate(`/(tabs)/habits/${habit.id}/activity`)}
        >
          <Text style={{ opacity: isActioning ? 0.4 : 1 }}>📊</Text>
        </Pressable>

        {/* Pause / Resume */}
        {habit.paused ? (
          <Pressable disabled={isActioning} onPress={() => onResume(habit.id)}>
            <Text style={{ opacity: isActioning ? 0.4 : 1 }}>
              {isPausing ? "⏳" : "▶️"}
            </Text>
          </Pressable>
        ) : (
          <Pressable disabled={isActioning} onPress={() => onPause(habit.id)}>
            <Text style={{ opacity: isActioning ? 0.4 : 1 }}>
              {isPausing ? "⏳" : "⏸️"}
            </Text>
          </Pressable>
        )}

        {/* Archive */}
        {!habit.paused && (
          <Pressable disabled={isActioning} onPress={() => onArchive(habit.id)}>
            <Text style={{ opacity: isActioning ? 0.4 : 1 }}>
              {isArchiving ? "⏳" : "📦"}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default memo(ManageHabitCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  cardPaused: {
    opacity: 0.6,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: "dashed",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    flex: 1,
    flexShrink: 1,
  },
  pausedBadge: {
    backgroundColor: Colors.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  pausedBadgeText: {
    fontSize: 11,
    color: Colors.subtext,
    fontWeight: "600",
  },
  meta: {
    fontSize: 12,
    color: Colors.subtext,
    marginTop: 4,
  },
  time: {
    fontSize: 13,
    color: Colors.primary,
    marginTop: 6,
  },
  pausedUntilText: {
    fontSize: 12,
    color: Colors.subtext,
    marginTop: 4,
    fontStyle: "italic",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
});
