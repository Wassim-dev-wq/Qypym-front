import { t } from 'src/constants/locales';
import { AxiosError } from 'axios';

export type ApiErrorCode =
    | 'EMAIL_EXISTS'
    | 'KEYCLOAK_CREATE_FAILED'
    | 'KEYCLOAK_ERROR'
    | 'REG_FAILED'
    | 'CODE_NOT_FOUND'
    | 'INVALID_CODE'
    | 'UNKNOWN'
    | 'VAL_001'
    | 'USER_NOT_FOUND'

export interface ApiErrorResponse {
    status: string;
    message: string;
    errorCode: ApiErrorCode;
    timestamp: string;
}

export interface CustomError {
    code?: ApiErrorCode;
    message?: string;
    response?: {
        data?: ApiErrorResponse;
        status?: number;
    };
}
const ERROR_CODE_MESSAGES: Record<ApiErrorCode, string> = {
    EMAIL_EXISTS: t('emailAlreadyRegistered'),
    KEYCLOAK_CREATE_FAILED: t('keycloakCreateFailed'),
    KEYCLOAK_ERROR: t('keycloakError'),
    REG_FAILED: t('registrationFailed'),
    CODE_NOT_FOUND: t('verificationCodeExpired'),
    INVALID_CODE: t('invalidVerificationCode'),
    UNKNOWN: t('unknownError'),
    VAL_001: t('validationError'),
    USER_NOT_FOUND: t('userNotFound'),
};

export function extractErrorCode(error: unknown): ApiErrorCode {
    if (!error) return 'UNKNOWN';
    const customError = error as CustomError;
    if (customError.code) {
        return customError.code as ApiErrorCode;
    }
    if (customError.response?.data?.errorCode) {
        return customError.response.data.errorCode;
    }
    if ((error as AxiosError).isAxiosError && (error as AxiosError).response?.data) {
        const axiosError = error as AxiosError;
        const responseData = axiosError.response?.data as any;
        if (responseData.errorCode) {
            return responseData.errorCode as ApiErrorCode;
        }

    }
    return 'UNKNOWN';
}

export function getErrorMessage(error: unknown): string {
    const errorCode = extractErrorCode(error);
    if (errorCode && ERROR_CODE_MESSAGES[errorCode]) {
        return ERROR_CODE_MESSAGES[errorCode];
    }
    const customError = error as CustomError;
    if (customError.message) {
        return customError.message;
    }

    if (customError.response?.data?.message) {
        return customError.response.data.message;
    }
    return t('unknownError');
}


export function logErrorDetails(error: unknown): void {
    console.error('Error details:', {
        errorObject: error,
        isAxiosError: (error as AxiosError).isAxiosError || false,
        message: (error as Error).message,
        responseData: (error as AxiosError).response?.data,
        responseStatus: (error as AxiosError).response?.status,
        extractedCode: extractErrorCode(error)
    });
}