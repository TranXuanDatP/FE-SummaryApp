import client from './client';
import type { PaginatedResponse } from '../types/api';

export interface MonthlyReportRow {
  id: string;
  date: string;
  employeeName: string;
  projectName: string;
  content: string;
  isEditable: boolean;
  comments: Array<{ managerName: string; content: string }>;
}

export const getMonthlyReport = (params: { month: number; year: number; employeeId?: string; projectId?: string; page?: number; limit?: number }) =>
  client.get<never, PaginatedResponse<MonthlyReportRow>>('/reports/monthly', { params });

export const exportMonthlyReport = (params: { month: number; year: number; employeeId?: string; projectId?: string }) =>
  client.get<never, Blob>('/reports/monthly/export', { params, responseType: 'blob' });
