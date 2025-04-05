export interface Place {
    id: string;
    name: string;
    address: string;
    coordinates?: {
        latitude: number;
        longitude: number;
    };
    distance?: number;
    isValidated?: boolean;
}

export interface Filters {
    searchQuery: string;
    skillLevels: string[];
    formats: string[];
    statuses: string[];
    distance: number;
    location: Place | null;
    timeOfDay: string[];
    ageRange: [number, number];
    minPlayers: number;
    sortBy: any;
}
