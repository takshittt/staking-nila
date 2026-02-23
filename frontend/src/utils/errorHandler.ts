import toast from 'react-hot-toast';

/**
 * Extracts a user-friendly error message from various error sources
 * (e.g., Axios response, Fetch response, native Error, or string).
 */
export const extractErrorMessage = (error: any, defaultMessage: string = 'An unexpected error occurred'): string => {
    // Check if it's an Axios error with response data
    if (error?.response?.data?.error) {
        return error.response.data.error;
    }
    if (error?.response?.data?.message) {
        return error.response.data.message;
    }

    // Check if it's a Fetch error caught in try/catch (often wrapped in an Error object but might have data)
    if (error?.data?.error) {
        return error.data.error;
    }

    // Check if it's a standard JS Error
    if (error instanceof Error) {
        // Ignored specific wallet connection rejections
        if (error.message.includes('user rejected transaction') || error.message.includes('User rejected the request')) {
            return 'Transaction rejected by user';
        }
        return error.message;
    }

    // Fallback for string errors
    if (typeof error === 'string') {
        return error;
    }

    return defaultMessage;
};

/**
 * Centralized error handler that formats the error and optionally displays a toast notification.
 */
export const handleError = (error: any, customMessage?: string): string => {
    console.error('[Error] ->', error);
    
    const defaultMsg = customMessage || 'An unexpected error occurred. Please try again.';
    const message = extractErrorMessage(error, defaultMsg);
    
    // Display error toast
    toast.error(message);
    
    return message;
};
