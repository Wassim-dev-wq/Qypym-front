export type JoinRequestStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELED' | 'LEFT' | 'NOT_REQUESTED';

export interface MatchJoinRequestDto {
    preferredTeamId?: string;
    message?: string;
    position?: string;
    experience?: string;
    personalNote?: string;
    available: boolean;
}

export interface MatchJoinRequestResponse {
    id: string;
    matchId: string;
    userId: string;
    preferredTeamId?: string;
    message?: string;
    position?: string;
    experience?: string;
    personalNote?: string;
    available: boolean;
    requestStatus: JoinRequestStatus;
    createdAt: string;
    updatedAt: string;
}
