import {useCallback, useEffect, useState} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {LocationObject} from 'expo-location';
import {LocationFilters, matchService, PageResponse} from './matchesService';
import {useAuth} from '@/src/core/api/auth/useAuth';
import {MatchJoinRequestDto, MatchJoinRequestResponse} from "@/src/types/match/response/matchJoinRequestResponse";
import {MatchDetailsResponse} from "@/src/types/match/matchDetails";
import {FilterMatchesRequest, Match} from '@/src/types/match/match';

export function useMatchListData({
                                     location,
                                     filters,
                                 }: {
    location: LocationObject | null;
    filters: LocationFilters;
}) {
    const [matches, setMatches] = useState<Match[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);

    useEffect(() => {
        const doFetch = async () => {
            if (!location) {
                setIsLoading(false);
                return;
            }
            try {
                setIsLoading(true);
                const response = await matchService.fetchByLocation(location, filters, page);
                setMatches(response.data.content || []);
            } catch (err) {
                console.error('Failed to fetch matches:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setIsLoading(false);
            }
        };

        doFetch();
    }, [location, filters, page]);

    const loadMore = () => setPage((prev) => prev + 1);
    const refresh = () => {
        setPage(0);
        setMatches([]);
    };

    return {
        matches,
        isLoading,
        error,
        loadMore,
        refresh,
    };
}


export function useMatchDetails(matchId: string) {
    const queryClient = useQueryClient();

    const matchQuery = useQuery<MatchDetailsResponse>({
        queryKey: ['match-details', matchId],
        queryFn: () => matchService.getMatchDetailsById(matchId),
        enabled: !!matchId,
        staleTime: 30000,
    });

    const joinRequestQuery = useQuery({
        queryKey: ['match-join-request', matchId],
        queryFn: () => matchService.getJoinRequest(matchId),
        enabled: !!matchId,
    });

    const toggleSaveMutation = useMutation({
        mutationFn: (isSaved: boolean) =>
            isSaved
                ? matchService.unsaveMatch(matchId)
                : matchService.saveMatch(matchId),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['match-details', matchId]});
            queryClient.invalidateQueries({queryKey: ['savedMatches']});
        },
    });

    const joinMatchMutation = useMutation({
        mutationFn: (request: MatchJoinRequestDto) =>
            matchService.join(matchId, request),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['match-join-request', matchId]});
            queryClient.invalidateQueries({queryKey: ['match-details', matchId]});
        },
    });

    const leaveMatchMutation = useMutation({
        mutationFn: (requestId?: string) =>
            matchService.leaveMatch(matchId, requestId),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['match-join-request', matchId]});
            queryClient.invalidateQueries({queryKey: ['match-details', matchId]});
        },
    });

    const cancelJoinMutation = useMutation({
        mutationFn: (requestId?: string) =>
            matchService.cancelJoinRequest(matchId, requestId),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['match-join-request', matchId]});
            queryClient.invalidateQueries({queryKey: ['match-details', matchId]});
        },
    });

    return {
        match: matchQuery.data,
        joinRequest: joinRequestQuery.data,
        isLoading: matchQuery.isLoading || joinRequestQuery.isLoading,
        isError: matchQuery.isError || joinRequestQuery.isError,
        error: matchQuery.error || joinRequestQuery.error,
        toggleSave: toggleSaveMutation.mutate,
        joinMatch: joinMatchMutation.mutate,
        cancelJoin: cancelJoinMutation.mutate,
        leaveMatch: leaveMatchMutation.mutate,
        isJoining: joinMatchMutation.isPending,
        isCancelling: cancelJoinMutation.isPending,
        isLeaving: leaveMatchMutation.isPending,
        isSaving: toggleSaveMutation.isPending,
    };
}

export function useMatchHistory(page = 0, size = 20) {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const {data, isLoading, isError, error, refetch} = useQuery({
        queryKey: ['match-history', page, size],
        queryFn: () => matchService.getMatchHistory(page, size),
        staleTime: 5 * 60 * 1000,
    });
    const onRefresh = useCallback(async () => {
        setIsRefreshing(true);
        try {
            await refetch();
        } finally {
            setIsRefreshing(false);
        }
    }, [refetch]);

    return {
        data,
        isLoading: isLoading && !isRefreshing,
        isRefreshing,
        isError,
        error,
        refetch,
        onRefresh,
    };
}

export function useMatchHistoryDetail(matchId: string) {
    const {data, isLoading, isError, error, refetch} = useQuery({
        queryKey: ['match-history-detail', matchId],
        queryFn: () => matchService.getMatchHistoryDetail(matchId),
        enabled: !!matchId,
        staleTime: 5 * 60 * 1000,
    });

    return {
        match: data,
        isLoading,
        isError,
        error,
        refetch,
    };
}

