import { useRef, useState, useEffect } from "react";
import { View, Text, StyleSheet, TextInput, Pressable } from "react-native";
import { router } from "expo-router";
import FormInput from "../components/FormInput";
import PrimaryButton from "../components/PrimaryButton";
import { saveToken, getToken } from "../utils/authStorage";
import { loginApi } from "../services/authService";
import { isValidEmail } from "../utils/validation";
import { Colors } from "../constants/colors";
import { registerForPushNotifications } from "../utils/pushNotifications";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [apiError, setApiError] = useState("");

  const passwordRef = useRef<TextInput>(null);

  useEffect(() => {
    const autoLogin = async () => {
      const token = await getToken();
      if (token) {
        router.replace("/home");
        return;
      }
      setChecking(false);
    };
    autoLogin();
  }, []);

  // Show nothing while checking token
  if (checking) return null;

  const handleLogin = async () => {
    if (loading) return;

    let valid = true;
    setEmailError("");
    setPasswordError("");
    setApiError("");

    if (!email.trim()) {
      setEmailError("Email is required");
      valid = false;
    } else if (!isValidEmail(email)) {
      setEmailError("Enter a valid email address");
      valid = false;
    } else if (email.length > 100) {
      setEmailError("Email is too long");
      valid = false;
    }

    if (!password.trim()) {
      setPasswordError("Password is required");
      valid = false;
    } else if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      valid = false;
    }

    if (!valid) return;

    setLoading(true);
    try {
      const data = await loginApi(email, password);
      await saveToken(data.token);
      await registerForPushNotifications();
      router.replace("/home");
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.branding}>
        <Text style={styles.appTitle}>HabitAI</Text>
        <Text style={styles.subtitle}>Build habits. Stay consistent.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.screenTitle}>Login</Text>

        <FormInput
          label="Email"
          value={email}
          placeholder="Enter email"
          keyboardType="email-address"
          returnKeyType="next"
          onChangeText={(text) => {
            setEmail(text);
            setEmailError("");
            setApiError("");
          }}
          onSubmitEditing={() => passwordRef.current?.focus()}
          error={emailError}
        />

        <FormInput
          ref={passwordRef}
          label="Password"
          value={password}
          placeholder="Enter password"
          secureTextEntry
          returnKeyType="done"
          onChangeText={(text) => {
            setPassword(text);
            setPasswordError("");
            setApiError("");
          }}
          onSubmitEditing={handleLogin}
          error={passwordError}
        />

        {apiError ? <Text style={styles.apiError}>{apiError}</Text> : null}

        <PrimaryButton title="Login" loading={loading} onPress={handleLogin} />

        <Pressable disabled={loading} onPress={() => router.push("/auth/register")}>
          <Text style={[styles.link, loading && { opacity: 0.5 }]}>
            Don't have an account? Register
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: Colors.background,
  },
  branding: {
    alignItems: "center",
    marginBottom: 30,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 15,
    color: Colors.subtext,
    marginTop: 6,
  },
  card: {
    backgroundColor: Colors.card,
    padding: 20,
    borderRadius: 12,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
  },
  link: {
    marginTop: 20,
    textAlign: "center",
    color: Colors.primary,
    fontWeight: "500",
  },
  apiError: {
    color: Colors.error,
    textAlign: "center",
    marginBottom: 12,
    fontSize: 14,
  },
});