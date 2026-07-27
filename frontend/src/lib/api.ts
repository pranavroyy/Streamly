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

// Fast In-Memory Token Cache to avoid synchronous localStorage disk reads on every HTTP call
let memoryAccessToken: string | null = null;
let memoryRefreshToken: string | null = null;

export const getAccessToken = (): string | null => {
  if (memoryAccessToken) return memoryAccessToken;
  if (typeof window !== "undefined") {
    memoryAccessToken = localStorage.getItem("accessToken");
    return memoryAccessToken;
  }
  return null;
};

export const getRefreshToken = (): string | null => {
  if (memoryRefreshToken) return memoryRefreshToken;
  if (typeof window !== "undefined") {
    memoryRefreshToken = localStorage.getItem("refreshToken");
    return memoryRefreshToken;
  }
  return null;
};

export const setTokens = (accessToken: string, refreshToken?: string) => {
  memoryAccessToken = accessToken;
  if (refreshToken) {
    memoryRefreshToken = refreshToken;
  }
  if (typeof window !== "undefined") {
    localStorage.setItem("accessToken", accessToken);
    if (refreshToken) {
      localStorage.setItem("refreshToken", refreshToken);
    }
  }
};

export const clearAuthStorage = () => {
  memoryAccessToken = null;
  memoryRefreshToken = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userFullName");
  }
};

// Request Interceptor: Attach access token to headers instantly
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 errors, token refresh, and redirect to login
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      const isAuthEndpoint = originalRequest.url?.includes("/v1/auth/");

      if (!isAuthEndpoint) {
        originalRequest._retry = true;
        const refreshToken = getRefreshToken();

        if (refreshToken) {
          try {
            const response = await axios.post(`${API_BASE_URL}/v1/auth/refresh`, {
              refreshToken,
            });

            const { accessToken, refreshToken: newRefreshToken } = response.data;
            setTokens(accessToken, newRefreshToken);

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
