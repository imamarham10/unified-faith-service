import { describe, it, beforeAll } from './api-test-runner';
import { get, post, registerTestUser, loginAndGetToken, setAuthToken } from './helpers/http';
import { assertStatus, assertStatusIn, assertIsArray, assertArrayLength } from './helpers/assertions';

describe('Names API — 99 Names of Allah', () => {
  it('should get all names of Allah', async () => {
    const res = await get('/api/v1/islam/names/allah');
    assertStatusIn(res, [200, 201], 'All Allah names');
    const data = res.data?.data || res.data;
    if (Array.isArray(data)) {
      assertArrayLength(data, 99, 99, 'Should have 99 names');
    }
  });

  it('should get name by ID', async () => {
    const res = await get('/api/v1/islam/names/allah/1');
    assertStatusIn(res, [200, 201], 'Name by ID');
  });

  it('should get daily name', async () => {
    const res = await get('/api/v1/islam/names/daily');
    assertStatusIn(res, [200, 201], 'Daily name');
  });

  it('should return 404 for non-existent name ID', async () => {
    const res = await get('/api/v1/islam/names/allah/999');
    assertStatusIn(res, [404, 400], 'Non-existent name');
  });
});

describe('Names API — Favorites (Auth Required)', () => {
  beforeAll(async () => {
    const email = `test+names${Date.now()}@example.com`;
    await registerTestUser({ email, password: 'Test@1234' });
    await loginAndGetToken(email, 'Test@1234');
  });

  it('should add name to favorites', async () => {
    const res = await post('/api/v1/islam/names/favorites', { nameId: 1 });
    assertStatusIn(res, [200, 201], 'Add favorite');
  });

  it('should get favorites list', async () => {
    const res = await get('/api/v1/islam/names/favorites');
    assertStatusIn(res, [200, 201], 'Get favorites');
  });

  it('should reject favorites without auth', async () => {
    const token = require('./helpers/http').getAuthToken();
    setAuthToken(null);
    const res = await post('/api/v1/islam/names/favorites', { nameId: 1 });
    assertStatus(res, 401, 'Favorites without auth');
    setAuthToken(token);
  });
});

describe('Names API — 99 Names of Muhammad', () => {
  it('should get all Muhammad names', async () => {
    const res = await get('/api/v1/islam/names/muhammad');
    assertStatusIn(res, [200, 201], 'All Muhammad names');
  });

  it('should get daily Muhammad name', async () => {
    const res = await get('/api/v1/islam/names/muhammad/daily');
    assertStatusIn(res, [200, 201], 'Daily Muhammad name');
  });
});
