import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ValidationPipe, UsePipes, UseGuards, BadRequestException } from '@nestjs/common';
import { DhikrService } from '../services/dhikr.service';
import { DhikrDictionaryService } from '../services/dhikr-dictionary.service';
import { CreateCounterDto, CreateGoalDto, UpdateCounterDto } from '../dto/dhikr.dto';
import { JwtAuthGuard } from '../../../../auth-service/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../../../../auth-service/decorators/current-user.decorator';

@Controller('api/v1/islam/dhikr')
@UseGuards(JwtAuthGuard)
export class DhikrController {
  constructor(
    private readonly dhikrService: DhikrService,
    private readonly dictionaryService: DhikrDictionaryService,
  ) {}

  @Get('counters')
  async getCounters(@CurrentUser() user: CurrentUserData) {
    return this.dhikrService.getCounters(user.userId);
  }

  @Post('counters')
  @UsePipes(new ValidationPipe({ transform: true }))
  async createCounter(@CurrentUser() user: CurrentUserData, @Body() body: CreateCounterDto) {
    return this.dhikrService.createCounter(user.userId, {
      ...body,
      phraseTranslit: body.phraseTranslit ?? body.phraseTransliteration,
    });
  }

  @Patch('counters/:id')
  @UsePipes(new ValidationPipe({ transform: true }))
  async patchCounter(@Param('id') id: string, @Body() body: UpdateCounterDto) {
    // Absolute updates take precedence so reset/goal/rename aren't shadowed
    // by an accidental count value.
    if (body.setCount !== undefined || body.targetCount !== undefined || body.name !== undefined) {
      return this.dhikrService.updateCounterFields(id, {
        setCount: body.setCount,
        targetCount: body.targetCount,
        name: body.name,
      });
    }
    return this.dhikrService.incrementCounter(id, body.count ?? 1);
  }

  @Delete('counters/:id')
  async deleteCounter(@Param('id') id: string) {
    return this.dhikrService.deleteCounter(id);
  }

  @Post('goals')
  @UsePipes(new ValidationPipe({ transform: true }))
  async createGoal(@CurrentUser() user: CurrentUserData, @Body() body: CreateGoalDto) {
    return this.dhikrService.createGoal(user.userId, body);
  }

  @Get('goals')
  async getGoals(@CurrentUser() user: CurrentUserData) {
    return this.dhikrService.getGoals(user.userId);
  }

  @Get('stats')
  async getStats(@CurrentUser() user: CurrentUserData) {
    return this.dhikrService.getStats(user.userId);
  }

  @Get('history')
  async getHistory(
    @CurrentUser() user: CurrentUserData,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    const take = limit ? Math.min(Math.max(parseInt(limit, 10) || 30, 1), 365) : 30;
    return this.dhikrService.getHistory(user.userId, from, to, take);
  }

  @Get('phrases')
  async getAvailablePhrases() {
    return this.dictionaryService.getAllPhrases();
  }

  // Same dictionary in the mobile client's field names. `phrases` keeps the
  // original shape for the web client.
  @Get('dictionary')
  async getDictionary() {
    return this.dictionaryService.getAllPhrases().map((p, index) => ({
      id: p.transliteration.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `phrase-${index}`,
      phraseArabic: p.arabic,
      phraseTransliteration: p.transliteration,
      meaning: p.english,
      category: p.category,
      recommendedCount: 33,
    }));
  }
}
