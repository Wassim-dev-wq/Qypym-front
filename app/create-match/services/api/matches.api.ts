import axios from 'axios';
import { axiosInstance } from './axios.config';
import { transformFormDataToRequest } from '@/app/utils/match.transformers';
import { Match } from '@/app/utils/types/match/match';
import { MatchFormData } from '@/app/utils/types/match/matchFormData';
import { MatchResponse } from '@/app/utils/types/match/response/matchResponse';
import { MatchJoinRequestResponse } from '@/app/utils/types/match/response/matchJoinRequestResponse';
import { ApiResponse } from "@/app/utils/types/match/api";

class MatchApiError extends Error {
    constructor(
        message: string,
        public statusCode?: number,
        public errorCode?: string | null
    ) {
        super(message);
        this.name = 'MatchApiError';
    }
}

export const matchesApi = {
    extractData<T>(response: ApiResponse<T>): T {
        return response.data as T;
    },

    create: async (formData: MatchFormData): Promise<Match> => {
        try {
            const payload = transformFormDataToRequest(formData);
            const { data } = await axiosInstance.post<MatchResponse>('/matches', payload);
            return matchesApi.extractData<Match>(data);
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                const apiError = error.response.data as ApiResponse<any>;
                throw new MatchApiError(
                    apiError.data?.message || 'Failed to create match',
                    error.response.status,
                    apiError.data?.errorCode
                );
            }
            throw new MatchApiError(
                error instanceof Error ? error.message : 'Failed to create match'
            );
        }
    },

    getById: async (matchId: string): Promise<Match> => {
        try {
            const { data } = await axiosInstance.get<MatchResponse>(`/matches/${matchId}`);
            return matchesApi.extractData<Match>(data);
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                const apiError = error.response.data as ApiResponse<any>;
                throw new MatchApiError(
                    apiError.data?.message || 'Failed to fetch match details',
                    error.response.status,
                    apiError.data?.errorCode
                );
            }
            throw new MatchApiError(
                error instanceof Error ? error.message : 'Failed to fetch match details'
            );
        }
    },

    getJoinById: async (matchId: string): Promise<MatchJoinRequestResponse | null> => {
        try {
            const { data } = await axiosInstance.get<MatchJoinRequestResponse>(`/matches/${matchId}/join`);
            return matchesApi.extractData<MatchJoinRequestResponse>(data);
        } catch (error) {
            if (axios.isAxiosError(error) &&
                error.response?.status === 404 &&
                error.response.data?.errorCode === 'JOIN_REQUEST_NOT_FOUND') {
                return null;
            }
            // Re-throw other errors
            throw error;
        }
    },

    join: async (matchId: string): Promise<MatchJoinRequestResponse> => {
        try {
            const { data } = await axiosInstance.post<MatchJoinRequestResponse>(`/matches/${matchId}/join`);
            return matchesApi.extractData<MatchJoinRequestResponse>(data);
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                const apiError = error.response.data as ApiResponse<any>;
                throw new MatchApiError(
                    apiError.data?.message || 'Failed to join match',
                    error.response.status,
                    apiError.data?.errorCode
                );
            }
            throw new MatchApiError(
                error instanceof Error ? error.message : 'Failed to join match'
            );
        }
    }
} as const;

export type { MatchApiError };
