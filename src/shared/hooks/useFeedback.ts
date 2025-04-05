import { useState, useCallback } from 'react';
import { ApiService, API_CONFIG } from "@/src/core/api/core/axios.config";
import {FeedbackRequestResponse, PlayerRatingResponse, SubmitFeedbackRequest} from "@/src/types/feedback/feedback";
import {ApiResponse, isSuccessResponse} from "@/src/types/match/api";
import {getErrorMessage} from "@/src/utils/apiErrors";

export const useFeedback = () => {
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const getMatchFeedbackRequest = useCallback(async (matchId: string): Promise<FeedbackRequestResponse | null> => {
        setLoading(true);
        setError(null);
        try {
            const response = await ApiService.getInstance().get<ApiResponse<FeedbackRequestResponse>>(
                API_CONFIG.ENDPOINTS.FEEDBACK.GET_MATCH_FEEDBACK(matchId)
            );
            if (!isSuccessResponse(response.data)) {
                throw new Error(getErrorMessage(response.data));
            }
            return response.data.data;
        } catch(err) {
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const submitFeedback = useCallback(async (
        requestId: string,
        feedbackData: SubmitFeedbackRequest
    ): Promise<FeedbackRequestResponse | null> => {
        setLoading(true);
        setError(null);
        try {
            const response = await ApiService.getInstance().post<ApiResponse<FeedbackRequestResponse>>(
                API_CONFIG.ENDPOINTS.FEEDBACK.SUBMIT_FEEDBACK(requestId),
                feedbackData
            );

            if (!isSuccessResponse(response.data)) {
                throw new Error(getErrorMessage(response.data));
            }
            return response.data.data;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to submit feedback');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const getPlayerRating = useCallback(async (playerId: string): Promise<PlayerRatingResponse | null> => {
        setLoading(true);
        setError(null);
        try {
            const response = await ApiService.getInstance().get<ApiResponse<PlayerRatingResponse>>(
                API_CONFIG.ENDPOINTS.FEEDBACK.GET_PLAYER_RATING(playerId)
            );
            if (!isSuccessResponse(response.data)) {
                throw new Error(getErrorMessage(response.data));
            }
            return response.data.data;
        } catch (err) {
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const getTopRatedPlayers = useCallback(async (limit: number = 10): Promise<PlayerRatingResponse[] | null> => {
        setLoading(true);
        setError(null);
        try {
            const response = await ApiService.getInstance().get<ApiResponse<PlayerRatingResponse[]>>(
                API_CONFIG.ENDPOINTS.FEEDBACK.GET_TOP_RATED,
                { params: { limit } }
            );

            if (!isSuccessResponse(response.data)) {
                throw new Error(getErrorMessage(response.data));
            }

            return response.data.data;
        } catch (err) {
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        loading,
        error,
        getMatchFeedbackRequest,
        submitFeedback,
        getPlayerRating,
        getTopRatedPlayers
    };
};