import {useEffect, useState} from 'react';
import {ApiService} from "@/src/core/api/core/axios.config";
import {PlayerStats} from "@/src/types/user/user";

export const usePlayerStats = (userId: string) => {
    const [data, setData] = useState<PlayerStats | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isError, setIsError] = useState<boolean>(false);

    const fetchPlayerStats = async () => {
        setIsLoading(true);
        setIsError(false);

        try {
            const response = await ApiService.getInstance().get<PlayerStats>(
                `/api/v1/players/${userId}/stats`
            );
            setData(response.data);
        } catch (error) {
            console.error('Error fetching player stats:', error);
            setIsError(true);
        } finally {
            setIsLoading(false);
        }
    };

    const refetch = () => {
        return fetchPlayerStats();
    };

    useEffect(() => {
        fetchPlayerStats();
    }, [userId]);

    return {
        data,
        isLoading,
        isError,
        refetch
    };
};