import { API_ENDPOINTS } from "../constants/api";
import { buildAuthHeaders, handleResponse } from "../utils/apiHandler";
import {
  HabitDTO,
  HabitResponse,
  ActivityItem,
  HabitStreakResponse,
  CreateHabitRequest,
  UpdateHabitRequest,
} from "../types/habit";

/* ---------------- Habit APIs ---------------- */

export const getAllHabitsApi = async (): Promise<HabitDTO[]> => {
  const headers = await buildAuthHeaders();
  const response = await fetch(API_ENDPOINTS.habits + "/all", { headers });
  return handleResponse<HabitDTO[]>(response);
};

export const getHabitsForDateApi = async (date: string): Promise<HabitResponse[]> => {
  const headers = await buildAuthHeaders();
  const response = await fetch(`${API_ENDPOINTS.habits}?date=${date}`, { headers });
  return handleResponse<HabitResponse[]>(response);
};

export const getHabitByIdApi = async (habitId: number): Promise<HabitDTO> => {
  const headers = await buildAuthHeaders();
  const response = await fetch(`${API_ENDPOINTS.habits}/${habitId}`, { headers });
  return handleResponse<HabitDTO>(response);
};

export const createHabitApi = async (request: CreateHabitRequest): Promise<HabitDTO> => {
  const headers = await buildAuthHeaders();
  const response = await fetch(API_ENDPOINTS.habits, {
    method: "POST",
    headers,
    body: JSON.stringify(request),
  });
  return handleResponse<HabitDTO>(response);
};

export const updateHabitApi = async (
  habitId: number,
  request: UpdateHabitRequest
): Promise<void> => {
  const headers = await buildAuthHeaders();
  const response = await fetch(`${API_ENDPOINTS.habits}/${habitId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(request),
  });
  await handleResponse<void>(response);
};

export const deleteHabitApi = async (habitId: number): Promise<void> => {
  const headers = await buildAuthHeaders();
  const response = await fetch(`${API_ENDPOINTS.habits}/${habitId}`, {
    method: "DELETE",
    headers,
  });
  await handleResponse<void>(response);
};

export const logHabitApi = async (
  habitId: number,
  date: string,
  habitStatus: string,
  currentCount: number = 0
): Promise<void> => {
  const headers = await buildAuthHeaders();
  const response = await fetch(`${API_ENDPOINTS.habits}/${habitId}/log`, {
    method: "POST",
    headers,
    body: JSON.stringify({ date, habitStatus, currentCount }),
  });
  await handleResponse<void>(response);
};

export const getHabitStreakApi = async (habitId: number): Promise<HabitStreakResponse> => {
  const headers = await buildAuthHeaders();
  const response = await fetch(`${API_ENDPOINTS.habits}/${habitId}/streak`, { headers });
  return handleResponse<HabitStreakResponse>(response);
};

export const getLongestStreakApi = async (habitId: number): Promise<HabitStreakResponse> => {
  const headers = await buildAuthHeaders();
  const response = await fetch(`${API_ENDPOINTS.habits}/${habitId}/streak/longest`, { headers });
  return handleResponse<HabitStreakResponse>(response);
};

export const getHabitActivityApi = async (
  habitId: number,
  startDate: string,
  endDate: string
): Promise<ActivityItem[]> => {
  const headers = await buildAuthHeaders();
  const response = await fetch(
    `${API_ENDPOINTS.habits}/${habitId}/activity?startDate=${startDate}&endDate=${endDate}`,
    { headers }
  );
  return handleResponse<ActivityItem[]>(response);
};

export const pauseHabitApi = async (habitId: number, days: number): Promise<void> => {
  const headers = await buildAuthHeaders();
  const response = await fetch(`${API_ENDPOINTS.habits}/${habitId}/pause`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ days }),
  });
  await handleResponse<void>(response);
};

export const resumeHabitApi = async (habitId: number): Promise<void> => {
  const headers = await buildAuthHeaders();
  const response = await fetch(`${API_ENDPOINTS.habits}/${habitId}/resume`, {
    method: "PATCH",
    headers,
  });
  await handleResponse<void>(response);
};
