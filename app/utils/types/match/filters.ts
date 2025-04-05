export interface Filters {
    priceRange: [number, number];
    skillLevel: string;
    timeOfDay: string[];
    matchType: string;
    distance: number;
    facilities: string[];
    availability: string[];
    ageRange: [number, number];
    location: string;
}
