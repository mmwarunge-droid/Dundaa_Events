import axios from "axios";

/*
Shared Axios API client for Dundaa web app.

- Reads backend URL from Vite env
- Automatically attaches JWT token if available
- Clears broken auth on 401 responses
*/

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("dundaa_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const requestUrl = error?.config?.url || "";

    const isAuthEndpoint =
      requestUrl.includes("/login") ||
      requestUrl.includes("/signup") ||
      requestUrl.includes("/auth/reactivate") ||
      requestUrl.includes("/auth/check-status");

    if (status === 401 && !isAuthEndpoint) {
      localStorage.removeItem("dundaa_token");

      window.dispatchEvent(
        new CustomEvent("dundaa:unauthorized", {
          detail: {
            url: requestUrl,
            message: "Your session has expired. Please log in again."
          }
        })
      );
    }

    return Promise.reject(error);
  }
);

export default api;