export function useMatchJoinRequestActions(matchId: string) {
    const queryClient = useQueryClient();

    const acceptMutation = useMutation({
        mutationFn: (requestId: string) =>
            matchService.acceptJoinRequest(matchId, requestId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['match-join-requests', matchId]
            });
            queryClient.invalidateQueries({
                queryKey: ['match-details', matchId]
            });
        }
    });

    const rejectMutation = useMutation({
        mutationFn: (requestId: string) =>
            matchService.rejectJoinRequest(matchId, requestId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['match-join-requests', matchId]
            });
            queryClient.invalidateQueries({
                queryKey: ['match-details', matchId]
            });
        }
    });

    return {
        acceptRequest: acceptMutation.mutate,
        rejectRequest: rejectMutation.mutate,
        isPending: {
            accept: acceptMutation.isPending,
            reject: rejectMutation.isPending
        },
        error: acceptMutation.error || rejectMutation.error
    };
}


export function useHostJoinRequests(matchId?: string) {
    const {data, isLoading} = useQuery<MatchJoinRequestResponse[]>({
        queryKey: ['match-join-requests', matchId],
        queryFn: () => {
            if (!matchId) throw new Error('matchId is required');
            return matchService.getJoinRequests(matchId);
        },
        enabled: !!matchId,
        staleTime: 30_000,
    });

    const pendingRequests = data?.filter((r) => r.requestStatus === 'PENDING') || [];
    const acceptedRequests = data?.filter((r) => r.requestStatus === 'ACCEPTED') || [];
    const rejectedRequests = data?.filter((r) => r.requestStatus === 'DECLINED') || [];

    return {
        pendingRequests,
        acceptedRequests,
        rejectedRequests,
        isLoading,
    };
}


const SAVED_MATCHES_KEY = 'savedMatches';

export function useSavedMatches() {
    const {user} = useAuth();
    const queryClient = useQueryClient();

    const {data: savedMatchIds = new Set(), refetch} = useQuery({
        queryKey: [SAVED_MATCHES_KEY, user?.id],
        queryFn: async () => {
            const matches = await matchService.getSavedMatches();
            return new Set(matches.map(match => match.id) || []);
        },
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        enabled: !!user?.id,
    });

    const enhanceMatchesWithSavedStatus = useCallback((matches: any[]) => {
        if (!matches) return [];
        return matches.map(match => ({
            ...match,
            isSaved: savedMatchIds.has(match.id)
        }));
    }, [savedMatchIds]);

    const toggleSaveMatch = useCallback(async (matchId: string) => {
        try {
            const isCurrentlySaved = savedMatchIds.has(matchId);
            const updateQueries = () => {
                queryClient.setQueryData([SAVED_MATCHES_KEY, user?.id], (oldSet: Set<string> = new Set()) => {
                    const newSet = new Set(oldSet);
                    if (isCurrentlySaved) {
                        newSet.delete(matchId);
                    } else {
                        newSet.add(matchId);
                    }
                    return newSet;
                });

                queryClient.setQueriesData(
                    {queryKey: ['matches']},
                    (old: any) => {
                        if (!old) return old;
                        if (Array.isArray(old)) {
                            return old.map(match =>
                                match.id === matchId
                                    ? {...match, isSaved: !isCurrentlySaved}
                                    : match
                            );
                        }
                        return old;
                    }
                );
            };

            updateQueries();

            if (isCurrentlySaved) {
                await matchService.unsaveMatch(matchId);
            } else {
                await matchService.saveMatch(matchId);
            }
            await refetch();
        } catch (error) {
            console.error('Error toggling save status:', error);
            await queryClient.invalidateQueries({queryKey: [SAVED_MATCHES_KEY, user?.id]});
            await queryClient.invalidateQueries({queryKey: ['matches']});
            throw error;
        }
    }, [savedMatchIds, queryClient, refetch, user?.id]);

    return {
        savedMatchIds,
        enhanceMatchesWithSavedStatus,
        toggleSaveMatch,
        refetch
    };
}

export function useUserJoinRequests(userId: string) {
    return useQuery<MatchJoinRequestResponse[]>({
        queryKey: ['userJoinRequests', userId],
        queryFn: async () => {
            return await matchService.getUserJoinRequests();
        },
        enabled: !!userId,
        staleTime: 60000,
    });
}

interface UseSearchMatchesOptions {
    filters: FilterMatchesRequest;
    page?: number;
    size?: number;
}

export function useSearchMatches({filters, page = 0, size = 10}: UseSearchMatchesOptions) {
    return useQuery<PageResponse<Match>>({
        queryKey: ['matchesSearch', filters, page, size],
        queryFn: () => matchService.searchMatches(filters, page, size),
        staleTime: 1000 * 60,
    });
}