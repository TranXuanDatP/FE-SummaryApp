import client from './client';
import type { UserDto, PaginatedResponse, EmployeeListItemDto } from '../types/api';

export const getUsers = (page = 1, limit = 20) =>
  client.get<never, PaginatedResponse<UserDto>>('/users', { params: { page, limit } });

export const getUser = (id: string) =>
  client.get<never, UserDto>(`/users/${id}`);

export const getEmployees = (params?: { month?: number; year?: number }) =>
  client.get<never, EmployeeListItemDto[]>('/users/employees', { params });

export const createUser = (data: { email: string; password: string; fullName: string; role: string }) =>
  client.post<never, UserDto>('/users', data);

export const deactivateUser = (id: string) =>
  client.patch<never, UserDto>(`/users/${id}/deactivate`);

export const deleteUser = (id: string) =>
  client.delete<never, { deleted: boolean; id: string }>(`/users/${id}`);
