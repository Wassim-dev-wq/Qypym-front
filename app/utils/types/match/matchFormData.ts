import { MatchEnums } from './matchEnums';

export interface MatchFormData {
    title: string;
    date: Date;
    time: Date;
    location: string;
    latitude?: number;
    longitude?: number;
    format: string;
    duration: number;
    skillLevel: MatchEnums['SkillLevel'];
}

export const initialMatchDetails: MatchFormData = {
    title: '',
    date: new Date(),
    time: new Date(),
    location: '',
    format: '',
    duration: 60,
    skillLevel: 'BEGINNER',
    latitude: undefined,
    longitude: undefined
};

export interface CreateMatchRequest {
    title: string;
    startDate: string;
    duration: number;
    format: string;
    location: Location;
    skillLevel: MatchEnums['SkillLevel'];
}
