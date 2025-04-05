export interface ApiResponse<T> {
    data: {
        data: T;
        errorCode: string | null;
        message: string | null;
        status: 'SUCCESS' | 'FAILURE';
        timestamp: string;
    };
    status: number;
}