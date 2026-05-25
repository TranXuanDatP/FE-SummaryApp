import client from './client';
import type { ProjectDto, PaginatedResponse } from '../types/api';

export const getProjects = (page = 1, limit = 20) =>
  client.get<never, PaginatedResponse<ProjectDto>>('/projects', { params: { page, limit } });

export const searchProjects = (q: string, page = 1, limit = 20) =>
  client.get<never, PaginatedResponse<ProjectDto>>('/projects/search', { params: { q, page, limit } });

export const getProject = (id: string) =>
  client.get<never, ProjectDto>(`/projects/${id}`);

export const createProject = (data: { name: string; description?: string }) =>
  client.post<never, ProjectDto>('/projects', data);

export const updateProject = (id: string, data: { name?: string; description?: string }) =>
  client.put<never, ProjectDto>(`/projects/${id}`, data);

export const mergeProjects = (targetId: string, sourceIds: string[]) =>
  client.post<never, ProjectDto>(`/projects/${targetId}/merge`, { sourceIds });

export const deleteProject = (id: string) =>
  client.delete<never, { deleted: boolean; id: string; workLogsDeleted: number }>(`/projects/${id}`);
