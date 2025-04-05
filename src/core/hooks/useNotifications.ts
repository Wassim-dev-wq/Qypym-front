import { useCallback, useEffect, useState } from 'react';
import { ApiService, API_CONFIG } from "@/src/core/api/core/axios.config";

export type NotificationType = 'MATCH_CREATED' | 'MATCH_UPDATED' | 'MATCH_DELETED' | 'MATCH_STATUS_CHANGED' | 'PLAYER_JOINED' | 'PLAYER_LEFT' | 'JOIN_REQUEST_RECEIVED' | 'JOIN_REQUEST_ACCEPTED' | 'JOIN_REQUEST_REJECTED';

export interface Notification {
    id: string;
    title: string;
    message: string;
    createdAt: string;
    type: NotificationType;
    matchId: string;
    read: boolean;
    userId: string;
}

interface PaginatedResponse<T> {
    content: T[];
    empty: boolean;
    first: boolean;
    last: boolean;
    number: number;
    numberOfElements: number;
    pageable: {
        offset: number;
        pageNumber: number;
        pageSize: number;
        paged: boolean;
        sort: {
            empty: boolean;
            sorted: boolean;
            unsorted: boolean;
        };
    };
    size: number;
    totalElements: number;
    totalPages: number;
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message: string | null;
}

export const useNotifications = (userId: string) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [unreadCount, setUnreadCount] = useState<number>(0);

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await ApiService.getInstance().get<ApiResponse<PaginatedResponse<Notification>>>(
                API_CONFIG.ENDPOINTS.NOTIFICATIONS.GET_ALL
            );
            setNotifications(response.data.data.content);
            const unreadNotifications = response.data.data.content.filter(n => !n.read).length;
            setUnreadCount(unreadNotifications);
        } catch (err) {
            console.error('Error fetching notifications:', err);
            setError('Failed to load notifications');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [userId]);

    const fetchUnreadCount = useCallback(async () => {
        try {
            const response = await ApiService.getInstance().get<ApiResponse<number>>(
                API_CONFIG.ENDPOINTS.NOTIFICATIONS.GET_UNREAD_COUNT,
                {
                    headers: { 'X-User-ID': userId },
                }
            );
            setUnreadCount(response.data.data);
        } catch (err) {
            console.error(err);
        }
    }, [userId]);

    const markAsRead = useCallback(
        async (notificationId: string) => {
            try {
                const response = await ApiService.getInstance().put<ApiResponse<Notification>>(
                    API_CONFIG.ENDPOINTS.NOTIFICATIONS.MARK_AS_READ(notificationId),
                );
                if (response) {
                    setNotifications((prev) =>
                        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
                    );
                    fetchUnreadCount();
                }
            } catch (err) {
                console.error(err);
            }
        },
        [userId, fetchUnreadCount]
    );

    const markAllAsRead = useCallback(async () => {
        try {
            const response = await ApiService.getInstance().put<ApiResponse<null>>(
                API_CONFIG.ENDPOINTS.NOTIFICATIONS.MARK_ALL_AS_READ,
                null,
                {
                    headers: { 'X-User-ID': userId },
                }
            );
            if (response) {
                setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                setUnreadCount(0);
            }
        } catch (err) {
            console.error(err);
        }
    }, [userId]);

    useEffect(() => {
        fetchNotifications();
        fetchUnreadCount();
    }, [fetchNotifications, fetchUnreadCount]);

    return {
        notifications,
        loading,
        error,
        refreshing,
        unreadCount,
        onRefresh: () => {
            setRefreshing(true);
            fetchNotifications();
            fetchUnreadCount();
        },
        markAsRead,
        markAllAsRead,
    };
};
