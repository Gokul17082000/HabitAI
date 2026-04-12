import { API_ENDPOINTS } from "../constants/api";
import { buildAuthHeaders, handleResponse, retryGet, retryPost } from "../utils/apiHandler";
import {
  HabitDTO,
  HabitResponse,
  ActivityItem,
  HabitStreakResponse,
  CreateHabitRequest,
  UpdateHabitRequest,
} from "../types/habit";

export const getAllHabitsApi = async (): Promise<HabitDTO[]> => {
  const url = API_ENDPOINTS.habits + "/all";
  const headers = await buildAuthHeaders();
  const response = await fetch(url, { headers });
  return handleResponse<HabitDTO[]>(response, retryGet(url));
};

export const getHabitsForDateApi = async (date: string): Promise<HabitResponse[]> => {
  const url = `${API_ENDPOINTS.habits}?date=${date}`;
  const headers = await buildAuthHeaders();
  const response = await fetch(url, { headers });
  return handleResponse<HabitResponse[]>(response, retryGet(url));
};

export const getHabitByIdApi = async (habitId: number): Promise<HabitDTO> => {
  const url = `${API_ENDPOINTS.habits}/${habitId}`;
  const headers = await buildAuthHeaders();
  const response = await fetch(url, { headers });
  return handleResponse<HabitDTO>(response, retryGet(url));
};

export const createHabitApi = async (request: CreateHabitRequest): Promise<HabitDTO> => {
  const url = API_ENDPOINTS.habits;
  const body = JSON.stringify(request);
  const headers = await buildAuthHeaders();
  const response = await fetch(url, { method: "POST", headers, body });
  return handleResponse<HabitDTO>(response, retryPost(url, "POST", body));
};

export const updateHabitApi = async (
  habitId: number,
  request: UpdateHabitRequest
): Promise<void> => {
  const url = `${API_ENDPOINTS.habits}/${habitId}`;
  const body = JSON.stringify(request);
  const headers = await buildAuthHeaders();
  const response = await fetch(url, { method: "PUT", headers, body });
  await handleResponse<void>(response, retryPost(url, "PUT", body));
};

export const deleteHabitApi = async (habitId: number): Promise<void> => {
  const url = `${API_ENDPOINTS.habits}/${habitId}`;
  const headers = await buildAuthHeaders();
  const response = await fetch(url, { method: "DELETE", headers });
  await handleResponse<void>(response, retryPost(url, "DELETE"));
};

export const logHabitApi = async (
  habitId: number,
  date: string,
  habitStatus: string,
  currentCount: number = 0,
  note?: string
): Promise<void> => {
  const url = `${API_ENDPOINTS.habits}/${habitId}/log`;
  const body = JSON.stringify({ date, habitStatus, currentCount, note });
  const headers = await buildAuthHeaders();
  const response = await fetch(url, { method: "POST", headers, body });
  await handleResponse<void>(response, retryPost(url, "POST", body));
};

export const getHabitStreakApi = async (habitId: number): Promise<HabitStreakResponse> => {
  const url = `${API_ENDPOINTS.habits}/${habitId}/streak`;
  const headers = await buildAuthHeaders();
  const response = await fetch(url, { headers });
  return handleResponse<HabitStreakResponse>(response, retryGet(url));
};

export const getLongestStreakApi = async (habitId: number): Promise<HabitStreakResponse> => {
  const url = `${API_ENDPOINTS.habits}/${habitId}/streak/longest`;
  const headers = await buildAuthHeaders();
  const response = await fetch(url, { headers });
  return handleResponse<HabitStreakResponse>(response, retryGet(url));
};

export const getHabitActivityApi = async (
  habitId: number,
  startDate: string,
  endDate: string
): Promise<ActivityItem[]> => {
  const url = `${API_ENDPOINTS.habits}/${habitId}/activity?startDate=${startDate}&endDate=${endDate}`;
  const headers = await buildAuthHeaders();
  const response = await fetch(url, { headers });
  return handleResponse<ActivityItem[]>(response, retryGet(url));
};

export const pauseHabitApi = async (habitId: number, days: number): Promise<void> => {
  const url = `${API_ENDPOINTS.habits}/${habitId}/pause`;
  const body = JSON.stringify({ days });
  const headers = await buildAuthHeaders();
  const response = await fetch(url, { method: "PATCH", headers, body });
  await handleResponse<void>(response, retryPost(url, "PATCH", body));
};

export const resumeHabitApi = async (habitId: number): Promise<void> => {
  const url = `${API_ENDPOINTS.habits}/${habitId}/resume`;
  const headers = await buildAuthHeaders();
  const response = await fetch(url, { method: "PATCH", headers });
  await handleResponse<void>(response, retryPost(url, "PATCH"));
};

export const getArchivedHabitsApi = async (): Promise<HabitDTO[]> => {
  const url = API_ENDPOINTS.habits + "/archived";
  const headers = await buildAuthHeaders();
  const response = await fetch(url, { headers });
  return handleResponse<HabitDTO[]>(response, retryGet(url));
};

export const archiveHabitApi = async (habitId: number): Promise<void> => {
  const url = `${API_ENDPOINTS.habits}/${habitId}/archive`;
  const headers = await buildAuthHeaders();
  const response = await fetch(url, { method: "PATCH", headers });
  await handleResponse<void>(response, retryPost(url, "PATCH"));
};

export const unarchiveHabitApi = async (habitId: number): Promise<void> => {
  const url = `${API_ENDPOINTS.habits}/${habitId}/unarchive`;
  const headers = await buildAuthHeaders();
  const response = await fetch(url, { method: "PATCH", headers });
  await handleResponse<void>(response, retryPost(url, "PATCH"));
};

/**
 * Returns a map of date → status[] for every day in the given month.
 * Used by the calendar screen to colour each day cell.
 * year: full year (e.g. 2026), month: 1-based (1 = January).
 */
export const getMonthSummaryApi = async (
  year: number,
  month: number
): Promise<Record<string, string[]>> => {
  const url = `${API_ENDPOINTS.habitSummary}?year=${year}&month=${month}`;
  const headers = await buildAuthHeaders();
  const response = await fetch(url, { headers });
  return handleResponse<Record<string, string[]>>(response, retryGet(url));
};