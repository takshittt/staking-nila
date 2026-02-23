import axios from 'axios';


const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Centralized error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Check for auth failure
        if (error.response?.status === 401) {
            localStorage.removeItem('admin_token');
            window.location.href = '/login';
        }

        // Extract expected error message from backend
        const backendMessage = error.response?.data?.error || error.response?.data?.message;

        // Create an explicit standardized error output
        const formattedError = new Error(backendMessage || 'An unexpected error occurred from the server.');

        // Attach original error context
        (formattedError as any).originalError = error;
        (formattedError as any).status = error.response?.status;

        return Promise.reject(formattedError);
    }
);

export default api;
