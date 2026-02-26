import { describe, it, beforeAll } from './api-test-runner';
import { get, put, setAuthToken, registerTestUser, loginAndGetToken } from './helpers/http';
import { assertStatus, assertStatusIn, assertHasFields } from './helpers/assertions';

describe('Settings API — User Preferences', () => {
  beforeAll(async () => {
    const email = `test+settings${Date.now()}@example.com`;
    await registerTestUser({ email, password: 'Test@1234' });
    await loginAndGetToken(email, 'Test@1234');
  });

  it('should get user preferences', async () => {
    const res = await get('/users/preferences');
    assertStatusIn(res, [200, 201], 'Get preferences');
  });

  it('should update preferences with valid data', async () => {
    const res = await put('/users/preferences', {
      faith: 'muslim',
      language: 'en',
      countryCode: 'US',
      timezone: 'America/New_York',
    });
    assertStatusIn(res, [200, 201], 'Update valid preferences');
  });

  it('[BUG #1] should reject Arabic language (ar) — not in backend allowed list', async () => {
    const res = await put('/users/preferences', { language: 'ar' });
    // BUG: Backend rejects 'ar' because it's not in [en, hi, ta, te, kn, ml, mr, gu, bn, pa]
    assertStatus(res, 400, 'Arabic language rejected');
  });

  it('[BUG #1] should reject Urdu language (ur)', async () => {
    const res = await put('/users/preferences', { language: 'ur' });
    assertStatus(res, 400, 'Urdu language rejected');
  });

  it('[BUG #1] should reject French language (fr)', async () => {
    const res = await put('/users/preferences', { language: 'fr' });
    assertStatus(res, 400, 'French language rejected');
  });

  it('[BUG #1] should reject Turkish language (tr)', async () => {
    const res = await put('/users/preferences', { language: 'tr' });
    assertStatus(res, 400, 'Turkish language rejected');
  });

  it('should accept Hindi language (hi) — in backend allowed list', async () => {
    const res = await put('/users/preferences', { language: 'hi' });
    assertStatusIn(res, [200, 201], 'Hindi language accepted');
  });

  it('[BUG #2] should reject Jewish faith — not in backend allowed list', async () => {
    const res = await put('/users/preferences', { faith: 'jewish' });
    // BUG: Frontend offers "Jewish" but backend rejects it
    assertStatus(res, 400, 'Jewish faith rejected');
  });

  it('should accept Muslim faith', async () => {
    const res = await put('/users/preferences', { faith: 'muslim' });
    assertStatusIn(res, [200, 201], 'Muslim faith accepted');
  });

  it('should accept Jain faith (backend supports but frontend missing)', async () => {
    const res = await put('/users/preferences', { faith: 'jain' });
    assertStatusIn(res, [200, 201], 'Jain faith accepted');
  });

  it('should reject invalid country code (too long)', async () => {
    const res = await put('/users/preferences', { countryCode: 'TOOLONG' });
    assertStatus(res, 400, 'Country code too long');
  });

  it('should accept valid country code', async () => {
    const res = await put('/users/preferences', { countryCode: 'US' });
    assertStatusIn(res, [200, 201], 'Valid country code');
  });

  it('should update notification preferences', async () => {
    const res = await put('/users/preferences', {
      notificationPreferences: {
        push: true,
        email: true,
        sms: false,
        dailyPacket: true,
        aiGuru: false,
      },
    });
    assertStatusIn(res, [200, 201], 'Notification preferences');
  });

  it('should reject preferences update without auth token', async () => {
    const currentToken = require('./helpers/http').getAuthToken();
    setAuthToken(null);
    const res = await put('/users/preferences', { faith: 'muslim' });
    assertStatus(res, 401, 'Preferences without auth');
    setAuthToken(currentToken);
  });
});
