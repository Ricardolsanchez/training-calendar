// src/lib/api.ts
import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL;

// 👇 Solo para debug (luego lo puedes quitar)
console.log("API baseURL en runtime:", baseURL);

export const api = axios.create({
  baseURL,
  withCredentials: true,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
});