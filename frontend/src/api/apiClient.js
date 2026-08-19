// Shared axios instance. ASSUMPTION: JWT is stored in localStorage under the
// key "authToken" - no login code exists yet to confirm this. Update the
// getter below (and whatever the login flow sets) to match once it's built.
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
