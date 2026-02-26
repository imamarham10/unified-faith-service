import { describe, it, beforeAll } from './api-test-runner';
import { get, post, del, registerTestUser, loginAndGetToken, setAuthToken } from './helpers/http';
import { assertStatus, assertStatusIn, assertIsArray, assertArrayLength, assertHasFields } from './helpers/assertions';

describe('Quran API — Surahs & Verses (Public)', () => {
  it('should get all surahs', async () => {
    const res = await get('/api/v1/islam/quran/surahs');
    assertStatusIn(res, [200, 201], 'Get surahs');
    const data = res.data?.data || res.data;
    if (Array.isArray(data)) {
      assertArrayLength(data, 114, 114, 'Should have exactly 114 surahs');
    }
  });

  it('should get surah by ID (Al-Fatiha)', async () => {
    const res = await get('/api/v1/islam/quran/surah/1');
    assertStatusIn(res, [200, 201], 'Get surah 1');
  });

  it('should get surah by ID (Al-Baqarah)', async () => {
    const res = await get('/api/v1/islam/quran/surah/2');
    assertStatusIn(res, [200, 201], 'Get surah 2');
  });

  it('should return 404 for non-existent surah', async () => {
    const res = await get('/api/v1/islam/quran/surah/999');
    assertStatusIn(res, [404, 400], 'Non-existent surah');
  });

  it('should search verses', async () => {
    const res = await get('/api/v1/islam/quran/search', { q: 'mercy' });
    assertStatusIn(res, [200, 201], 'Search verses');
  });

  it('should handle empty search query', async () => {
    const res = await get('/api/v1/islam/quran/search', { q: '' });
    assertStatusIn(res, [200, 400], 'Empty search');
  });
});

describe('Quran API — Bookmarks (Auth Required)', () => {
  beforeAll(async () => {
    const email = `test+quran${Date.now()}@example.com`;
    await registerTestUser({ email, password: 'Test@1234' });
    await loginAndGetToken(email, 'Test@1234');
  });

  it('should add a bookmark', async () => {
    const res = await post('/api/v1/islam/quran/bookmarks', {
      surahId: 1, verseNumber: 1, note: 'Test bookmark',
    });
    assertStatusIn(res, [200, 201], 'Add bookmark');
  });

  it('should get bookmarks', async () => {
    const res = await get('/api/v1/islam/quran/bookmarks');
    assertStatusIn(res, [200, 201], 'Get bookmarks');
  });

  it('should reject bookmark without auth', async () => {
    const token = require('./helpers/http').getAuthToken();
    setAuthToken(null);
    const res = await post('/api/v1/islam/quran/bookmarks', { surahId: 1, verseNumber: 1 });
    assertStatus(res, 401, 'Bookmark without auth');
    setAuthToken(token);
  });
});
