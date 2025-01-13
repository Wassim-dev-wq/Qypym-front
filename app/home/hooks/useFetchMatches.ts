import { useEffect, useState } from 'react';
import { LocationObject } from 'expo-location';
import { fetchMatchesFromAPI } from '../services/matchService';
import { Match } from '../../utils/types/match/match';

interface Filters {
    skillLevel?: string;
    distance?: number;
}

export function useFetchMatches({
                                    location,
                                    filters,
                                }: {
    location: LocationObject | null;
    filters: Filters;
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
                const response = await fetchMatchesFromAPI(location, filters, page);
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

    // For infinite scroll or manual load more
    const loadMore = () => setPage((prev) => prev + 1);

    // For pull-to-refresh or resetting the list
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
