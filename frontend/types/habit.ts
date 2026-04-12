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

// Shared display constants — import these instead of redefining per screen.
export const HABIT_CATEGORIES: HabitCategory[] = [
  "GENERAL", "HEALTH", "FITNESS", "WORK", "LEARNING",
];

export const HABIT_FREQUENCIES: HabitFrequency[] = ["DAILY", "WEEKLY", "MONTHLY"];

export const DAYS_OF_WEEK: DayOfWeek[] = [
  "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY",
];

export const DAY_SHORT: Record<DayOfWeek, string> = {
  MONDAY: "Mon", TUESDAY: "Tue", WEDNESDAY: "Wed", THURSDAY: "Thu",
  FRIDAY: "Fri", SATURDAY: "Sat", SUNDAY: "Sun",
};