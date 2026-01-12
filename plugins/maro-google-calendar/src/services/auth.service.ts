/**
 * Google Calendar MCP Server - Authentication Service
 * Handles OAuth2 token management with auto-refresh
 */

import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { OAuthCredentials, OAuthTokens } from '../types/calendar.types.js';
import { CalendarError, ErrorCodes } from '../utils/error-handler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '../..');

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const CREDENTIALS_PATH = resolve(PROJECT_ROOT, 'config/credentials.json');
const TOKENS_PATH = resolve(PROJECT_ROOT, 'data/tokens.json');

class AuthService {
  private static instance: AuthService;
  private oauth2Client: OAuth2Client | null = null;
  private credentials: OAuthCredentials | null = null;
  private tokens: OAuthTokens | null = null;
  private initialized = false;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.loadCredentials();
    await this.loadTokens();
    this.createOAuth2Client();
    this.initialized = true;
  }

  private async loadCredentials(): Promise<void> {
    try {
      const content = await readFile(CREDENTIALS_PATH, 'utf-8');
      this.credentials = JSON.parse(content) as OAuthCredentials;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new CalendarError(
          'OAuth credentials not found. Place credentials.json in config/',
          ErrorCodes.AUTH_NOT_CONFIGURED
        );
      }
      throw new CalendarError('Failed to load credentials', ErrorCodes.PARSE_ERROR);
    }
  }

  private async loadTokens(): Promise<void> {
    try {
      const content = await readFile(TOKENS_PATH, 'utf-8');
      this.tokens = JSON.parse(content) as OAuthTokens;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.tokens = null;
        return;
      }
      throw new CalendarError('Failed to load tokens', ErrorCodes.PARSE_ERROR);
    }
  }

  private async saveTokens(tokens: OAuthTokens): Promise<void> {
    const dataDir = dirname(TOKENS_PATH);
    try { await access(dataDir); } catch { await mkdir(dataDir, { recursive: true }); }
    await writeFile(TOKENS_PATH, JSON.stringify(tokens, null, 2));
    this.tokens = tokens;
  }

  private createOAuth2Client(): void {
    if (!this.credentials) {
      throw new CalendarError('Credentials not loaded', ErrorCodes.AUTH_NOT_CONFIGURED);
    }
    const clientConfig = this.credentials.installed || this.credentials.web;
    if (!clientConfig) {
      throw new CalendarError('Invalid credentials format', ErrorCodes.AUTH_NOT_CONFIGURED);
    }
    this.oauth2Client = new google.auth.OAuth2(
      clientConfig.client_id,
      clientConfig.client_secret,
      'urn:ietf:wg:oauth:2.0:oob' // OOB - no browser popup
    );
    if (this.tokens) this.oauth2Client.setCredentials(this.tokens);
    this.oauth2Client.on('tokens', (t) => { void this.handleTokenRefresh(t); });
  }

  private async handleTokenRefresh(tokens: {
    access_token?: string | null;
    refresh_token?: string | null;
    expiry_date?: number | null;
  }): Promise<void> {
    if (!this.tokens) return;
    const updated: OAuthTokens = {
      ...this.tokens,
      access_token: tokens.access_token || this.tokens.access_token,
      expiry_date: tokens.expiry_date || this.tokens.expiry_date,
    };
    if (tokens.refresh_token) updated.refresh_token = tokens.refresh_token;
    await this.saveTokens(updated);
  }

  public isAuthenticated(): boolean {
    return this.tokens !== null && this.oauth2Client !== null;
  }

  public needsRefresh(): boolean {
    if (!this.tokens || !this.tokens.expiry_date) return true;
    const buffer = 5 * 60 * 1000;
    return Date.now() >= this.tokens.expiry_date - buffer;
  }

  public async getClient(): Promise<OAuth2Client> {
    if (!this.initialized) await this.initialize();
    if (!this.oauth2Client) {
      throw new CalendarError('OAuth2 client not initialized', ErrorCodes.AUTH_NOT_CONFIGURED);
    }
    if (!this.isAuthenticated()) {
      const authUrl = this.generateAuthUrl();
      throw new CalendarError('Not authenticated. Visit: ' + authUrl, ErrorCodes.AUTH_TOKEN_INVALID);
    }
    if (this.needsRefresh()) {
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      await this.handleTokenRefresh(credentials);
    }
    return this.oauth2Client;
  }

  public generateAuthUrl(): string {
    if (!this.oauth2Client) {
      if (!this.credentials) throw new CalendarError('Credentials not loaded', ErrorCodes.AUTH_NOT_CONFIGURED);
      this.createOAuth2Client();
    }
    return this.oauth2Client!.generateAuthUrl({ access_type: 'offline', scope: SCOPES, prompt: 'consent' });
  }

  public async exchangeCode(code: string): Promise<void> {
    if (!this.oauth2Client) {
      throw new CalendarError('OAuth2 client not initialized', ErrorCodes.AUTH_NOT_CONFIGURED);
    }
    const { tokens } = await this.oauth2Client.getToken(code);
    if (!tokens.access_token) throw new Error('No access token received');
    const oauthTokens: OAuthTokens = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? undefined,
      scope: tokens.scope || SCOPES.join(' '),
      token_type: tokens.token_type || 'Bearer',
      expiry_date: tokens.expiry_date || Date.now() + 3600000,
    };
    await this.saveTokens(oauthTokens);
    this.oauth2Client.setCredentials(oauthTokens);
  }

  public getStatus(): {
    isAuthenticated: boolean;
    needsRefresh: boolean;
    expiresAt?: string;
    authUrl?: string;
  } {
    const status: {
      isAuthenticated: boolean;
      needsRefresh: boolean;
      expiresAt?: string;
      authUrl?: string;
    } = {
      isAuthenticated: this.isAuthenticated(),
      needsRefresh: this.needsRefresh(),
    };
    if (this.tokens && this.tokens.expiry_date) {
      status.expiresAt = new Date(this.tokens.expiry_date).toISOString();
    }
    if (!status.isAuthenticated) {
      try { status.authUrl = this.generateAuthUrl(); } catch {}
    }
    return status;
  }

  public async clearTokens(): Promise<void> {
    this.tokens = null;
    if (this.oauth2Client) this.oauth2Client.revokeCredentials();
    try { const { unlink } = await import('node:fs/promises'); await unlink(TOKENS_PATH); } catch {}
  }
}

export const authService = AuthService.getInstance();
export { AuthService };
