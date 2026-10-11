import { Controller, Get, Param, Query } from '@nestjs/common';
import { CollectionsService } from '../services/collections.service';
import { Public } from '../../../auth-service/decorators/public.decorator';

/**
 * `GET /api/v1/hindu/collections` and `/collections/:slug`.
 *
 * Shaped after `ScripturesController`: no class-level guard, `@Public()` on
 * the content reads, `?lang=` defaulting to `'en'` and accepting the same
 * comma-tolerant language value the Hindu side already uses elsewhere. No
 * `?script=` — that is a Qur'an concern.
 *
 * Identical two methods to the Islam controller with `'hindu'` substituted;
 * every line of resolution is in the shared `CollectionsService`.
 */
@Controller('api/v1/hindu/collections')
export class HinduCollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Public()
  @Get()
  getCollections() {
    return this.collectionsService.getCollections('hindu');
  }

  @Public()
  @Get(':slug')
  getCollection(@Param('slug') slug: string, @Query('lang') lang?: string) {
    return this.collectionsService.getCollectionBySlug(
      'hindu',
      slug,
      lang || 'en',
    );
  }
}
