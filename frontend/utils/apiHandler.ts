import { removeToken, removeRefreshToken, getRefreshToken, saveToken, saveRefreshToken } from "./authStorage";
import { router } from "expo-router";

export class UnauthorizedError extends Error {
  constructor() {
    super("Session expired. Please log in again.");
  }
}

/**
 * Attempts to refresh the access token using the stored refresh token.
 * Returns the new access token on success, or null if refresh fails.
 * A module-level flag prevents multiple simultaneous refresh races.
 */
let isRefreshing = false;
const refreshAccessToken = async (): Promise<string | null> => {
  if (isRefreshing) return null;
  isRefreshing = true;
  try {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return null;

    const { API_ENDPOINTS } = await import("../constants/api");
    const response = await fetch(API_ENDPOINTS.refresh, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    await saveToken(data.accessToken);
    await saveRefreshToken(data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  } finally {
    isRefreshing = false;
  }
};

/**
 * Central response handler for all API calls.
 * On 401: attempts a silent token refresh before redirecting to login.
 * skipAuthRedirect=true is used only by /auth/* endpoints that must not loop.
 */
export const handleResponse = async <T>(
  response: Response,
  skipAuthRedirect = false
): Promise<T> => {
  if (response.status === 401 && !skipAuthRedirect) {
    const newToken = await refreshAccessToken();
    if (!newToken) {
      // Refresh failed — clear all tokens and send user to login
      await removeToken();
      await removeRefreshToken();
      router.replace("/");
    }
    // Either way, throw so the original call fails cleanly.
    // If refresh succeeded, the next buildAuthHeaders call will use the new token.
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
