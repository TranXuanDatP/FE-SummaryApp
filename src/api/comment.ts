import client from './client';

export const createComment = (workLogId: string, content: string) =>
  client.post(`/work-logs/${workLogId}/comments`, { content });

export const updateComment = (id: string, content: string) =>
  client.put(`/comments/${id}`, { content });

export const deleteComment = (id: string) =>
  client.delete(`/comments/${id}`);
