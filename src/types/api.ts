export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDto {
  id: string;
  name: string;
  description: string | null;
  status: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkLogDto {
  id: string;
  projectId: string;
  employeeId: string;
  executionDate: string;
  content: string;
  isUnlocked: boolean;
  unlockedBy: string | null;
  unlockedAt: string | null;
  unlockReason: string | null;
  version: number;
  isEditable: boolean;
  editWindowClosesAt: string;
  projectName: string;
  employeeName: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkLogDefaultsDto {
  suggestedProjectId: string | null;
  todayDate: string;
}

export interface CalendarDayDto {
  date: string;
  isBusinessDay: boolean;
  hasWorkLog: boolean;
  isEditable: boolean;
}

export interface SummaryDto {
  completionRate: number;
  totalBusinessDays: number;
  loggedDays: number;
  editableMissingDays: number;
}

export interface CommentDto {
  id: string;
  workLogId: string;
  managerId: string;
  managerName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationDto {
  id: string;
  userId: string;
  type: string;
  title: string;
  content: string;
  actionLink: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationPreferenceDto {
  id: string;
  type: string;
  channel: string;
  enabled: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}
