import toast from 'react-hot-toast';

/**
 * Extracts a user-friendly error message from various error sources.
 * In admin-frontend, axios Config interceptor guarantees all caught axios errors 
 * are wrapped as Error instances with the backend text logic.
 */
export const extractErrorMessage = (error: any, defaultMessage: string = 'An unexpected error occurred'): string => {
    if (error?.response?.data?.error) {
        return error.response.data.error;
    }
    if (error?.response?.data?.message) {
        return error.response.data.message;
    }

    if (error instanceof Error) {
        return error.message;
    }

    if (typeof error === 'string') {
        return error;
    }

    return defaultMessage;
};

/**
 * Centralized error handler that optionally formats and displays a toast notification.
 */
export const handleError = (error: any, customMessage?: string): string => {
    console.error('[Admin Error] ->', error);

    const defaultMsg = customMessage || 'An unexpected error occurred. Please try again.';
    const message = extractErrorMessage(error, defaultMsg);

    toast.error(message);

    return message;
};
