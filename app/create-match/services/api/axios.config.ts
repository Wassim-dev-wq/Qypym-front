import axios from 'axios';
import { MATCHES_API_CONFIG } from "@/components/api/matchesApiService";
import { storage } from '@/app/utils/storage';
import { authApi } from '@/components/api/auth';

const DEFAULT_TIMEOUT = 10000;

export const axiosInstance = axios.create({
    baseURL: 'http://192.168.1.165:8087/api/v1',
    timeout: DEFAULT_TIMEOUT
});

axiosInstance.interceptors.request.use(async (config) => {
    const token = await storage.getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    console.log('Request:', {
        url: config.url,
        method: config.method?.toUpperCase(),
        headers: config.headers,
        body: config.data
    });

    return config;
}, (error) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
});

axiosInstance.interceptors.response.use(
    (response) => {
        console.log('Response:', {
            status: response.status,
            data: response.data
        });
        return response;
    },
    async (error) => {
        console.error('Error:', {
            status: error.response?.status,
            data: error.response?.data
        });
        if (error.response?.status === 401) {
            const handled = await authApi.handleAuthError(error);
            if (handled) return handled;
        }

        return Promise.reject({
            status: error.response?.status,
            message: error.response?.data?.message || 'An unexpected error occurred',
            error: error.response?.data
        });
    }
);

export default axiosInstance;