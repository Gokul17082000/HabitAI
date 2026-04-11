import { Platform } from "react-native";
import Constants from "expo-constants";

const getBaseUrl = (): string => {
  if (__DEV__) {
    if (Platform.OS === "web") {
      return "http://localhost:8080";
    }
    // Read from app.json > extra.devApiHost so each developer can override
    // their local IP in app.json without touching source files.
    const host = Constants.expoConfig?.extra?.devApiHost ?? "192.168.1.2";
    return `http://${host}:8080`;
  }
  return "https://habitai-knma.onrender.com";
};

export const BASE_URL = getBaseUrl();

export const API_ENDPOINTS = {
  login: `${BASE_URL}/auth/login`,
  register: `${BASE_URL}/auth/register`,
  refresh: `${BASE_URL}/auth/refresh`,
  logout: `${BASE_URL}/auth/logout`,
  user: `${BASE_URL}/user`,
  userStats: `${BASE_URL}/user/stats`,
  pushToken: `${BASE_URL}/user/push-token`,
  habits: `${BASE_URL}/habits`,
  habitSummary: `${BASE_URL}/habits/summary`,
  ai: `${BASE_URL}/ai`,
  yearPixels: `${BASE_URL}/user/year-pixels`,
  weeklyReview: `${BASE_URL}/user/weekly-review`,
  streakFreeze: `${BASE_URL}/user/streak-freeze`,
  streakFreezeUse: `${BASE_URL}/user/streak-freeze/use`,
};