import { API_ENDPOINTS } from "../constants/api";
import { buildAuthHeaders, handleResponse, retryGet, UnauthorizedError } from "../utils/apiHandler";

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

interface RegisterResponse {
  message: string;
}

export interface TopHabit {
  title: string;
  completions: number;
  consistencyPercent: number;
}

export interface UserStats {
  totalHabits: number;
  totalCompleted: number;
  totalMissed: number;
  totalDaysTracked: number;
  overallConsistency: number;
  currentStreak: number;
  longestStreak: number;
  topHabits: TopHabit[];
  memberSince: string;
}

/* ---------------- Auth APIs (no retry — these are the auth routes themselves) ---------------- */

export const loginApi = async (
  email: string,
  password: string
): Promise<LoginResponse> => {
  const response = await fetch(API_ENDPOINTS.login, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });
  // No retryFn — auth endpoints must not trigger a refresh loop
  return handleResponse<LoginResponse>(response);
};

export const registerApi = async (
  email: string,
  password: string
): Promise<RegisterResponse> => {
  const response = await fetch(API_ENDPOINTS.register, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });
  return handleResponse<RegisterResponse>(response);
};

export const refreshTokenApi = async (
  refreshToken: string
): Promise<LoginResponse> => {
  const response = await fetch(API_ENDPOINTS.refresh, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  return handleResponse<LoginResponse>(response);
};

/* ---------------- Authenticated user APIs ---------------- */

export const getUserApi = async (): Promise<{ email: string }> => {
  const url = API_ENDPOINTS.user;
  const headers = await buildAuthHeaders();
  const response = await fetch(url, { headers });
  return handleResponse<{ email: string }>(response, retryGet(url));
};

export const getUserStatsApi = async (): Promise<UserStats> => {
  const url = API_ENDPOINTS.userStats;
  const headers = await buildAuthHeaders();
  const response = await fetch(url, { headers });
  return handleResponse<UserStats>(response, retryGet(url));
};

export const getYearPixelsApi = async (): Promise<Record<string, string>> => {
  const url = API_ENDPOINTS.yearPixels;
  const headers = await buildAuthHeaders();
  const response = await fetch(url, { headers });
  return handleResponse<Record<string, string>>(response, retryGet(url));
};

/**
 * Calls POST /auth/logout to invalidate all server-side refresh tokens,
 * then clears both tokens from secure storage locally.
 * Always clears local storage even if the server call fails — the user
 * is logged out on this device regardless.
 */
export const logoutApi = async (): Promise<void> => {
  try {
    const headers = await buildAuthHeaders();
    await fetch(API_ENDPOINTS.logout, { method: "POST", headers });
    // No retry on logout failure — local cleanup always happens below
  } catch {
    // Best-effort server call; local cleanup is what matters
  } finally {
    const { removeToken, removeRefreshToken } = await import("../utils/authStorage");
    await removeToken();
    await removeRefreshToken();
  }
};