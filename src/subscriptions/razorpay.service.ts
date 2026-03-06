import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Razorpay = require('razorpay');

@Injectable()
export class RazorpayService {
  private razorpay: InstanceType<typeof Razorpay>;

  constructor(private configService: ConfigService) {
    this.razorpay = new Razorpay({
      key_id: this.configService.get<string>('RAZORPAY_KEY_ID') || '',
      key_secret: this.configService.get<string>('RAZORPAY_KEY_SECRET') || '',
    });
  }

  async createSubscription(planId: string, userId: string, plan: string) {
    // Razorpay caps total_count at 100 for yearly plans
    const totalCount = plan === 'yearly' ? 10 : 120;

    return this.razorpay.subscriptions.create({
      plan_id: planId,
      total_count: totalCount,
      quantity: 1,
      customer_notify: 1,
      notes: { userId },
    });
  }

  async fetchSubscription(subscriptionId: string) {
    return this.razorpay.subscriptions.fetch(subscriptionId);
  }

  async cancelSubscription(subscriptionId: string) {
    return this.razorpay.subscriptions.cancel(subscriptionId);
  }

  verifyPaymentSignature(
    paymentId: string,
    subscriptionId: string,
    signature: string,
  ): boolean {
    const secret = this.configService.get<string>('RAZORPAY_KEY_SECRET') || '';
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${paymentId}|${subscriptionId}`)
      .digest('hex');
    return generatedSignature === signature;
  }

  verifyWebhookSignature(
    rawBody: string,
    signature: string,
  ): boolean {
    const secret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET') || '';
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');
    return generatedSignature === signature;
  }
}
