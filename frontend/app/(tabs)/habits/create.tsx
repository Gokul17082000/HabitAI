import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";

import FormInput from "../../components/FormInput";
import PrimaryButton from "../../components/PrimaryButton";
import { getToken } from "../../utils/authStorage";

/* -------------------- Screen -------------------- */
export default function CreateHabitScreen() {
  // Basic fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"GENERAL" | "HEALTH" | "WORK" | "FITNESS" | "LEARNING">("GENERAL");

  // Frequency
  const [frequency, setFrequency] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("DAILY");
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>([]);
  const [daysOfMonth, setDaysOfMonth] = useState<number[]>([]);

  // Time
  const [targetTime, setTargetTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  // UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* -------------------- Helpers -------------------- */
  const handleFrequencyChange = (value: "DAILY" | "WEEKLY" | "MONTHLY") => {
    setFrequency(value);
    setDaysOfWeek([]);
    setDaysOfMonth([]);
  };

  const toggleDayOfWeek = (day: string) => {
    setDaysOfWeek(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const toggleDayOfMonth = (day: number) => {
    setDaysOfMonth(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  /* -------------------- Save -------------------- */
  const handleSave = async () => {
    setError("");

    if (!title.trim()) return setError("Habit title is required");
    if (!description.trim()) return setError("Description is required");

    if (frequency === "WEEKLY" && daysOfWeek.length === 0) {
      return setError("Select at least one day of week");
    }

    if (frequency === "MONTHLY" && daysOfMonth.length === 0) {
      return setError("Select at least one day of month");
    }

    setLoading(true);

    try {
      const token = await getToken();
      if (!token) return router.replace("/");

      const hours = targetTime.getHours().toString().padStart(2, "0");
      const minutes = targetTime.getMinutes().toString().padStart(2, "0");

      const response = await fetch("http://localhost:8080/habits", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          category,
          frequency,
          daysOfWeek: frequency === "WEEKLY" ? daysOfWeek : null,
          daysOfMonth: frequency === "MONTHLY" ? daysOfMonth : null,
          targetTime: `${hours}:${minutes}`,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to create habit");

      router.back();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  /* -------------------- UI -------------------- */
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.close}>Close</Text>
        </Pressable>
      </View>
      <Text style={styles.title}>New Habit</Text>

      <View style={styles.form}>
        <FormInput label="Title" value={title} onChangeText={setTitle} />
        <FormInput label="Description" value={description} onChangeText={setDescription} />

        {/* Category */}
        <Text style={styles.sectionTitle}>Category</Text>

        <View style={styles.row}>
          {["GENERAL", "HEALTH", "WORK", "FITNESS", "LEARNING"].map((item) => (
            <Pressable
              key={item}
              onPress={() => setCategory(item as any)}
              style={[
                styles.chip,
                category === item && styles.chipActive,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  category === item && styles.chipTextActive,
                ]}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </View>


        {/* Frequency */}
        <Text style={styles.label}>Frequency</Text>
        <View style={styles.row}>
          {["DAILY", "WEEKLY", "MONTHLY"].map(f => (
            <Chip
              key={f}
              label={f}
              active={frequency === f}
              onPress={() => handleFrequencyChange(f as any)}
            />
          ))}
        </View>

        {/* Weekly */}
        {frequency === "WEEKLY" && (
          <>
            <Text style={styles.label}>Days of Week</Text>
            <View style={styles.row}>
              {["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"]
                .map(d => (
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
              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
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
        <Pressable style={styles.timeBox} onPress={() => setShowTimePicker(true)}>
          <Text>{targetTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
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

        {error && <Text style={styles.error}>{error}</Text>}

        <PrimaryButton title="Save Habit" loading={loading} onPress={handleSave} />
      </View>
    </ScrollView>
  );
}

/* -------------------- Chip -------------------- */
function Chip({ label, active, onPress }: any) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

/* -------------------- Styles -------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f8f9fa" },
  title: { fontSize: 24, fontWeight: "600", textAlign: "center", marginBottom: 20 },
  form: { backgroundColor: "#fff", padding: 20, borderRadius: 10 },
  label: { marginTop: 12, marginBottom: 6, fontSize: 14 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive: { backgroundColor: "#4f46e5", borderColor: "#4f46e5" },
  chipText: { fontSize: 13 },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  timeBox: { borderWidth: 1, padding: 12, borderRadius: 8, marginBottom: 12 },
  error: { color: "red", textAlign: "center", marginBottom: 10 },
  sectionTitle: {fontSize: 15, fontWeight: "600", marginTop: 16, marginBottom: 8, color: '#333'},
  header: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 10, },
  close: { color: "#4f46e5", fontSize: 16, fontWeight: "500", },
});