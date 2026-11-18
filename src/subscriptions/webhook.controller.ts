import {
  Controller, Post, Req, Body, Headers, HttpCode, HttpStatus,
  BadRequestException, UnauthorizedException, Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../auth-service/decorators/public.decorator';
import { RazorpayService } from './razorpay.service';
import { RevenueCatEvent, RevenueCatService } from './revenuecat.service';
import { SubscriptionsService } from './subscriptions.service';

@Controller('api/v1/webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly razorpayService: RazorpayService,
    private readonly revenueCatService: RevenueCatService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @Post('razorpay')
  @HttpCode(HttpStatus.OK)
  async handleRazorpayWebhook(
    @Req() req: Request,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    const rawBody = (req as any).rawBody?.toString('utf-8');
    if (!rawBody) {
      throw new BadRequestException('Missing request body');
    }

    if (!signature) {
      throw new BadRequestException('Missing signature header');
    }

    const isValid = this.razorpayService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = JSON.parse(rawBody);
    console.log(`[Razorpay Webhook] Received event: ${event.event}`);

    await this.subscriptionsService.handleWebhookEvent(event);

    return { status: 'ok' };
  }

  /**
   * Store purchases, by way of RevenueCat.
   *
   * Plus is in-app digital content, so an Android purchase has to go through
   * Play Billing. RevenueCat wraps it, verifies the receipt with the store,
   * and tells us here — which is why nothing in this service ever sees a
   * purchase token.
   *
   * Authenticated by the Authorization header configured in the RevenueCat
   * dashboard. Without that check anyone who learns this URL can post
   * themselves a subscription, and the endpoint has to be `@Public()` for
   * RevenueCat to reach it at all — so the header is the only thing standing
   * between a stranger and a free Plus.
   */
  @Public()
  @Post('revenuecat')
  @HttpCode(HttpStatus.OK)
  async handleRevenueCatWebhook(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: { event?: RevenueCatEvent },
  ) {
    if (!this.revenueCatService.verifyWebhookAuth(authorization)) {
      throw new UnauthorizedException('Invalid webhook authorization');
    }

    const event = body?.event;
    if (!event?.type) {
      throw new BadRequestException('Missing event');
    }

    this.logger.log(`[RevenueCat] ${event.type}`);

    const change = await this.revenueCatService.apply(event);
    if (change) {
      // The entitlement lives on the user's roles, which is what the app's
      // JWT carries. The client picks the change up on its next token
      // refresh; nothing is pushed to it from here.
      if (change.active) {
        await this.subscriptionsService.assignPremiumRole(change.userId);
      } else {
        await this.subscriptionsService.revokePremiumRole(change.userId);
      }
    }

    // 200 even for an event we ignored. A non-2xx makes RevenueCat retry,
    // and retrying an event we will never act on just fills their queue.
    return { status: 'ok' };
  }
}
