/**
 * Google Calendar MCP Server - Tool Definitions
 * Zod schemas and tool handlers for MCP
 */

import { z } from 'zod';
import { calendarService } from '../services/calendar.service.js';
import { authService } from '../services/auth.service.js';
import { withErrorHandling, createSuccessResult, createErrorResult } from '../utils/error-handler.js';
import { formatForDisplay } from '../utils/date-parser.js';

/**
 * Schema for list_events tool
 */
export const ListEventsSchema = z.object({
  timeMin: z.string().optional().describe('Start time for events (natural language, e.g., "today", "tomorrow", "next week")'),
  timeMax: z.string().optional().describe('End time for events (natural language)'),
  maxResults: z.number().min(1).max(2500).optional().default(10).describe('Maximum number of events to return'),
  calendarId: z.string().optional().default('primary').describe('Calendar ID (default: primary)'),
  query: z.string().optional().describe('Free text search query'),
});

export type ListEventsArgs = z.infer<typeof ListEventsSchema>;

/**
 * Schema for create_event tool
 */
export const CreateEventSchema = z.object({
  summary: z.string().min(1).describe('Event title/summary'),
  description: z.string().optional().describe('Event description'),
  location: z.string().optional().describe('Event location'),
  startTime: z.string().describe('Start time (natural language, e.g., "tomorrow at 2pm", "next Monday 10am")'),
  endTime: z.string().optional().describe('End time (natural language)'),
  duration: z.string().optional().describe('Duration if no end time (e.g., "1 hour", "30 minutes")'),
  timeZone: z.string().optional().describe('Timezone (e.g., "America/New_York", "Asia/Seoul")'),
  attendees: z.array(z.string().email()).optional().describe('List of attendee email addresses'),
  reminders: z.array(z.object({
    method: z.enum(['email', 'popup']),
    minutes: z.number().min(0),
  })).optional().describe("Reminders (e.g., [{\"method\": \"popup\", \"minutes\": 10}])"),
  calendarId: z.string().optional().default('primary').describe('Calendar ID (default: primary)'),
});

export type CreateEventArgs = z.infer<typeof CreateEventSchema>;

/**
 * Schema for update_event tool
 */
export const UpdateEventSchema = z.object({
  eventId: z.string().min(1).describe('Event ID to update'),
  summary: z.string().optional().describe('New event title/summary'),
  description: z.string().optional().describe('New event description'),
  location: z.string().optional().describe('New event location'),
  startTime: z.string().optional().describe('New start time (natural language)'),
  endTime: z.string().optional().describe('New end time (natural language)'),
  timeZone: z.string().optional().describe('Timezone'),
  attendees: z.array(z.string().email()).optional().describe('Updated list of attendee emails'),
  reminders: z.array(z.object({
    method: z.enum(['email', 'popup']),
    minutes: z.number().min(0),
  })).optional().describe("Updated reminders"),
  calendarId: z.string().optional().default('primary').describe('Calendar ID (default: primary)'),
});

export type UpdateEventArgs = z.infer<typeof UpdateEventSchema>;

/**
 * Schema for delete_event tool
 */
export const DeleteEventSchema = z.object({
  eventId: z.string().min(1).describe('Event ID to delete'),
  calendarId: z.string().optional().default('primary').describe('Calendar ID (default: primary)'),
  sendUpdates: z.enum(['all', 'externalOnly', 'none']).optional().default('all').describe('Whether to send update notifications'),
});

export type DeleteEventArgs = z.infer<typeof DeleteEventSchema>;

/**
 * Tool handler for list_events
 */
