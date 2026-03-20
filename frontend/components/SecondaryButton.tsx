import { Pressable, StyleSheet, Text } from "react-native";
import { Colors } from "../constants/colors";

interface SecondaryButtonProps {
  title: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

export default function SecondaryButton({
  title,
  loading = false,
  disabled = false,
  onPress,
}: SecondaryButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        pressed && { opacity: 0.7 },
        (loading || disabled) && { opacity: 0.6 },
      ]}
      disabled={loading || disabled}
      onPress={onPress}
    >
      <Text style={styles.text}>
        {loading ? "Please wait..." : title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  text: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: "600",
  },
});