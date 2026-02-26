import { describe, it } from './api-test-runner';
import { get } from './helpers/http';
import { assertStatus, assertStatusIn, assertIsArray } from './helpers/assertions';

describe('Feelings API — Emotions & Remedies', () => {
  it('should get all emotions', async () => {
    const res = await get('/api/v1/islam/feelings');
    assertStatusIn(res, [200, 201], 'Get all emotions');
  });

  it('should get emotion details by slug', async () => {
    // Common emotion slugs: sad, anxious, angry, lonely, grateful, happy
    const res = await get('/api/v1/islam/feelings/sad');
    assertStatusIn(res, [200, 201], 'Sad emotion details');
  });

  it('should get another emotion detail', async () => {
    const res = await get('/api/v1/islam/feelings/anxious');
    assertStatusIn(res, [200, 201], 'Anxious emotion details');
  });

  it('should return 404 for non-existent emotion', async () => {
    const res = await get('/api/v1/islam/feelings/nonexistent-emotion');
    assertStatusIn(res, [404, 400], 'Non-existent emotion');
  });
});
