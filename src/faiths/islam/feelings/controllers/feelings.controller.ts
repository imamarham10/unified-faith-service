
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { FeelingsService } from '../services/feelings.service';
import { Public } from '../../../../auth-service/decorators/public.decorator';

@Controller('api/v1/islam/feelings')
export class FeelingsController {
  constructor(private readonly feelingsService: FeelingsService) {}

  @Public()
  @Get()
  async getAllEmotions() {
    return this.feelingsService.getAllEmotions();
  }

  @Public()
  @Get(':slug')
  async getEmotionBySlug(@Param('slug') slug: string) {
    return this.feelingsService.getEmotionBySlug(slug);
  }
}
