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
} from "../../../types/habit";
import { Colors } from "../../../constants/colors";

const CATEGORIES: HabitCategory[] = ["GENERAL", "HEALTH", "WORK", "FITNESS", "LEARNING"];
const FREQUENCIES: HabitFrequency[] = ["DAILY", "WEEKLY", "MONTHLY"];
const DAYS_OF_WEEK: DayOfWeek[] = [
  "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY",
];

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
    if (!description.trim()) {
      setError("Description is required");
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
      };

      await createHabitApi(request);
      router.replace("/habits");
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
        />
        <FormInput
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="e.g. Run 5km every morning"
        />

        {/* Category */}
        <Text style={styles.sectionTitle}>Category</Text>
        <View style={styles.row}>
          {CATEGORIES.map((item) => (
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
          {FREQUENCIES.map((f) => (
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
          </>
        )}

        {/* Time */}
        <Text style={styles.label}>Target Time</Text>

        {Platform.OS === "web" ? (
          <input
            type="time"
            value={formatTargetTime(targetTime)}
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
  closeBtn: {
    padding: 12,
    borderRadius: 8,
  },
});