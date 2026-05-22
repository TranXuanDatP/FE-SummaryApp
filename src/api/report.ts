import client from './client';

export const getMonthlyReport = (params: { month: number; year: number; employeeId?: string; projectId?: string; page?: number; limit?: number }) =>
  client.get('/reports/monthly', { params });

export const exportMonthlyReport = (params: { month: number; year: number; employeeId?: string; projectId?: string }) =>
  client.get('/reports/monthly/export', { params, responseType: 'blob' });
