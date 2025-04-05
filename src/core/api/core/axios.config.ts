import axios, {AxiosError, AxiosInstance} from "axios";
import {storage} from "@/src/core/storage/storage";
import {authApi} from "@/src/core/api/auth";

export interface AuthResponse {
    data:
        {
            accessToken: string;
            refreshToken: string;
            expiresIn: number;
        },
}

export interface RegisterResponse {
    status: string;
    data:
        {
            userId: string;
        },
}

export const API_CONFIG = {

    BASE_URL: 'https://api.qypym.fr',
    TIMEOUT: 10000,
    ENDPOINTS: {
        AUTH: {
            LOGIN: '/api/v1/auth/login',
            REGISTER: '/api/v1/auth/register',
            REFRESH_TOKEN: '/api/v1/auth/refresh-token',
            VERIFY_TOKEN: '/api/v1/auth/verify-token',
            VERIFY_EMAIL: '/api/v1/auth/verify-email',
            FORGOT_PASSWORD: '/api/v1/auth/forgot-password',
            VERIFY_PASSWORD_RESET: '/api/v1/auth/verify-password-reset',
            RESET_PASSWORD: '/api/v1/auth/reset-password',
        },
        MATCH: {
            MATCHES: '/api/v1/matches',
            MATCH_BY_ID: (id: string) => `/api/v1/matches/${id}`,
            MATCH_DETAILS: (id: string) => `/api/v1/matches/${id}/details`,
            SAVE_MATCH: (id: string) => `/api/v1/matches/${id}/save`,
            JOIN_MATCH: (id: string) => `/api/v1/matches/${id}/join`,
            JOIN_REQUESTS: (id: string) => `/api/v1/matches/${id}/requests`,
            GET_REQUEST: (matchId: string) => `/api/v1/matches/${matchId}/requests/status`,
            JOIN_REQUEST: (matchId: string, requestId: string) => `/api/v1/matches/${matchId}/${requestId}`,
            ACCEPT_JOIN_REQUEST: (requestId: string) => `/api/v1/matches/${requestId}/accept`,
            SAVED_MATCHES: '/api/v1/matches/saved',
            MATCH_HISTORY: '/api/v1/matches/history',
            MATCH_HISTORY_DETAIL: (id: string) => `/api/v1/matches/history/${id}`,
            MATCH_DELETE: (id: string) => `/api/v1/matches/${id}`,
            MATCHES_SEARCH: '/api/v1/matches/search',
        },
        PLAYER:  {
            LEAVE_MATCH: (matchId: string, requestId: string) => `/api/v1/player/${matchId}/${requestId}/leave`,
        },
        NOTIFICATIONS: {
            GET_ALL: '/api/v1/notifications',
            GET_UNREAD_COUNT: '/api/v1/notifications/unreadCount',
            MARK_AS_READ: (notificationId: string) => `/api/v1/notifications/${notificationId}/read`,
            MARK_ALL_AS_READ: '/api/v1/notifications/readAll',
            REGISTER_TOKEN: '/api/v1/user-push-tokens/register',
            DELETE_TOKEN: '/api/v1/user-push-tokens',
            GET_TOKENS: '/api/v1/user-push-tokens'
        },
        USERS: {
            REGISTER: '/api/v1/users',
            GET_BY_ID: (userId: string) => `/api/v1/users/${userId}`,
            GET_CURRENT: '/api/v1/users/me',
            UPDATE_CURRENT: '/api/v1/users/profile',
            UPLOAD_PHOTO: '/api/v1/users/me/photo',
            GET_MY_PHOTO: '/api/v1/users/me/photo',
            GET_PHOTO: (userId: string) => `/api/v1/users/${userId}/photo`,
            DELETE_PHOTO: '/api/v1/users/me/photo'
        },
        REQUESTS: {
            GET_MY_REQUESTS: () => `/api/v1/matches/requests`,
        },
        FEEDBACK: {
            GET_MATCH_FEEDBACK: (matchId: string) => `/api/v1/feedback/matches/${matchId}`,
            SUBMIT_FEEDBACK: (requestId: string) => `/api/v1/feedback/requests/${requestId}/submit`,
            GET_PLAYER_RATING: (playerId: string) => `/api/v1/feedback/players/${playerId}/rating`,
            GET_TOP_RATED: '/api/v1/feedback/players/top-rated',
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

            this.instance.interceptors.request.use(async (config) => {
                const token = await storage.getToken();

                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            });

            this.instance.interceptors.response.use(
                (response) => response,
                async (error: AxiosError) => {
                    try {
                        const handled = await authApi.handleaerror(error);
                        if (handled) {
                            return handled;
                        }
                        return Promise.reject(error);
                    } catch (refreshError) {
                        return Promise.reject(refreshError || error);
                    }
                }
            );
        }
        return this.instance;
    }
}