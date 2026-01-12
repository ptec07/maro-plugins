# Google Calendar MCP Server

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/your-repo/google-calendar-mcp)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org)
[![MCP](https://img.shields.io/badge/MCP-compatible-purple.svg)](https://modelcontextprotocol.io)

A Model Context Protocol (MCP) server that enables natural language control of Google Calendar through Claude Code. Create, read, update, and delete calendar events using conversational commands.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Google Cloud Console Setup](#google-cloud-console-setup)
- [Configuration](#configuration)
- [First-Time Authentication](#first-time-authentication)
- [Usage Examples](#usage-examples)
- [Tool Reference](#tool-reference)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Overview

This MCP server integrates Google Calendar with Claude Code, allowing you to manage your calendar using natural language. Instead of manually navigating the Google Calendar interface, you can simply tell Claude what you want to do with your schedule.

**Key Benefits:**

- Control your calendar without leaving your development environment
- Use natural language dates like "tomorrow at 2pm" or "next Monday"
- Manage multiple calendars from a single interface
- Receive formatted, readable event information

---

## Features

### Natural Language Date Support

- Parse dates like "today", "tomorrow", "next week", "Monday at 3pm"
- Understand duration expressions like "1 hour", "30 minutes"
- Support for multiple timezone specifications

### Full CRUD Operations

- **Create** events with attendees, reminders, and locations
- **Read** events with flexible time range queries
- **Update** existing events with partial modifications
- **Delete** events with notification control

### OAuth2 Authentication

- Secure Google OAuth2 flow
- Automatic token refresh
- Persistent token storage for seamless reconnection

### Claude Code Integration

- Native MCP protocol support
- Seamless integration with Claude Code workflows
- Structured responses for clear event information

---

## Prerequisites

Before installation, ensure you have:

1. **Node.js 20.0.0 or higher**
   ```bash
   node --version  # Should output v20.0.0 or higher
   ```

2. **A Google Account** with access to Google Calendar

3. **A Google Cloud Project** with the Calendar API enabled (setup instructions below)

4. **Claude Code** installed and configured

---

## Installation

### Step 1: Clone or Download the Plugin

```bash
# Navigate to your plugins directory
cd your-plugins-directory

# Clone the repository (if using git)
git clone https://github.com/your-repo/google-calendar-mcp.git
cd google-calendar-mcp
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Build the Project

```bash
npm run build
```

### Step 4: Verify Installation

```bash
# Check that the dist folder was created
ls dist/index.js
```

---

## Google Cloud Console Setup

Follow these detailed steps to configure Google Cloud for OAuth2 authentication.

### Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top of the page
3. Click **New Project**
4. Enter a project name (e.g., "Calendar MCP Server")
5. Click **Create**
6. Wait for the project to be created and select it

### Step 2: Enable the Google Calendar API

1. In the left sidebar, navigate to **APIs & Services** > **Library**
2. Search for "Google Calendar API"
3. Click on **Google Calendar API** in the results
4. Click **Enable**
5. Wait for the API to be enabled

### Step 3: Configure OAuth Consent Screen

1. Navigate to **APIs & Services** > **OAuth consent screen**
2. Select **External** user type (or Internal if using Google Workspace)
3. Click **Create**
4. Fill in the required fields:
   - **App name**: Calendar MCP Server
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
5. Click **Save and Continue**
6. On the Scopes page, click **Add or Remove Scopes**
7. Find and select `https://www.googleapis.com/auth/calendar`
8. Click **Update** then **Save and Continue**
9. On the Test users page, click **Add Users**
10. Add your Google email address
11. Click **Save and Continue**
12. Review and click **Back to Dashboard**

### Step 4: Create OAuth2 Credentials

1. Navigate to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Select **Desktop app** as the application type
4. Enter a name (e.g., "Calendar MCP Desktop Client")
5. Click **Create**
6. A dialog will appear with your credentials
7. Click **Download JSON**
8. Save the file as `credentials.json`

### Step 5: Place Credentials File

Move the downloaded `credentials.json` file to the plugin config directory:

```bash
# Create the config directory if it does not exist
mkdir -p config

# Move the credentials file
mv ~/Downloads/credentials.json config/credentials.json
```

---

## Configuration

### Directory Structure

After setup, your plugin directory should look like this:

```
google-calendar-mcp/
├── config/
│   └── credentials.json    # Your OAuth credentials (required)
├── data/
│   └── tokens.json         # Auto-generated after authentication
├── dist/
│   └── index.js            # Compiled server
├── src/
│   └── ...                 # Source files
├── package.json
└── .mcp.json
```

### MCP Configuration

The plugin includes a `.mcp.json` file for Claude Code integration. Ensure it contains:

```json
{
  "mcpServers": {
    "google-calendar": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "${pluginRoot}"
    }
  }
}
```

### Installing as a Claude Code Plugin

To use this as a Claude Code plugin:

1. Copy the entire `google-calendar-mcp` directory to your Claude Code plugins location
2. Or install via the plugin command:
   ```bash
   /plugin install path/to/google-calendar-mcp
   ```

---

## First-Time Authentication

When you first use the plugin, you will need to complete the OAuth authentication flow.

### Step 1: Trigger Authentication

Use any calendar tool in Claude Code. For example:

```
Show me my calendar events for today
```

### Step 2: Open the Authorization URL

Claude will respond with an authentication URL. Open this URL in your browser.

### Step 3: Grant Permissions

1. Select your Google account
2. If you see a warning about the app being unverified, click **Advanced** > **Go to Calendar MCP Server (unsafe)**
3. Review the permissions requested
4. Click **Allow**

### Step 4: Copy the Authorization Code

1. After granting permissions, you will be redirected to a page with an authorization code
2. Copy the entire code

### Step 5: Complete Authentication

Return to Claude Code and use the auth_status tool to exchange the code:

```
Exchange this authorization code: [paste your code here]
```

### Verification

After successful authentication, the plugin will automatically:

- Store tokens in `data/tokens.json`
- Refresh tokens automatically when they expire
- Maintain your session across restarts

---

## Usage Examples

### Basic Operations (English)

**List Events:**
```
Show me my meetings for next week
```

```
What events do I have tomorrow?
```

```
List all events from January 1st to January 7th
```

**Create Events:**
```
Schedule a meeting with John tomorrow at 2pm for 1 hour
```

```
Create an event called "Project Review" next Monday at 10am with description "Q1 review"
```

```
Add a 30-minute lunch break today at noon at "Cafe Downtown"
```

**Update Events:**
```
Move the "Project Review" meeting to 3pm
```

```
Change the location of my next meeting to "Conference Room B"
```

**Delete Events:**
```
Cancel my meeting tomorrow at 2pm
```

```
Delete the "Project Review" event
```

**Check Authentication:**
```
Check my Google Calendar authentication status
```

---

### Usage Examples (Korean)

**일정 조회:**
```
다음 주 미팅 일정 보여줘
```

```
내일 일정이 뭐가 있어?
```

```
이번 달 일정 전체 보여줘
```

**일정 생성:**
```
내일 오후 2시에 김철수님과 1시간 미팅 잡아줘
```

```
다음 주 월요일 오전 10시에 "프로젝트 리뷰" 미팅 만들어줘
```

```
오늘 점심시간에 30분 휴식 일정 추가해줘, 장소는 "카페"
```

**일정 수정:**
```
"프로젝트 리뷰" 미팅 시간을 오후 3시로 변경해줘
```

```
내일 미팅 장소를 "회의실 B"로 바꿔줘
```

**일정 삭제:**
```
내일 오후 2시 미팅 취소해줘
```

```
"프로젝트 리뷰" 일정 삭제해줘
```

**인증 상태 확인:**
```
구글 캘린더 인증 상태 확인해줘
```

---

## Tool Reference

### 1. list_events

Query calendar events within a specified time range.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `timeMin` | string | No | Now | Start time (natural language: "today", "tomorrow") |
| `timeMax` | string | No | - | End time (natural language) |
| `maxResults` | number | No | 10 | Maximum events to return (1-2500) |
| `calendarId` | string | No | "primary" | Calendar ID to query |
| `query` | string | No | - | Free text search query |

**Example Response:**
```json
{
  "events": [
    {
      "id": "abc123",
      "summary": "Team Meeting",
      "start": "2024-01-15 10:00 AM",
      "end": "2024-01-15 11:00 AM",
      "location": "Conference Room A",
      "htmlLink": "https://calendar.google.com/..."
    }
  ],
  "count": 1,
  "timeZone": "Asia/Seoul"
}
```

---

### 2. create_event

Create a new calendar event with flexible time specifications.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `summary` | string | **Yes** | - | Event title |
| `description` | string | No | - | Event description |
| `location` | string | No | - | Event location |
| `startTime` | string | **Yes** | - | Start time (natural language) |
| `endTime` | string | No | - | End time (natural language) |
| `duration` | string | No | - | Duration if no end time ("1 hour", "30 minutes") |
| `timeZone` | string | No | System | Timezone (e.g., "Asia/Seoul") |
| `attendees` | string[] | No | - | List of attendee email addresses |
| `reminders` | object[] | No | - | Reminder settings |
| `calendarId` | string | No | "primary" | Target calendar ID |

**Reminders Format:**
```json
[
  {"method": "popup", "minutes": 10},
  {"method": "email", "minutes": 60}
]
```

---

### 3. update_event

Modify an existing calendar event.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `eventId` | string | **Yes** | - | Event ID to update |
| `summary` | string | No | - | New event title |
| `description` | string | No | - | New description |
| `location` | string | No | - | New location |
| `startTime` | string | No | - | New start time |
| `endTime` | string | No | - | New end time |
| `timeZone` | string | No | - | New timezone |
| `attendees` | string[] | No | - | Updated attendee list |
| `reminders` | object[] | No | - | Updated reminders |
| `calendarId` | string | No | "primary" | Calendar ID |

---

### 4. delete_event

Remove a calendar event.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `eventId` | string | **Yes** | - | Event ID to delete |
| `calendarId` | string | No | "primary" | Calendar ID |
| `sendUpdates` | string | No | "all" | Notification setting: "all", "externalOnly", "none" |

---

### 5. auth_status

Check the current OAuth authentication status.

**Parameters:** None

**Example Response:**
```json
{
  "isAuthenticated": true,
  "needsRefresh": false,
  "expiresAt": "2024-01-15T12:00:00.000Z"
}
```

---

## Troubleshooting

### Authentication Issues

**Problem:** "OAuth credentials not found"

**Solution:**
1. Verify `credentials.json` exists in the `config/` directory
2. Ensure the file is valid JSON
3. Re-download credentials from Google Cloud Console if corrupted

---

**Problem:** "Not authenticated" or authentication URL displayed

**Solution:**
1. Complete the OAuth flow by opening the provided URL
2. Grant the required permissions
3. Exchange the authorization code

---

**Problem:** "Token refresh failed"

**Solution:**
1. Delete `data/tokens.json`
2. Re-authenticate using the OAuth flow
3. Check that the Google Cloud project still has Calendar API enabled

---

### API Errors

**Problem:** "Calendar API has not been used in project"

**Solution:**
1. Go to Google Cloud Console
2. Navigate to APIs & Services > Library
3. Search for "Google Calendar API"
4. Ensure it shows as "Enabled"

---

**Problem:** "Access Not Configured" or "403 Forbidden"

**Solution:**
1. Verify your email is added as a test user in OAuth consent screen
2. If the app is in production, ensure the consent screen is published
3. Check that the correct scopes are configured

---

### Date Parsing Issues

**Problem:** Dates not being recognized correctly

**Solution:**
1. Use explicit date formats when natural language fails
2. Specify timezone explicitly: "tomorrow at 2pm Asia/Seoul"
3. Use ISO format as fallback: "2024-01-15T14:00:00"

---

### General Debugging

**Enable verbose logging:**
```bash
DEBUG=* npm start
```

**Check token validity:**
```
Check my Google Calendar authentication status
```

**Reset authentication:**
```bash
rm data/tokens.json
# Then re-authenticate
```

---

## Development

### Running in Development Mode

```bash
npm run dev
```

### Running Tests

```bash
npm test
```

### Building for Production

```bash
npm run build
```

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `@modelcontextprotocol/sdk` | MCP server implementation |
| `googleapis` | Google Calendar API client |
| `chrono-node` | Natural language date parsing |
| `date-fns` | Date manipulation utilities |
| `date-fns-tz` | Timezone handling |
| `zod` | Schema validation |

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m "Add amazing feature"`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## Support

If you encounter any issues or have questions:

1. Check the [Troubleshooting](#troubleshooting) section
2. Search existing issues in the repository
3. Create a new issue with detailed information about your problem

---

**Made with Claude Code**
