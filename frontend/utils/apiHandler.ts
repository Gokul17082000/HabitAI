import { removeToken } from "./authStorage";
import { router } from "expo-router";

export class UnauthorizedError extends Error {
  constructor() {
    super("Session expired. Please log in again.");
  }
}

export const handleResponse = async <T>(response: Response): Promise<T> => {
  if (response.status === 401) {
    await removeToken();
    router.replace("/");
    throw new UnauthorizedError();
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
  }
  return data as T;
};