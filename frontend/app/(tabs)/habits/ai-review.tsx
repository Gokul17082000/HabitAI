import { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  StatusBar, TextInput, Pressable, ActivityIndicator, Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { createHabitApi } from "../../../services/habitService";
import { CreateHabitRequest, HabitCategory, HabitFrequency, DayOfWeek, HABIT_CATEGORIES, HABIT_FREQUENCIES, DAYS_OF_WEEK, DAY_SHORT } from "../../../types/habit";
import { Colors } from "../../../constants/colors";


export default function AiReviewScreen() {
  const params = useLocalSearchParams();

  // Parse habits from params — track whether parsing succeeded so we can
  // navigate away safely inside a useEffect instead of during render.
  // Calling router during render causes "Cannot update a component from
  // inside the function body of a different component" in Expo Router.
  let initial: CreateHabitRequest[] = [];
  let parseError = false;
  try {
    const parsed = JSON.parse(params.habits as string);
    if (Array.isArray(parsed)) {
      initial = parsed;
    } else {
      parseError = true;
    }
  } catch {
    parseError = true;
  }

  const [habits, setHabits] = useState<CreateHabitRequest[]>(initial);
  const [selected, setSelected] = useState<Set<number>>(
    new Set(initial.map((_, i) => i))
  );
  const [saving, setSaving] = useState(false);

  // Navigate away after mount if params were malformed.
  useEffect(() => {
    if (parseError) {
      router.back();
    }
  }, []);

  const toggleSelect = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === habits.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(habits.map((_, i) => i)));
    }
  };

  const updateHabit = <K extends keyof CreateHabitRequest>(index: number, field: K, value: CreateHabitRequest[K]) => {
    setHabits((prev) =>
      prev.map((h, i) => {
        if (i !== index) return h;
        const updated = { ...h, [field]: value };
        // When frequency changes, reset days
        if (field === "frequency") {
          updated.daysOfWeek = null;
          updated.daysOfMonth = null;
        }
        return updated;
      })
    );
  };

  const toggleDayOfWeek = (index: number, day: DayOfWeek) => {
    setHabits((prev) =>
      prev.map((h, i) => {
        if (i !== index) return h;
        const current = h.daysOfWeek ?? [];
        const exists = current.includes(day);
        return {
          ...h,
          daysOfWeek: exists
            ? current.filter((d) => d !== day)
            : [...current, day],
        };
      })
    );
  };

  const saveSelected = async () => {
    const toSave = habits.filter((_, i) => selected.has(i));
    if (toSave.length === 0) return;

    // Validate weekly habits have at least one day selected
    const invalidWeekly = toSave.find(
      (h) => h.frequency === "WEEKLY" && (!h.daysOfWeek || h.daysOfWeek.length === 0)
    );
    if (invalidWeekly) {
      Alert.alert("Missing days", `"${invalidWeekly.title}" is WEEKLY but has no days selected.`);
      return;
    }

    const invalidMonthly = toSave.find(
      (h) => h.frequency === "MONTHLY" && (!h.daysOfMonth || h.daysOfMonth.length === 0)
    );
    if (invalidMonthly) {
      Alert.alert("Missing days", `"${invalidMonthly.title}" is MONTHLY but has no days of month selected.`);
      return;
    }

    setSaving(true);
    try {
      await Promise.all(toSave.map((h) => createHabitApi(h)));
      router.replace("/(tabs)/habits");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save habits");
    } finally {
      setSaving(false);
    }
  };

  const allSelected = selected.size === habits.length;

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Review your plan</Text>
        <Pressable onPress={toggleSelectAll}>
          <Text style={styles.selectAll}>
            {allSelected ? "Deselect all" : "Select all"}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Tap a card to select it. Edit fields before saving.
      </Text>

      <ScrollView contentContainerStyle={styles.list}>
        {habits.map((habit, index) => {
          const isSelected = selected.has(index);
          return (
            <View key={index} style={[styles.card, isSelected && styles.cardSelected]}>

              {/* Card header — tap to select/deselect */}
              <Pressable style={styles.cardHeader} onPress={() => toggleSelect(index)}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.cardTitle} numberOfLines={2}>{habit.title}</Text>
                </View>
                <Text style={styles.categoryBadge}>{habit.category}</Text>
              </Pressable>

              {/* Edit fields — only when selected */}
              {isSelected && (
                <View style={styles.editSection}>

                  {/* Title */}
                  <Text style={styles.label}>Title</Text>
                  <TextInput
                    style={styles.input}
                    value={habit.title}
                    onChangeText={(v) => updateHabit(index, "title", v)}
                  />

                  {/* Description */}
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    style={[styles.input, styles.inputMultiline]}
                    value={habit.description}
                    onChangeText={(v) => updateHabit(index, "description", v)}
                    multiline
                  />

                  {/* Category chips */}
                  <Text style={styles.label}>Category</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.chipRow}>
                      {HABIT_CATEGORIES.map((cat) => (
                        <Pressable
                          key={cat}
                          style={[styles.chip, habit.category === cat && styles.chipActive]}
                          onPress={() => updateHabit(index, "category", cat)}
                        >
                          <Text style={[styles.chipText, habit.category === cat && styles.chipTextActive]}>
                            {cat}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>

                  {/* Frequency segments */}
                  <Text style={styles.label}>Frequency</Text>
                  <View style={styles.segmentRow}>
                    {HABIT_FREQUENCIES.map((freq) => (
                      <Pressable
                        key={freq}
                        style={[styles.segment, habit.frequency === freq && styles.segmentActive]}
                        onPress={() => updateHabit(index, "frequency", freq)}
                      >
                        <Text style={[styles.segmentText, habit.frequency === freq && styles.segmentTextActive]}>
                          {freq}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {/* Days of week — only when WEEKLY */}
                  {habit.frequency === "WEEKLY" && (
                    <>
                      <Text style={styles.label}>Days of week</Text>
                      <View style={styles.daysRow}>
                        {DAYS_OF_WEEK.map((day) => {
                          const isActive = habit.daysOfWeek?.includes(day) ?? false;
                          return (
                            <Pressable
                              key={day}
                              style={[styles.dayChip, isActive && styles.dayChipActive]}
                              onPress={() => toggleDayOfWeek(index, day)}
                            >
                              <Text style={[styles.dayChipText, isActive && styles.dayChipTextActive]}>
                                {DAY_SHORT[day].slice(0, 2)}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </>
                  )}

                  {/* Days of month — only when MONTHLY */}
                  {habit.frequency === "MONTHLY" && (
                    <>
                      <Text style={styles.label}>Days of month</Text>
                      <View style={styles.daysRow}>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                          const isActive = habit.daysOfMonth?.includes(day) ?? false;
                          return (
                            <Pressable
                              key={day}
                              style={[styles.dayChip, isActive && styles.dayChipActive]}
                              onPress={() => {
                                setHabits((prev) =>
                                  prev.map((h, i) => {
                                    if (i !== index) return h;
                                    const current = h.daysOfMonth ?? [];
                                    return {
                                      ...h,
                                      daysOfMonth: current.includes(day)
                                        ? current.filter((d) => d !== day)
                                        : [...current, day],
                                    };
                                  })
                                );
                              }}
                            >
                              <Text style={[styles.dayChipText, isActive && styles.dayChipTextActive]}>
                                {day}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </>
                  )}

                  {/* Target time and count */}
                  <View style={styles.row}>
                    <View style={styles.halfField}>
                      <Text style={styles.label}>Target time</Text>
                      <TextInput
                        style={styles.input}
                        value={habit.targetTime}
                        onChangeText={(v) => updateHabit(index, "targetTime", v)}
                        placeholder="HH:mm:ss"
                        placeholderTextColor={Colors.subtext}
                      />
                    </View>
                    <View style={styles.halfField}>
                      <Text style={styles.label}>Target count</Text>
                      <TextInput
                        style={styles.input}
                        value={String(habit.targetCount)}
                        onChangeText={(v) => updateHabit(index, "targetCount", parseInt(v) || 1)}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  {/* Countable toggle */}
                  <View style={styles.toggleRow}>
                    <Text style={styles.label}>Countable habit?</Text>
                    <Pressable
                      style={[styles.toggleBtn, habit.isCountable && styles.toggleBtnActive]}
                      onPress={() => updateHabit(index, "isCountable", !habit.isCountable)}
                    >
                      <Text style={[styles.toggleText, habit.isCountable && styles.toggleTextActive]}>
                        {habit.isCountable ? "Yes" : "No"}
                      </Text>
                    </Pressable>
                  </View>

                </View>
              )}
            </View>
          );
        })}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.saveBtn, (saving || selected.size === 0) && { opacity: 0.5 }]}
          onPress={saveSelected}
          disabled={saving || selected.size === 0}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>
              Add {selected.size} habit{selected.size !== 1 ? "s" : ""} to my plan
            </Text>
          )}
        </Pressable>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:          { flex: 1, backgroundColor: Colors.background, paddingTop: StatusBar.currentHeight ?? 12 },
  header:            { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, paddingBottom: 8 },
  back:              { fontSize: 14, color: Colors.primary, width: 60 },
  title:             { fontSize: 17, fontWeight: "600", color: Colors.text },
  selectAll:         { fontSize: 13, color: Colors.primary, fontWeight: "500" },
  subtitle:          { fontSize: 13, color: Colors.subtext, paddingHorizontal: 20, marginBottom: 12 },
  list:              { paddingHorizontal: 20, paddingBottom: 100 },

  card:              { backgroundColor: Colors.white, borderRadius: 12, marginBottom: 12, borderWidth: 1.5, borderColor: "#e5e7eb", overflow: "hidden" },
  cardSelected:      { borderColor: Colors.primary },
  cardHeader:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 },
  cardHeaderLeft:    { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  cardTitle:         { fontSize: 14, fontWeight: "600", color: Colors.text, flex: 1 },
  categoryBadge:     { fontSize: 11, color: Colors.primary, fontWeight: "600", backgroundColor: "#ede9fe", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },

  checkbox:          { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: "#d1d5db", alignItems: "center", justifyContent: "center" },
  checkboxSelected:  { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkmark:         { color: "#fff", fontSize: 13, fontWeight: "700" },

  editSection:       { paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  label:             { fontSize: 12, color: Colors.subtext, marginBottom: 4, marginTop: 10 },
  input:             { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, padding: 10, fontSize: 14, color: Colors.text },
  inputMultiline:    { minHeight: 56, textAlignVertical: "top" },
  row:               { flexDirection: "row", gap: 12 },
  halfField:         { flex: 1 },

  chipRow:           { flexDirection: "row", gap: 8 },
  chip:              { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#f9fafb" },
  chipActive:        { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText:          { fontSize: 12, color: Colors.subtext },
  chipTextActive:    { color: "#fff", fontWeight: "600" },

  segmentRow:        { flexDirection: "row", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, overflow: "hidden" },
  segment:           { flex: 1, paddingVertical: 8, alignItems: "center", backgroundColor: "#f9fafb" },
  segmentActive:     { backgroundColor: Colors.primary },
  segmentText:       { fontSize: 12, color: Colors.subtext },
  segmentTextActive: { color: "#fff", fontWeight: "600" },

  daysRow:           { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  dayChip:           { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#f9fafb", alignItems: "center", justifyContent: "center" },
  dayChipActive:     { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayChipText:       { fontSize: 12, color: Colors.subtext, fontWeight: "500" },
  dayChipTextActive: { color: "#fff", fontWeight: "600" },

  toggleRow:         { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  toggleBtn:         { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#f9fafb" },
  toggleBtnActive:   { backgroundColor: Colors.primary, borderColor: Colors.primary },
  toggleText:        { fontSize: 13, color: Colors.subtext },
  toggleTextActive:  { color: "#fff", fontWeight: "600" },

  footer:            { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: "#e5e7eb" },
  saveBtn:           { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  saveBtnText:       { color: "#fff", fontWeight: "600", fontSize: 15 },
});