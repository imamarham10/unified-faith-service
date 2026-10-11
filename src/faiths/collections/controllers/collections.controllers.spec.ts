import { Test } from '@nestjs/testing';
import { IslamCollectionsController } from './islam-collections.controller';
import { HinduCollectionsController } from './hindu-collections.controller';
import { CollectionsService } from '../services/collections.service';

/**
 * Controller-level specs. The thing worth pinning is that the faith
 * discriminator is set by the **route**, never by a caller-supplied value —
 * `/api/v1/islam/collections/gita-daily` must not reach into the Hindu set.
 *
 * No database: `CollectionsService` is replaced by a stub, matching
 * `juz.controller.spec.ts`.
 */
async function makeControllers() {
  const service = {
    getCollections: jest.fn().mockResolvedValue([]),
    getCollectionBySlug: jest.fn().mockResolvedValue({}),
  };
  const moduleRef = await Test.createTestingModule({
    controllers: [IslamCollectionsController, HinduCollectionsController],
  })
    .useMocker((token) => (token === CollectionsService ? service : undefined))
    .compile();
  return {
    islam: moduleRef.get(IslamCollectionsController),
    hindu: moduleRef.get(HinduCollectionsController),
    service,
  };
}

describe('Collections controllers — faith is pinned by the route', () => {
  it('the Islam list endpoint always asks for islam', async () => {
    const { islam, service } = await makeControllers();
    await islam.getCollections();
    expect(service.getCollections).toHaveBeenCalledWith('islam');
  });

  it('the Hindu list endpoint always asks for hindu', async () => {
    const { hindu, service } = await makeControllers();
    await hindu.getCollections();
    expect(service.getCollections).toHaveBeenCalledWith('hindu');
  });

  it('a Hindu slug on the Islam route is still looked up under islam', async () => {
    const { islam, service } = await makeControllers();
    await islam.getCollection('gita-daily');
    expect(service.getCollectionBySlug).toHaveBeenCalledWith(
      'islam',
      'gita-daily',
      'en',
      'simple',
    );
  });

  it('defaults lang to en and script to simple, like QuranController', async () => {
    const { islam, service } = await makeControllers();
    await islam.getCollection('nightly-recitation');
    expect(service.getCollectionBySlug).toHaveBeenCalledWith(
      'islam',
      'nightly-recitation',
      'en',
      'simple',
    );
  });

  it.each(['uthmani', 'indopak', 'simple'])(
    'forwards ?script=%s untouched',
    async (script) => {
      const { islam, service } = await makeControllers();
      await islam.getCollection('nightly-recitation', 'en', script);
      expect(service.getCollectionBySlug).toHaveBeenCalledWith(
        'islam',
        'nightly-recitation',
        'en',
        script,
      );
    },
  );

  it.each(['uthmaani', '', 'SIMPLE', '../etc/passwd'])(
    'falls back to simple for the unknown script %p, as QuranController does',
    async (script) => {
      const { islam, service } = await makeControllers();
      await islam.getCollection('nightly-recitation', 'en', script);
      expect(service.getCollectionBySlug).toHaveBeenCalledWith(
        'islam',
        'nightly-recitation',
        'en',
        'simple',
      );
    },
  );

  it('the Hindu detail endpoint takes no script argument', async () => {
    const { hindu, service } = await makeControllers();
    await hindu.getCollection('gita-daily', 'hi');
    expect(service.getCollectionBySlug).toHaveBeenCalledWith(
      'hindu',
      'gita-daily',
      'hi',
    );
  });

  it('the Hindu detail endpoint defaults lang to en', async () => {
    const { hindu, service } = await makeControllers();
    await hindu.getCollection('gita-daily', undefined);
    expect(service.getCollectionBySlug).toHaveBeenCalledWith(
      'hindu',
      'gita-daily',
      'en',
    );
  });
});
