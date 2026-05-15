import { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, StatusBar } from "react-native";
import { router } from "expo-router";
import HabitForm, { HabitFormValues } from "../../../components/HabitForm";
import { createHabitApi } from "../../../services/habitService";
import { CreateHabitRequest } from "../../../types/habit";
import { useTheme } from "../../../context/ThemeContext";
import { AppColors } from "../../../constants/colors";

export default function CreateHabitScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (values: HabitFormValues) => {
    setError("");
    setLoading(true);
    try {
      const request: CreateHabitRequest = {
        ...values,
        daysOfWeek: values.daysOfWeek.length > 0 ? values.daysOfWeek : null,
        daysOfMonth: values.daysOfMonth.length > 0 ? values.daysOfMonth : null,
      };
      await createHabitApi(request);
      router.replace("/(tabs)/habits");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create habit");
    } finally {
      setLoading(false);
    }
  };

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

      <HabitForm
        onSubmit={handleSubmit}
        submitLabel="Save Habit"
        loading={loading}
        apiError={error}
      />
    </ScrollView>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      backgroundColor: c.background,
    },
    header: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginBottom: 10,
      paddingTop: StatusBar.currentHeight ?? 20,
    },
    close: {
      color: c.primary,
      fontSize: 14,
      fontWeight: "600",
    },
    closeBtn: {
      padding: 12,
      borderRadius: 8,
    },
    title: {
      fontSize: 24,
      fontWeight: "600",
      textAlign: "center",
      marginBottom: 20,
      color: c.text,
    },
    divider: {
      height: 1,
      backgroundColor: c.border,
      marginBottom: 16,
    },
  });
