import { describe, it, beforeAll } from './api-test-runner';
import { get, post, patch, del, registerTestUser, loginAndGetToken, setAuthToken } from './helpers/http';
import { assertStatus, assertStatusIn, assertHasFields } from './helpers/assertions';

describe('Dhikr API — Counters (Auth Required)', () => {
  let counterId: string;

  beforeAll(async () => {
    const email = `test+dhikr${Date.now()}@example.com`;
    await registerTestUser({ email, password: 'Test@1234' });
    await loginAndGetToken(email, 'Test@1234');
  });

  it('should create a counter with name and phrase', async () => {
    const res = await post('/api/v1/islam/dhikr/counters', {
      name: 'SubhanAllah Counter',
      phrase: 'SubhanAllah',
      targetCount: 100,
    });
    assertStatusIn(res, [200, 201], 'Create counter');
    const data = res.data?.data || res.data;
    if (data?.id) counterId = data.id;
  });

  it('[BUG #3] should reject counter creation without phrase (phrase is required)', async () => {
    const res = await post('/api/v1/islam/dhikr/counters', {
      name: 'Counter Without Phrase',
      // phrase is omitted — frontend sends it as optional but backend requires it
    });
    // BUG: Backend requires phrase (IsNotEmpty) — this confirms the mismatch
    assertStatus(res, 400, 'Counter without phrase');
  });

  it('should reject counter creation without name', async () => {
    const res = await post('/api/v1/islam/dhikr/counters', {
      phrase: 'SubhanAllah',
    });
    assertStatus(res, 400, 'Counter without name');
  });

  it('should get all counters', async () => {
    const res = await get('/api/v1/islam/dhikr/counters');
    assertStatusIn(res, [200, 201], 'Get counters');
  });

  it('should update counter count', async () => {
    if (!counterId) return;
    const res = await patch(`/api/v1/islam/dhikr/counters/${counterId}`, { count: 10 });
    assertStatusIn(res, [200, 201], 'Update counter');
  });

  it('should delete a counter', async () => {
    if (!counterId) return;
    const res = await del(`/api/v1/islam/dhikr/counters/${counterId}`);
    assertStatusIn(res, [200, 204], 'Delete counter');
  });

  it('should reject counter operations without auth', async () => {
    const token = require('./helpers/http').getAuthToken();
    setAuthToken(null);
    const res = await get('/api/v1/islam/dhikr/counters');
    assertStatus(res, 401, 'Counters without auth');
    setAuthToken(token);
  });
});

describe('Dhikr API — Goals & History', () => {
  beforeAll(async () => {
    const email = `test+dhikrgoal${Date.now()}@example.com`;
    await registerTestUser({ email, password: 'Test@1234' });
    await loginAndGetToken(email, 'Test@1234');
  });

  it('should create a goal', async () => {
    const res = await post('/api/v1/islam/dhikr/goals', {
      phrase: 'Alhamdulillah',
      targetCount: 100,
      period: 'daily',
    });
    assertStatusIn(res, [200, 201], 'Create goal');
  });

  it('should get goals', async () => {
    const res = await get('/api/v1/islam/dhikr/goals');
    assertStatusIn(res, [200, 201], 'Get goals');
  });

  it('should get dhikr stats', async () => {
    const res = await get('/api/v1/islam/dhikr/stats');
    assertStatusIn(res, [200, 201], 'Get stats');
  });

  it('should get dhikr history', async () => {
    const res = await get('/api/v1/islam/dhikr/history');
    assertStatusIn(res, [200, 201], 'Get history');
  });

  it('should get predefined phrases', async () => {
    const res = await get('/api/v1/islam/dhikr/phrases');
    assertStatusIn(res, [200, 201], 'Get phrases');
  });
});
