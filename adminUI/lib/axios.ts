import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000/api/v1",
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem("access_token");

      // Example: redirect to login
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default api;