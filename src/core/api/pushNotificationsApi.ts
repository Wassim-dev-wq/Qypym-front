import { API_CONFIG, ApiService } from "@/src/core/api/core/axios.config";

export interface RegisterPushTokenParams {
    userId: string;
    token: string;
    platform: "ios" | "android" | "macos" | "windows" | "web";
}

export interface UserPushTokenResponse {
    id: string;
    expoToken: string;
    createdAt: string;
}

export const pushNotificationsApi = {

    async registerPushToken(
        params: RegisterPushTokenParams
    ): Promise<UserPushTokenResponse> {
        try {
            console.log("Registering push token:", params);
            const response = await ApiService.getInstance().post(
                API_CONFIG.ENDPOINTS.NOTIFICATIONS.REGISTER_TOKEN,
                params
            );
            return response.data;
        } catch (error) {
            console.error("Error registering push token:", error);
            throw error;
        }
    },

    async deletePushToken(
        userId: string,
        expoToken: string
    ): Promise<void> {
        try {
            await ApiService.getInstance().delete(
                API_CONFIG.ENDPOINTS.NOTIFICATIONS.DELETE_TOKEN,
                {
                    params: {expoToken},
                }
            );
        } catch (error) {
            console.error("Error deleting push token:", error);
            throw error;
        }
    },

    async getPushTokens(
        userId: string
    ): Promise<UserPushTokenResponse[]> {
        try {
            const response = await ApiService.getInstance().get(
                API_CONFIG.ENDPOINTS.NOTIFICATIONS.GET_TOKENS
            );
            return response.data;
        } catch (error) {
            console.error("Error fetching push tokens:", error);
            throw error;
        }
    },
};