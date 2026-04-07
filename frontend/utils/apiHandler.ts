import { removeToken, removeRefreshToken, getRefreshToken, saveToken, saveRefreshToken } from "./authStorage";
import { router } from "expo-router";

export class UnauthorizedError extends Error {
  constructor() {
    super("Session expired. Please log in again.");
  }
}

/**
 * FIX: Replace the boolean flag with a shared promise.
 *
 * Old behaviour: when `isRefreshing = true`, every concurrent 401 caller got
 * `null` back immediately and threw UnauthorizedError, logging the user out
 * even though the refresh was still in flight and about to succeed.
 *
 * New behaviour: the first caller starts the refresh and stores the promise.
 * Every subsequent concurrent caller awaits the *same* promise, so they all
 * get the new token once the single refresh completes — no race, no false logouts.
 */
let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
  // If a refresh is already in flight, share it — don't fire a second one
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async (): Promise<string | null> => {
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
      // Clear the shared promise so the next genuine 401 triggers a fresh refresh
      refreshPromise = null;
    }
  })();

  return refreshPromise;
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
    // If refresh succeeded, the caller should retry with the new token from storage.
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