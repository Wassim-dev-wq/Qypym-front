import { MatchEnums } from './matchEnums';

export type MatchStatus = MatchEnums['Status'];

export function isValidMatchStatus(status: string): status is MatchStatus {
    const validStatuses: MatchStatus[] = ['DRAFT', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    return validStatuses.includes(status as MatchStatus);
}

export interface SkillLevelOption {
    id: MatchEnums['SkillLevel'];
    icon: string;
    labelKey: string;
}

export const SKILL_LEVELS: SkillLevelOption[] = [
    { id: 'BEGINNER', icon: 'star-outline', labelKey: 'beginner' },
    { id: 'INTERMEDIATE', icon: 'star-half', labelKey: 'intermediate' },
    { id: 'ADVANCED', icon: 'star', labelKey: 'advanced'},
    { id: 'ALL', icon: 'star', labelKey: 'all' }
];

export interface MatchFormatOption {
    format: string;
    labelKey: string;
}

export const MATCH_FORMATS: MatchFormatOption[] = [
    { format: '5v5', labelKey: 'format5v5' },
    { format: '7v7', labelKey: 'format7v7' },
    { format: '11v11', labelKey: 'format11v11' },
    { format: 'Other', labelKey: 'formatOther' },
];
