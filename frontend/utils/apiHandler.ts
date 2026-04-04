import { removeToken } from "./authStorage";
import { router } from "expo-router";

export class UnauthorizedError extends Error {
  constructor() {
    super("Session expired. Please log in again.");
  }
}

/**
 * Central response handler for all API calls.
 * Handles 401 redirect, 204 no-content, JSON parsing and error extraction.
 * skipAuthRedirect=true is used only by /auth/* endpoints that must not loop.
 */
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
    const message =
      data.message || (data.errors && data.errors[0]) || "Something went wrong";
    throw new Error(message);
  }
  return data as T;
};

/**
 * Builds the Authorization + Content-Type headers from the stored token.
 * Throws UnauthorizedError (no redirect) if no token found — the caller's
 * handleResponse will do the redirect when the server responds 401.
 */
export const buildAuthHeaders = async (): Promise<Record<string, string>> => {
  const { getToken } = await import("./authStorage");
  const token = await getToken();
  if (!token) throw new UnauthorizedError();
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};
