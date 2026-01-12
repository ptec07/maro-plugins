/**
 * Google Calendar MCP Server - Type Definitions
 */

import type { calendar_v3 } from 'googleapis';

/**
 * OAuth2 credentials structure from Google Cloud Console
 */
export interface OAuthCredentials {
  installed?: {
    client_id: string;
    project_id: string;
    auth_uri: string;
    token_uri: string;
    auth_provider_x509_cert_url: string;
    client_secret: string;
    redirect_uris: string[];
  };
  web?: {
    client_id: string;
    project_id: string;
    auth_uri: string;
    token_uri: string;
    auth_provider_x509_cert_url: string;
    client_secret: string;
    redirect_uris: string[];
  };
}

/**
 * OAuth2 tokens structure
 */
export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

/**
 * Calendar event attendee
 */
export interface EventAttendee {
  email: string;
  displayName?: string;
  responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  optional?: boolean;
}

/**
 * Calendar event reminder
 */
export interface EventReminder {
  method: 'email' | 'popup';
  minutes: number;
}

/**
 * Base calendar event interface
 */
export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: EventAttendee[];
  reminders?: {
    useDefault: boolean;
    overrides?: EventReminder[];
  };
  status?: 'confirmed' | 'tentative' | 'cancelled';
  htmlLink?: string;
  created?: string;
  updated?: string;
  creator?: {
    email?: string;
    displayName?: string;
  };
  organizer?: {
    email?: string;
    displayName?: string;
  };
  recurrence?: string[];
  recurringEventId?: string;
}

/**
 * Input for creating a new event
 */
export interface CreateEventInput {
  summary: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime?: string;
  duration?: string;
  timeZone?: string;
  attendees?: string[];
  reminders?: EventReminder[];
  recurrence?: string[];
  sendNotifications?: boolean;
  calendarId?: string;
}

/**
 * Input for updating an existing event
 */
export interface UpdateEventInput {
  eventId: string;
  summary?: string;
  description?: string;
  location?: string;
  startTime?: string;
  endTime?: string;
  timeZone?: string;
  attendees?: string[];
  reminders?: EventReminder[];
  sendNotifications?: boolean;
  calendarId?: string;
}

/**
 * Input for listing events
 */
export interface ListEventsInput {
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
  calendarId?: string;
  timeZone?: string;
  query?: string;
  showDeleted?: boolean;
  singleEvents?: boolean;
  orderBy?: 'startTime' | 'updated';
}

/**
 * Input for deleting an event
 */
export interface DeleteEventInput {
  eventId: string;
  calendarId?: string;
  sendNotifications?: boolean;
  sendUpdates?: 'all' | 'externalOnly' | 'none';
}

/**
 * Response for list events operation
 */
export interface ListEventsResponse {
  events: CalendarEvent[];
  nextPageToken?: string;
  timeZone?: string;
}

/**
 * Parsed date/time result from natural language
 */
export interface ParsedDateTime {
  dateTime: Date;
  timeZone: string;
  isAllDay: boolean;
}

/**
 * Parsed duration result
 */
export interface ParsedDuration {
  hours: number;
  minutes: number;
  totalMinutes: number;
}

/**
 * MCP tool execution result
 */
export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Google Calendar API event type alias
 */
export type GoogleCalendarEvent = calendar_v3.Schema$Event;
