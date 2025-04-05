import {LocationObject} from 'expo-location';
import {matchesApi} from './matches.api';
import {API_CONFIG, ApiService} from "@/src/core/api/core/axios.config";
import {Match} from '@/src/types/match/match';

export interface PageData<T> {
    content: T[];
    totalPages?: number;
    totalElements?: number;
    size?: number;
    number?: number;
    numberOfElements?: number;
}

export interface PageResponse<T> {
    data: PageData<T>;
    status: string;
    timestamp: string;
    errorCode: string | null;
    message: string | null;
}

export interface LocationFilters {
    skillLevels?: string[];
    distance?: number;
}


export const matchService = {
    fetchByLocation: async (
        location: LocationObject,
        filters: LocationFilters,
        page = 0,
        size = 10
    ): Promise<PageResponse<Match>> => {
        const client = ApiService.getInstance();
        const params = new URLSearchParams({
            page: page.toString(),
            size: size.toString(),
        });

        if (location?.coords) {
            params.append('latitude', String(location.coords.latitude));
            params.append('longitude', String(location.coords.longitude));
        }

        if (filters.distance) {
            params.append('distance', String(filters.distance));
        }

        if (filters.skillLevels && filters.skillLevels.length > 0) {
            const skillLevelParam = filters.skillLevels.map(s => s.toUpperCase()).join(',');
            params.append('skillLevel', skillLevelParam);
        }

        try {
            const response = await client.get(API_CONFIG.ENDPOINTS.MATCH.MATCHES, {params});
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    getUserJoinRequests: matchesApi.getUserJoinRequests,
    getMatchById: matchesApi.getMatchById,
    getJoinRequest: matchesApi.getJoinRequest,
    getMatchDetailsById: matchesApi.getMatchDetailsById,
    saveMatch: matchesApi.saveMatch,
    unsaveMatch: matchesApi.unsaveMatch,
    deleteMatch: matchesApi.deleteMatch,
    getSavedMatches: matchesApi.getSavedMatches,
    join: matchesApi.join,
    leaveMatch: matchesApi.leaveMatch,
    getJoinRequests: matchesApi.getJoinRequests,
    cancelJoinRequest: matchesApi.cancelJoinRequest,
    acceptJoinRequest: matchesApi.acceptJoinRequest,
    rejectJoinRequest: matchesApi.rejectJoinRequest,
    getMatchHistory: matchesApi.getMatchHistory,
    getMatchHistoryDetail: matchesApi.getMatchHistoryDetail,
    searchMatches: matchesApi.searchMatches,

};