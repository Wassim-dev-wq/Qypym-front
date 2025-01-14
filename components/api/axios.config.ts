import axios, {AxiosError, AxiosInstance} from "axios";
import {storage} from "@/app/utils/storage";
import {authApi} from "@/components/api/auth";

export interface AuthResponse {
    data:
        {
            accessToken: string;
            refreshToken: string;
            expiresIn: number;
        },
}

interface RefreshTokenRequest {
    refreshToken: string;
}


export interface UserData {
    id: string;
    email: string;
    name: string;
}

const API_BASE = '/api/v1';

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

export class ApiService {
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