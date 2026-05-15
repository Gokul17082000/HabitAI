import { useRef } from "react";
import { Pressable, StyleSheet, Text, Animated } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { AppColors } from "../constants/colors";

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
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 60, bounciness: 0 }).start();

  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 60, bounciness: 6 }).start();

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale }] }, (loading || disabled) && styles.wrapperDisabled]}>
      <Pressable
        style={styles.button}
        disabled={loading || disabled}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <Text style={styles.text}>
          {loading ? "Please wait..." : title}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    wrapper: {
      marginTop: 10,
      borderRadius: 12,
      shadowColor: c.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.28,
      shadowRadius: 8,
      elevation: 4,
    },
    wrapperDisabled: {
      opacity: 0.6,
      shadowOpacity: 0,
      elevation: 0,
    },
    button: {
      backgroundColor: c.primary,
      paddingVertical: 15,
      borderRadius: 12,
      alignItems: "center",
    },
    text: {
      color: c.white,
      fontSize: 16,
      fontWeight: "600",
      letterSpacing: 0.2,
    },
  });
