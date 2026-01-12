/**
 * Google Calendar MCP Server - Calendar Service
 * Google Calendar API wrapper
 */

import { google, calendar_v3 } from 'googleapis';
import { authService } from './auth.service.js';
import type {
  CalendarEvent,
  CreateEventInput,
  UpdateEventInput,
  ListEventsInput,
  DeleteEventInput,
  ListEventsResponse,
} from '../types/calendar.types.js';
import { CalendarError, ErrorCodes } from '../utils/error-handler.js';
import {
  parseDateTime,
  calculateEndTime,
  formatForCalendar,
  getDefaultTimezone,
  normalizeTimezone,
} from '../utils/date-parser.js';

const DEFAULT_CALENDAR_ID = 'primary';

// Type aliases for Google Calendar API types
type GoogleEvent = calendar_v3.Schema$Event;
type ListEventsParams = calendar_v3.Params$Resource$Events$List;

async function getCalendarClient(): Promise<calendar_v3.Calendar> {
  const auth = await authService.getClient();
  return google.calendar({ version: 'v3', auth });
}

function toCalendarEvent(event: GoogleEvent): CalendarEvent {
  const attendees = event.attendees?.map((a) => ({
    email: a.email || '',
    displayName: a.displayName ?? undefined,
    responseStatus: a.responseStatus as 'needsAction' | 'declined' | 'tentative' | 'accepted' | undefined,
    optional: a.optional ?? undefined,
  }));
  
  return {
    id: event.id || '',
    summary: event.summary || '',
    description: event.description ?? undefined,
    location: event.location ?? undefined,
    start: {
      dateTime: event.start?.dateTime ?? undefined,
      date: event.start?.date ?? undefined,
      timeZone: event.start?.timeZone ?? undefined,
    },
    end: {
      dateTime: event.end?.dateTime ?? undefined,
      date: event.end?.date ?? undefined,
      timeZone: event.end?.timeZone ?? undefined,
    },
    attendees,
    reminders: event.reminders
      ? {
          useDefault: event.reminders.useDefault || false,
          overrides: event.reminders.overrides?.map((r) => ({
            method: r.method as 'email' | 'popup',
            minutes: r.minutes || 0,
          })),
        }
      : undefined,
    status: event.status as 'confirmed' | 'tentative' | 'cancelled' | undefined,
    htmlLink: event.htmlLink ?? undefined,
    created: event.created ?? undefined,
    updated: event.updated ?? undefined,
    creator: event.creator
      ? { email: event.creator.email ?? undefined, displayName: event.creator.displayName ?? undefined }
      : undefined,
    organizer: event.organizer
      ? { email: event.organizer.email ?? undefined, displayName: event.organizer.displayName ?? undefined }
      : undefined,
    recurrence: event.recurrence ?? undefined,
    recurringEventId: event.recurringEventId ?? undefined,
  };
}

async function listEvents(input: ListEventsInput): Promise<ListEventsResponse> {
  const calendar = await getCalendarClient();
  const calendarId = input.calendarId || DEFAULT_CALENDAR_ID;
  const timezone = normalizeTimezone(input.timeZone) || getDefaultTimezone();

  let timeMin: string | undefined;
  let timeMax: string | undefined;

  if (input.timeMin) {
    try {
      const parsed = parseDateTime(input.timeMin, undefined, timezone);
      timeMin = parsed.dateTime.toISOString();
    } catch {
      // If parsing fails, try using as-is (might be ISO string)
      timeMin = input.timeMin;
    }
  }

  if (input.timeMax) {
    try {
      const parsed = parseDateTime(input.timeMax, undefined, timezone);
      timeMax = parsed.dateTime.toISOString();
    } catch {
      // If parsing fails, try using as-is (might be ISO string)
      timeMax = input.timeMax;
    }
  }

  // Default to next 7 days if no time range specified
  if (!timeMin && !timeMax) {
    timeMin = new Date().toISOString();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    timeMax = nextWeek.toISOString();
  }

  const params: ListEventsParams = {
    calendarId,
    timeMin,
    timeMax,
    maxResults: input.maxResults || 10,
    singleEvents: true,
    orderBy: 'startTime',
  };

  const response = await calendar.events.list(params);
  const events = response.data.items || [];

  return {
    events: events.map(toCalendarEvent),
    nextPageToken: response.data.nextPageToken ?? undefined,
  };
}

