import { Module } from '@nestjs/common';
import { IslamCollectionsController } from './controllers/islam-collections.controller';
import { HinduCollectionsController } from './controllers/hindu-collections.controller';
import { CollectionsService } from './services/collections.service';
import { AuthModule } from '../../auth-service/modules/auth.module';

/**
 * Curated collections (`team/curated-collections-spec.md` §1.2, Phase 2).
 *
 * One module, one service, two controllers — because `Collection.faithId` is a
 * discriminator over a single pair of tables that both verticals share. It
 * sits under `src/faiths/` rather than in `islam/` or `hindu/` for the same
 * reason `src/activity/` sits at the top level: it spans faiths. It is
 * registered in `FaithModule` alongside `IslamModule` and `HinduModule`.
 *
 * `AuthModule` is imported for `JwtAuthGuard` and its passport strategy — the
 * Islam controller carries the class-level guard that `QuranController` does,
 * even though every collection read is `@Public()`.
 *
 * `PrismaService` is deliberately NOT re-declared as a provider: it is
 * exported by the `@Global()` `PrismaModule`, and listing it again would build
 * a second `PrismaService` and so a second `pg.Pool` of up to 10 real backend
 * connections, for no benefit.
 */
@Module({
  imports: [AuthModule],
  controllers: [IslamCollectionsController, HinduCollectionsController],
  providers: [CollectionsService],
  exports: [CollectionsService],
})
export class CollectionsModule {}
