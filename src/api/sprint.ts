import client from './client';
import type { SprintDto } from '../types/api';

export const getSprints = (projectId: string) =>
  client.get<never, SprintDto[]>(`/sprints/project/${projectId}`);

export const getSprintById = (id: string) =>
  client.get<never, SprintDto>(`/sprints/${id}`);

export const createSprint = (projectId: string, data: {
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  sortOrder?: number;
}) => client.post<never, SprintDto>(`/sprints/project/${projectId}`, data);

export const updateSprint = (id: string, data: {
  name?: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  sortOrder?: number;
}) => client.put<never, SprintDto>(`/sprints/${id}`, data);

export const updateSprintStatus = (id: string, status: 'planning' | 'in_progress' | 'completed') =>
  client.patch<never, SprintDto>(`/sprints/${id}/status`, { status });

export const deleteSprint = (id: string) =>
  client.delete<never, { deleted: boolean; id: string }>(`/sprints/${id}`);
