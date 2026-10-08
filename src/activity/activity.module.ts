import { Module } from '@nestjs/common';
import { ActivityController } from './controllers/activity.controller';
import { ActivityService } from './services/activity.service';
import { AuthModule } from '../auth-service/modules/auth.module';

/**
 * The retention engine's write path (Task 1.4).
 *
 * `/today`, `/history` and `/goal` land here in Task 1.6; the rollup cron in
 * Task 1.7. AuthModule is imported for JwtAuthGuard and its passport strategy.
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
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}
