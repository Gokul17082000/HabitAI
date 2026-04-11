import { useState } from "react";
import {
  View, Text, StyleSheet, Pressable,
  ScrollView, StatusBar, ActivityIndicator
} from "react-native";
import { router } from "expo-router";
import { useFreezeApi } from "../../../services/authService";
import { formatDate } from "../../../utils/formatters";
import { Colors } from "../../../constants/colors";

export default function UseFreezeScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const handleUseFreeze = async (date: Date) => {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const result = await useFreezeApi(formatDate(date));
      setSuccess(
        `Freeze used! You have ${result.availableFreezes} freeze(s) remaining.`
      );
    } catch (e: any) {
      setError(e.message || "Failed to use freeze.");
    } finally {
      setLoading(false);
    }
  };

  const formatDisplay = (date: Date) =>
    date.toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric"
    });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Use Streak Freeze</Text>
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          style={styles.closeBtn}
        >
          <Text style={styles.close}>✕ Close</Text>
        </Pressable>
      </View>
      <View style={styles.divider} />

      <Text style={styles.description}>
        A streak freeze protects your streak for one missed day.
        You can apply it to today or yesterday.
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.options}>
          <Pressable
            style={styles.option}
            onPress={() => handleUseFreeze(today)}
          >
            <Text style={styles.optionEmoji}>🧊</Text>
            <Text style={styles.optionTitle}>Today</Text>
            <Text style={styles.optionDate}>{formatDisplay(today)}</Text>
          </Pressable>

          <Pressable
            style={styles.option}
            onPress={() => handleUseFreeze(yesterday)}
          >
            <Text style={styles.optionEmoji}>🧊</Text>
            <Text style={styles.optionTitle}>Yesterday</Text>
            <Text style={styles.optionDate}>{formatDisplay(yesterday)}</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>How freezes work</Text>
        <Text style={styles.infoText}>
          • Max 2 freezes at a time{"\n"}
          • Earn 1 freeze every 7 consecutive days{"\n"}
          • Each freeze protects one missed day{"\n"}
          • Frozen days don't break your streak
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: Colors.background,
    paddingTop: StatusBar.currentHeight ?? 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  header: {
    fontSize: 22,
    fontWeight: "600",
    color: Colors.text,
  },
  close: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  closeBtn: {
    padding: 12,
    borderRadius: 8,
  },
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: Colors.subtext,
    marginBottom: 24,
    lineHeight: 22,
  },
  error: {
    color: Colors.error,
    fontSize: 14,
    marginBottom: 12,
    textAlign: "center",
  },
  success: {
    color: "#16a34a",
    fontSize: 14,
    marginBottom: 12,
    textAlign: "center",
    fontWeight: "500",
  },
  options: {
    gap: 12,
    marginBottom: 24,
  },
  option: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  optionEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 4,
  },
  optionDate: {
    fontSize: 13,
    color: Colors.subtext,
  },
  infoCard: {
    backgroundColor: "#f0f9ff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: Colors.subtext,
    lineHeight: 22,
  },
});