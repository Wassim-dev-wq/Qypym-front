import axios from 'axios';
import * as Crypto from 'expo-crypto';
import {MatchDetails} from "@/app/create-match/types/matches";

const MATCHES_API = 'http://192.168.1.165:9091/api/v1/matches';
const axiosInstance = axios.create();

axiosInstance.interceptors.request.use(request => {
    console.log('Request:', {
        url: request.url,
        method: request.method?.toUpperCase(),
        headers: request.headers,
        body: request.data
    });
    return request;
});

axiosInstance.interceptors.response.use(
    response => {
        console.log('Response:', {
            status: response.status,
            data: response.data
        });
        return response;
    },
    error => {
        console.error('Error:', {
            status: error.response?.status,
            data: error.response?.data
        });
        return Promise.reject(error);
    }
);
const formatZonedDateTime = (date: Date, time: Date): string => {
    const d = new Date(date);
    d.setHours(time.getHours(), time.getMinutes(), 0);
    return d.toISOString().slice(0, 19) + '+00:00';
};

interface CreateMatchPayload {
    title: string;
    startDate: string;
    duration: number;
    format: string;
    location: LocationDTO;
    skillLevel: SkillLevel;
}

interface LocationDTO {
    address: string;
    coordinates: CoordinatesDTO;
}

interface CoordinatesDTO {
    latitude: number;
    longitude: number;
}

enum SkillLevel {
    BEGINNER = 'BEGINNER',
    INTERMEDIATE = 'INTERMEDIATE',
    ADVANCED = 'ADVANCED'
}

export const createMatch = async (matchDetails: MatchDetails, userId: string) => {
    const payload: CreateMatchPayload = {
        title: matchDetails.title,
        startDate: formatZonedDateTime(matchDetails.date, matchDetails.time),
        duration: matchDetails.duration,
        format: matchDetails.format.toLowerCase(),
        location: {
            address: matchDetails.location,
            coordinates: {
                latitude: matchDetails.latitude!,
                longitude: matchDetails.longitude!
            }
        },
        skillLevel: matchDetails.skillLevel.toUpperCase() as SkillLevel
    };
    console.log('Request Payload:', {
        url: MATCHES_API,
        method: 'POST',
        headers: {
            'X-User-ID': userId,
            'X-Correlation-ID': Crypto.randomUUID()
        },
        body: payload
    });

    return axiosInstance.post(MATCHES_API, payload, {
        headers: {
            'X-User-ID': userId,
            'X-Correlation-ID': Crypto.randomUUID(),
            'Content-Type': 'application/json'
        }
    });
};