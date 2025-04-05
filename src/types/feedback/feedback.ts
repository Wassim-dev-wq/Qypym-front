export interface PlayerRatingResponse {
    playerId: string;
    overallRating: number;
    skillRating: number;
    sportsmanshipRating: number;
    teamworkRating: number;
    reliabilityRating: number;
    totalMatches: number;
    totalRatings: number;
    lastUpdatedAt: string;
}

export interface FeedbackRequestResponse {
    id: string;
    matchId: string;
    matchTitle: string;
    status: 'PENDING' | 'COMPLETED' | 'EXPIRED';
    createdAt: string;
    expiryAt: string;
    feedbackCount: number;
    totalPlayersInMatch: number;
    userHasSubmitted: boolean;
}

export interface PlayerRatingRequest {
    ratedPlayerId: string;
    skillRating?: number;
    sportsmanshipRating?: number;
    teamworkRating?: number;
    reliabilityRating?: number;
    comments?: string;
}

export interface SubmitFeedbackRequest {
    matchRating?: number;
    matchComments?: string;
    playerRatings?: PlayerRatingRequest[];
    team1Id?: string;
    team2Id?: string;
    team1Score?: number;
    team2Score?: number;
}

export interface MatchTeam {
    id: string;
    name: string;
    teamNumber: number;
}

export interface PlayerForRating {
    id: string;
    name: string;
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message: string | null;
}