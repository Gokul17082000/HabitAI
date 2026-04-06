import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "auth_token";
const REFRESH_TOKEN_KEY = "refresh_token";

export const saveToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch (e) {
    console.error("Failed to save token", e);
  }
};

export const getToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (e) {
    return null;
  }
};

export const removeToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch (e) {
    console.error("Failed to remove token", e);
  }
};

export const saveRefreshToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
  } catch (e) {
    console.error("Failed to save refresh token", e);
  }
};

export const getRefreshToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  } catch (e) {
    return null;
  }
};

export const removeRefreshToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch (e) {
    console.error("Failed to remove refresh token", e);
  }
};