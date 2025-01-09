import axios, { AxiosInstance, AxiosError } from 'axios';
import { storage } from '@/app/utils/storage';
import * as Updates from "expo-updates";
import {router} from "expo-router";

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

export interface UserData {
    id: string;
    email: string;
    name: string;
}

// API Configuration
export const API_CONFIG = {
    BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.165:8089',
    TIMEOUT: 10000,
    ENDPOINTS: {
        AUTH: {
            LOGIN: '/api/v1/auth/login',
            REGISTER: '/api/v1/auth/register',
            FORGOT_PASSWORD: '/api/v1/auth/password/forgot',
            REFRESH_TOKEN: '/api/v1/auth/refresh-token',
            VERIFY_TOKEN: '/api/v1/auth/verify-token',
            SOCIAL: {
                GOOGLE: '/api/v1/auth/google',
                FACEBOOK: '/api/v1/auth/facebook',
            }
        },
        USERS: {
            PROFILE: '/api/v1/users/profile',
            UPDATE_PROFILE: '/api/v1/users/profile',
        }
    }
} as const;

class ApiService {
    private static instance: AxiosInstance;

    public static getInstance(): AxiosInstance {
        if (!this.instance) {
            this.instance = axios.create({
                baseURL: API_CONFIG.BASE_URL,
                timeout: API_CONFIG.TIMEOUT,
            });

            // Request interceptor
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

            // Response interceptor
            this.instance.interceptors.response.use(
                (response) => response,
                async (error: AxiosError) => {
                    const handled = await authApi.handleAuthError(error);
                    if (!handled) {
                        return Promise.reject(error);
                    }
                }
            );
        }
        return this.instance;
    }
}

// Auth API Methods
export const authApi = {

    async login(email: string, password: string): Promise<AuthResponse> {
        const response = await ApiService.getInstance().post<AuthResponse>(
            API_CONFIG.ENDPOINTS.AUTH.LOGIN,
            { email, password }
        );
        await this.handleAuthSuccess(response.data);
        return response.data;
    },

    async register(data: { name: string; email: string; password: string }): Promise<AuthResponse> {
        const response = await ApiService.getInstance().post<AuthResponse>(
            API_CONFIG.ENDPOINTS.AUTH.REGISTER,
            data
        );
        await this.handleAuthSuccess(response.data);
        return response.data;
    },

    async socialAuth(token: string, provider: 'google' | 'facebook'): Promise<AuthResponse> {
        const endpoint = provider === 'google'
            ? API_CONFIG.ENDPOINTS.AUTH.SOCIAL.GOOGLE
            : API_CONFIG.ENDPOINTS.AUTH.SOCIAL.FACEBOOK;

        const response = await ApiService.getInstance().post<AuthResponse>(
            endpoint,
            { token }
        );
        await this.handleAuthSuccess(response.data);
        return response.data;
    },

    async verifyToken(): Promise<boolean> {
        try {
            await ApiService.getInstance().post(API_CONFIG.ENDPOINTS.AUTH.VERIFY_TOKEN);
            return true;
        } catch {
            return false;
        }
    },

    async handleAuthSuccess(authData: AuthResponse): Promise<void> {
        await Promise.all([
            storage.setToken(authData.accessToken),
            storage.setRefreshToken(authData.refreshToken),
            storage.setTokenExpiry(authData.expiresIn)
        ]);
    },

    async handleAuthError(error: any) {
        if (error?.response?.status === 401) {
            await storage.removeToken();
            if (!__DEV__) {
                await Updates.reloadAsync();
            }
            return router.replace('/(auth)/login');
        }
        return false;
    }
};

export default ApiService.getInstance();