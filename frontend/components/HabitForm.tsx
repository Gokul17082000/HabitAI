import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Switch,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import FormInput from "./FormInput";
import PrimaryButton from "./PrimaryButton";
import Chip from "./Chip";
import { formatTargetTime } from "../utils/formatters";
import {
  HabitCategory,
  HabitFrequency,
  DayOfWeek,
  HABIT_CATEGORIES,
  HABIT_FREQUENCIES,
  DAYS_OF_WEEK,
} from "../types/habit";
import { useTheme } from "../context/ThemeContext";
import { AppColors } from "../constants/colors";

export interface HabitFormValues {
  title: string;
  description: string;
  category: HabitCategory;
  frequency: HabitFrequency;
  daysOfWeek: DayOfWeek[];
  daysOfMonth: number[];
  targetTime: string;
  isCountable: boolean;
  targetCount: number;
  notificationsEnabled: boolean;
}

interface Props {
  initialValues?: Partial<Omit<HabitFormValues, "targetTime"> & { targetTime: Date }>;
  onSubmit: (values: HabitFormValues) => void;
  submitLabel: string;
  loading: boolean;
  apiError: string;
}

export default function HabitForm({ initialValues, onSubmit, submitLabel, loading, apiError }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [category, setCategory] = useState<HabitCategory>(initialValues?.category ?? "GENERAL");
  const [frequency, setFrequency] = useState<HabitFrequency>(initialValues?.frequency ?? "DAILY");
  const [daysOfWeek, setDaysOfWeek] = useState<DayOfWeek[]>(initialValues?.daysOfWeek ?? []);
  const [daysOfMonth, setDaysOfMonth] = useState<number[]>(initialValues?.daysOfMonth ?? []);
  const [targetTime, setTargetTime] = useState<Date>(initialValues?.targetTime ?? new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isCountable, setIsCountable] = useState(initialValues?.isCountable ?? false);
  const [targetCount, setTargetCount] = useState(initialValues?.targetCount ?? 1);
  const [notificationsEnabled, setNotificationsEnabled] = useState(initialValues?.notificationsEnabled ?? true);
  const [error, setError] = useState("");

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

  const handleSave = () => {
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

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      category,
      frequency,
      daysOfWeek: frequency === "WEEKLY" ? daysOfWeek : [],
      daysOfMonth: frequency === "MONTHLY" ? daysOfMonth : [],
      targetTime: formatTargetTime(targetTime),
      isCountable,
      targetCount: isCountable ? targetCount : 1,
      notificationsEnabled,
    });
  };

  const displayError = error || apiError;

  return (
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

      {isCountable && (
        <>
          <Text style={styles.label}>Daily Target</Text>
          <View style={styles.counterRow}>
            <Pressable
              style={styles.counterBtn}
              onPress={() => setTargetCount((prev) => Math.max(1, prev - 1))}
            >
              <Text style={styles.counterBtnText}>−</Text>
            </Pressable>
            <Text style={styles.counterValue}>{targetCount}</Text>
            <Pressable
              style={styles.counterBtn}
              onPress={() => setTargetCount((prev) => Math.min(100, prev + 1))}
            >
              <Text style={styles.counterBtnText}>+</Text>
            </Pressable>
          </View>
        </>
      )}

      <Text style={styles.label}>Target Time</Text>
      {Platform.OS === "web" ? (
        <input
          type="time"
          value={`${targetTime.getHours().toString().padStart(2, "0")}:${targetTime
            .getMinutes()
            .toString()
            .padStart(2, "0")}`}
          onChange={(e) => {
            const [h, m] = e.target.value.split(":");
            const t = new Date();
            t.setHours(Number(h), Number(m), 0, 0);
            setTargetTime(t);
          }}
          style={{
            border: `1px solid ${colors.border}`,
            borderRadius: 8,
            padding: 12,
            fontSize: 15,
            color: colors.text,
            backgroundColor: colors.card,
            marginBottom: 12,
            width: "100%",
            boxSizing: "border-box",
          }}
        />
      ) : (
        <>
          <Pressable style={styles.timeBox} onPress={() => setShowTimePicker(true)}>
            <Text style={styles.timeText}>
              {targetTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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

      <View style={styles.notifRow}>
        <View>
          <Text style={styles.label}>Push Notifications</Text>
          <Text style={styles.notifHint}>
            {notificationsEnabled ? "Reminders enabled" : "Reminders disabled"}
          </Text>
        </View>
        <Switch
          value={notificationsEnabled}
          onValueChange={setNotificationsEnabled}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.white}
        />
      </View>

      {displayError ? <Text style={styles.error}>{displayError}</Text> : null}

      <PrimaryButton title={submitLabel} loading={loading} onPress={handleSave} />
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    form: {
      backgroundColor: c.card,
      padding: 20,
      borderRadius: 10,
    },
    label: {
      marginTop: 12,
      marginBottom: 6,
      fontSize: 14,
      color: c.text,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: "600",
      marginTop: 16,
      marginBottom: 8,
      color: c.text,
    },
    row: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    timeBox: {
      borderWidth: 1,
      borderColor: c.border,
      padding: 12,
      borderRadius: 8,
      marginBottom: 12,
    },
    timeText: {
      fontSize: 15,
      color: c.text,
    },
    error: {
      color: c.error,
      textAlign: "center",
      marginBottom: 10,
    },
    monthWarning: {
      fontSize: 12,
      color: c.streak,
      backgroundColor: c.streakLight,
      borderRadius: 6,
      padding: 8,
      marginTop: 4,
      marginBottom: 8,
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
      backgroundColor: c.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    counterBtnText: {
      color: c.white,
      fontSize: 20,
      fontWeight: "600",
    },
    counterValue: {
      fontSize: 22,
      fontWeight: "700",
      color: c.text,
      minWidth: 40,
      textAlign: "center",
    },
    notifRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 12,
      marginBottom: 16,
    },
    notifHint: {
      fontSize: 11,
      color: c.subtext,
      marginTop: 2,
    },
  });
