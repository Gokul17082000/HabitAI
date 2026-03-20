import { Platform } from "react-native";

const getBaseUrl = (): string => {
  if (__DEV__) {
    switch (Platform.OS) {
      case "android":
        return "http://192.168.1.2:8080";
      case "ios":
        return "http://192.168.1.2:8080";
      default:
        return "http://localhost:8080";
    }
  }
  return "https://your-production-url.com";
};

export const BASE_URL = getBaseUrl();

export const API_ENDPOINTS = {
  login: `${BASE_URL}/auth/login`,
  register: `${BASE_URL}/auth/register`,
  user: `${BASE_URL}/user`,
  userStats: `${BASE_URL}/user/stats`,
  pushToken: `${BASE_URL}/user/push-token`,
  habits: `${BASE_URL}/habits`,
};