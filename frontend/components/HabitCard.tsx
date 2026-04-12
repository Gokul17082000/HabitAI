import { View, Text, StyleSheet, Pressable, Modal, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { useEffect, useRef, useState } from "react";
import { getHabitStreakApi, logHabitApi } from "../services/habitService";
import { formatDate, formatTime } from "../utils/formatters";
import { HabitResponse, HabitStatus } from "../types/habit";
import { Colors } from "../constants/colors";
import CelebrationModal from "./CelebrationModal";

interface HabitCardProps {
  habit: HabitResponse;
  onLogged?: (habitId: number, newStatus: HabitStatus) => void;
}

const STATUS_COLORS: Record<HabitStatus, string> = {
  PENDING: Colors.pending,
  COMPLETED: Colors.completed,
  MISSED: Colors.missed,
  PARTIALLY_COMPLETED: Colors.partial,
};

export default function HabitCard({ habit, onLogged }: HabitCardProps) {
  const [streak, setStreak] = useState<number | null>(null);
  const [logging, setLogging] = useState(false);
  const [localStatus, setLocalStatus] = useState<HabitStatus>(habit.habitStatus);
  const [localCount, setLocalCount] = useState<number>(habit.currentCount);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationStreak, setCelebrationStreak] = useState(0);

  // Tracks the previous localStatus so we can detect the exact PENDING→COMPLETED
  // transition rather than firing on every render where status === COMPLETED.
  const prevStatusRef = useRef<HabitStatus>(habit.habitStatus);

  // A ref that always holds the latest streak value so the completion effect
  // never closes over a stale number. Without this, if loadStreak() hasn't
  // resolved yet when the user taps complete, streak is still null and the
  // optimistic increment is skipped — or worse, computes from a stale value.
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

  // Optimistically bump the displayed streak by 1 only when localStatus
  // transitions INTO "COMPLETED" from a non-completed state.
  // Using a ref prevents this from firing on every re-render where status
  // happens to already be COMPLETED (e.g. parent list updates), which would
  // cause the streak counter to increment incorrectly on each render.

  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = localStatus;

    // Read streak from the ref so we always use the latest fetched value,
    // not whatever was captured in the closure when this effect was registered.
    const currentStreak = streakRef.current;

    if (localStatus === "COMPLETED" && prev !== "COMPLETED" && currentStreak !== null) {
      const newStreak = currentStreak + 1;
      streakRef.current = newStreak;
      setStreak(newStreak);

      // Check if new streak hits a milestone
      const milestones = [7, 21, 66, 100, 180, 365, 500, 730, 1000];
      if (milestones.includes(newStreak)) {
        setCelebrationStreak(newStreak);
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
    onLogged?.(habit.id, newStatus);

    setLogging(true);
    try {
      await logHabitApi(habit.id, today, newStatus, 0);
      // Streak is refreshed on the next useFocusEffect cycle (home screen
      // re-fetches habits). No need to fire an extra network request here.
    } catch {
      setLocalStatus(habit.habitStatus);
      onLogged?.(habit.id, habit.habitStatus);
    } finally {
      setLogging(false);
    }
  };

  // ---------- Countable habit handler ----------
  const handleCountLog = async (delta: number) => {
    if (isMissed || logging) return;

    const newCount = Math.max(0, Math.min(habit.targetCount, localCount + delta));
    if (newCount === localCount) return; // no change

    // Compute optimistic status
    const newStatus: HabitStatus =
      newCount === 0 ? "PENDING"
      : newCount >= habit.targetCount ? "COMPLETED"
      : "PARTIALLY_COMPLETED";

    setLocalCount(newCount);
    setLocalStatus(newStatus);
    onLogged?.(habit.id, newStatus);

    setLogging(true);
    try {
      await logHabitApi(habit.id, today, newStatus, newCount);
      // Streak refreshes on the next focus cycle — no extra call needed here.
    } catch {
      // Revert on error
      setLocalCount(habit.currentCount);
      setLocalStatus(habit.habitStatus);
      onLogged?.(habit.id, habit.habitStatus);
    } finally {
      setLogging(false);
    }
  };

  const handleSaveNote = async () => {
    if (!note.trim()) {
      setShowNoteModal(false);
      return;
    }
    setSavingNote(true);
    try {
      await logHabitApi(habit.id, today, localStatus, localCount, note.trim());
      // Close modal and mark saved only after the request completes, so the
      // user sees the "Saving..." indicator finish rather than the modal
      // disappearing mid-save with no confirmation.
      setNoteSaved(true);
      setShowNoteModal(false);
      setNote("");
    } catch {
      // fail silently — note is non-critical; close modal anyway
      setShowNoteModal(false);
      setNote("");
    } finally {
      setSavingNote(false);
    }
  };

  const statusColor = STATUS_COLORS[localStatus] ?? STATUS_COLORS.PENDING;

  return (
    <View style={styles.card}>
      {/* Left side — same for both */}
      <View style={styles.left}>
        <Text style={styles.title} numberOfLines={2}>{habit.title}</Text>
        <Text style={styles.category}>{habit.category}</Text>
        <Text style={styles.time}>⏰ {formatTime(habit.targetTime)}</Text>
      </View>

      {/* Right side — different for binary vs countable */}
      <View style={styles.right}>
        {habit.isCountable ? (
          // ---------- Countable UI ----------
          <>
            <View style={styles.progressRow}>
              <Text style={[styles.progressText, { color: statusColor }]}>
                {localCount}/{habit.targetCount}
              </Text>
            </View>

            {/* Progress bar */}
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

            {/* + / - buttons — hidden when missed */}
            {!isMissed && (
              <View style={styles.countControls}>
                <Pressable
                  style={[styles.countBtn, logging && { opacity: 0.5 }]}
                  disabled={logging || localCount <= 0}
                  accessibilityRole="button"
                  accessibilityLabel={`Decrease count for ${habit.title}`}
                  onPress={() => handleCountLog(-1)}
                >
                  <Text style={styles.countBtnText}>−</Text>
                </Pressable>

                <Pressable
                  style={[styles.countBtn, logging && { opacity: 0.5 }]}
                  disabled={logging || localCount >= habit.targetCount}
                  accessibilityRole="button"
                  accessibilityLabel={`Increase count for ${habit.title}`}
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
          // ---------- Binary UI (unchanged) ----------
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

        {/* Streak — shown for both */}
        {streak !== null && streak > 0 && (
          <Text style={styles.streak}>🔥 {streak}</Text>
        )}
      </View>
      {/* Note prompt — shows below card when missed */}
      {isMissed && (
        noteSaved ? (
          <Text style={noteStyles.savedText}>✓ Note saved</Text>
        ) : (
          <Pressable
            style={noteStyles.prompt}
            onPress={() => setShowNoteModal(true)}
          >
            <Text style={noteStyles.promptText}>💬 Why did you skip? Add a note</Text>
          </Pressable>
        )
      )}

      {/* Note Modal */}
      <Modal
        visible={showNoteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNoteModal(false)}
      >
        <KeyboardAvoidingView
          style={noteStyles.overlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={noteStyles.modal}>
            <Text style={noteStyles.modalTitle}>Why did you skip?</Text>
            <Text style={noteStyles.modalHabit}>{habit.title}</Text>
            <TextInput
              style={noteStyles.input}
              placeholder="e.g. Was too tired, ran out of time..."
              placeholderTextColor="#9ca3af"
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={300}
              autoFocus
            />
            <View style={noteStyles.modalActions}>
              <Pressable
                style={noteStyles.cancelBtn}
                onPress={() => { setShowNoteModal(false); setNote(""); }}
              >
                <Text style={noteStyles.cancelText}>Skip</Text>
              </Pressable>
              <Pressable
                style={[noteStyles.saveBtn, savingNote && { opacity: 0.6 }]}
                onPress={handleSaveNote}
                disabled={savingNote}
              >
                <Text style={noteStyles.saveText}>
                  {savingNote ? "Saving..." : "Save note"}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {/* Celebration Modal */}
      <CelebrationModal
        streak={celebrationStreak}
        habitTitle={habit.title}
        visible={showCelebration}
        onDismiss={() => setShowCelebration(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
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
    color: Colors.text,
    flexShrink: 1,
  },
  category: {
    fontSize: 12,
    color: Colors.subtext,
    marginTop: 4,
  },
  time: {
    fontSize: 13,
    color: Colors.primary,
    marginTop: 6,
  },
  right: {
    alignItems: "flex-end",
    minWidth: 90,
  },
  // Binary styles
  statusBadge: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  statusText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "600",
  },
  button: {
    padding: 4,
  },
  // Countable styles
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
    backgroundColor: "#e5e7eb",
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  countBtnText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: "600",
  },
  // Shared
  streak: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "600",
    color: Colors.streak,
    textAlign: "center",
  },
  undoHint: {
    fontSize: 10,
    color: Colors.subtext,
    marginTop: 4,
  },
});

const noteStyles = StyleSheet.create({
  prompt:        { marginTop: -8, marginBottom: 12, paddingHorizontal: 4 },
  promptText:    { fontSize: 12, color: Colors.subtext },
  overlay:       { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 24 },
  modal:         { backgroundColor: "#fff", borderRadius: 16, padding: 20 },
  modalTitle:    { fontSize: 17, fontWeight: "700", color: Colors.text, marginBottom: 4 },
  modalHabit:    { fontSize: 13, color: Colors.subtext, marginBottom: 14 },
  input:         { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 12, fontSize: 14, color: Colors.text, minHeight: 80, textAlignVertical: "top" },
  modalActions:  { flexDirection: "row", gap: 10, marginTop: 16 },
  cancelBtn:     { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 10, borderWidth: 1, borderColor: "#e5e7eb" },
  cancelText:    { fontSize: 14, color: Colors.subtext },
  saveBtn:       { flex: 2, paddingVertical: 12, alignItems: "center", borderRadius: 10, backgroundColor: Colors.primary },
  saveText:      { fontSize: 14, color: "#fff", fontWeight: "600" },
  savedText: { fontSize: 12, color: Colors.completed, marginTop: -8, marginBottom: 12, paddingHorizontal: 4 },
});