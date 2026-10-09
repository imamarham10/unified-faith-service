import { Module } from '@nestjs/common';
import { ActivityController } from './controllers/activity.controller';
import { ActivityMaintenanceController } from './controllers/activity-maintenance.controller';
import { ActivityService } from './services/activity.service';
import { ActivityReadService } from './services/activity-read.service';
import { RollupService } from './services/rollup.service';
import { RollupCronService } from './services/rollup-cron.service';
import { MaintenanceSecretGuard } from './guards/maintenance-secret.guard';
import { AuthModule } from '../auth-service/modules/auth.module';

/**
 * The retention engine's write path (Task 1.4), read path (Task 1.6) and
 * nightly rollup (Task 1.7).
 *
 * `/today`, `/history` and `/goal` are `ActivityReadService`; the nightly
 * rollup is `RollupCronService`, reached through `ActivityMaintenanceController`
 * on its own `/api/v1/maintenance/` path so that `/api/v1/activity/` stays
 * exactly the four endpoints the frozen contract describes. `RollupService`
 * (Task 1.5) is exported because all of those read through it rather than
 * reimplementing the streak rules. AuthModule is imported for JwtAuthGuard and
 * its passport strategy; the maintenance controller deliberately does not use
 * it, being called by a cron that holds no user token.
 *
 * PrismaService is deliberately NOT re-declared as a provider here. It is
 * exported by the `@Global()` PrismaModule, and listing it again would build a
 * second PrismaService — and so a second `pg.Pool` of up to 10 real backend
 * connections — for no benefit. (FeedbackModule does re-declare it; that is
 * pre-existing and out of scope.)
 */
@Module({
  imports: [AuthModule],
  controllers: [ActivityController, ActivityMaintenanceController],
  providers: [
    ActivityService,
    ActivityReadService,
    RollupService,
    RollupCronService,
    MaintenanceSecretGuard,
  ],
  exports: [ActivityService, ActivityReadService, RollupService, RollupCronService],
})
export class ActivityModule {}
