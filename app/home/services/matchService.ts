import {LocationObject} from 'expo-location';
import * as Crypto from 'expo-crypto';
import {Match} from '../../utils/types/match/match';
import {MatchesApiService} from "@/components/api/matchesApiService";

interface PageData<T> {
    content: T[];
}

interface PageResponse<T> {
    data: PageData<T>;
    status: string;
    timestamp: string;
    errorCode: string | null;
    message: string | null;
}

interface Filters {
    skillLevel?: string;
    distance?: number;
}

export async function fetchMatchesFromAPI(
    location: LocationObject,
    filters: Filters,
    page = 0,
    size = 10
): Promise<PageResponse<Match>> {
    const api = MatchesApiService.getInstance();

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
    if (filters.skillLevel) {
        params.append('skillLevel', filters.skillLevel.toUpperCase());
    }

    try {
        const response = await api.get('/api/v1/matches', {
            params,
            headers: {
                'X-Correlation-ID': Crypto.randomUUID(),
            }
        })

        return response.data;
    } catch (error) {
        throw error;
    }
}