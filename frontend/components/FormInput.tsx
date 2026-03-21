import { forwardRef, useState } from "react";
import { Pressable, Text, TextInput, View, StyleSheet, TextInputProps } from "react-native";
import { Colors } from "../constants/colors";

interface FormInputProps extends TextInputProps {
  label: string;
  error?: string;
  secureTextEntry?: boolean;
}

const FormInput = forwardRef<TextInput, FormInputProps>(
  ({ label, error, secureTextEntry = false, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = secureTextEntry;

    return (
      <View style={styles.container}>
        <Text style={styles.label}>{label}</Text>

        <View style={styles.inputWrapper}>
          <TextInput
            ref={ref}
            style={[styles.input, error && styles.inputError]}
            placeholderTextColor={Colors.placeholder}
            secureTextEntry={isPassword && !showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            {...props}
          />

          {isPassword && (
            <Pressable
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eye}
            >
              <Text>{showPassword ? "🙈" : "👁️"}</Text>
            </Pressable>
          )}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    );
  }
);

export default FormInput;

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    marginBottom: 6,
    color: Colors.text,
  },
  inputWrapper: {
    position: "relative",
    justifyContent: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingRight: 40,
    fontSize: 15,
    color: Colors.text,
  },
  inputError: {
    borderColor: Colors.error,
  },
  eye: {
    position: "absolute",
    right: 12,
    padding: 8,
  },
  error: {
    color: Colors.error,
    fontSize: 12,
    marginTop: 4,
  },
});