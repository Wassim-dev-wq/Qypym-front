import {storage} from '@/src/core/storage/storage';
import {API_CONFIG, ApiService, AuthResponse, RegisterResponse} from "@/src/core/api/core/axios.config";
import {RegisterRequest} from "@/src/types/user/user";

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];
const MAX_REFRESH_WAIT = 5000;

export const authApi = {
    async login(email: string, password: string): Promise<AuthResponse> {
        return this.handleAuthRequest(
            API_CONFIG.ENDPOINTS.AUTH.LOGIN,
            {email, password}
        );
    },

    async verifyEmail(verificationCode: string): Promise<boolean> {
        try {
            const userId = await storage.getUserId();
            if (!userId) {
                return false;
            }
            const response = await ApiService.getInstance().post(
                API_CONFIG.ENDPOINTS.AUTH.VERIFY_EMAIL,
                {userId, code: verificationCode}
            );
            if (response.data && typeof response.data === 'object' && 'status' in response.data) {
                await storage.removeUserId();
                return response.data.status.toUpperCase() === 'SUCCESS';
            }
            return false;
        } catch (error) {
            throw error;
        }
    },

    async forgotPassword(email: string): Promise<any> {
        try {
            const response = await ApiService.getInstance().post(
                API_CONFIG.ENDPOINTS.AUTH.FORGOT_PASSWORD,
                {email}
            );
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    async resetPassword(userId: string, password: string): Promise<void> {
        try {
            const response = await ApiService.getInstance().post(
                API_CONFIG.ENDPOINTS.AUTH.RESET_PASSWORD,
                {
                    userId,
                    password
                }
            );
            return response.data.data;
        } catch (error) {
            throw error;
        }
    },

    async verifyPasswordResetCode(userId: string, code: string): Promise<boolean> {
        try {
            const response = await ApiService.getInstance().post(
                API_CONFIG.ENDPOINTS.AUTH.VERIFY_PASSWORD_RESET,
                {
                    userId,
                    code
                }
            );
            return response.data.data;
        } catch (error) {
            throw error;
        }
    },

    async register(registerData: RegisterRequest): Promise<RegisterResponse> {
        return this.handleRegisterRequest(
            API_CONFIG.ENDPOINTS.AUTH.REGISTER,
            registerData
        );
    },

    async verifyToken(): Promise<boolean> {
        try {
            const token = await storage.getToken();
            if (!token) return false;
            await ApiService.getInstance().post(API_CONFIG.ENDPOINTS.AUTH.VERIFY_TOKEN);
            return true;
        } catch {
            return false;
        }
    },

    async handleAuthRequest<T extends object>(endpoint: string, data: any): Promise<T> {
        try {
            const response = await ApiService.getInstance().post<T>(endpoint, data);
            if ('data' in response.data && 'accessToken' in (response.data as any).data) {
                await this.handleAuthSuccess(response.data as AuthResponse);
            }
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    async handleRegisterRequest<T extends object>(endpoint: string, data: any): Promise<T> {
        try {
            const response = await ApiService.getInstance().post<T>(endpoint, data);
            await this.handleRegisterSuccess(response.data as unknown as RegisterResponse);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    async handleRegisterSuccess(registerData: RegisterResponse): Promise<void> {
        try {
            const {userId} = registerData.data;
            await storage.setUserId(userId);
        } catch (error) {
            throw error;
        }
    },

    async handleAuthSuccess(authData: AuthResponse): Promise<void> {
        const {accessToken, refreshToken, expiresIn} = authData.data;
        await storage.setToken(accessToken);
        await storage.setRefreshToken(refreshToken);
        await storage.setTokenExpiry(expiresIn);
    },

    async handleLogout(): Promise<void> {
        await Promise.all([
            storage.removeToken(),
            storage.removeRefreshToken(),
            storage.removeTokenExpiry(),
        ]);
    },

    async refreshAccessToken(): Promise<string> {
        try {
            const refreshToken = await storage.getRefreshToken();
            if (!refreshToken) throw new Error('No refresh token available');
            const response = await ApiService.getInstance().post<AuthResponse>(
                API_CONFIG.ENDPOINTS.AUTH.REFRESH_TOKEN,
                {refreshToken}
            );
            await this.handleAuthSuccess(response.data);
            return response.data.data.accessToken;
        } catch (error) {
            await this.handleLogout();
            throw error;
        }
    },

    async handleaerror(error: any) {
        if (!error || typeof error !== 'object') {
            return Promise.reject(error);
        }

        if (error.__CANCEL__) {
            return Promise.reject(error);
        }

        try {
            const originalRequest = error.config || {};

            if (!('response' in error) || !error.response) {
                console.log('Network error - no response received');
                return Promise.reject(new Error('Network error, please check your connection'));
            }

            if (error.response.status !== 401 || originalRequest._retry) {
                if (error.response.data && typeof error.response.data === 'object') {
                    const apiError = error.response.data;
                    const errorMessage = apiError.message;
                    const errorCode = apiError.errorCode;
                    const formattedError = new Error(errorMessage);
                    (formattedError as any).code = errorCode;
                    (formattedError as any).status = error.response.status;
                    (formattedError as any).originalError = error;
                    return Promise.reject(formattedError);
                }

                return Promise.reject(error);
            }
            const authHeader = error.response?.headers?.['www-authenticate'] ||
                error.response?.headers?.['Www-Authenticate'];
            console.log('Auth header:', authHeader);
            if (authHeader && authHeader.includes('error="invalid_token"')) {
                console.log('Token expired or invalid (from header), signing out user');
                await storage.removeToken();
                return true;
            }
            if (isRefreshing) {
                try {
                    await Promise.race([
                        new Promise(resolve => {
                            const callback = (token: string) => resolve(token);
                            refreshSubscribers.push(callback);
                        }),
                        new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('Token refresh timeout')), MAX_REFRESH_WAIT)
                        )
                    ]);
                    return ApiService.getInstance().request(originalRequest);
                } catch (refreshError) {
                    console.log('Error waiting for token refresh:', refreshError);
                    await storage.removeToken();
                    return true;
                }
            }
            isRefreshing = true;
            originalRequest._retry = true;
            try {
                const refreshPromise = this.refreshAccessToken();
                const timeoutPromise = new Promise<string>((_, reject) => {
                    setTimeout(() => reject(new Error('Token refresh timeout')), MAX_REFRESH_WAIT);
                });
                const newToken = await Promise.race([refreshPromise, timeoutPromise]);
                if (newToken) {
                    refreshSubscribers.forEach(callback => callback(newToken));
                    originalRequest.headers = originalRequest.headers || {};
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    return ApiService.getInstance().request(originalRequest);
                } else {
                    throw new Error('Failed to refresh token');
                }
            } catch (refreshError) {
                console.log('Error refreshing token:', refreshError);
                await storage.removeToken();
                return true;
            } finally {
                isRefreshing = false;
                refreshSubscribers = [];
            }
        } catch (handlerError) {
            console.log('Error handler encountered an error:', handlerError);
            return error;
        }
    }
};