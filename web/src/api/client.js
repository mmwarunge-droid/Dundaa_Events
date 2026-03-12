import axios from "axios";

/*
Shared Axios API client for Dundaa web app.

- Reads backend URL from Vite env
- Automatically attaches JWT token if available
*/

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
});

// Attach auth token to every outgoing request after login.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("dundaa_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;