import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { setOnboardingComplete } from "../utils/onboardingStorage";
import { Colors } from "../constants/colors";
import { StatusBar } from "react-native";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    id: 1,
    emoji: "🧠",
    title: "Welcome to HabitAI",
    subtitle: "Build better habits with the power of AI-driven tracking and insights.",
  },
  {
    id: 2,
    emoji: "📊",
    title: "Track Your Progress",
    subtitle: "Visualize your consistency with GitHub-style heatmaps and detailed activity graphs.",
  },
  {
    id: 3,
    emoji: "🔥",
    title: "Stay Consistent",
    subtitle: "Build streaks, get reminders and never miss a habit again.",
  },
];

export default function OnboardingScreen() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = async () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      await setOnboardingComplete();
      router.replace("/");
    }
  };

  const handleSkip = async () => {
    await setOnboardingComplete();
    router.replace("/");
  };

  const slide = SLIDES[currentSlide];

  return (
    <View style={styles.container}>
      {/* Skip button */}
      {currentSlide < SLIDES.length - 1 && (
        <Pressable onPress={handleSkip} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      )}

      {/* Slide content */}
      <View style={styles.slideContainer}>
        <Text style={styles.emoji}>{slide.emoji}</Text>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.subtitle}>{slide.subtitle}</Text>
      </View>

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === currentSlide && styles.dotActive,
            ]}
          />
        ))}
      </View>

      {/* Next / Get Started button */}
      <Pressable
        style={({ pressed }) => [
          styles.nextBtn,
          pressed && { opacity: 0.8 },
        ]}
        onPress={handleNext}
      >
        <Text style={styles.nextText}>
          {currentSlide === SLIDES.length - 1 ? "Get Started 🚀" : "Next →"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: StatusBar.currentHeight ?? 40,
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: "space-between",
  },
  skipBtn: {
    alignSelf: "flex-end",
    padding: 12,
  },
  skipText: {
    color: Colors.subtext,
    fontSize: 15,
    fontWeight: "500",
  },
  slideContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emoji: {
    fontSize: 100,
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.subtext,
    textAlign: "center",
    lineHeight: 24,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotActive: {
    width: 24,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  nextBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  nextText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
});