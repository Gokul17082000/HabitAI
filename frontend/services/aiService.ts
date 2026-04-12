import { API_ENDPOINTS } from "../constants/api";
import { buildAuthHeaders, handleResponse, retryGet, retryPost } from "../utils/apiHandler";
import { CreateHabitRequest } from "../types/habit";

export interface InsightResponse {
  insight: string;
}

export const suggestHabitsApi = async (
  goal: string
): Promise<CreateHabitRequest[]> => {
  const url = `${API_ENDPOINTS.ai}/suggest`;
  const body = JSON.stringify({ goal });
  const headers = await buildAuthHeaders();
  const response = await fetch(url, { method: "POST", headers, body });
  return handleResponse<CreateHabitRequest[]>(response, retryPost(url, "POST", body));
};

export const getInsightsApi = async (): Promise<InsightResponse> => {
  const url = `${API_ENDPOINTS.ai}/insights`;
  const headers = await buildAuthHeaders();
  const response = await fetch(url, { headers });
  return handleResponse<InsightResponse>(response, retryGet(url));
};