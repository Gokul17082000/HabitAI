import { useRef } from "react";
import { Pressable, Text, StyleSheet, Animated } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { AppColors } from "../constants/colors";

interface ChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
  disabled?: boolean;
}

export default function Chip({ label, active, onPress, disabled = false }: ChipProps) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.93, useNativeDriver: true, speed: 60, bounciness: 0 }).start();

  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 60, bounciness: 6 }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        style={[
          styles.chip,
          active && styles.chipActive,
          disabled && styles.chipDisabled,
        ]}
      >
        <Text style={[styles.text, active && styles.textActive]}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    chip: {
      borderWidth: 1.5,
      borderColor: c.border,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 7,
      backgroundColor: c.card,
    },
    chipActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    chipDisabled: {
      opacity: 0.4,
    },
    text: {
      fontSize: 13,
      color: c.subtext,
      fontWeight: "500",
    },
    textActive: {
      color: c.white,
      fontWeight: "700",
    },
  });
