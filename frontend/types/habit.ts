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
}

export interface HabitResponse {
  id: number;
  title: string;
  description: string;
  category: HabitCategory;
  targetTime: string;
  habitStatus: HabitStatus;
}

export interface ActivityItem {
  date: string;
  habitStatus: HabitStatus;
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
}

export type UpdateHabitRequest = CreateHabitRequest;