export type MatchStatus = 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type SkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'SEMI_PRO' | 'PRO';

interface Coordinates {
    latitude: number;
    longitude: number;
}

interface Location {
    address: string;
    coordinates: Coordinates;
}

export interface Match {
    id: string;
    title: string;
    startDate: string;
    duration: number;
    format: string;
    location: Location;
    status: MatchStatus;
    skillLevel: SkillLevel;
    creatorId: string;
    createdAt: string;
    updatedAt?: string;
}