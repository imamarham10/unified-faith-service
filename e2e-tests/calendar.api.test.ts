import { describe, it } from './api-test-runner';
import { get } from './helpers/http';
import { assertStatus, assertStatusIn, assertHasFields } from './helpers/assertions';

describe('Calendar API — Date Conversion & Events', () => {
  it('should get today\'s date in Hijri', async () => {
    const res = await get('/api/v1/islam/calendar/today');
    assertStatusIn(res, [200, 201], 'Today Hijri');
  });

  it('should convert Gregorian to Hijri', async () => {
    const res = await get('/api/v1/islam/calendar/convert/to-hijri', { date: '2026-02-26' });
    assertStatusIn(res, [200, 201], 'To Hijri');
  });

  it('should convert Hijri to Gregorian', async () => {
    const res = await get('/api/v1/islam/calendar/convert/to-gregorian', {
      year: 1447, month: 8, day: 1,
    });
    assertStatusIn(res, [200, 201], 'To Gregorian');
  });

  it('should get Gregorian month view', async () => {
    const res = await get('/api/v1/islam/calendar/gregorian-month', { year: 2026, month: 2 });
    assertStatusIn(res, [200, 201], 'Gregorian month');
  });

  it('should get Hijri month view', async () => {
    const res = await get('/api/v1/islam/calendar/hijri-month', { year: 1447, month: 8 });
    assertStatusIn(res, [200, 201], 'Hijri month');
  });

  it('should get Islamic events', async () => {
    const res = await get('/api/v1/islam/calendar/events');
    assertStatusIn(res, [200, 201], 'Get events');
  });

  it('should get upcoming events', async () => {
    const res = await get('/api/v1/islam/calendar/events/upcoming');
    assertStatusIn(res, [200, 201], 'Upcoming events');
  });

  it('should get Hijri months', async () => {
    const res = await get('/api/v1/islam/calendar/months');
    assertStatusIn(res, [200, 201], 'Hijri months');
  });
});
