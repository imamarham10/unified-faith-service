import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { FeedbackService } from '../services/feedback.service';
import { CreateFeedbackDto } from '../dto/create-feedback.dto';
import { Public } from '../../auth-service/decorators/public.decorator';
import { Roles } from '../../auth-service/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth-service/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../auth-service/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../auth-service/guards/roles.guard';

@Controller('api/v1/feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  async create(
    @Req() req: Request,
    @Body(ValidationPipe) dto: CreateFeedbackDto,
  ) {
    // Honeypot: a real visitor never fills this hidden field. Pretend success
    // so the bot doesn't learn it was caught, and skip the DB write entirely.
    if (dto.website) {
      return { data: { id: 'noop' }, statusCode: 201, message: 'Feedback submitted' };
    }

    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      'unknown';

    const allowed = await this.feedbackService.checkRateLimit(ip);
    if (!allowed) {
      throw new HttpException(
        'Too many submissions — please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const userId = (req as any).user?.userId ?? null;
    const feedback = await this.feedbackService.create(dto, userId);
    return { data: feedback, statusCode: 201, message: 'Feedback submitted' };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async findAll() {
    return this.feedbackService.findAll();
  }
}
