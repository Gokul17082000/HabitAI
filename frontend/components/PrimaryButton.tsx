import { Pressable, StyleSheet, Text } from "react-native";

export default function PrimaryButton({
    title,
    loading = false,
    onPress,
}) {
    return (
        <Pressable style={({pressed}) => [
            styles.button,
            pressed && { opacity: 0.7},
            loading && { opacity: 0.6}
        ]}
        disabled={loading}
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
    backgroundColor: "#4f46e5",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  text: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
