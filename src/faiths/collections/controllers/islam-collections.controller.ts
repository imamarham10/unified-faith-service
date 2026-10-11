import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CollectionsService, toScript } from '../services/collections.service';
import { JwtAuthGuard } from '../../../auth-service/guards/jwt-auth.guard';
import { Public } from '../../../auth-service/decorators/public.decorator';

/**
 * `GET /api/v1/islam/collections` and `/collections/:slug`.
 *
 * Shaped after `QuranController`: class-level `JwtAuthGuard` with `@Public()`
 * on the content reads, `?lang=` and `?script=` query params with the same
 * defaults and the same `simple|uthmani|indopak` whitelist. Collections are
 * content, like surahs — they are readable without a token.
 *
 * The controller is deliberately thin. All resolution lives in the shared
 * `CollectionsService`, because `Collection.faithId` is a discriminator over
 * one table and the Hindu controller is the same two methods with `'hindu'`
 * substituted. Duplicating the resolver would guarantee the two drift.
 */
@Controller('api/v1/islam/collections')
@UseGuards(JwtAuthGuard)
export class IslamCollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Public()
  @Get()
  async getCollections() {
    return this.collectionsService.getCollections('islam');
  }

  @Public()
  @Get(':slug')
  async getCollection(
    @Param('slug') slug: string,
    @Query('lang') lang: string = 'en',
    @Query('script') script: string = 'simple',
  ) {
    return this.collectionsService.getCollectionBySlug(
      'islam',
      slug,
      lang,
      toScript(script),
    );
  }
}
