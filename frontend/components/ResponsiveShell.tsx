import React from "react";
import { View, StyleSheet, useWindowDimensions, Platform } from "react-native";
import { useTheme } from "../context/ThemeContext";

/**
 * Centers the whole app into a phone-width column on wide (desktop) web viewports,
 * so the mobile-first UI reads as an app instead of stretching edge-to-edge.
 *
 * - Native apps (iOS/Android): always full-bleed — never constrained.
 * - Mobile web: viewport width < MAX_WIDTH, so the column fills the screen (no change).
 * - Desktop web: content is capped at MAX_WIDTH, centered, with a subtle backdrop
 *   and hairline side borders framing the column.
 */
const MAX_WIDTH = 640;

export default function ResponsiveShell({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();

  const isConstrained = Platform.OS === "web" && width > MAX_WIDTH;

  return (
    <View
      style={[
        styles.outer,
        { backgroundColor: isConstrained ? colors.border : colors.background },
      ]}
    >
      <View
        style={[
          styles.inner,
          isConstrained && {
            maxWidth: MAX_WIDTH,
            borderLeftWidth: StyleSheet.hairlineWidth,
            borderRightWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    alignItems: "center",
  },
  inner: {
    flex: 1,
    width: "100%",
  },
});
