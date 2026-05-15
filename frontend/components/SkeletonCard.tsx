import { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { AppColors } from "../constants/colors";

export default function SkeletonCard() {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const shimmer = useRef(new Animated.Value(-260)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmer, {
        toValue: 360,
        duration: 1400,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const Highlight = () => (
    <Animated.View style={[styles.highlight, { transform: [{ translateX: shimmer }] }]} />
  );

  return (
    <View style={styles.card}>
      <View style={styles.left}>
        <View style={[styles.bar, styles.titleBar]}><Highlight /></View>
        <View style={[styles.bar, styles.metaBar]}><Highlight /></View>
        <View style={[styles.bar, styles.timeBar]}><Highlight /></View>
      </View>
      <View style={[styles.bar, styles.badge]}><Highlight /></View>
    </View>
  );
}

const makeStyles = (c: AppColors, isDark: boolean) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.card,
      padding: 16,
      borderRadius: 16,
      marginBottom: 12,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
    left: {
      flex: 1,
      gap: 10,
      marginRight: 16,
    },
    bar: {
      backgroundColor: c.border,
      borderRadius: 8,
      overflow: "hidden",
    },
    highlight: {
      position: "absolute",
      top: 0,
      bottom: 0,
      width: 110,
      backgroundColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)",
    },
    titleBar: { height: 15, width: "62%" },
    metaBar:  { height: 11, width: "40%" },
    timeBar:  { height: 11, width: "32%" },
    badge:    { width: 76, height: 30, borderRadius: 10 },
  });
