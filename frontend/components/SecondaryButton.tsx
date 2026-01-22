import { Pressable, StyleSheet, Text } from "react-native";

export default function SecondaryButton({
  title,
  onPress,
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        pressed && { opacity: 0.7 },
      ]}
      onPress={onPress}
    >
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderColor: "#4f46e5",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  text: {
    color: "#4f46e5",
    fontSize: 16,
    fontWeight: "600",
  },
});
