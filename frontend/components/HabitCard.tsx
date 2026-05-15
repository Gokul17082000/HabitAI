import { View, Text, StyleSheet, Pressable, Modal, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { useEffect, useRef, useState } from "react";
import { getHabitStreakApi, logHabitApi } from "../services/habitService";
import { formatDate, formatTime } from "../utils/formatters";
import { HabitResponse, HabitStatus } from "../types/habit";
import { useTheme } from "../context/ThemeContext";
import { AppColors } from "../constants/colors";
import CelebrationModal from "./CelebrationModal";

interface HabitCardProps {
  habit: HabitResponse;
  onLogged?: (habitId: number, newStatus: HabitStatus) => void;
}

export default function HabitCard({ habit, onLogged }: HabitCardProps) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const noteSt = makeNoteStyles(colors);

  const STATUS_COLORS: Record<HabitStatus, string> = {
    PENDING: colors.pending,
    COMPLETED: colors.completed,
    MISSED: colors.missed,
    PARTIALLY_COMPLETED: colors.partial,
  };

  const [streak, setStreak] = useState<number | null>(null);
  const [logging, setLogging] = useState(false);
  const [localStatus, setLocalStatus] = useState<HabitStatus>(habit.habitStatus);
  const [localCount, setLocalCount] = useState<number>(habit.currentCount);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [noteSaveError, setNoteSaveError] = useState("");
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationStreak, setCelebrationStreak] = useState(0);
  const [logError, setLogError] = useState("");

  const prevStatusRef = useRef<HabitStatus>(habit.habitStatus);
  const initialStatusRef = useRef<HabitStatus>(habit.habitStatus);
  const celebrationShownRef = useRef(false);
  const streakRef = useRef<number | null>(null);

  useEffect(() => {
    if (!logging && !savingNote) {
      setLocalStatus(habit.habitStatus);
      setLocalCount(habit.currentCount);
      setNoteSaved(false);
    }
  }, [habit.habitStatus, habit.currentCount, logging, savingNote]);

  const today = formatDate(new Date());
  const isMissed = localStatus === "MISSED";
  const isCompleted = localStatus === "COMPLETED";

  useEffect(() => {
    loadStreak();
  }, [habit.id]);

  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = localStatus;

    const currentStreak = streakRef.current;

    if (
      localStatus === "COMPLETED" &&
      prev !== "COMPLETED" &&
      currentStreak !== null &&
      initialStatusRef.current !== "COMPLETED" &&
      !celebrationShownRef.current
    ) {
      const wouldBeStreak = currentStreak + 1;
      const milestones = [7, 21, 66, 100, 180, 365, 500, 730, 1000];
      if (milestones.includes(wouldBeStreak)) {
        celebrationShownRef.current = true;
        setCelebrationStreak(wouldBeStreak);
        setShowCelebration(true);
      }
    }
  }, [localStatus]);

  const loadStreak = async () => {
    try {
      const data = await getHabitStreakApi(habit.id);
      streakRef.current = data.streak;
      setStreak(data.streak);
    } catch {
      setStreak(0);
    }
  };

  // ---------- Binary habit handler ----------
  const handleBinaryLog = async () => {
    if (isMissed || logging) return;

    const newStatus: HabitStatus = isCompleted ? "PENDING" : "COMPLETED";
    setLocalStatus(newStatus);
    setLogError("");
    onLogged?.(habit.id, newStatus);

    setLogging(true);
    try {
      await logHabitApi(habit.id, today, newStatus, 0);
    } catch {
      setLocalStatus(habit.habitStatus);
      onLogged?.(habit.id, habit.habitStatus);
      setLogError("Failed to save. Try again.");
    } finally {
      setLogging(false);
    }
  };

  // ---------- Countable habit handler ----------
  const handleCountLog = async (delta: number) => {
    if (isMissed || logging) return;

    const newCount = Math.max(0, Math.min(habit.targetCount, localCount + delta));
    if (newCount === localCount) return;

    const newStatus: HabitStatus =
      newCount === 0 ? "PENDING"
      : newCount >= habit.targetCount ? "COMPLETED"
      : "PARTIALLY_COMPLETED";

    setLocalCount(newCount);
    setLocalStatus(newStatus);
    setLogError("");
    onLogged?.(habit.id, newStatus);

    setLogging(true);
    try {
      await logHabitApi(habit.id, today, newStatus, newCount);
    } catch {
      setLocalCount(habit.currentCount);
      setLocalStatus(habit.habitStatus);
      onLogged?.(habit.id, habit.habitStatus);
      setLogError("Failed to save. Try again.");
    } finally {
      setLogging(false);
    }
  };

  const handleSaveNote = async () => {
    if (!note.trim()) {
      setShowNoteModal(false);
      return;
    }
    setNoteSaveError("");
    setSavingNote(true);
    try {
      await logHabitApi(habit.id, today, localStatus, localCount, note.trim());
      setNoteSaved(true);
      setShowNoteModal(false);
      setNote("");
    } catch {
      setNoteSaveError("Failed to save note. Try again.");
    } finally {
      setSavingNote(false);
    }
  };

  const displayedStreak =
    streak !== null
      ? streak + (localStatus === "COMPLETED" && initialStatusRef.current !== "COMPLETED" ? 1 : 0)
      : null;

  const statusColor = STATUS_COLORS[localStatus] ?? STATUS_COLORS.PENDING;

  const showNotePrompt = (isMissed || isCompleted) && !noteSaved;
  const notePromptText = isCompleted
    ? "💬 Add a note about today's session"
    : "💬 Why did you skip? Add a note";
  const modalTitle = isCompleted ? "How did it go?" : "Why did you skip?";
  const modalPlaceholder = isCompleted
    ? "e.g. Felt great, hit a new PR..."
    : "e.g. Was too tired, ran out of time...";

  return (
    <View style={styles.card}>
      {/* Left accent bar */}
      <View style={[styles.accentBar, { backgroundColor: statusColor }]} />

      <View style={styles.inner}>
      <View style={styles.row}>
      <View style={styles.left}>
        <Text style={styles.title} numberOfLines={2}>{habit.title}</Text>
        <Text style={styles.category}>{habit.category}</Text>
        {habit.targetTime ? (
          <Text style={styles.time}>⏰ {formatTime(habit.targetTime)}</Text>
        ) : null}
      </View>

      <View style={styles.right}>
        {habit.isCountable ? (
          <>
            <View style={styles.progressRow}>
              <Text style={[styles.progressText, { color: statusColor }]}>
                {localCount}/{habit.targetCount}
              </Text>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.round((localCount / habit.targetCount) * 100)}%`,
                    backgroundColor: statusColor,
                  },
                ]}
              />
            </View>

            {!isMissed && (
              <View style={styles.countControls}>
                <Pressable
                  style={[styles.countBtn, logging && { opacity: 0.5 }]}
                  disabled={logging || localCount <= 0}
                  accessibilityRole="button"
                  accessibilityLabel={`Decrease count for ${habit.title}`}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  onPress={() => handleCountLog(-1)}
                >
                  <Text style={styles.countBtnText}>−</Text>
                </Pressable>

                <Pressable
                  style={[styles.countBtn, logging && { opacity: 0.5 }]}
                  disabled={logging || localCount >= habit.targetCount}
                  accessibilityRole="button"
                  accessibilityLabel={`Increase count for ${habit.title}`}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  onPress={() => handleCountLog(1)}
                >
                  <Text style={styles.countBtnText}>+</Text>
                </Pressable>
              </View>
            )}

            {isCompleted && (
              <Text style={styles.undoHint}>target reached 🎯</Text>
            )}
          </>
        ) : (
          <>
            <Pressable
              disabled={isMissed || logging}
              accessibilityRole="button"
              accessibilityLabel={
                isCompleted
                  ? `Mark ${habit.title} as incomplete`
                  : `Mark ${habit.title} as complete`
              }
              style={({ pressed }) => [
                styles.button,
                pressed && !isMissed && { opacity: 0.7 },
                (isMissed || logging) && { opacity: 0.5 },
              ]}
              onPress={handleBinaryLog}
            >
              <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                <Text style={styles.statusText}>
                  {logging ? "..." : isCompleted ? "✓ DONE" : localStatus ?? "PENDING"}
                </Text>
              </View>
            </Pressable>

            {isCompleted && (
              <Text style={styles.undoHint}>tap to undo</Text>
            )}
          </>
        )}

        {displayedStreak !== null && displayedStreak > 0 && (
          <Text style={styles.streak}>🔥 {displayedStreak}</Text>
        )}
      </View>
      </View>

      {logError ? (
        <Text style={noteSt.noteError}>{logError}</Text>
      ) : null}

      {/* Note prompt — shown for both MISSED and COMPLETED */}
      {showNotePrompt && (
        <Pressable
          style={noteSt.prompt}
          onPress={() => setShowNoteModal(true)}
        >
          <Text style={noteSt.promptText}>{notePromptText}</Text>
        </Pressable>
      )}
      {noteSaved && (
        <Text style={noteSt.savedText}>✓ Note saved</Text>
      )}

      {/* Note Modal */}
      <Modal
        visible={showNoteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNoteModal(false)}
      >
        <KeyboardAvoidingView
          style={noteSt.overlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={noteSt.modal}>
            <Text style={noteSt.modalTitle}>{modalTitle}</Text>
            <Text style={noteSt.modalHabit}>{habit.title}</Text>
            <TextInput
              style={noteSt.input}
              placeholder={modalPlaceholder}
              placeholderTextColor={colors.placeholder}
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={300}
              autoFocus
            />
            {noteSaveError ? (
              <Text style={noteSt.noteError}>{noteSaveError}</Text>
            ) : null}
            <View style={noteSt.modalActions}>
              <Pressable
                style={noteSt.cancelBtn}
                onPress={() => { setShowNoteModal(false); setNote(""); setNoteSaveError(""); }}
              >
                <Text style={noteSt.cancelText}>Skip</Text>
              </Pressable>
              <Pressable
                style={[noteSt.saveBtn, savingNote && { opacity: 0.6 }]}
                onPress={handleSaveNote}
                disabled={savingNote}
              >
                <Text style={noteSt.saveText}>
                  {savingNote ? "Saving..." : "Save note"}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <CelebrationModal
        streak={celebrationStreak}
        habitTitle={habit.title}
        visible={showCelebration}
        onDismiss={() => setShowCelebration(false)}
      />
      </View>
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.card,
      borderRadius: 16,
      marginBottom: 12,
      flexDirection: "row",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 8,
      elevation: 3,
    },
    accentBar: {
      width: 4,
      borderTopLeftRadius: 16,
      borderBottomLeftRadius: 16,
    },
    inner: {
      flex: 1,
      padding: 16,
      flexDirection: "column",
    },
    row: {
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
      color: c.text,
      flexShrink: 1,
    },
    category: {
      fontSize: 12,
      color: c.subtext,
      marginTop: 4,
    },
    time: {
      fontSize: 13,
      color: c.primary,
      marginTop: 6,
    },
    right: {
      alignItems: "flex-end",
      minWidth: 90,
    },
    statusBadge: {
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 10,
    },
    statusText: {
      color: c.white,
      fontSize: 12,
      fontWeight: "600",
    },
    button: {
      padding: 4,
    },
    progressRow: {
      marginBottom: 4,
    },
    progressText: {
      fontSize: 16,
      fontWeight: "700",
    },
    progressTrack: {
      width: 90,
      height: 6,
      backgroundColor: c.border,
      borderRadius: 3,
      overflow: "hidden",
      marginBottom: 8,
    },
    progressFill: {
      height: 6,
      borderRadius: 3,
    },
    countControls: {
      flexDirection: "row",
      gap: 8,
    },
    countBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    countBtnText: {
      color: c.white,
      fontSize: 18,
      fontWeight: "600",
    },
    streak: {
      marginTop: 6,
      fontSize: 12,
      fontWeight: "600",
      color: c.streak,
      textAlign: "center",
    },
    undoHint: {
      fontSize: 10,
      color: c.subtext,
      marginTop: 4,
    },
  });

const makeNoteStyles = (c: AppColors) =>
  StyleSheet.create({
    prompt:       { marginTop: -8, marginBottom: 12, paddingHorizontal: 4, paddingVertical: 4 },
    promptText:   { fontSize: 12, color: c.primary, textDecorationLine: "underline" },
    overlay:      { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 24 },
    modal:        { backgroundColor: c.card, borderRadius: 16, padding: 20 },
    modalTitle:   { fontSize: 17, fontWeight: "700", color: c.text, marginBottom: 4 },
    modalHabit:   { fontSize: 13, color: c.subtext, marginBottom: 14 },
    input:        { borderWidth: 1, borderColor: c.border, borderRadius: 10, padding: 12, fontSize: 14, color: c.text, minHeight: 80, textAlignVertical: "top" },
    modalActions: { flexDirection: "row", gap: 10, marginTop: 16 },
    cancelBtn:    { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 10, borderWidth: 1, borderColor: c.border },
    cancelText:   { fontSize: 14, color: c.subtext },
    saveBtn:      { flex: 2, paddingVertical: 12, alignItems: "center", borderRadius: 10, backgroundColor: c.primary },
    saveText:     { fontSize: 14, color: c.white, fontWeight: "600" },
    noteError:    { fontSize: 12, color: c.error, textAlign: "center", marginBottom: 8 },
    savedText:    { fontSize: 12, color: c.completed, marginTop: -8, marginBottom: 12, paddingHorizontal: 4 },
  });
