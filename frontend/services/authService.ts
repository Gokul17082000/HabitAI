import { API_ENDPOINTS } from "../constants/api";
import { getToken } from "../utils/authStorage";
import { handleResponse } from "../utils/apiHandler";

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

export const loginApi = async (email: string, password: string): Promise<LoginResponse> => {
  const response = await fetch(API_ENDPOINTS.login, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim(), password }),
  });
  return handleResponse<LoginResponse>(response);
};

export const registerApi = async (email: string, password: string): Promise<RegisterResponse> => {
  const response = await fetch(API_ENDPOINTS.register, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim(), password }),
  });
  return handleResponse<RegisterResponse>(response);
};

export const getUserApi = async (): Promise<{ email: string }> => {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");

  const response = await fetch(API_ENDPOINTS.user, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  return handleResponse<{ email: string }>(response);
};

export const getUserStatsApi = async (): Promise<UserStats> => {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");

  const response = await fetch(API_ENDPOINTS.userStats, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  return handleResponse<UserStats>(response);
};
