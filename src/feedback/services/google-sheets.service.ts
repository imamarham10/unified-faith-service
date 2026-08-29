import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';

interface FeedbackRow {
  id: string;
  type: string;
  message: string;
  email: string | null;
  pageUrl: string;
  faithContext: string | null;
  createdAt: Date;
}

/**
 * Appends a row per feedback submission for non-technical/founder visibility
 * (filter, sort, comment) without a bespoke admin UI. Free at any realistic
 * volume (Sheets API quota: 60 write requests/min/user) — deliberately not
 * routed through Zapier, whose free tier caps at 100 tasks/month.
 *
 * No-ops with a debug log if the service account isn't configured, so local
 * dev / early deploys don't need these env vars to boot.
 */
@Injectable()
export class GoogleSheetsService {
  private readonly logger = new Logger(GoogleSheetsService.name);

  constructor(private configService: ConfigService) {}

  async appendFeedbackRow(feedback: FeedbackRow): Promise<void> {
    const clientEmail = this.configService.get<string>('GOOGLE_SHEETS_CLIENT_EMAIL');
    const privateKey = this.configService.get<string>('GOOGLE_SHEETS_PRIVATE_KEY');
    const spreadsheetId = this.configService.get<string>('GOOGLE_SHEETS_SPREADSHEET_ID');

    if (!clientEmail || !privateKey || !spreadsheetId) {
      this.logger.debug('Google Sheets not configured — skipping row append.');
      return;
    }

    const auth = new google.auth.JWT({
      email: clientEmail,
      // Env vars store the PEM key with literal "\n" — restore real newlines.
      key: privateKey.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Feedback!A:G',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [
          [
            feedback.createdAt.toISOString(),
            feedback.type,
            feedback.message,
            feedback.email || '',
            feedback.pageUrl,
            feedback.faithContext || '',
            feedback.id,
          ],
        ],
      },
    });
  }
}
