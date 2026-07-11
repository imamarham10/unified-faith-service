import { Controller, Get, Param, Query } from '@nestjs/common';
import { HinduFeelingsService } from '../services/feelings.service';
import { Public } from '../../../../auth-service/decorators/public.decorator';

@Controller('api/v1/hindu/feelings')
export class HinduFeelingsController {
  constructor(private readonly feelingsService: HinduFeelingsService) {}

  @Public()
  @Get()
  getEmotions() {
    return this.feelingsService.getEmotions();
  }

  @Public()
  @Get(':slug')
  getEmotion(@Param('slug') slug: string, @Query('lang') lang?: string) {
    return this.feelingsService.getEmotionBySlug(slug, lang || 'en');
  }
}
