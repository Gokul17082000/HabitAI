import { API_ENDPOINTS } from "../constants/api";
import { handleResponse } from "../utils/apiHandler";
import { getToken } from "../utils/authStorage";
import { CreateHabitRequest } from "../types/habit";

export interface InsightResponse {
  insight: string;
}

const buildHeaders = async (): Promise<Record<string, string>> => {
  const token = await getToken();
  if (!token) throw new Error("Session expired. Please log in again.");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

export const suggestHabitsApi = async (
  goal: string
): Promise<CreateHabitRequest[]> => {
  const headers = await buildHeaders();
  const response = await fetch(`${API_ENDPOINTS.ai}/suggest`, {
    method: "POST",
    headers,
    body: JSON.stringify({ goal }),
  });
  return handleResponse<CreateHabitRequest[]>(response);
};

export const getInsightsApi = async (): Promise<InsightResponse> => {
  const headers = await buildHeaders();
  const response = await fetch(`${API_ENDPOINTS.ai}/insights`, { headers });
  return handleResponse<InsightResponse>(response);
};