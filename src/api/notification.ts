import client from './client';
import type { PaginatedResponse, NotificationDto, NotificationPreferenceDto } from '../types/api';

export const getNotifications = (page = 1, limit = 20) =>
  client.get<never, PaginatedResponse<NotificationDto>>('/notifications', { params: { page, limit } });

export const markAllRead = () =>
  client.put<never, void>('/notifications/read-all');

export const markRead = (id: string) =>
  client.put<never, void>(`/notifications/${id}/read`);

export const getPreferences = () =>
  client.get<never, NotificationPreferenceDto[]>('/notifications/preferences');

export const updatePreferences = (preferences: { type: string; channel: string; enabled: boolean }[]) =>
  client.put<never, void>('/notifications/preferences', { preferences });
