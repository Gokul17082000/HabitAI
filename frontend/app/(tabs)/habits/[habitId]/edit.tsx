import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, StatusBar } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import HabitForm, { HabitFormValues } from "../../../../components/HabitForm";
import { getHabitByIdApi, updateHabitApi } from "../../../../services/habitService";
import { parseTargetTime } from "../../../../utils/formatters";
import { UnauthorizedError } from "../../../../utils/apiHandler";
import { DayOfWeek, UpdateHabitRequest } from "../../../../types/habit";
import { useTheme } from "../../../../context/ThemeContext";
import { AppColors } from "../../../../constants/colors";

export default function EditHabitScreen() {
  const { habitId } = useLocalSearchParams<{ habitId: string }>();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [initialValues, setInitialValues] = useState<
    (Omit<HabitFormValues, "targetTime"> & { targetTime: Date }) | null
  >(null);
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    loadHabit();
  }, [habitId]);

  const loadHabit = async () => {
    setFetching(true);
    setFetchError("");
    try {
      const habit = await getHabitByIdApi(Number(habitId));
      setInitialValues({
        title: habit.title,
        description: habit.description,
        category: habit.category,
        frequency: habit.frequency,
        daysOfWeek: (habit.daysOfWeek as DayOfWeek[]) ?? [],
        daysOfMonth: habit.daysOfMonth ?? [],
        targetTime: parseTargetTime(habit.targetTime),
        isCountable: habit.isCountable,
        targetCount: habit.targetCount,
        notificationsEnabled: habit.notificationsEnabled ?? true,
      });
    } catch (e) {
      if (e instanceof UnauthorizedError) return;
      setFetchError("Failed to load habit.");
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (values: HabitFormValues) => {
    setSubmitError("");
    setLoading(true);
    try {
      const request: UpdateHabitRequest = {
        ...values,
        daysOfWeek: values.daysOfWeek.length > 0 ? values.daysOfWeek : null,
        daysOfMonth: values.daysOfMonth.length > 0 ? values.daysOfMonth : null,
      };
      await updateHabitApi(Number(habitId), request);
      router.replace("/(tabs)/habits");
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Failed to update habit");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Loading habit...</Text>
      </View>
    );
  }

  if (fetchError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{fetchError}</Text>
      </View>
    );
  }

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

      <Text style={styles.title}>Edit Habit</Text>
      <View style={styles.divider} />

      {initialValues && (
        <HabitForm
          initialValues={initialValues}
          onSubmit={handleSubmit}
          submitLabel="Update Habit"
          loading={loading}
          apiError={submitError}
        />
      )}
    </ScrollView>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: c.background,
    },
    loadingText: {
      color: c.subtext,
      fontSize: 15,
    },
    errorText: {
      color: c.error,
      fontSize: 15,
    },
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
