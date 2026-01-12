/**
 * Google Calendar MCP Server - Entry Point
 */

import { runServer } from './server.js';

// Run the server
runServer().catch((error) => {
  console.error('[google-calendar-mcp] Fatal error:', error);
  process.exit(1);
});
