import axios from "axios";
import { useAuthStore } from "@/stores/auth-store";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  // Enable sending/receiving cookies for httpOnly JWT authentication
  withCredentials: true,
});

// Request interceptor - tokens are in httpOnly cookies
// Cookies are sent automatically with withCredentials: true
// No need to manually attach Authorization header for web clients

// Handle 401 — attempt token refresh via cookie
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check for session timeout or concurrent session termination
    const errorMessage = error.response?.data?.detail || "";
    const isSessionTimeout = errorMessage.includes("Session expired due to inactivity");
    const isSessionTerminated = errorMessage.includes("Session terminated");

    // If session was explicitly expired/terminated, don't try to refresh
    if (error.response?.status === 401 && (isSessionTimeout || isSessionTerminated)) {
      useAuthStore.getState().clear();
      const reason = isSessionTimeout ? "session_timeout" : "session_terminated";
      window.location.href = `/login?reason=${reason}`;
      return Promise.reject(error);
    }

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("auth/login") &&
      !originalRequest.url?.includes("auth/refresh")
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: () => {
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Refresh using httpOnly cookies - browser sends them automatically
        await axios.post(
          `${API_BASE_URL}/auth/refresh/`,
          {}, // Empty body - refresh token is in httpOnly cookie
          { withCredentials: true }
        );

        // If refresh succeeded, new cookies are set automatically
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        useAuthStore.getState().clear();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export { api };
export default api;
