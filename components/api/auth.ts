import {storage} from '@/app/utils/storage';
import {API_CONFIG, ApiService, AuthResponse} from "@/components/api/axios.config";
import {router} from "expo-router";
import {RefreshTokenRequest} from "expo-auth-session";

// Auth API Methods
export const authApi = {

    async login(email: string, password: string): Promise<AuthResponse> {
        return this.handleAuthRequest<AuthResponse>(
            API_CONFIG.ENDPOINTS.AUTH.LOGIN,
            {email, password}
        );
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
            {token}
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

    async handleAuthRequest<T>(endpoint: string, data: any): Promise<T> {
        try {
            const response = await ApiService.getInstance().post<T>(endpoint, data);
            await this.handleAuthSuccess(response.data as AuthResponse);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    async handleAuthSuccess(authData: AuthResponse): Promise<void> {
        const authDataTokens = authData.data;
        await Promise.all([
            storage.setToken(authDataTokens.accessToken),
            storage.setRefreshToken(authDataTokens.refreshToken),
            storage.setTokenExpiry(authDataTokens.expiresIn)
        ]);
    },

    async handleAuthError(error: any) {
        const originalRequest = error.config;
        if (error?.response?.status === 401 && !originalRequest._retry) {
            console.log('Refreshing token');
            originalRequest._retry = true;
            try {
                const refreshToken  = await storage.getRefreshToken();
                if (!refreshToken) {
                    throw new Error('No refresh token available');
                }
                const response = await ApiService.getInstance().post<AuthResponse>(
                    API_CONFIG.ENDPOINTS.AUTH.REFRESH_TOKEN,
                    {refreshToken} as RefreshTokenRequest
                );
                await this.handleAuthSuccess(response.data);
                return ApiService.getInstance().request(originalRequest);
            } catch (refreshError) {
                await storage.removeToken();
                router.replace('/(auth)/login');
                return Promise.reject(refreshError);
            }
        }
        return false;
    },


};

export default ApiService.getInstance();