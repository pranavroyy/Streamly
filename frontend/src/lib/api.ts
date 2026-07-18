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

// Response Interceptor for centralized handling of API errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // We can handle global errors here (e.g. logouts, toaster warnings)
    const message = error.response?.data?.message || "An error occurred with Streamly API";
    return Promise.reject({
      ...error,
      message,
    });
  }
);
