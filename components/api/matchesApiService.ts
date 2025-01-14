import axios, { AxiosInstance } from 'axios';
import { storage } from '@/app/utils/storage';
import { authApi } from '@/components/api/auth';

export const MATCHES_API_CONFIG = {
    BASE_URL: process.env.EXPO_PUBLIC_MATCHES_API_URL || 'http://192.168.1.165:8087',
    TIMEOUT: 10000,
    ENDPOINTS: {
        MATCHES: {
            LIST: '/api/v1/matches',
            CREATE: '/api/v1/matches',
            JOIN: (matchId: string) => `/api/v1/matches/${matchId}/join`,
            LEAVE: (matchId: string) => `/api/v1/matches/${matchId}/leave`,
        }
    }
} as const;

export class MatchesApiService {
    private static instance: AxiosInstance;

    public static getInstance(): AxiosInstance {
        if (!this.instance) {
            this.instance = axios.create({
                baseURL: MATCHES_API_CONFIG.BASE_URL,
                timeout: MATCHES_API_CONFIG.TIMEOUT,
            });

            this.instance.interceptors.request.use(
                async (config) => {
                    const token = await storage.getToken();
                    if (token) {
                        config.headers.Authorization = `Bearer ${token}`;
                    }
                    return config;
                },
                (error) => Promise.reject(error)
            );

            this.instance.interceptors.response.use(
                (response) => response,
                async (error) => {
                    const handled = await authApi.handleAuthError(error);
                    if (!handled) {
                        return Promise.reject(error);
                    }
                    return handled;
                }
            );
        }
        return this.instance;
    }
}