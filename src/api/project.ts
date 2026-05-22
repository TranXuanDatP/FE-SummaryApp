import client from './client';

export const getProjects = (page = 1, limit = 20) =>
  client.get('/projects', { params: { page, limit } });

export const searchProjects = (q: string, page = 1, limit = 20) =>
  client.get('/projects/search', { params: { q, page, limit } });

export const getProject = (id: string) =>
  client.get(`/projects/${id}`);

export const createProject = (data: { name: string; description?: string }) =>
  client.post('/projects', data);

export const updateProject = (id: string, data: { name?: string; description?: string }) =>
  client.put(`/projects/${id}`, data);

export const mergeProjects = (targetId: string, sourceIds: string[]) =>
  client.post(`/projects/${targetId}/merge`, { sourceIds });
