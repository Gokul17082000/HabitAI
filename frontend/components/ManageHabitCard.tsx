import React, { memo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { HabitDTO } from "../types/habit";
import { formatTime } from "../utils/formatters";
import { useTheme } from "../context/ThemeContext";
import { AppColors } from "../constants/colors";

interface Props {
  habit: HabitDTO;
  isActioning: boolean;
  isDeleting: boolean;
  isPausing: boolean;
  isArchiving: boolean;
  isFirst: boolean;
  isLast: boolean;
  onDelete: (id: number) => void;
  onPause: (id: number) => void;
  onResume: (id: number) => void;
  onArchive: (id: number) => void;
  onMoveUp: (id: number) => void;
  onMoveDown: (id: number) => void;
}

function formatPausedUntil(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function IconBtn({
  label,
  onPress,
  disabled,
  variant = "default",
  colors,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
  variant?: "default" | "danger" | "primary" | "success";
  colors: AppColors;
}) {
  const variantStyle = {
    default:  { bg: colors.border, text: colors.subtext },
    danger:   { bg: colors.errorLight, text: colors.missed },
    primary:  { bg: colors.primaryLight, text: colors.primary },
    success:  { bg: colors.completedLight, text: colors.completed },
  }[variant];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.iconBtn,
        { backgroundColor: variantStyle.bg },
        pressed && { opacity: 0.65 },
        disabled && styles.iconBtnDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.iconBtnText, { color: variantStyle.text }]}>{label}</Text>
    </Pressable>
  );
}

function ManageHabitCard({
  habit,
  isActioning,
  isDeleting,
  isPausing,
  isArchiving,
  isFirst,
  isLast,
  onDelete,
  onPause,
  onResume,
  onArchive,
  onMoveUp,
  onMoveDown,
}: Props) {
  const { colors } = useTheme();
  const cardStyles = makeStyles(colors);

  return (
    <View style={[cardStyles.card, habit.paused && cardStyles.cardPaused]}>
      {/* Reorder arrows — left column */}
      <View style={cardStyles.reorderCol}>
        <Pressable
          style={[cardStyles.reorderBtn, isFirst && { opacity: 0.2 }]}
          onPress={() => onMoveUp(habit.id)}
          disabled={isFirst || isActioning}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Move habit up"
          accessibilityRole="button"
        >
          <Text style={cardStyles.reorderText}>▲</Text>
        </Pressable>
        <Pressable
          style={[cardStyles.reorderBtn, isLast && { opacity: 0.2 }]}
          onPress={() => onMoveDown(habit.id)}
          disabled={isLast || isActioning}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Move habit down"
          accessibilityRole="button"
        >
          <Text style={cardStyles.reorderText}>▼</Text>
        </Pressable>
      </View>

      {/* Info */}
      <View style={cardStyles.info}>
        <View style={cardStyles.titleRow}>
          <Text style={cardStyles.title} numberOfLines={2}>{habit.title}</Text>
          {habit.paused && (
            <View style={cardStyles.pausedBadge}>
              <Text style={cardStyles.pausedBadgeText}>Paused</Text>
            </View>
          )}
          {!habit.notificationsEnabled && (
            <Text style={cardStyles.notifOff}>🔕</Text>
          )}
        </View>

        <Text style={cardStyles.meta}>
          {habit.category} · {habit.frequency}
          {habit.isCountable ? ` · ×${habit.targetCount}` : ""}
        </Text>

        <Text style={cardStyles.time}>⏰ {formatTime(habit.targetTime)}</Text>

        {habit.paused && habit.pausedUntil && (
          <Text style={cardStyles.resumeDate}>
            Resumes {formatPausedUntil(habit.pausedUntil)}
          </Text>
        )}
      </View>

      {/* Actions */}
      <View style={cardStyles.actions}>
        <IconBtn
          label="✏️"
          variant="primary"
          onPress={() => router.navigate(`/(tabs)/habits/${habit.id}/edit`)}
          disabled={isActioning}
          colors={colors}
        />
        <IconBtn
          label="📊"
          variant="default"
          onPress={() => router.navigate(`/(tabs)/habits/${habit.id}/activity`)}
          disabled={isActioning}
          colors={colors}
        />
        {habit.paused ? (
          <IconBtn
            label={isPausing ? "⏳" : "▶"}
            variant="success"
            onPress={() => onResume(habit.id)}
            disabled={isActioning}
            colors={colors}
          />
        ) : (
          <IconBtn
            label={isPausing ? "⏳" : "⏸"}
            variant="default"
            onPress={() => onPause(habit.id)}
            disabled={isActioning}
            colors={colors}
          />
        )}
        {!habit.paused && (
          <IconBtn
            label={isArchiving ? "⏳" : "📦"}
            variant="default"
            onPress={() => onArchive(habit.id)}
            disabled={isActioning}
            colors={colors}
          />
        )}
        <IconBtn
          label={isDeleting ? "⏳" : "🗑"}
          variant="danger"
          onPress={() => onDelete(habit.id)}
          disabled={isActioning}
          colors={colors}
        />
      </View>
    </View>
  );
}

export default memo(ManageHabitCard);

const styles = StyleSheet.create({
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnText: {
    fontSize: 15,
  },
  iconBtnDisabled: {
    opacity: 0.4,
  },
});

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.card,
      padding: 14,
      borderRadius: 16,
      marginBottom: 10,
      flexDirection: "row",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
    cardPaused: {
      opacity: 0.7,
      borderWidth: 1.5,
      borderColor: c.border,
      borderStyle: "dashed",
    },
    reorderCol: {
      marginRight: 8,
      alignItems: "center",
      gap: 4,
    },
    reorderBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.border,
    },
    reorderText: {
      fontSize: 10,
      color: c.subtext,
    },
    info: {
      flex: 1,
      marginRight: 10,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
    },
    title: {
      fontSize: 15,
      fontWeight: "600",
      color: c.text,
      flex: 1,
      flexShrink: 1,
    },
    pausedBadge: {
      backgroundColor: c.border,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
    },
    pausedBadgeText: {
      fontSize: 11,
      color: c.subtext,
      fontWeight: "600",
    },
    notifOff: {
      fontSize: 13,
    },
    meta: {
      fontSize: 12,
      color: c.subtext,
      marginTop: 3,
    },
    time: {
      fontSize: 12,
      color: c.primary,
      marginTop: 4,
      fontWeight: "500",
    },
    resumeDate: {
      fontSize: 11,
      color: c.subtext,
      marginTop: 3,
      fontStyle: "italic",
    },
    actions: {
      flexDirection: "row",
      gap: 6,
      alignItems: "center",
    },
  });
