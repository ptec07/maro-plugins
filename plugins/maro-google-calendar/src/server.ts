/**
 * Google Calendar MCP Server
 * Main server implementation using MCP SDK
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  handleListEvents,
  handleCreateEvent,
  handleUpdateEvent,
  handleDeleteEvent,
  handleGetAuthStatus,
  ListEventsSchema,
  CreateEventSchema,
  UpdateEventSchema,
  DeleteEventSchema,
} from './tools/index.js';
import { authService } from './services/auth.service.js';

const SERVER_NAME = "google-calendar-mcp";
const SERVER_VERSION = "1.0.0";

/**
 * Create and configure the MCP server
 */
export function createServer(): Server {
  const server = new Server({ name: SERVER_NAME, version: SERVER_VERSION }, {
    capabilities: {
      tools: {},
    },
  });

  // Register list tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'list_events',
          description: 'List calendar events within a time range. Supports natural language for dates.',
          inputSchema: zodToJsonSchema(ListEventsSchema),
        },
        {
          name: 'create_event',
          description: 'Create a new calendar event. Supports natural language for dates and times.',
          inputSchema: zodToJsonSchema(CreateEventSchema),
        },
        {
          name: 'update_event',
          description: 'Update an existing calendar event by ID.',
          inputSchema: zodToJsonSchema(UpdateEventSchema),
        },
        {
          name: 'delete_event',
          description: 'Delete a calendar event by ID.',
          inputSchema: zodToJsonSchema(DeleteEventSchema),
        },
        {
          name: 'auth_status',
          description: 'Check Google Calendar authentication status.',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
      ],
    };
  });

  // Register tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result;

      switch (name) {
        case 'list_events': {
          const parsed = ListEventsSchema.parse(args);
          result = await handleListEvents(parsed);
          break;
        }
        case 'create_event': {
          const parsed = CreateEventSchema.parse(args);
          result = await handleCreateEvent(parsed);
          break;
        }
        case 'update_event': {
          const parsed = UpdateEventSchema.parse(args);
          result = await handleUpdateEvent(parsed);
          break;
        }
        case 'delete_event': {
          const parsed = DeleteEventSchema.parse(args);
          result = await handleDeleteEvent(parsed);
          break;
        }
        case 'auth_status': {
          result = await handleGetAuthStatus();
          break;
        }
        default:
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({ error: 'Unknown tool: ' + name }),
              },
            ],
          };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ error: errorMessage }, null, 2),
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Run the MCP server with stdio transport
 */
export async function runServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();

  // Initialize auth service on startup
  try {
    await authService.initialize();
    console.error('[google-calendar-mcp] Auth service initialized');
    console.error('[google-calendar-mcp] Auth status:', JSON.stringify(authService.getStatus()));
  } catch (error) {
    console.error('[google-calendar-mcp] Auth initialization warning:', error);
    // Continue anyway - user can check auth_status and authenticate later
  }

  await server.connect(transport);
  console.error('[google-calendar-mcp] Server running on stdio');
}

export { SERVER_NAME, SERVER_VERSION };
