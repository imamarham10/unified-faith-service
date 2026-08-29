import { IsIn, IsOptional, IsString, IsEmail, MaxLength, MinLength } from 'class-validator';

export const FEEDBACK_TYPES = ['feedback', 'bug', 'feature_request', 'query'] as const;

export class CreateFeedbackDto {
  @IsIn(FEEDBACK_TYPES)
  type: (typeof FEEDBACK_TYPES)[number];

  @IsString()
  @MinLength(3)
  @MaxLength(5000)
  message: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @MaxLength(2048)
  pageUrl: string;

  @IsOptional()
  @IsIn(['islam', 'hindu'])
  faithContext?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  userAgent?: string;

  // Honeypot — real users never see or fill this field (hidden via CSS on the client).
  // Any non-empty value here means the submission is a bot; the controller
  // short-circuits and returns success without touching the DB or notifications.
  @IsOptional()
  @IsString()
  website?: string;
}