async function createEvent(input: CreateEventInput): Promise<CalendarEvent> {
  const calendar = await getCalendarClient();
  const calendarId = input.calendarId || DEFAULT_CALENDAR_ID;
  const timezone = normalizeTimezone(input.timeZone) || getDefaultTimezone();

  // Parse natural language date/time
  const startParsed = parseDateTime(input.startTime, undefined, timezone);
  const startDate = startParsed.dateTime;

  // Calculate end time
  let endDate: Date;
  if (input.endTime) {
    const endParsed = parseDateTime(input.endTime, undefined, timezone);
    endDate = endParsed.dateTime;
  } else if (input.duration) {
    endDate = calculateEndTime(startDate, input.duration);
  } else {
    // Default to 1 hour duration
    endDate = calculateEndTime(startDate, '1 hour');
  }

  const eventResource: calendar_v3.Schema$Event = {
    summary: input.summary,
    description: input.description,
    location: input.location,
    start: formatForCalendar(startDate, timezone, startParsed.isAllDay),
    end: formatForCalendar(endDate, timezone, startParsed.isAllDay),
  };

  // Add attendees if provided
  if (input.attendees && input.attendees.length > 0) {
    eventResource.attendees = input.attendees.map((email) => ({ email }));
  }

  // Add reminders if provided
  if (input.reminders) {
    eventResource.reminders = {
      useDefault: false,
      overrides: input.reminders.map((r) => ({
        method: r.method,
        minutes: r.minutes,
      })),
    };
  }

  // Add recurrence if provided
  if (input.recurrence) {
    eventResource.recurrence = input.recurrence;
  }

  const response = await calendar.events.insert({
    calendarId,
    requestBody: eventResource,
    sendUpdates: input.sendNotifications ? 'all' : 'none',
  });

  if (!response.data) {
    throw new CalendarError('Failed to create event', ErrorCodes.API_ERROR);
  }

  return toCalendarEvent(response.data);
}

async function updateEvent(input: UpdateEventInput): Promise<CalendarEvent> {
  const calendar = await getCalendarClient();
  const calendarId = input.calendarId || DEFAULT_CALENDAR_ID;
  const timezone = normalizeTimezone(input.timeZone) || getDefaultTimezone();

  // First, get the existing event
  const existingResponse = await calendar.events.get({
    calendarId,
    eventId: input.eventId,
  });

  if (!existingResponse.data) {
    throw new CalendarError(
      `Event not found: ${input.eventId}`,
      ErrorCodes.EVENT_NOT_FOUND
    );
  }

  const existingEvent = existingResponse.data;

  // Build update payload
  const updatePayload: calendar_v3.Schema$Event = {
    ...existingEvent,
  };

  if (input.summary !== undefined) {
    updatePayload.summary = input.summary;
  }

  if (input.description !== undefined) {
    updatePayload.description = input.description;
  }

  if (input.location !== undefined) {
    updatePayload.location = input.location;
  }

  if (input.startTime) {
    const startParsed = parseDateTime(input.startTime, undefined, timezone);
    updatePayload.start = formatForCalendar(startParsed.dateTime, timezone, startParsed.isAllDay);
  }

  if (input.endTime) {
    const endParsed = parseDateTime(input.endTime, undefined, timezone);
    updatePayload.end = formatForCalendar(endParsed.dateTime, timezone, endParsed.isAllDay);
  }

  if (input.attendees) {
    updatePayload.attendees = input.attendees.map((email) => ({ email }));
  }

  if (input.reminders) {
    updatePayload.reminders = {
      useDefault: false,
      overrides: input.reminders.map((r) => ({
        method: r.method,
        minutes: r.minutes,
      })),
    };
  }

  const response = await calendar.events.update({
    calendarId,
    eventId: input.eventId,
    requestBody: updatePayload,
    sendUpdates: input.sendNotifications ? 'all' : 'none',
  });

  if (!response.data) {
    throw new CalendarError('Failed to update event', ErrorCodes.API_ERROR);
  }

  return toCalendarEvent(response.data);
}

async function deleteEvent(input: DeleteEventInput): Promise<void> {
  const calendar = await getCalendarClient();
  const calendarId = input.calendarId || DEFAULT_CALENDAR_ID;

  await calendar.events.delete({
    calendarId,
    eventId: input.eventId,
    sendUpdates: input.sendNotifications ? 'all' : 'none',
  });
}

async function getEvent(eventId: string, calendarId?: string): Promise<CalendarEvent> {
  const calendar = await getCalendarClient();
  const targetCalendarId = calendarId || DEFAULT_CALENDAR_ID;

  const response = await calendar.events.get({
    calendarId: targetCalendarId,
    eventId,
  });

  if (!response.data) {
    throw new CalendarError(
      `Event not found: ${eventId}`,
      ErrorCodes.EVENT_NOT_FOUND
    );
  }

  return toCalendarEvent(response.data);
}

export const calendarService = {
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getEvent,
};
