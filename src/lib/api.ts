import axios from "axios";

const baseURL =   import.meta.env.VITE_API_BASE_URL || "https://training-calendar-backend.onrender.com";

console.log("API baseURL en runtime:", baseURL);

export const api = axios.create({
  baseURL: "https://training-calendar-backend.onrender.com",
  withCredentials: true, // 👈 importante para Sanctum
});

// Si hay token, se añade al header
const storedToken = localStorage.getItem("admin_token");
if (storedToken) {
  api.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
}
