import { API_ENDPOINTS } from "../constants/api";
import { buildAuthHeaders, handleResponse } from "../utils/apiHandler";
import { CreateHabitRequest } from "../types/habit";

export interface InsightResponse {
  insight: string;
}

export const suggestHabitsApi = async (
  goal: string
): Promise<CreateHabitRequest[]> => {
  const headers = await buildAuthHeaders();
  const response = await fetch(`${API_ENDPOINTS.ai}/suggest`, {
    method: "POST",
    headers,
    body: JSON.stringify({ goal }),
  });
  return handleResponse<CreateHabitRequest[]>(response);
};

export const getInsightsApi = async (): Promise<InsightResponse> => {
  const headers = await buildAuthHeaders();
  const response = await fetch(`${API_ENDPOINTS.ai}/insights`, { headers });
  return handleResponse<InsightResponse>(response);
};