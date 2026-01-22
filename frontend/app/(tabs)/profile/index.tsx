import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { getToken, removeToken } from "../../../utils/authStorage";

type UserDTO = {
  email: string;
};

export default function ProfileScreen() {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const token = await getToken();
      if (!token) return router.replace("/");

      const res = await fetch("http://localhost:8080/user", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to load profile");

      const data = await res.json();
      setUser(data);
    } catch (e) {
      console.log("Profile load error", e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await removeToken();
    router.replace("/");
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <Text style={styles.header}>Profile</Text>

      {/* Profile Card */}
      <View style={styles.card}>
        <Text style={styles.avatar}>👤</Text>
        <Text style={styles.email}>
          {loading ? "Loading..." : user?.email}
        </Text>
      </View>

      {/* Stats (placeholder – wire later) */}
      <View style={styles.statsCard}>
        <Text style={styles.sectionTitle}>Stats</Text>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Habits</Text>
          <Text style={styles.statValue}>—</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Active Habits</Text>
          <Text style={styles.statValue}>—</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Longest Streak</Text>
          <Text style={styles.statValue}>—</Text>
        </View>
      </View>

      {/* Logout */}
      <Pressable style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
    </View>
  );
}

/* ---------------- Styles ---------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f8f9fa",
  },

  header: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 20,
  },

  card: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 20,
  },

  avatar: {
    fontSize: 48,
    marginBottom: 10,
  },

  email: {
    fontSize: 15,
    fontWeight: "500",
    color: "#374151",
  },

  statsCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 14,
    marginBottom: 30,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },

  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  statLabel: {
    fontSize: 14,
    color: "#6b7280",
  },

  statValue: {
    fontSize: 14,
    fontWeight: "600",
  },

  logoutBtn: {
    backgroundColor: "#ef4444",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  logoutText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
});
