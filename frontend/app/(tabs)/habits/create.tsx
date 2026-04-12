import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  StatusBar
} from "react-native";
import { router } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import FormInput from "../../../components/FormInput";
import PrimaryButton from "../../../components/PrimaryButton";
import Chip from "../../../components/Chip";
import { createHabitApi } from "../../../services/habitService";
import { formatTargetTime } from "../../../utils/formatters";
import {
  HabitCategory,
  HabitFrequency,
  DayOfWeek,
  CreateHabitRequest,
  HABIT_CATEGORIES,
  HABIT_FREQUENCIES,
  DAYS_OF_WEEK,
} from "../../../types/habit";
import { Colors } from "../../../constants/colors";


export default function CreateHabitScreen() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<HabitCategory>("GENERAL");
  const [frequency, setFrequency] = useState<HabitFrequency>("DAILY");
  const [daysOfWeek, setDaysOfWeek] = useState<DayOfWeek[]>([]);
  const [daysOfMonth, setDaysOfMonth] = useState<number[]>([]);
  const [targetTime, setTargetTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isCountable, setIsCountable] = useState(false);
  const [targetCount, setTargetCount] = useState(1);

  /* -------------------- Helpers -------------------- */
  const handleFrequencyChange = (value: HabitFrequency) => {
    setFrequency(value);
    setDaysOfWeek([]);
    setDaysOfMonth([]);
  };

  const toggleDayOfWeek = (day: DayOfWeek) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const toggleDayOfMonth = (day: number) => {
    setDaysOfMonth((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  /* -------------------- Save -------------------- */
  const handleSave = async () => {
    setError("");

    if (!title.trim()) {
      setError("Habit title is required");
      return;
    }
    if (frequency === "WEEKLY" && daysOfWeek.length === 0) {
      setError("Select at least one day of week");
      return;
    }
    if (frequency === "MONTHLY" && daysOfMonth.length === 0) {
      setError("Select at least one day of month");
      return;
    }

    if (isCountable && (targetCount < 1 || targetCount > 100)) {
      setError("Target count must be between 1 and 100");
      return;
    }

    setLoading(true);
    try {
      const request: CreateHabitRequest = {
        title: title.trim(),
        description: description.trim(),
        category,
        frequency,
        daysOfWeek: frequency === "WEEKLY" ? daysOfWeek : null,
        daysOfMonth: frequency === "MONTHLY" ? daysOfMonth : null,
        targetTime: formatTargetTime(targetTime),
        isCountable,
        targetCount: isCountable ? targetCount : 1,
      };

      await createHabitApi(request);
      router.replace("/(tabs)/habits");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create habit");
    } finally {
      setLoading(false);
    }
  };

  /* -------------------- UI -------------------- */
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            router.dismissAll();
            router.replace("/(tabs)/habits");
          }}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          style={styles.closeBtn}
        >
          <Text style={styles.close}>✕ Close</Text>
        </Pressable>
      </View>

      <Text style={styles.title}>New Habit</Text>
      <View style={styles.divider} />

      <View style={styles.form}>
        <FormInput
          label="Title"
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Morning Run"
          maxLength={100}
        />
        <FormInput
          label="Description (optional)"
          value={description}
          onChangeText={setDescription}
          placeholder="e.g. Run 5km every morning"
          maxLength={100}
        />

        {/* Category */}
        <Text style={styles.sectionTitle}>Category</Text>
        <View style={styles.row}>
          {HABIT_CATEGORIES.map((item) => (
            <Chip
              key={item}
              label={item}
              active={category === item}
              onPress={() => setCategory(item)}
            />
          ))}
        </View>

        {/* Frequency */}
        <Text style={styles.label}>Frequency</Text>
        <View style={styles.row}>
          {HABIT_FREQUENCIES.map((f) => (
            <Chip
              key={f}
              label={f}
              active={frequency === f}
              onPress={() => handleFrequencyChange(f)}
            />
          ))}
        </View>

        {/* Weekly */}
        {frequency === "WEEKLY" && (
          <>
            <Text style={styles.label}>Days of Week</Text>
            <View style={styles.row}>
              {DAYS_OF_WEEK.map((d) => (
                <Chip
                  key={d}
                  label={d.slice(0, 3)}
                  active={daysOfWeek.includes(d)}
                  onPress={() => toggleDayOfWeek(d)}
                />
              ))}
            </View>
          </>
        )}

        {/* Monthly */}
        {frequency === "MONTHLY" && (
          <>
            <Text style={styles.label}>Days of Month</Text>
            <View style={styles.row}>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                <Chip
                  key={day}
                  label={String(day)}
                  active={daysOfMonth.includes(day)}
                  onPress={() => toggleDayOfMonth(day)}
                />
              ))}
            </View>
            {daysOfMonth.some((d) => d >= 28) && (
              <Text style={styles.monthWarning}>
                ⚠️ Days 28–31 may not exist in all months (e.g. Feb). The habit will run on the last available day instead.
              </Text>
            )}
          </>
        )}

        {/* Countable Toggle */}
        <Text style={styles.label}>Habit Type</Text>
        <View style={styles.row}>
          <Chip
            label="Simple (Yes/No)"
            active={!isCountable}
            onPress={() => {
              setIsCountable(false);
              setTargetCount(1);
            }}
          />
          <Chip
            label="Countable"
            active={isCountable}
            onPress={() => setIsCountable(true)}
          />
        </View>

        {/* Target Count — only shown when countable */}
        {isCountable && (
          <>
            <Text style={styles.label}>Daily Target</Text>
            <View style={styles.counterRow}>
              <Pressable
                style={styles.counterBtn}
                onPress={() => setTargetCount(prev => Math.max(1, prev - 1))}
              >
                <Text style={styles.counterBtnText}>−</Text>
              </Pressable>
              <Text style={styles.counterValue}>{targetCount}</Text>
              <Pressable
                style={styles.counterBtn}
                onPress={() => setTargetCount(prev => Math.min(100, prev + 1))}
              >
                <Text style={styles.counterBtnText}>+</Text>
              </Pressable>
            </View>
          </>
        )}

        {/* Time */}
        <Text style={styles.label}>Target Time</Text>

        {Platform.OS === "web" ? (
          <input
            type="time"
            value={`${targetTime.getHours().toString().padStart(2,"0")}:${targetTime.getMinutes().toString().padStart(2,"0")}`}
            onChange={(e) => {
              const [h, m] = e.target.value.split(":");
              const newTime = new Date();
              newTime.setHours(Number(h), Number(m), 0, 0);
              setTargetTime(newTime);
            }}
            style={{
              border: "1px solid #ccc",
              borderRadius: 8,
              padding: 12,
              fontSize: 15,
              marginBottom: 12,
              width: "100%",
              boxSizing: "border-box",
            }}
          />
        ) : (
          <>
            <Pressable
              style={styles.timeBox}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.timeText}>
                {targetTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </Pressable>

            {showTimePicker && (
              <DateTimePicker
                mode="time"
                value={targetTime}
                is24Hour
                onChange={(_, t) => {
                  setShowTimePicker(false);
                  if (t) setTargetTime(t);
                }}
              />
            )}
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton
          title="Save Habit"
          loading={loading}
          onPress={handleSave}
        />
      </View>
    </ScrollView>
  );
}

/* -------------------- Styles -------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 10,
    paddingTop: StatusBar.currentHeight ?? 20,
  },
  close: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 20,
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginBottom: 16,
  },
  form: {
    backgroundColor: Colors.card,
    padding: 20,
    borderRadius: 10,
  },
  label: {
    marginTop: 12,
    marginBottom: 6,
    fontSize: 14,
    color: Colors.text,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
    color: Colors.text,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  timeBox: {
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  timeText: {
    fontSize: 15,
    color: Colors.text,
  },
  error: {
    color: Colors.error,
    textAlign: "center",
    marginBottom: 10,
  },
  monthWarning: {
    fontSize: 12,
    color: "#92400e",
    backgroundColor: "#fef3c7",
    borderRadius: 6,
    padding: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  closeBtn: {
    padding: 12,
    borderRadius: 8,
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 12,
  },
  counterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  counterBtnText: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: "600",
  },
  counterValue: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text,
    minWidth: 40,
    textAlign: "center",
  },
});