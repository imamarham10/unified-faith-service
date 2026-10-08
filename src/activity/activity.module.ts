import { Module } from '@nestjs/common';
import { ActivityController } from './controllers/activity.controller';
import { ActivityService } from './services/activity.service';
import { ActivityReadService } from './services/activity-read.service';
import { RollupService } from './services/rollup.service';
import { AuthModule } from '../auth-service/modules/auth.module';

/**
 * The retention engine's write path (Task 1.4) and read path (Task 1.6).
 *
 * `/today`, `/history` and `/goal` are `ActivityReadService`; the rollup cron
 * lands in Task 1.7. `RollupService` (Task 1.5) is exported because both of those read
 * through it rather than reimplementing the streak rules. AuthModule is imported for JwtAuthGuard and its passport strategy.
 *
 * PrismaService is deliberately NOT re-declared as a provider here. It is
 * exported by the `@Global()` PrismaModule, and listing it again would build a
 * second PrismaService — and so a second `pg.Pool` of up to 10 real backend
 * connections — for no benefit. (FeedbackModule does re-declare it; that is
 * pre-existing and out of scope.)
 */
@Module({
  imports: [AuthModule],
  controllers: [ActivityController],
  providers: [ActivityService, ActivityReadService, RollupService],
  exports: [ActivityService, ActivityReadService, RollupService],
})
export class ActivityModule {}
