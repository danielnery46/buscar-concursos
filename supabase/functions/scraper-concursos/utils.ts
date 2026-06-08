import { CORS_HEADERS } from "./constants.ts";

export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

/**
 * Structured logging helper.
 */
export function log(level: LogLevel, message: string, context?: Record<string, any>) {
    console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        message,
        context: context ? JSON.parse(JSON.stringify(context, Object.getOwnPropertyNames(context))) : undefined
    }));
}

/**
 * Extracts a string message from an unknown error object.
 */
export function getErrorMessage(error: any): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'object' && error !== null) {
        return JSON.stringify(error);
    }
    return String(error);
}

/**
 * Creates a standardized JSON error response.
 */
export function createErrorResponse(message: string, status: number = 500, details?: any) {
    log('ERROR', message, details);
    return new Response(JSON.stringify({ error: message, details }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        status,
    });
}

/**
 * Creates a standardized success response.
 */
export function createSuccessResponse(data: any, status: number = 200) {
    return new Response(JSON.stringify(data), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        status,
    });
}

/**
 * Handles CORS OPTIONS requests.
 */
export function handleCors(req: Request) {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: CORS_HEADERS });
    }
    return null;
}

/**
 * Retries an async operation with exponential backoff.
 */
export async function retryAsync<T>(
    operation: () => Promise<T>,
    maxRetries: number,
    delayMs: number,
    operationName: string = "Operation"
): Promise<T> {
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            log('WARN', `${operationName}: Attempt ${attempt} failed`, { error: getErrorMessage(error) });
            if (attempt < maxRetries) {
                const delay = delayMs * Math.pow(2, attempt - 1);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }
    throw new Error(`${operationName} failed after ${maxRetries} attempts. Last error: ${getErrorMessage(lastError)}`);
}
