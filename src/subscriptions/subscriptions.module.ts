import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth-service/modules/auth.module';
import { RazorpayService } from './razorpay.service';
import { RevenueCatService } from './revenuecat.service';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { WebhookController } from './webhook.controller';

@Module({
  imports: [ConfigModule, AuthModule],
  providers: [RazorpayService, RevenueCatService, SubscriptionsService],
  controllers: [SubscriptionsController, WebhookController],
})
export class SubscriptionsModule {}
