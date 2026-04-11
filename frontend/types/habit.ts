export type HabitFrequency = "DAILY" | "WEEKLY" | "MONTHLY";

export type HabitCategory = "GENERAL" | "HEALTH" | "WORK" | "FITNESS" | "LEARNING";

export type HabitStatus = "COMPLETED" | "MISSED" | "PENDING" | "PARTIALLY_COMPLETED";

export type DayOfWeek =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export interface HabitDTO {
  id: number;
  title: string;
  description: string;
  category: HabitCategory;
  frequency: HabitFrequency;
  daysOfWeek: DayOfWeek[] | null;
  daysOfMonth: number[] | null;
  targetTime: string;
  createdAt: string;
  isCountable: boolean;
  targetCount: number;
  paused: boolean;
  pausedUntil: string | null;
  archived: boolean;
}

export interface HabitResponse {
  id: number;
  title: string;
  description: string;
  category: HabitCategory;
  targetTime: string;
  targetCount: number;
  isCountable: boolean;
  currentCount: number;
  habitStatus: HabitStatus;
}

export interface ActivityItem {
  date: string;
  habitStatus: HabitStatus;
  note?: string;
}

export interface HabitStreakResponse {
  streak: number;
}

export interface CreateHabitRequest {
  title: string;
  description: string;
  category: HabitCategory;
  frequency: HabitFrequency;
  daysOfWeek: DayOfWeek[] | null;
  daysOfMonth: number[] | null;
  targetTime: string;
  targetCount: number;
  isCountable: boolean;
}

export type UpdateHabitRequest = CreateHabitRequest;