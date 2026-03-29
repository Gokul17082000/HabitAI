import { removeToken } from "./authStorage";
import { router } from "expo-router";

export class UnauthorizedError extends Error {
  constructor() {
    super("Session expired. Please log in again.");
  }
}

export const handleResponse = async <T>(
  response: Response,
  skipAuthRedirect = false
): Promise<T> => {
  if (response.status === 401 && !skipAuthRedirect) {
    await removeToken();
    router.replace("/");
    throw new UnauthorizedError();
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) return undefined as T;

  const data = JSON.parse(text);
  if (!response.ok) {
    const message = data.message
      || (data.errors && data.errors[0])
      || "Something went wrong";
    throw new Error(message);
  }
  return data as T;
};