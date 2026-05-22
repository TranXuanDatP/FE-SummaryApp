import client from './client';

export const login = (email: string, password: string) =>
  client.post('/auth/login', { email, password });

export const refreshToken = (refreshToken: string) =>
  client.post('/auth/refresh', { refreshToken });

export const logout = (refreshToken: string) =>
  client.post('/auth/logout', { refreshToken });