export async function handleListEvents(args: ListEventsArgs) {
  return withErrorHandling(async () => {
    const result = await calendarService.listEvents({
      timeMin: args.timeMin,
      timeMax: args.timeMax,
      maxResults: args.maxResults,
      calendarId: args.calendarId,
      query: args.query,
    });

    // Format events for display
    const formattedEvents = result.events.map((event) => ({
      id: event.id,
      summary: event.summary,
      start: event.start.dateTime
        ? formatForDisplay(event.start.dateTime, event.start.timeZone)
        : event.start.date,
      end: event.end.dateTime
        ? formatForDisplay(event.end.dateTime, event.end.timeZone)
        : event.end.date,
      location: event.location,
      description: event.description,
    }));

    return {
      events: formattedEvents,
      count: formattedEvents.length,
      timeZone: result.timeZone,
    };
  });
}

/**
 * Tool handler for create_event
 */
export async function handleCreateEvent(args: CreateEventArgs) {
  return withErrorHandling(async () => {
    const event = await calendarService.createEvent({
      summary: args.summary,
      description: args.description,
      location: args.location,
      startTime: args.startTime,
      endTime: args.endTime,
      duration: args.duration,
      timeZone: args.timeZone,
      attendees: args.attendees,
      reminders: args.reminders,
      calendarId: args.calendarId,
    });

    return {
      id: event.id,
      summary: event.summary,
      start: event.start.dateTime
        ? formatForDisplay(event.start.dateTime, event.start.timeZone)
        : event.start.date,
      end: event.end.dateTime
        ? formatForDisplay(event.end.dateTime, event.end.timeZone)
        : event.end.date,
      location: event.location,
      message: 'Event created successfully',
    };
  });
}

/**
 * Tool handler for update_event
 */
export async function handleUpdateEvent(args: UpdateEventArgs) {
  return withErrorHandling(async () => {
    const event = await calendarService.updateEvent({
      eventId: args.eventId,
      summary: args.summary,
      description: args.description,
      location: args.location,
      startTime: args.startTime,
      endTime: args.endTime,
      timeZone: args.timeZone,
      attendees: args.attendees,
      reminders: args.reminders,
      calendarId: args.calendarId,
    });

    return {
      id: event.id,
      summary: event.summary,
      start: event.start.dateTime
        ? formatForDisplay(event.start.dateTime, event.start.timeZone)
        : event.start.date,
      end: event.end.dateTime
        ? formatForDisplay(event.end.dateTime, event.end.timeZone)
        : event.end.date,
      location: event.location,
      message: 'Event updated successfully',
    };
  });
}

/**
 * Tool handler for delete_event
 */
export async function handleDeleteEvent(args: DeleteEventArgs) {
  return withErrorHandling(async () => {
    await calendarService.deleteEvent({
      eventId: args.eventId,
      calendarId: args.calendarId,
      sendUpdates: args.sendUpdates,
    });

    return {
      eventId: args.eventId,
      message: 'Event deleted successfully',
    };
  });
}

/**
 * Tool definitions for MCP server registration
 */
export const toolDefinitions = [
  {
    name: 'list_events',
    description: 'List calendar events within a time range. Supports natural language for dates like "today", "tomorrow", "next week".',
    inputSchema: ListEventsSchema,
    handler: handleListEvents,
  },
  {
    name: 'create_event',
    description: 'Create a new calendar event. Supports natural language for dates and times like "tomorrow at 2pm", "next Monday 10am".',
    inputSchema: CreateEventSchema,
    handler: handleCreateEvent,
  },
  {
    name: 'update_event',
    description: 'Update an existing calendar event. Provide the event ID and fields to update.',
    inputSchema: UpdateEventSchema,
    handler: handleUpdateEvent,
  },
  {
    name: 'delete_event',
    description: 'Delete a calendar event by ID.',
    inputSchema: DeleteEventSchema,
    handler: handleDeleteEvent,
  },
] as const;

/**
 * Get authentication status tool (special utility)
 */
export async function handleGetAuthStatus() {
  try {
    await authService.initialize();
    return createSuccessResult(authService.getStatus());
  } catch (error) {
    return createErrorResult(error);
  }
}
