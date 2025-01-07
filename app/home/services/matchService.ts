import { LocationObject } from 'expo-location';
import * as Crypto from 'expo-crypto';
import { Match } from '../types/Match';

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
    const baseUrl = 'http://192.168.1.165:9091/api/v1/matches';
    const url = new URL(baseUrl);

    url.searchParams.append('page', page.toString());
    url.searchParams.append('size', size.toString());

    // If we have lat/lon from device location
    if (location?.coords) {
        url.searchParams.append('latitude', String(location.coords.latitude));
        url.searchParams.append('longitude', String(location.coords.longitude));
    }

    // If the user set a distance filter
    if (filters.distance) {
        url.searchParams.append('distance', String(filters.distance));
    }

    // If skill level is set
    if (filters.skillLevel) {
        url.searchParams.append('skillLevel', filters.skillLevel.toUpperCase());
    }

    console.log('Request URL:', url.toString());

    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-User-ID': 'f8c3de3d-1fea-4d7c-a8b0-29f63c4c3454',
            'X-Correlation-ID': Crypto.randomUUID(),
        },
    });

    if (!response.ok) {
        throw new Error(`Network response was not ok. Status: ${response.status}`);
    }

    const data = await response.json();
    console.log('API Response:', data);
    return data;
}
