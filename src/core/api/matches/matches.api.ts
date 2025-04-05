import axios from 'axios';
import {transformFormDataToRequest} from '@/src/utils/match.transformers';
import {API_CONFIG, ApiService} from "@/src/core/api/core/axios.config";
import {PageResponse} from "@/src/core/api/matches/matchesService";
import {MatchFormData} from "@/src/types/match/matchFormData";
import {MatchResponse} from "@/src/types/match/response/matchResponse";
import {ApiResponse} from "@/src/types/match/api";
import {FilterMatchesRequest, Match} from "@/src/types/match/match";
import {MatchDetailsResponse} from "@/src/types/match/matchDetails";
import {MatchJoinRequestDto, MatchJoinRequestResponse} from "@/src/types/match/response/matchJoinRequestResponse";


export class MatchApiError extends Error {
    constructor(
        message: string,
        public statusCode?: number,
        public errorCode?: string | null
    ) {
        super(message);
        this.name = 'MatchApiError';
    }
}

function mapFormat(fmt: string): string {
    switch (fmt.toLowerCase()) {
        case '5v5':
            return 'FIVE_V_FIVE';
        case '7v7':
            return 'SEVEN_V_SEVEN';
        case '11v11':
            return 'ELEVEN_V_ELEVEN';
        case 'other':
            return 'OTHER';
        default:
            return fmt.toUpperCase();
    }
}

function extractData<T>(response: ApiResponse<T>): T {
    return response.data as T;
}


