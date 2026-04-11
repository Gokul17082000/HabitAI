/**
 * SECURITY FIX: Tokens were previously stored in AsyncStorage, which on Android
 * maps to unencrypted SharedPreferences — readable in plain text on rooted
 * devices or via adb backup.
 *
 * expo-secure-store uses:
 *   iOS  → Keychain Services (hardware-backed encryption)
 *   Android → EncryptedSharedPreferences (AES-256, hardware-backed on API 23+)
 *
 * Install: npx expo install expo-secure-store
 *
 * API is intentionally identical to the old AsyncStorage wrapper so no call
 * sites need to change — only this file changes.
 */
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "auth_token";
const REFRESH_TOKEN_KEY = "refresh_token";

/**
 * SecureStore is not available on web — fall back to AsyncStorage there.
 * On native (iOS/Android) always use SecureStore.
 */
const isWeb = Platform.OS === "web";

const secureSet = async (key: string, value: string): Promise<void> => {
  if (isWeb) {
    await AsyncStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

const secureGet = async (key: string): Promise<string | null> => {
  if (isWeb) {
    return AsyncStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
};

const secureDelete = async (key: string): Promise<void> => {
  if (isWeb) {
    await AsyncStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
};

export const saveToken = async (token: string): Promise<void> => {
  try {
    await secureSet(TOKEN_KEY, token);
  } catch (e) {
    console.error("Failed to save token", e);
  }
};

export const getToken = async (): Promise<string | null> => {
  try {
    return await secureGet(TOKEN_KEY);
  } catch (e) {
    return null;
  }
};

export const removeToken = async (): Promise<void> => {
  try {
    await secureDelete(TOKEN_KEY);
  } catch (e) {
    console.error("Failed to remove token", e);
  }
};

export const saveRefreshToken = async (token: string): Promise<void> => {
  try {
    await secureSet(REFRESH_TOKEN_KEY, token);
  } catch (e) {
    console.error("Failed to save refresh token", e);
  }
};

export const getRefreshToken = async (): Promise<string | null> => {
  try {
    return await secureGet(REFRESH_TOKEN_KEY);
  } catch (e) {
    return null;
  }
};

export const removeRefreshToken = async (): Promise<void> => {
  try {
    await secureDelete(REFRESH_TOKEN_KEY);
  } catch (e) {
    console.error("Failed to remove refresh token", e);
  }
};