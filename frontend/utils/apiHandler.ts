import { removeToken, removeRefreshToken, getRefreshToken, saveToken, saveRefreshToken } from "./authStorage";
import { router } from "expo-router";

export class UnauthorizedError extends Error {
  constructor() {
    super("Session expired. Please log in again.");
  }
}

/**
 * Shared refresh promise so concurrent 401s don't each fire their own refresh.
 * The first caller starts the refresh; every subsequent caller awaits the same promise.
 */
let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
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
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

/**
 * Central response handler for all API calls.
 *
 * FIX: On a 401, we now retry the original request with the new token if
 * the refresh succeeds, instead of always throwing UnauthorizedError.
 * Previously the refresh could succeed but the caller still got an error,
 * causing spurious logouts.
 *
 * @param response    - The initial fetch response.
 * @param retryFn     - A function that replays the original request with a
 *                      fresh token. Pass undefined for auth endpoints that
 *                      should never be retried (skipAuthRedirect behaviour).
 */
export const handleResponse = async <T>(
  response: Response,
  retryFn?: (newToken: string) => Promise<Response>
): Promise<T> => {
  if (response.status === 401 && retryFn) {
    const newToken = await refreshAccessToken();

    if (newToken) {
      // Refresh succeeded — replay the original request with the new token
      const retried = await retryFn(newToken);
      // Parse the retried response (no further retry on another 401)
      return parseResponse<T>(retried);
    }

    // Refresh failed — clear tokens and send user to login
    await removeToken();
    await removeRefreshToken();
    router.replace("/");
    throw new UnauthorizedError();
  }

  return parseResponse<T>(response);
};

/**
 * Parses a fetch Response into T. Throws with the server's error message on
 * non-OK responses.
 */
const parseResponse = async <T>(response: Response): Promise<T> => {
  if (response.status === 204) return undefined as T;

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
 * Builds Authorization + Content-Type headers from the stored access token.
 * Also returns a retryFn that rebuilds the same request with a new token,
 * for use with handleResponse's auto-retry mechanism.
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

/**
 * Helper: builds a retryFn for a simple GET/DELETE with no body.
 * Usage: handleResponse(response, retryGet(url))
 */
export const retryGet = (url: string) => async (newToken: string): Promise<Response> =>
  fetch(url, {
    headers: {
      Authorization: `Bearer ${newToken}`,
      "Content-Type": "application/json",
    },
  });

/**
 * Helper: builds a retryFn for a request with a JSON body.
 * Usage: handleResponse(response, retryPost(url, method, body))
 */
export const retryPost = (
  url: string,
  method: string,
  body?: string
) => async (newToken: string): Promise<Response> =>
  fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${newToken}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body } : {}),
  });