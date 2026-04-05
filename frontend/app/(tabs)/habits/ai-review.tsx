import { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  StatusBar, TextInput, Pressable, ActivityIndicator, Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { createHabitApi } from "../../../services/habitService";
import { CreateHabitRequest } from "../../../types/habit";
import { Colors } from "../../../constants/colors";

export default function AiReviewScreen() {
  const params = useLocalSearchParams();
  const initial: CreateHabitRequest[] = JSON.parse(params.habits as string);
  const [habits, setHabits] = useState<CreateHabitRequest[]>(initial);
  const [saving, setSaving] = useState(false);

  const updateHabit = (index: number, field: keyof CreateHabitRequest, value: string) => {
    setHabits((prev) =>
      prev.map((h, i) => (i === index ? { ...h, [field]: value } : h))
    );
  };

  const removeHabit = (index: number) => {
    setHabits((prev) => prev.filter((_, i) => i !== index));
  };

  const saveAll = async () => {
    if (habits.length === 0) return;
    setSaving(true);
    try {
      await Promise.all(habits.map((h) => createHabitApi(h)));
      router.replace("/(tabs)/habits");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save habits");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Review your plan</Text>
        <View style={{ width: 60 }} />
      </View>

      <Text style={styles.subtitle}>
        Your AI-generated habit plan. Edit anything before saving.
      </Text>

      <ScrollView contentContainerStyle={styles.list}>
        {habits.map((habit, index) => (
          <View key={index} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIndex}>Habit {index + 1}</Text>
              <Pressable onPress={() => removeHabit(index)}>
                <Text style={styles.remove}>Remove</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              value={habit.title}
              onChangeText={(v) => updateHabit(index, "title", v)}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={styles.input}
              value={habit.description}
              onChangeText={(v) => updateHabit(index, "description", v)}
            />

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.label}>Category</Text>
                <Text style={styles.pill}>{habit.category}</Text>
              </View>
              <View style={styles.halfField}>
                <Text style={styles.label}>Frequency</Text>
                <Text style={styles.pill}>{habit.frequency}</Text>
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.label}>Target time</Text>
                <Text style={styles.pill}>{habit.targetTime}</Text>
              </View>
              <View style={styles.halfField}>
                <Text style={styles.label}>Target count</Text>
                <Text style={styles.pill}>{habit.targetCount}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={saveAll}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save {habits.length} habits</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background, paddingTop: StatusBar.currentHeight ?? 12 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, paddingBottom: 8 },
  back: { fontSize: 14, color: Colors.primary, width: 60 },
  title: { fontSize: 18, fontWeight: "600", color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.subtext, paddingHorizontal: 20, marginBottom: 12 },
  list: { paddingHorizontal: 20, paddingBottom: 120 },
  card: { backgroundColor: Colors.white, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#e5e7eb" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  cardIndex: { fontSize: 13, fontWeight: "600", color: Colors.primary },
  remove: { fontSize: 13, color: "#ef4444" },
  label: { fontSize: 12, color: Colors.subtext, marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, padding: 10, fontSize: 14, color: Colors.text },
  row: { flexDirection: "row", gap: 12 },
  halfField: { flex: 1 },
  pill: { backgroundColor: "#f3f4f6", borderRadius: 6, padding: 8, fontSize: 13, color: Colors.text },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: "#e5e7eb" },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  saveBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});