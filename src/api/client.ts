import axios from 'axios';
import type { ApiError } from '../types/api';

const client = axios.create();

let logoutFn: (() => void) | null = null;
export const setLogoutFn = (fn: () => void) => {
  logoutFn = fn;
};

interface QueueItem {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}

let isRefreshing = false;
let failedQueue: QueueItem[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token!);
  });
  failedQueue = [];
};

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (res) => res.data?.data ?? res.data,
  async (error: { config: { _retry?: boolean; headers: Record<string, string> }; response?: { status: number; data?: { error?: { message?: string; code?: string }; message?: string; code?: string } }; message: string }) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return client(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const res = await axios.post('/auth/refresh', { refreshToken });
          const { accessToken, refreshToken: newRefresh } = res.data.data;

          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefresh);

          processQueue(null, accessToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return client(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          logoutFn?.();
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }
    }

    const err = error.response?.data?.error;
    const msg = err?.message || error.response?.data?.message || error.message;
    const code = err?.code || error.response?.data?.code;
    return Promise.reject<ApiError>({ message: msg, code, status: error.response?.status });
  },
);

export default client;
