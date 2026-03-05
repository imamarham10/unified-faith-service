import { IsString, IsIn } from 'class-validator';

export class CreateSubscriptionDto {
  @IsString()
  @IsIn(['monthly', 'yearly'])
  plan: string;
}

export class VerifySubscriptionDto {
  @IsString()
  razorpay_payment_id: string;

  @IsString()
  razorpay_subscription_id: string;

  @IsString()
  razorpay_signature: string;
}
