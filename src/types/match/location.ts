export interface Coordinates {
    latitude: number;
    longitude: number;
}

export interface Location {
    address: string;
    coordinates: Coordinates;
}