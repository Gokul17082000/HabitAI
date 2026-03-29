import { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { Colors } from "../constants/colors";

export default function SkeletonCard() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.card, { opacity }]}>
      {/* Left */}
      <View style={styles.left}>
        <View style={styles.titleBar} />
        <View style={styles.metaBar} />
        <View style={styles.timeBar} />
      </View>
      {/* Right */}
      <View style={styles.badge} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  left: {
    flex: 1,
    gap: 8,
  },
  titleBar: {
    height: 16,
    width: "60%",
    backgroundColor: Colors.border,
    borderRadius: 8,
  },
  metaBar: {
    height: 12,
    width: "40%",
    backgroundColor: Colors.border,
    borderRadius: 8,
  },
  timeBar: {
    height: 12,
    width: "30%",
    backgroundColor: Colors.border,
    borderRadius: 8,
  },
  badge: {
    width: 70,
    height: 28,
    backgroundColor: Colors.border,
    borderRadius: 10,
  },
});