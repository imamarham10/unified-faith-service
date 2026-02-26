import { describe, it, beforeAll } from './api-test-runner';
import { get, post, registerTestUser, loginAndGetToken, setAuthToken } from './helpers/http';
import { assertStatus, assertStatusIn, assertIsArray } from './helpers/assertions';

describe('Duas API — Listing & Search', () => {
  it('should get all duas', async () => {
    const res = await get('/api/v1/islam/duas');
    assertStatusIn(res, [200, 201], 'Get all duas');
  });

  it('should get duas by category', async () => {
    // First get categories to find a valid ID
    const catRes = await get('/api/v1/islam/duas/categories');
    if (catRes.status === 200 || catRes.status === 201) {
      const categories = catRes.data?.data || catRes.data;
      if (Array.isArray(categories) && categories.length > 0) {
        const categoryId = categories[0].id;
        const res = await get('/api/v1/islam/duas', { categoryId });
        assertStatusIn(res, [200, 201], 'Duas by category');
      }
    }
  });

  it('should get dua categories', async () => {
    const res = await get('/api/v1/islam/duas/categories');
    assertStatusIn(res, [200, 201], 'Get categories');
  });

  it('should search duas', async () => {
    const res = await get('/api/v1/islam/duas/search', { q: 'morning' });
    assertStatusIn(res, [200, 201], 'Search duas');
  });

  it('should get daily dua', async () => {
    const res = await get('/api/v1/islam/duas/daily');
    assertStatusIn(res, [200, 201], 'Daily dua');
  });

  it('should return 404 for non-existent dua ID', async () => {
    const res = await get('/api/v1/islam/duas/nonexistent-id-12345');
    assertStatusIn(res, [404, 400], 'Non-existent dua');
  });
});

describe('Duas API — Favorites (Auth Required)', () => {
  beforeAll(async () => {
    const email = `test+duas${Date.now()}@example.com`;
    await registerTestUser({ email, password: 'Test@1234' });
    await loginAndGetToken(email, 'Test@1234');
  });

  it('should get favorites list', async () => {
    const res = await get('/api/v1/islam/duas/favorites');
    assertStatusIn(res, [200, 201], 'Get dua favorites');
  });

  it('should reject favorites without auth', async () => {
    const token = require('./helpers/http').getAuthToken();
    setAuthToken(null);
    const res = await get('/api/v1/islam/duas/favorites');
    assertStatus(res, 401, 'Favorites without auth');
    setAuthToken(token);
  });
});
