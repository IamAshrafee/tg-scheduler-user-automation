import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for handling errors
api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // Handle 401 Unauthorized
        if (error.response && error.response.status === 401) {
            // Clear token and redirect to login
            localStorage.removeItem('token');
            window.location.href = '/login';
            return Promise.reject(error);
        }

        // Handle 403 Forbidden (Account Locked)
        if (error.response && error.response.status === 403) {
            const detail = error.response.data?.detail || '';
            if (detail.includes('Account locked')) {
                // Force a reload to trigger checkAuth which will fetch user status
                // Or if checkAuth fails, it will handle it.
                // For now, we want the UI to update.
                window.location.reload();
            }
        }

        return Promise.reject(error);
    }
);

export default api;
