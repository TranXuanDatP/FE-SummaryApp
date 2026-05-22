import client from './client';

export const getNotifications = (page = 1, limit = 20) =>
  client.get('/notifications', { params: { page, limit } });

export const markAllRead = () =>
  client.put('/notifications/read-all');

export const markRead = (id: string) =>
  client.put(`/notifications/${id}/read`);

export const getPreferences = () =>
  client.get('/notifications/preferences');

export const updatePreferences = (preferences: { type: string; channel: string; enabled: boolean }[]) =>
  client.put('/notifications/preferences', { preferences });
