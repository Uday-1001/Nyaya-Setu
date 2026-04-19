import axios from "axios";
import { useAuthStore } from "../store/authStore";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

/* ── Request interceptor: attach access token ─────────────────── */
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

/* ── Response interceptor: 401 → refresh → retry ─────────────── */
let isRefreshing = false;
type QueueItem = {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
};
let failedQueue: QueueItem[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  failedQueue = [];
};

const shouldAttemptRefresh = (error: unknown) => {
  const status = (error as { response?: { status?: number } })?.response
    ?.status;
  const message = String(
    (error as { response?: { data?: { message?: unknown } } })?.response?.data
      ?.message ?? "",
  ).toLowerCase();

  if (status === 401) return true;
  // Backward compatibility: older backend builds may emit token errors as 500.
  if (status === 500 && message.includes("token expired")) return true;
  return false;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as typeof error.config & { _retry?: boolean };
    const requestUrl = String(original?.url ?? "");
    const isRefreshRequest = requestUrl.includes("/auth/refresh");

    if (!isRefreshRequest && shouldAttemptRefresh(error) && !original._retry) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      const storedRefresh = useAuthStore.getState().refreshToken;
      if (!storedRefresh) {
        useAuthStore.getState().logout();
        return Promise.reject(
          new Error("Session expired. Please log in again."),
        );
      }

      try {
        const { data } = await axios.post<{
          token: string;
          refreshToken: string;
        }>(
          `${BASE_URL}/auth/refresh`,
          { refreshToken: storedRefresh },
          { withCredentials: true },
        );
        useAuthStore.getState().setSessionTokens(data.token, data.refreshToken);
        processQueue(null, data.token);
        original.headers.Authorization = `Bearer ${data.token}`;
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        return Promise.reject(
          new Error("Session expired. Please log in again."),
        );
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
