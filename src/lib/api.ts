// src/lib/api.ts
import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL;  // 👈 variable dinámica

export const api = axios.create({
  baseURL,                // 👈 ya no es localhost
  withCredentials: true,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
});
