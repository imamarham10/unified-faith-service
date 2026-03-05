import {
  Controller, Post, Req, Headers, HttpCode, HttpStatus, BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { RazorpayService } from './razorpay.service';
import { SubscriptionsService } from './subscriptions.service';

@Controller('api/v1/webhooks')
export class WebhookController {
  constructor(
    private readonly razorpayService: RazorpayService,
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
}
