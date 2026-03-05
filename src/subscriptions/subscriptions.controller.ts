import {
  Controller, Post, Get, Body, UseGuards, ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth-service/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../auth-service/decorators/current-user.decorator';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto, VerifySubscriptionDto } from './dto/subscription.dto';

@Controller('api/v1/subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post('create')
  async createSubscription(
    @CurrentUser() user: CurrentUserData,
    @Body(new ValidationPipe({ transform: true })) dto: CreateSubscriptionDto,
  ) {
    return this.subscriptionsService.createSubscription(user.userId, dto.plan);
  }

  @Post('verify')
  async verifySubscription(
    @CurrentUser() user: CurrentUserData,
    @Body(new ValidationPipe({ transform: true })) dto: VerifySubscriptionDto,
  ) {
    return this.subscriptionsService.verifyAndActivate(
      user.userId,
      dto.razorpay_payment_id,
      dto.razorpay_subscription_id,
      dto.razorpay_signature,
    );
  }

  @Get('current')
  async getCurrentSubscription(@CurrentUser() user: CurrentUserData) {
    return this.subscriptionsService.getSubscription(user.userId);
  }

  @Post('cancel')
  async cancelSubscription(@CurrentUser() user: CurrentUserData) {
    return this.subscriptionsService.cancelSubscription(user.userId);
  }
}
