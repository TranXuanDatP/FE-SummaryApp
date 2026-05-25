import client from './client';
import type { WorkLogDto, WorkLogDefaultsDto, CalendarDayDto, SummaryDto, PaginatedResponse } from '../types/api';

export const getWorkLogs = (params: { page?: number; limit?: number; projectId?: string; executionDate?: string }) =>
  client.get<never, PaginatedResponse<WorkLogDto>>('/work-logs', { params });

export const createWorkLog = (data: { content: string; projectId?: string; executionDate?: string }) =>
  client.post<never, WorkLogDto>('/work-logs', data);

export const updateWorkLog = (id: string, data: { content: string }) =>
  client.put<never, WorkLogDto>(`/work-logs/${id}`, data);

export const deleteWorkLog = (id: string) =>
  client.delete<never, { deleted: boolean; id: string }>(`/work-logs/${id}`);

export const unlockWorkLog = (id: string, reason: string) =>
  client.post<never, WorkLogDto>(`/work-logs/${id}/unlock`, { reason });

export const getCalendar = (month: number, year: number, employeeId?: string) =>
  client.get<never, CalendarDayDto[]>('/work-logs/calendar', { params: { month, year, employeeId } });

export const getSummary = (month: number, year: number, employeeId?: string) =>
  client.get<never, SummaryDto>('/work-logs/summary', { params: { month, year, employeeId } });

export const getDefaults = () =>
  client.get<never, WorkLogDefaultsDto>('/work-logs/defaults');
