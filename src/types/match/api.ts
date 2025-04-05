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

export const isSuccessResponse = <T>(response: ApiResponse<T>): boolean => {
    return response.status === "SUCCESS";
};

export const getErrorMessage = <T>(response: ApiResponse<T>): string => {
    return response.message || "An unknown error occurred";
};