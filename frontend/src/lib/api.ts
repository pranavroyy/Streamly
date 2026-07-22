import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
});

// Helper to get token from localStorage safely
const getLocalToken = (key: string): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem(key);
  }
  return null;
};

// Helper to set token in localStorage safely
const setLocalToken = (key: string, value: string) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(key, value);
  }
};

// Helper to remove tokens from localStorage safely
const removeLocalTokens = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userFullName");
  }
};

// Request Interceptor: Attach access token
api.interceptors.request.use(
  (config) => {
    const token = getLocalToken("accessToken");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error status is 401 and we haven't retried this request yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = getLocalToken("refreshToken");

      if (refreshToken) {
        try {
          // Perform refresh token request using standard Axios to prevent looping
          const response = await axios.post(`${API_BASE_URL}/v1/auth/refresh`, {
            refreshToken: refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data;

          setLocalToken("accessToken", accessToken);
          if (newRefreshToken) {
            setLocalToken("refreshToken", newRefreshToken);
          }

          // Retry the original request with the new access token
          originalRequest.headers["Authorization"] = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (refreshError: any) {
          // Refresh token is expired or invalid
          removeLocalTokens();
          // Force page reload or redirect to landing/login
          if (typeof window !== "undefined") {
            window.location.href = "/";
          }
          return Promise.reject(refreshError);
        }
      }
    }

    const message = error.response?.data?.message || "An error occurred with Streamly API";
    return Promise.reject({
      ...error,
      message,
    });
  }
);
