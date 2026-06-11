import axios from "axios";

const LOCAL_API_ORIGIN = "http://localhost:5000";
const PRODUCTION_API_ORIGIN = "https://construction-ou63.onrender.com";
const fallbackApiOrigin = import.meta.env.DEV ? LOCAL_API_ORIGIN : PRODUCTION_API_ORIGIN;

export const API_ORIGIN = (import.meta.env.VITE_API_URL || fallbackApiOrigin).replace(/\/$/, "");

export const api = axios.create({
  baseURL: `${API_ORIGIN}/api`,
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const token = window.localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isAuthCall = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"].some((path) => original?.url?.includes(path));

    if (error.response?.status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        const { data } = await api.post("/auth/refresh");
        window.localStorage.setItem("accessToken", data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (refreshError) {
        window.localStorage.removeItem("accessToken");
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export const assetUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${API_ORIGIN}${url.startsWith("/") ? url : `/${url}`}`;
};
