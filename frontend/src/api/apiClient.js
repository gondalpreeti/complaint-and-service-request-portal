// Shared axios instance. Uses localStorage "authToken", with a valid dev token fallback
// for local testing so the dashboard works out-of-the-box.
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Dev admin token generated from JWT_SECRET_KEY in backend/.env
const DEV_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6ImFkbWluIiwiZXhwIjo0MTAyNDQ0ODAwfQ.TkQTz9gu_19StaUCkk7pSuaDFaeQlI2M_71poqx4iNk";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken") || DEV_TOKEN;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
