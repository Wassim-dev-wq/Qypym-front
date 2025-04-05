import { MatchEnums } from './matchEnums';
import { Location } from './location';

export interface Match {
    id: string;
    title: string;
    description?: string;
    createdAt: string;
    updatedAt: string | null;
    startDate: string;
    duration: number;
    format: string;
    skillLevel: MatchEnums['SkillLevel'];
    matchType: string;
    location: Location;
    creatorId: string;
    status: MatchEnums['Status'];
}
