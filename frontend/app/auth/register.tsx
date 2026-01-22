import { useRef, useState } from "react";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import FormInput from "../../components/FormInput";
import PrimaryButton from "../../components/PrimaryButton";
import { TextInput, Pressable } from "react-native";

export default function RegisterScreen() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false);
    const [emailError, setEmailError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [apiError, setApiError] = useState("");

    const passwordRef = useRef<TextInput>(null);

    const isValidEmail = (email: string) => {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const isStrongPassword = (password: string) => {
      return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password);
    };

    const handleRegister = async() => {

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
         } else if (!isStrongPassword(password)) {
           setPasswordError(
             "Password must include uppercase, lowercase, number & special character"
           );
           valid = false;
         }

         if (!valid) {
             return;
         }

         setLoading(true);

         try {
              const response = await fetch("http://localhost:8080/auth/register", {
                   method: "POST",
                   headers: {
                     "Content-Type": "application/json"
                   },
                   body: JSON.stringify({
                        email: email.trim(),
                        password: password
                   })
              });

              const data = await response.json();
              if (!response.ok) {
                throw new Error(data.message || "Something went wrong");
              }
              router.replace("/");
         } catch(error) {
              setApiError(error.message);
         } finally {
             setLoading(false);
         }
    }

    return (
        <View style={styles.container}>
          <View style={styles.branding}>
            <Text style={styles.appTitle}>HabitAI</Text>
            <Text style={styles.subtitle}>Build habits. Stay consistent.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.screenTitle}>Create Account</Text>

            <FormInput
              label="Email"
              value={email}
              placeholder="Enter email"
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
              onSubmitEditing={handleRegister}
              error={passwordError}
            />

            <Text style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
              Must be at least 8 characters and include uppercase, number & symbol
            </Text>

            {apiError && <Text style={styles.apiError}>{apiError}</Text>}

            <PrimaryButton title="Register" loading={loading} disabled={loading} onPress={handleRegister} />

            <Pressable disabled={loading} onPress={() => router.replace("/")}>
              <Text style={[styles.link, loading && { opacity: 0.5 }]}>
                Already have an account? Login
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
    backgroundColor: "#f8f9fa",
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
    color: "#666",
    marginTop: 6,
  },

  card: {
    backgroundColor: "#fff",
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
    color: "#4f46e5",
    fontWeight: "500",
  },

  apiError: {
    color: "red",
    textAlign: "center",
    marginBottom: 12,
    fontSize: 14,
  },
});
