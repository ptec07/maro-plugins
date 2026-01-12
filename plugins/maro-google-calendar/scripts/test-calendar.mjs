import { google } from 'googleapis';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

async function run() {
  const credentials = JSON.parse(readFileSync(resolve(PROJECT_ROOT, 'config/credentials.json'), 'utf8'));
  const tokens = JSON.parse(readFileSync(resolve(PROJECT_ROOT, 'data/tokens.json'), 'utf8'));
  
  const { client_id, client_secret } = credentials.installed;
  
  // OOB redirect - prevents browser popup
  const oauth2Client = new google.auth.OAuth2(client_id, client_secret, 'urn:ietf:wg:oauth:2.0:oob');
  oauth2Client.setCredentials(tokens);
  
  // Silent token refresh
  oauth2Client.on('tokens', (t) => {
    writeFileSync(resolve(PROJECT_ROOT, 'data/tokens.json'), JSON.stringify({ ...tokens, ...t }, null, 2));
  });
  
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);
  
  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: tomorrow.toISOString(),
    timeMax: dayAfter.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  });
  
  const events = response.data.items || [];
  console.log('=== Tomorrow Events ===');
  if (events.length === 0) {
    console.log('No events scheduled.');
  } else {
    events.forEach((e, i) => {
      const time = e.start.dateTime 
        ? new Date(e.start.dateTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
        : 'All day';
      console.log(`${i+1}. [${time}] ${e.summary}`);
    });
  }
}

run().catch(e => console.error('Error:', e.message));
