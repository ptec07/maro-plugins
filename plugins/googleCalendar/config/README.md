# Google Calendar MCP - Configuration

## Setup Instructions

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Select "Desktop app" as the application type
   - Download the credentials JSON file
5. Rename the downloaded file to `credentials.json` and place it in this directory

## File Structure

```
config/
  credentials.json    # OAuth 2.0 credentials (NEVER commit this file)
  README.md           # This file
```

## Security Notes

- **NEVER** commit `credentials.json` to version control
- The `.gitignore` file should already exclude this file
- Keep your credentials secure and do not share them
