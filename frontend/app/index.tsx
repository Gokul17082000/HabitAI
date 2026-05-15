import { useRef, useState, useEffect } from "react";
import { View, Text, StyleSheet, TextInput, Pressable } from "react-native";
import { router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import FormInput from "../components/FormInput";
import PrimaryButton from "../components/PrimaryButton";
import { saveToken, saveRefreshToken, getToken } from "../utils/authStorage";
import { loginApi } from "../services/authService";
import { isValidEmail } from "../utils/validation";
import { useTheme } from "../context/ThemeContext";
import { AppColors } from "../constants/colors";
import { isOnboardingComplete } from "../utils/onboardingStorage";


/**
 * Decodes a JWT and returns true if its exp claim is still in the future.
 * Does NOT verify the signature — that is the server's job. This is purely
 * a client-side check to avoid sending obviously expired tokens.
 *
 * We avoid atob() because it is not guaranteed to be available in all
 * Hermes / JSC configurations on React Native. Instead we decode the
 * base64url payload with a pure-JS implementation so this never throws
 * a ReferenceError on any platform.
 */
function base64UrlDecode(str: string): string {
  // base64url → base64
  let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  // Pad to a multiple of 4
  while (b64.length % 4) b64 += "=";

  // Decode without atob (works in Hermes, JSC, and browsers)
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  let i = 0;
  b64 = b64.replace(/[^A-Za-z0-9+/]/g, "");
  while (i < b64.length) {
    const a = chars.indexOf(b64[i++]);
    const b = chars.indexOf(b64[i++]);
    const c = chars.indexOf(b64[i++]);
    const d = chars.indexOf(b64[i++]);
    result += String.fromCharCode((a << 2) | (b >> 4));
    if (c !== -1) result += String.fromCharCode(((b & 15) << 4) | (c >> 2));
    if (d !== -1) result += String.fromCharCode(((c & 3) << 6) | d);
  }
  return result;
}

function isTokenValid(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    if (typeof payload.exp !== "number") return false;
    // exp is in seconds; Date.now() is in ms. 30s skew tolerance for drifted clocks.
    return payload.exp * 1000 > Date.now() - 30_000;
  } catch {
    return false;
  }
}

export default function LoginScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [apiError, setApiError] = useState("");

  const passwordRef = useRef<TextInput>(null);

  useEffect(() => {
    const checkOnboarding = async () => {
      const onboardingDone = await isOnboardingComplete();
      if (!onboardingDone) {
        await SplashScreen.hideAsync();
        router.replace("/onboarding");
        return;
      }

      const token = await getToken();
      if (token && isTokenValid(token)) {
        await SplashScreen.hideAsync();
        router.replace("/home");
        return;
      }
      // Token missing or expired — clear it and show login
      if (token) {
        const { removeToken } = await import("../utils/authStorage");
        await removeToken();
      }
      // Hide splash only after the check is done so users never see a flash
      // of the login screen before being redirected to /home or /onboarding.
      await SplashScreen.hideAsync();
      setChecking(false);
    };
    checkOnboarding();
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
      await saveToken(data.accessToken);
      await saveRefreshToken(data.refreshToken);
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

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      padding: 20,
      backgroundColor: c.background,
    },
    branding: {
      alignItems: "center",
      marginBottom: 30,
    },
    appTitle: {
      fontSize: 32,
      fontWeight: "bold",
      color: c.primary,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 15,
      color: c.subtext,
      marginTop: 6,
    },
    card: {
      backgroundColor: c.card,
      padding: 20,
      borderRadius: 12,
    },
    screenTitle: {
      fontSize: 20,
      fontWeight: "600",
      textAlign: "center",
      marginBottom: 16,
      color: c.text,
    },
    link: {
      marginTop: 20,
      textAlign: "center",
      color: c.primary,
      fontWeight: "500",
    },
    apiError: {
      color: c.error,
      textAlign: "center",
      marginBottom: 12,
      fontSize: 14,
    },
  });