// src/lib/api.ts
import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL;

// (Opcional) Solo para debug, luego lo puedes quitar
console.log("API baseURL en runtime:", baseURL);

export const api = axios.create({
  baseURL,
});

// 👇 Si ya hay un token guardado, lo agregamos al header Authorization
const storedToken = localStorage.getItem("admin_token");
if (storedToken) {
  api.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
}
