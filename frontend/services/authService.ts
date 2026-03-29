import { API_ENDPOINTS } from "../constants/api";
import { getToken } from "../utils/authStorage";
import { handleResponse, UnauthorizedError } from "../utils/apiHandler";

interface LoginResponse {
  token: string;
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

/* ---------------- Auth Header ---------------- */
const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const token = await getToken();
  if (!token) throw new UnauthorizedError();
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

/* ---------------- APIs ---------------- */
export const loginApi = async (email: string, password: string): Promise<LoginResponse> => {
  const response = await fetch(API_ENDPOINTS.login, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim(), password }),
  });
  return handleResponse<LoginResponse>(response, true);
};

export const registerApi = async (email: string, password: string): Promise<RegisterResponse> => {
  const response = await fetch(API_ENDPOINTS.register, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim(), password }),
  });
  return handleResponse<RegisterResponse>(response, true);
};

export const getUserApi = async (): Promise<{ email: string }> => {
  const headers = await getAuthHeaders();
  const response = await fetch(API_ENDPOINTS.user, { headers });
  return handleResponse<{ email: string }>(response);
};

export const getUserStatsApi = async (): Promise<UserStats> => {
  const headers = await getAuthHeaders();
  const response = await fetch(API_ENDPOINTS.userStats, { headers });
  return handleResponse<UserStats>(response);
};