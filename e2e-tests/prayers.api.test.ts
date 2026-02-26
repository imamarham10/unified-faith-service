import { describe, it, beforeAll } from './api-test-runner';
import { get, post, del, registerTestUser, loginAndGetToken, setAuthToken } from './helpers/http';
import { assertStatus, assertStatusIn, assertHasFields, assertIsArray } from './helpers/assertions';

describe('Prayers API — Prayer Times (Public)', () => {
  it('should get prayer times with valid coordinates', async () => {
    const res = await get('/api/v1/islam/prayers/times', { lat: 21.4225, lng: 39.8262 });
    assertStatusIn(res, [200, 201], 'Prayer times');
  });

  it('should reject prayer times without coordinates', async () => {
    const res = await get('/api/v1/islam/prayers/times');
    assertStatusIn(res, [400, 422], 'Missing coordinates');
  });

  it('should get current prayer with valid coordinates', async () => {
    const res = await get('/api/v1/islam/prayers/current', { lat: 21.4225, lng: 39.8262 });
    assertStatusIn(res, [200, 201], 'Current prayer');
  });
});

describe('Prayers API — Prayer Logging (Auth Required)', () => {
  beforeAll(async () => {
    const email = `test+prayer${Date.now()}@example.com`;
    await registerTestUser({ email, password: 'Test@1234' });
    await loginAndGetToken(email, 'Test@1234');
  });

  it('should log a prayer', async () => {
    const res = await post('/api/v1/islam/prayers/log', {
      prayerName: 'fajr',
      date: new Date().toISOString().split('T')[0],
      status: 'on_time',
    });
    assertStatusIn(res, [200, 201], 'Log prayer');
  });

  it('should get prayer logs', async () => {
    const res = await get('/api/v1/islam/prayers/logs');
    assertStatusIn(res, [200, 201], 'Get prayer logs');
  });

  it('should get prayer stats', async () => {
    const res = await get('/api/v1/islam/prayers/stats');
    assertStatusIn(res, [200, 201], 'Prayer stats');
  });

  it('should reject prayer log without auth', async () => {
    const token = require('./helpers/http').getAuthToken();
    setAuthToken(null);
    const res = await post('/api/v1/islam/prayers/log', {
      prayerName: 'fajr', date: '2026-01-01', status: 'on_time',
    });
    assertStatus(res, 401, 'Prayer log without auth');
    setAuthToken(token);
  });
});
