import { removeToken } from "./authStorage";
import { router } from "expo-router";

export const handleResponse = async <T>(response: Response): Promise<T> => {
  if (response.status === 401) {
    await removeToken();
    router.replace("/");
    throw new Error("Session expired. Please log in again.");
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
  }
  return data as T;
};