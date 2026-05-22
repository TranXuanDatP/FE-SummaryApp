import client from './client';

export const getUsers = (page = 1, limit = 20) =>
  client.get('/users', { params: { page, limit } });

export const getUser = (id: string) =>
  client.get(`/users/${id}`);

export const createUser = (data: { email: string; password: string; fullName: string; role: string }) =>
  client.post('/users', data);

export const deactivateUser = (id: string) =>
  client.patch(`/users/${id}/deactivate`);
