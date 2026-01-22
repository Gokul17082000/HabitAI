import { useState, forwardRef } from "react";
import { Pressable, Text, TextInput, View, StyleSheet } from "react-native";

const FormInput = forwardRef<TextInput, any>(
  (
    {
      label,
      value,
      onChangeText,
      error,
      secureTextEntry = false,
      placeholder,
      returnKeyType,
      onSubmitEditing,
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = secureTextEntry;

    return (
      <View style={styles.container}>
        <Text style={styles.label}>{label}</Text>

        <View style={styles.inputWrapper}>
          <TextInput
            ref={ref}
            style={[styles.input, error && styles.inputError]}
            value={value}
            placeholder={placeholder}
            placeholderTextColor="#999"
            onChangeText={onChangeText}
            secureTextEntry={isPassword && !showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType={isPassword ? "default" : "email-address"}
            textContentType={isPassword ? "password" : "emailAddress"}
            returnKeyType={returnKeyType}
            onSubmitEditing={onSubmitEditing}
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
    color: "#333",
  },
  inputWrapper: {
    position: "relative",
    justifyContent: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingRight: 40,
    fontSize: 15,
  },
  inputError: {
    borderColor: "red",
  },
  eye: {
    position: "absolute",
    right: 12,
    padding: 8,
  },
  error: {
    color: "red",
    fontSize: 12,
    marginTop: 4,
  },
});
