import client from './client';

export const getWorkLogs = (params: { page?: number; limit?: number; projectId?: string; executionDate?: string }) =>
  client.get('/work-logs', { params });

export const createWorkLog = (data: { content: string; projectId?: string; executionDate?: string }) =>
  client.post('/work-logs', data);

export const updateWorkLog = (id: string, data: { content: string }) =>
  client.put(`/work-logs/${id}`, data);

export const deleteWorkLog = (id: string) =>
  client.delete(`/work-logs/${id}`);

export const unlockWorkLog = (id: string, reason: string) =>
  client.post(`/work-logs/${id}/unlock`, { reason });

export const getCalendar = (month: number, year: number, employeeId?: string) =>
  client.get('/work-logs/calendar', { params: { month, year, employeeId } });

export const getSummary = (month: number, year: number, employeeId?: string) =>
  client.get('/work-logs/summary', { params: { month, year, employeeId } });

export const getDefaults = () =>
  client.get('/work-logs/defaults');