export const matchesApi = {
    create: async (formData: MatchFormData): Promise<Match> => {
        try {
            const payload = transformFormDataToRequest(formData);
            const client = ApiService.getInstance();
            const {data} = await client.post<MatchResponse>(
                API_CONFIG.ENDPOINTS.MATCH.MATCHES,
                payload
            );
            return extractData<Match>(data);
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

    getMatchById: async (matchId: string): Promise<Match> => {
        try {
            const client = ApiService.getInstance();
            const {data} = await client.get<MatchResponse>(
                API_CONFIG.ENDPOINTS.MATCH.MATCH_BY_ID(matchId)
            );
            return extractData<Match>(data);
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

    searchMatches: async (
        filters: FilterMatchesRequest,
        page = 0,
        size = 10
    ): Promise<PageResponse<Match>> => {
        const client = ApiService.getInstance();
        const params = new URLSearchParams();

        params.append('page', String(page));
        params.append('size', String(size));

        if (filters.searchQuery && filters.searchQuery.trim() !== '') {
            params.append('searchQuery', filters.searchQuery.trim());
        }
        if (filters.latitude != null && filters.longitude != null) {
            params.append('latitude', String(filters.latitude));
            params.append('longitude', String(filters.longitude));
        }
        if (filters.distance) {
            params.append('distance', String(filters.distance));
        }
        if (filters.skillLevels && filters.skillLevels.length > 0) {
            filters.skillLevels.forEach(lvl => {
                params.append('skillLevels', lvl);
            });
        }
        if (filters.statuses && filters.statuses.length > 0) {
            filters.statuses.forEach(st => {
                params.append('statuses', st);
            });
        }
        if (filters.formats && filters.formats.length > 0) {
            filters.formats.forEach(fmt => {
                const mappedFormat = mapFormat(fmt);
                params.append('formats', mappedFormat);
            });
        }
        const url = `${API_CONFIG.ENDPOINTS.MATCH.MATCHES_SEARCH}?${params.toString()}`;
        try {
            console.log("url", url);
            const {data} = await client.get<PageResponse<Match>>(url);
            console.log(data.data.content);
            return data;
        } catch (error) {
            throw error;
        }
    },

    getMatchDetailsById: async (matchId: string): Promise<MatchDetailsResponse> => {
        try {
            const client = ApiService.getInstance();
            const {data} = await client.get<ApiResponse<MatchDetailsResponse>>(
                API_CONFIG.ENDPOINTS.MATCH.MATCH_DETAILS(matchId)
            );
            return extractData<MatchDetailsResponse>(data);
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

    saveMatch: async (matchId: string): Promise<void> => {
        try {
            const client = ApiService.getInstance();
            await client.post<void>(API_CONFIG.ENDPOINTS.MATCH.SAVE_MATCH(matchId), null);
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                const apiError = error.response.data as ApiResponse<any>;
                throw new MatchApiError(
                    apiError.data?.message || 'Failed to save match',
                    error.response.status,
                    apiError.data?.errorCode
                );
            }
            throw new MatchApiError(
                error instanceof Error ? error.message : 'Failed to save match'
            );
        }
    },

    getMatchHistory: async (page = 0, size = 20) => {
        try {
            const client = ApiService.getInstance();
            const {data} = await client.get(
                API_CONFIG.ENDPOINTS.MATCH.MATCH_HISTORY,
                {
                    params: {
                        page,
                        size,
                    }
                }
            );
            return extractData(data);
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                const apiError = error.response.data;
                throw new MatchApiError(
                    apiError.message || 'Failed to fetch match history',
                    error.response.status,
                    apiError.errorCode
                );
            }
            throw new MatchApiError(
                error instanceof Error ? error.message : 'Failed to fetch match history'
            );
        }
    },

    getMatchHistoryDetail: async (matchId: string) => {
        try {
            const client = ApiService.getInstance();
            const {data} = await client.get(
                API_CONFIG.ENDPOINTS.MATCH.MATCH_HISTORY_DETAIL(matchId)
            );
            return extractData(data);
        } catch (error) {
            throw error;
        }
    },

    deleteMatch: async (matchId: string): Promise<void> => {
        try {
            const client = ApiService.getInstance();
            await client.delete<void>(API_CONFIG.ENDPOINTS.MATCH.MATCH_DELETE(matchId));
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                const apiError = error.response.data as ApiResponse<any>;
                throw new MatchApiError(
                    apiError.data?.message || 'Failed to delete match',
                    error.response.status,
                    apiError.data?.errorCode
                );
            }
            throw new MatchApiError(
                error instanceof Error ? error.message : 'Failed to delete match'
            );
        }
    },

    unsaveMatch: async (matchId: string): Promise<void> => {
        try {
            const client = ApiService.getInstance();
            await client.delete<void>(API_CONFIG.ENDPOINTS.MATCH.SAVE_MATCH(matchId));
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                const apiError = error.response.data as ApiResponse<any>;
                throw new MatchApiError(
                    apiError.data?.message || 'Failed to unsave match',
                    error.response.status,
                    apiError.data?.errorCode
                );
            }
            throw new MatchApiError(
                error instanceof Error ? error.message : 'Failed to unsave match'
            );
        }
    },

    getSavedMatches: async (): Promise<Match[]> => {
        try {
            const client = ApiService.getInstance();
            const {data} = await client.get<ApiResponse<Match[]>>(
                API_CONFIG.ENDPOINTS.MATCH.SAVED_MATCHES
            );
            return extractData<Match[]>(data);
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                const apiError = error.response.data as ApiResponse<any>;
                throw new MatchApiError(
                    apiError.data?.message || 'Failed to fetch saved matches',
                    error.response.status,
                    apiError.data?.errorCode
                );
            }
            throw new MatchApiError(
                error instanceof Error ? error.message : 'Failed to fetch saved matches'
            );
        }
    },

    leaveMatch: async (matchId: string, requestId?: string): Promise<void> => {
        try {
            const client = ApiService.getInstance();
            if (requestId) {
                await client.delete<void>(
                    `${API_CONFIG.ENDPOINTS.PLAYER.LEAVE_MATCH(matchId, requestId as string)}`
                );
            }
        } catch (error) {
            throw error;
        }
    },

    join: async (matchId: string, request: MatchJoinRequestDto): Promise<MatchJoinRequestResponse> => {
        try {
            const client = ApiService.getInstance();
            const {data} = await client.post<ApiResponse<MatchJoinRequestResponse>>(
                API_CONFIG.ENDPOINTS.MATCH.JOIN_MATCH(matchId),
                request
            );
            return extractData<MatchJoinRequestResponse>(data);
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
    },

    getUserJoinRequests: async (): Promise<MatchJoinRequestResponse[]> => {
        try {
            const client = ApiService.getInstance();
            const {data} = await client.get<ApiResponse<MatchJoinRequestResponse[]>>(
                API_CONFIG.ENDPOINTS.REQUESTS.GET_MY_REQUESTS()
            );
            return extractData<MatchJoinRequestResponse[]>(data);
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                const apiError = error.response.data as ApiResponse<any>;
                throw new MatchApiError(
                    apiError.data?.message || 'Failed to fetch join requests',
                    error.response.status,
                    apiError.data?.errorCode
                );
            }
            throw new MatchApiError(
                error instanceof Error ? error.message : 'Failed to fetch join requests'
            );
        }
    },

    getJoinRequest: async (matchId: string): Promise<MatchJoinRequestResponse> => {
        try {
            const client = ApiService.getInstance();
            const {data} = await client.get<ApiResponse<MatchJoinRequestResponse>>(
                API_CONFIG.ENDPOINTS.MATCH.GET_REQUEST(matchId)
            );
            return extractData<MatchJoinRequestResponse>(data);
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                const apiError = error.response.data as ApiResponse<any>;
                throw new MatchApiError(
                    apiError.data?.message || 'Failed to fetch join requests',
                    error.response.status,
                    apiError.data?.errorCode
                );
            }
            throw new MatchApiError(
                error instanceof Error ? error.message : 'Failed to fetch join requests'
            );
        }
    },

    getJoinRequests: async (matchId: string): Promise<MatchJoinRequestResponse[]> => {
        try {
            const client = ApiService.getInstance();
            const {data} = await client.get<ApiResponse<MatchJoinRequestResponse[]>>(
                API_CONFIG.ENDPOINTS.MATCH.JOIN_REQUESTS(matchId)
            );
            return extractData<MatchJoinRequestResponse[]>(data);
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                const apiError = error.response.data as ApiResponse<any>;
                throw new MatchApiError(
                    apiError.data?.message || 'Failed to fetch join requests',
                    error.response.status,
                    apiError.data?.errorCode
                );
            }
            throw new MatchApiError(
                error instanceof Error ? error.message : 'Failed to fetch join requests'
            );
        }
    },

    cancelJoinRequest: async (matchId: string, requestId?: string): Promise<MatchJoinRequestResponse> => {
        try {
            const client = ApiService.getInstance();
            const {data} = await client.delete<ApiResponse<MatchJoinRequestResponse>>(
                `${API_CONFIG.ENDPOINTS.MATCH.JOIN_REQUEST(matchId, requestId as string)}/cancel`
            );
            return extractData<MatchJoinRequestResponse>(data);
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                const apiError = error.response.data as ApiResponse<any>;
                throw new MatchApiError(
                    apiError.data?.message || 'Failed to cancel join request',
                    error.response.status,
                    apiError.data?.errorCode
                );
            }
            throw new MatchApiError(
                error instanceof Error ? error.message : 'Failed to cancel join request'
            );
        }
    },

    acceptJoinRequest: async (
        matchId: string,
        requestId: string,
        assignedTeamId?: string
    ): Promise<MatchJoinRequestResponse> => {
        try {
            const client = ApiService.getInstance();
            const url = assignedTeamId
                ? `${API_CONFIG.ENDPOINTS.MATCH.JOIN_REQUEST(matchId, requestId)}/accept?assignedTeamId=${assignedTeamId}`
                : `${API_CONFIG.ENDPOINTS.MATCH.ACCEPT_JOIN_REQUEST(requestId)}`;

            const {data} = await client.patch<ApiResponse<MatchJoinRequestResponse>>(url);
            return extractData<MatchJoinRequestResponse>(data);
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                const apiError = error.response.data as ApiResponse<any>;
                throw new MatchApiError(
                    apiError.data?.message || 'Failed to accept join request',
                    error.response.status,
                    apiError.data?.errorCode
                );
            }
            throw new MatchApiError(
                error instanceof Error ? error.message : 'Failed to accept join request'
            );
        }
    },

    rejectJoinRequest: async (matchId: string, requestId: string): Promise<MatchJoinRequestResponse> => {
        try {
            const client = ApiService.getInstance();
            const {data} = await client.patch<ApiResponse<MatchJoinRequestResponse>>(
                `${API_CONFIG.ENDPOINTS.MATCH.JOIN_REQUEST(matchId, requestId)}/reject`
            );
            return extractData<MatchJoinRequestResponse>(data);
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                const apiError = error.response.data as ApiResponse<any>;
                throw new MatchApiError(
                    apiError.data?.message || 'Failed to reject join request',
                    error.response.status,
                    apiError.data?.errorCode
                );
            }
            throw new MatchApiError(
                error instanceof Error ? error.message : 'Failed to reject join request'
            );
        }
    }
};