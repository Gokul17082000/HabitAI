import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Switch,
} from "react-native";
import { router } from "expo-router";
import { changePasswordApi } from "../../../services/authService";
import { useTheme } from "../../../context/ThemeContext";
import { AppColors } from "../../../constants/colors";
import FormInput from "../../../components/FormInput";

export default function SettingsScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = makeStyles(colors);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChangePassword = async () => {
    setError("");
    setSuccess(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All fields are required");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setError("Password must contain at least one uppercase letter");
      return;
    }
    if (!/[a-z]/.test(newPassword)) {
      setError("Password must contain at least one lowercase letter");
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      setError("Password must contain at least one number");
      return;
    }
    if (!/[@$!%*?&]/.test(newPassword)) {
      setError("Password must contain at least one special character (@$!%*?&)");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await changePasswordApi(currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.header}>Settings</Text>
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          style={styles.closeBtn}
        >
          <Text style={[styles.close, { color: colors.primary }]}>✕ Close</Text>
        </Pressable>
      </View>
      <View style={styles.divider} />

      {/* Appearance */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Appearance</Text>
        <View style={styles.settingRow}>
          <View>
            <Text style={styles.settingLabel}>Dark Mode</Text>
            <Text style={styles.settingHint}>Switch between light and dark theme</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>
      </View>

      {/* Change Password */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Change Password</Text>

        <FormInput
          label="Current Password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Enter current password"
          secureTextEntry
        />
        <FormInput
          label="New Password"
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="8+ chars, uppercase, number, @$!%*?&"
          secureTextEntry
        />
        <FormInput
          label="Confirm New Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Repeat new password"
          secureTextEntry
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? (
          <Text style={styles.successText}>✓ Password changed successfully</Text>
        ) : null}

        <Pressable
          style={[styles.saveBtn, loading && { opacity: 0.6 }]}
          onPress={handleChangePassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Save Password</Text>
          )}
        </Pressable>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      backgroundColor: c.background,
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
      color: c.text,
    },
    close: {
      fontSize: 14,
      fontWeight: "600",
    },
    closeBtn: {
      padding: 12,
      borderRadius: 8,
    },
    divider: {
      height: 1,
      backgroundColor: c.border,
      marginBottom: 20,
    },
    card: {
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: c.text,
      marginBottom: 16,
    },
    settingRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    settingLabel: {
      fontSize: 14,
      fontWeight: "500",
      color: c.text,
    },
    settingHint: {
      fontSize: 12,
      color: c.subtext,
      marginTop: 2,
    },
    error: {
      color: c.error,
      fontSize: 13,
      marginBottom: 10,
      textAlign: "center",
    },
    successText: {
      color: c.completed,
      fontSize: 13,
      marginBottom: 10,
      textAlign: "center",
      fontWeight: "500",
    },
    saveBtn: {
      backgroundColor: c.primary,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
      marginTop: 8,
    },
    saveBtnText: {
      color: c.white,
      fontWeight: "600",
      fontSize: 15,
    },
  });
