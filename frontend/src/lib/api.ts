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

// Helper functions for auth storage
export const getAccessToken = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("accessToken");
  }
  return null;
};

export const getRefreshToken = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("refreshToken");
  }
  return null;
};

export const setTokens = (accessToken: string, refreshToken?: string) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("accessToken", accessToken);
    if (refreshToken) {
      localStorage.setItem("refreshToken", refreshToken);
    }
  }
};

export const clearAuthStorage = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userFullName");
  }
};

// Request Interceptor: Attach access token to headers
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle 401 errors, token refresh, and redirect to login
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error status is 401 and request was not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Avoid looping on auth endpoints (login, register, refresh)
      const isAuthEndpoint = originalRequest.url?.includes("/v1/auth/");
      
      if (!isAuthEndpoint) {
        originalRequest._retry = true;
        const refreshToken = getRefreshToken();

        if (refreshToken) {
          try {
            // Request new token pair from refresh endpoint
            const response = await axios.post(`${API_BASE_URL}/v1/auth/refresh`, {
              refreshToken,
            });

            const { accessToken, refreshToken: newRefreshToken } = response.data;
            setTokens(accessToken, newRefreshToken);

            // Retry original request with updated token
            originalRequest.headers["Authorization"] = `Bearer ${accessToken}`;
            return api(originalRequest);
          } catch (refreshError) {
            clearAuthStorage();
            if (typeof window !== "undefined" && window.location.pathname !== "/login") {
              window.location.href = "/login";
            }
            return Promise.reject(refreshError);
          }
        } else {
          clearAuthStorage();
          if (typeof window !== "undefined" && window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
        }
      }
    }

    const message =
      error.response?.data?.message ||
      (Array.isArray(error.response?.data?.errors)
        ? error.response.data.errors.join(", ")
        : null) ||
      "An error occurred with Streamly API";

    return Promise.reject({
      ...error,
      message,
    });
  }
);
