import { useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Colors } from "../constants/colors";

const MILESTONES = [
  { days: 7,    emoji: "🌱", title: "7 Day Streak!",    message: "One week strong. You're building something real." },
  { days: 21,   emoji: "🔥", title: "21 Day Streak!",   message: "Three weeks in. This is becoming a true habit." },
  { days: 66,   emoji: "⚡", title: "66 Day Streak!",   message: "Science says habits are automatic at 66 days. You did it." },
  { days: 100,  emoji: "🏆", title: "100 Day Streak!",  message: "A century of consistency. That's extraordinary." },
  { days: 180,  emoji: "💪", title: "180 Day Streak!",  message: "Half a year. You are what you repeatedly do." },
  { days: 365,  emoji: "🌟", title: "One Year Streak!", message: "365 days. You've changed your life. Seriously." },
  { days: 500,  emoji: "🚀", title: "500 Day Streak!",  message: "500 days. You're in a league of your own." },
  { days: 730,  emoji: "💎", title: "Two Year Streak!", message: "Two years of showing up. Absolutely legendary." },
  { days: 1000, emoji: "🔱", title: "1000 Day Streak!", message: "1000 days. There are no more words." },
];

interface Props {
  streak: number;
  habitTitle: string;
  visible: boolean;
  onDismiss: () => void;
}

export default function CelebrationModal({ streak, habitTitle, visible, onDismiss }: Props) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const milestone = MILESTONES.find((m) => m.days === streak);

  useEffect(() => {
    if (visible && milestone) {
      // Haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Spring animation
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (!milestone) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          {/* Confetti dots */}
          <View style={styles.confettiRow}>
            {["🎉", "✨", "🎊", "⭐", "🎉"].map((c, i) => (
              <Text key={i} style={styles.confetti}>{c}</Text>
            ))}
          </View>

          <Text style={styles.emoji}>{milestone.emoji}</Text>
          <Text style={styles.title}>{milestone.title}</Text>
          <Text style={styles.habitName}>{habitTitle}</Text>
          <Text style={styles.message}>{milestone.message}</Text>

          <Pressable style={styles.btn} onPress={onDismiss}>
            <Text style={styles.btnText}>Awesome! 🙌</Text>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  confettiRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  confetti: {
    fontSize: 20,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 6,
  },
  habitName: {
    fontSize: 14,
    color: Colors.subtext,
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    fontSize: 15,
    color: Colors.text,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  btnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});