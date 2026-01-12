/**
 * Google Calendar MCP Server - Error Handler Utility
 */

import type { ToolResult } from '../types/calendar.types.js';

/**
 * Custom error class for calendar operations
 */
export class CalendarError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly details?: unknown;

  constructor(
    message: string,
    code: string,
    statusCode?: number,
    details?: unknown
  ) {
    super(message);
    this.name = 'CalendarError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Error codes for calendar operations
 */
export const ErrorCodes = {
  // Authentication errors
  AUTH_NOT_CONFIGURED: 'AUTH_NOT_CONFIGURED',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_REFRESH_FAILED: 'AUTH_REFRESH_FAILED',

  // Validation errors
  INVALID_INPUT: 'INVALID_INPUT',
  INVALID_DATE: 'INVALID_DATE',
  INVALID_DURATION: 'INVALID_DURATION',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Calendar API errors
  EVENT_NOT_FOUND: 'EVENT_NOT_FOUND',
  CALENDAR_NOT_FOUND: 'CALENDAR_NOT_FOUND',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  API_ERROR: 'API_ERROR',

  // System errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  PARSE_ERROR: 'PARSE_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Create a standardized error response
 */
export function createErrorResult(error: unknown): ToolResult {
  if (error instanceof CalendarError) {
    return {
      success: false,
      error: `[${error.code}] ${error.message}`,
    };
  }

  if (error instanceof Error) {
    // Handle Google API errors
    const apiError = error as Error & {
      code?: number;
      errors?: Array<{ message: string; reason: string }>;
    };

    if (apiError.code === 401) {
      return {
        success: false,
        error: `[${ErrorCodes.AUTH_TOKEN_INVALID}] Authentication failed. Please re-authenticate.`,
      };
    }

    if (apiError.code === 403) {
      return {
        success: false,
        error: `[${ErrorCodes.RATE_LIMIT_EXCEEDED}] Rate limit exceeded or insufficient permissions.`,
      };
    }

    if (apiError.code === 404) {
      return {
        success: false,
        error: `[${ErrorCodes.EVENT_NOT_FOUND}] Resource not found.`,
      };
    }

    if (apiError.errors && apiError.errors.length > 0) {
      const firstError = apiError.errors[0];
      const errorMessage = firstError ? firstError.message : 'Unknown API error';
      return {
        success: false,
        error: `[${ErrorCodes.API_ERROR}] ${errorMessage}`,
      };
    }

    return {
      success: false,
      error: `[${ErrorCodes.UNKNOWN_ERROR}] ${error.message}`,
    };
  }

  return {
    success: false,
    error: `[${ErrorCodes.UNKNOWN_ERROR}] An unexpected error occurred`,
  };
}

/**
 * Create a success response
 */
export function createSuccessResult<T>(data: T): ToolResult {
  return {
    success: true,
    data,
  };
}

/**
 * Wrap an async operation with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>
): Promise<ToolResult> {
  try {
    const result = await operation();
    return createSuccessResult(result);
  } catch (error) {
    return createErrorResult(error);
  }
}

/**
 * Format error for logging
 */
export function formatErrorForLog(error: unknown): string {
  if (error instanceof CalendarError) {
    return JSON.stringify({
      name: error.name,
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
    });
  }

  if (error instanceof Error) {
    return JSON.stringify({
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
  }

  return String(error);
}

/**
 * Assert that a value is defined
 */
export function assertDefined<T>(
  value: T | undefined | null,
  message: string
): asserts value is T {
  if (value === undefined || value === null) {
    throw new CalendarError(
      message,
      ErrorCodes.MISSING_REQUIRED_FIELD
    );
  }
}

/**
 * Validate required fields in an object
 */
export function validateRequiredFields(
  obj: Record<string, unknown>,
  requiredFields: string[]
): void {
  for (const field of requiredFields) {
    if (!(field in obj) || obj[field] === undefined || obj[field] === null) {
      throw new CalendarError(
        `Missing required field: ${field}`,
        ErrorCodes.MISSING_REQUIRED_FIELD
      );
    }
  }
}
