export interface WeatherResponse {
    weatherId: number;
    temperature: number;
    condition: string;
    humidity: number;
    windSpeed: number;
    cloudCoverage: number;
}

export interface CoordinatesDTO {
    latitude: number;
    longitude: number;
}

export interface LocationDTO {
    address: string;
    coordinates: CoordinatesDTO;
}

export interface MatchTeamResponse {
    id: string;
    name: string;
    teamNumber: number;
    players: MatchPlayerResponse[];
    currentPlayers: number;
    maxPlayers: number;
}

export interface MatchPlayerResponse {
    id: string;
    playerId: string;
    role: string;
    status: string;
    team?: {
        id: string;
        name: string;
        teamNumber: number;
    };
    joinedAt?: string;
}

export interface MatchDetailsResponse {
    id: string;
    title: string;
    startDate: string;
    duration: number;
    format: string;
    location: LocationDTO;
    skillLevel: string;
    status: string;
    creatorId: string;
    createdAt: string;
    updatedAt: string;
    isOwner: boolean;
    saved: boolean;
    savedCount: number;
    players: MatchPlayerResponse[];
    teams: MatchTeamResponse[];
    maxPlayers: number;
    maxPlayersPerTeam: number;
    currentPlayers: number;
    verificationCode: string;
    codeExpiryTime: string;
    weather?: WeatherResponse;
}
