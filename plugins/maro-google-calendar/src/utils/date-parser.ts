/**
 * Google Calendar MCP Server - Date Parser Utility
 * Uses chrono-node for natural language date parsing
 */

import * as chrono from 'chrono-node';
import { addMinutes, addHours, format, parseISO } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import type { ParsedDateTime, ParsedDuration } from '../types/calendar.types.js';
import { CalendarError, ErrorCodes } from './error-handler.js';

/**
 * Default timezone if not specified
 */
const DEFAULT_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * Duration pattern matching
 */
const DURATION_PATTERNS = {
  hours: /(\d+)\s*(?:hours?|hrs?|h)/i,
  minutes: /(\d+)\s*(?:minutes?|mins?|m)/i,
  combined: /(\d+)\s*(?:hours?|hrs?|h)\s*(?:and\s*)?(\d+)\s*(?:minutes?|mins?|m)/i,
};

/**
 * Parse natural language date/time string
 */
export function parseDateTime(
  input: string,
  referenceDate?: Date,
  timeZone?: string
): ParsedDateTime {
  const tz = timeZone || DEFAULT_TIMEZONE;
  const refDate = referenceDate || new Date();

  // Try to parse with chrono
  const results = chrono.parse(input, refDate, { forwardDate: true });

  if (results.length === 0) {
    throw new CalendarError(
      `Could not parse date/time from: "${input}"`,
      ErrorCodes.INVALID_DATE
    );
  }

  const result = results[0];
  if (!result) {
    throw new CalendarError(
      `Could not parse date/time from: "${input}"`,
      ErrorCodes.INVALID_DATE
    );
  }
  
  const parsedDate = result.start.date();

  // Check if the parsed result has time components
  const hasTime = result.start.isCertain('hour') || 
                  result.start.isCertain('minute');

  // Convert to the specified timezone
  const zonedDate = toZonedTime(parsedDate, tz);

  return {
    dateTime: zonedDate,
    timeZone: tz,
    isAllDay: !hasTime,
  };
}

/**
 * Parse duration string (e.g., "1 hour", "30 minutes", "1h 30m")
 */
export function parseDuration(input: string): ParsedDuration {
  // Try combined pattern first
  const combinedMatch = input.match(DURATION_PATTERNS.combined);
  if (combinedMatch) {
    const hours = parseInt(combinedMatch[1] || '0', 10);
    const minutes = parseInt(combinedMatch[2] || '0', 10);
    return {
      hours,
      minutes,
      totalMinutes: hours * 60 + minutes,
    };
  }

  let hours = 0;
  let minutes = 0;

  // Try hours pattern
  const hoursMatch = input.match(DURATION_PATTERNS.hours);
  if (hoursMatch) {
    hours = parseInt(hoursMatch[1] || '0', 10);
  }

  // Try minutes pattern
  const minutesMatch = input.match(DURATION_PATTERNS.minutes);
  if (minutesMatch) {
    minutes = parseInt(minutesMatch[1] || '0', 10);
  }

  if (hours === 0 && minutes === 0) {
    // Try parsing as just a number (assume hours)
    const numMatch = input.match(/^(\d+)$/);
    if (numMatch) {
      hours = parseInt(numMatch[1] || '1', 10);
    } else {
      throw new CalendarError(
        `Could not parse duration from: "${input}"`,
        ErrorCodes.INVALID_DURATION
      );
    }
  }

  return {
    hours,
    minutes,
    totalMinutes: hours * 60 + minutes,
  };
}

/**
 * Calculate end time from start time and duration
 */
export function calculateEndTime(
  startTime: Date,
  duration: string | ParsedDuration
): Date {
  const parsedDuration = typeof duration === 'string' 
    ? parseDuration(duration) 
    : duration;

  let endTime = startTime;
  
  if (parsedDuration.hours > 0) {
    endTime = addHours(endTime, parsedDuration.hours);
  }
  
  if (parsedDuration.minutes > 0) {
    endTime = addMinutes(endTime, parsedDuration.minutes);
  }

  return endTime;
}

/**
 * Format date for Google Calendar API (RFC3339)
 */
export function formatForCalendar(
  date: Date,
  timeZone?: string,
  isAllDay?: boolean
): { dateTime?: string; date?: string; timeZone?: string } {
  const tz = timeZone || DEFAULT_TIMEZONE;

  if (isAllDay) {
    // For all-day events, use date format (YYYY-MM-DD)
    return {
      date: format(date, 'yyyy-MM-dd'),
    };
  }

  // For timed events, use RFC3339 format
  return {
    dateTime: formatInTimeZone(date, tz, "yyyy-MM-dd'T'HH:mm:ssXXX"),
    timeZone: tz,
  };
}

/**
 * Parse ISO date string to Date object
 */
export function parseISODate(isoString: string): Date {
  try {
    return parseISO(isoString);
  } catch {
    throw new CalendarError(
      `Invalid ISO date string: "${isoString}"`,
      ErrorCodes.INVALID_DATE
    );
  }
}

/**
 * Get human-readable date/time format
 */
export function formatForDisplay(
  date: Date | string,
  timeZone?: string,
  includeTime = true
): string {
  const tz = timeZone || DEFAULT_TIMEZONE;
  const dateObj = typeof date === 'string' ? parseISO(date) : date;

  if (includeTime) {
    return formatInTimeZone(dateObj, tz, 'MMM d, yyyy h:mm a zzz');
  }

  return formatInTimeZone(dateObj, tz, 'MMM d, yyyy');
}

/**
 * Get the default timezone
 */
export function getDefaultTimezone(): string {
  return DEFAULT_TIMEZONE;
}

/**
 * Validate and normalize timezone string
 */
export function normalizeTimezone(timezone?: string): string {
  if (!timezone) {
    return DEFAULT_TIMEZONE;
  }

  // Common timezone aliases
  const aliases: Record<string, string> = {
    'EST': 'America/New_York',
    'EDT': 'America/New_York',
    'CST': 'America/Chicago',
    'CDT': 'America/Chicago',
    'MST': 'America/Denver',
    'MDT': 'America/Denver',
    'PST': 'America/Los_Angeles',
    'PDT': 'America/Los_Angeles',
    'KST': 'Asia/Seoul',
    'JST': 'Asia/Tokyo',
    'GMT': 'Etc/GMT',
    'UTC': 'Etc/UTC',
  };

  const upper = timezone.toUpperCase();
  if (aliases[upper]) {
    return aliases[upper];
  }

  return timezone;
}

/**
 * Check if a date string represents an all-day event
 */
export function isAllDayFormat(dateString: string): boolean {
  // All-day events use YYYY-MM-DD format (no time component)
  return /^\d{4}-\d{2}-\d{2}$/.test(dateString);
}
