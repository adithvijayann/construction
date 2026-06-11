import axios from "axios";

const normalizeApiOrigin = (value = "") => value.trim().replace(/\/+$/, "").replace(/\/api$/, "");

export const API_ORIGIN = normalizeApiOrigin(import.meta.env.VITE_API_URL);
export const API_BASE_URL = `${API_ORIGIN}/api`;

if (!API_ORIGIN) {
  throw new Error("VITE_API_URL is not configured. Set it to the backend origin, for example https://construction-ou63.onrender.com.");
}

export const api = axios.create({
  baseURL: API_BASE_URL,
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
