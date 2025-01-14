export type JoinRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface MatchJoinRequestResponse {
    id: string;
    matchId: string;
    userId: string;
    requestStatus: JoinRequestStatus;
    createdAt: string;
    updatedAt: string;
}
