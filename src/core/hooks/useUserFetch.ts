import {useQuery} from '@tanstack/react-query';
import axios from 'axios';
import { User } from '@/src/types/user/user';
import {API_CONFIG, ApiService} from "@/src/core/api/core/axios.config";
import * as ExpoFileSystem from 'expo-file-system';
import {ApiResponse} from "@/src/types/match/api";
import {profileResponse} from "@/src/types/user/response/profileResponse";

export const userApi = {
    getById: async (userId: string): Promise<User> => {
        try {
            const {data} = await ApiService.getInstance().get<ApiResponse<profileResponse>>(
                API_CONFIG.ENDPOINTS.USERS.GET_BY_ID(userId)
            );
            return data.data as unknown as User;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                const apiError = error.response.data as ApiResponse<any>;
                throw new Error(apiError.data?.message || 'Failed to fetch user details');
            }
            throw error;
        }
    },

    getCurrentUser: async (): Promise<User> => {
        try {
            const {data} = await ApiService.getInstance().get<ApiResponse<profileResponse>>(
                API_CONFIG.ENDPOINTS.USERS.GET_CURRENT
            );
            return data.data as unknown as User;
        } catch (error) {
            throw error;
        }
    },

    updateCurrentUser: async (user: Partial<User>): Promise<User> => {
        try {
            const {data} = await ApiService.getInstance().put<ApiResponse<profileResponse>>(
                API_CONFIG.ENDPOINTS.USERS.UPDATE_CURRENT,
                user
            );
            return data.data as unknown as User;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                const apiError = error.response.data as ApiResponse<any>;
                throw new Error(apiError.data?.message || 'Failed to update user details');
            }
            throw error;
        }
    },

    uploadProfilePhoto: async (photoUri: string): Promise<User> => {
        try {
            const formData = new FormData();

            const fileInfo = await ExpoFileSystem.getInfoAsync(photoUri);
            if (!fileInfo.exists) {
                throw new Error('File does not exist');
            }

            const fileName = photoUri.split('/').pop() || 'photo.jpg';

            const fileType = fileName.endsWith('.png')
                ? 'image/png'
                : fileName.endsWith('.gif')
                    ? 'image/gif'
                    : 'image/jpeg';

            formData.append('file', {
                uri: photoUri,
                name: fileName,
                type: fileType,
            } as any);

            const {data} = await ApiService.getInstance().post<ApiResponse<profileResponse>>(
                API_CONFIG.ENDPOINTS.USERS.UPLOAD_PHOTO,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );

            return data.data as unknown as User;
        } catch (error) {
            console.error('Photo upload error:', error);
            if (axios.isAxiosError(error) && error.response) {
                const apiError = error.response.data as ApiResponse<any>;
                throw new Error(apiError.data?.message || 'Failed to upload profile photo');
            }
            throw error;
        }
    },

    getProfilePhoto: async (userId: string): Promise<string> => {
        try {
            const response = await ApiService.getInstance().get(
                userId ? API_CONFIG.ENDPOINTS.USERS.GET_PHOTO(userId) : API_CONFIG.ENDPOINTS.USERS.GET_MY_PHOTO,
                { responseType: 'blob' }
            );

            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    resolve(reader.result as string);
                };
                reader.onerror = reject;
                reader.readAsDataURL(response.data);
            });
        } catch (error) {
            console.error('Failed to fetch profile photo:', error);
            throw error;
        }
    },

    deleteProfilePhoto: async (): Promise<User> => {
        try {
            const {data} = await ApiService.getInstance().delete<ApiResponse<profileResponse>>(
                API_CONFIG.ENDPOINTS.USERS.DELETE_PHOTO
            );
            return data.data as unknown as User;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                const apiError = error.response.data as ApiResponse<any>;
                throw new Error(apiError.data?.message || 'Failed to delete profile photo');
            }
            throw error;
        }
    }

};

export const useUser = (userId: string) => {
    return useQuery<User, Error>({
        queryKey: ['user', userId],
        queryFn: () => userApi.getById(userId),
        enabled: !!userId,
        staleTime: 60000,
        retry: 1,
    });
};

export const useCurrentUser = () => {
    return useQuery<User, Error>({
        queryKey: ['currentUser'],
        queryFn: () => userApi.getCurrentUser(),
        staleTime: 60000,
        retry: 1,
    });
};

export const useProfilePhoto = (userId: string) => {
    return useQuery<string, Error>({
        queryKey: ['profilePhoto', userId],
        queryFn: () => userApi.getProfilePhoto(userId),
        enabled: !!userId,
        staleTime: 60000,
        retry: 1,
    });
}
