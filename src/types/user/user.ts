export enum UserStatus {
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE",
    SUSPENDED = "SUSPENDED",
    DELETED = "DELETED"
}

export enum PlayerLevel {
    BEGINNER = "BEGINNER",
    INTERMEDIATE = "INTERMEDIATE",
    ADVANCED = "ADVANCED"
}

export enum GenderIdentity {
    MALE = "MALE",
    FEMALE = "FEMALE",
    NON_BINARY = "NON_BINARY",
    OTHER = "OTHER",
    UNKNOWN = "UNKNOWN"
}

export interface RegisterRequest {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
}


export interface User {
    id: string;
    keycloakUserId: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    status: UserStatus;
    playerLevel: PlayerLevel;
    dateOfBirth: string;
    genderIdentity: GenderIdentity;
    bio: string;
    videoIntroUrl: string;
    latitude: number;
    longitude: number;
    preferredDistance: number;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
    isProfileVerified: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface PlayerStats {
    totalMatches: number;
    createdMatches: number;
    upcomingMatches: number;
    reliabilityRate: number;
    preferredFormat: string;
    preferredRole: string;
    roleDistribution: Record<string, number>;
    teamCount: number;
    teamSwitchRate: number;
    activityByMonth: Record<string, number>;
    savedMatches: number;
    matchesCountByStatus: Record<string, number>;
    formatDistribution: Record<string, number>;
    skillDistribution: Record<string, number>;
}