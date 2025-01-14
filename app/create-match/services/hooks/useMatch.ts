import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {MatchApiError, matchesApi} from '@/app/create-match/services/api/matches.api';
import { Match } from '@/app/utils/types/match/match';
import {MatchJoinRequestResponse} from "@/app/utils/types/match/response/matchJoinRequestResponse";
import axios from "axios";

export const useMatch = (matchId: string) => {
    return useQuery<Match, MatchApiError>({
        queryKey: ['match', matchId],
        queryFn: () => matchesApi.getById(matchId),
        enabled: !!matchId,
        staleTime: 1000 * 60 * 5,
        retry: 1,
    });
};

export const useMatchJoin = (matchId: string) => {
    return useQuery<MatchJoinRequestResponse | null, MatchApiError>({
        queryKey: ['matchJoin', matchId],
        queryFn: () => matchesApi.getJoinById(matchId),
        enabled: !!matchId,
        staleTime: 1000 * 60 * 5,
        retry: false,
    });
};

export const useJoinMatch = () => {
    const queryClient = useQueryClient();

    return useMutation<MatchJoinRequestResponse, MatchApiError, string>({
        mutationFn: (matchId: string) => matchesApi.join(matchId),
        onSuccess: () => {
            queryClient.invalidateQueries(['matchJoin']);
        },
    });
};