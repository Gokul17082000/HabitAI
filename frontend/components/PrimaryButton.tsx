import { Pressable, StyleSheet, Text } from "react-native";
import { Colors } from "../constants/colors";

interface PrimaryButtonProps {
  title: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

export default function PrimaryButton({
  title,
  loading = false,
  disabled = false,
  onPress,
}: PrimaryButtonProps) {
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
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  text: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
});