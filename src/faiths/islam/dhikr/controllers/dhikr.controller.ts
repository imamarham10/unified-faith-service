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
    return this.dhikrService.createCounter(user.userId, body);
  }

  @Patch('counters/:id')
  @UsePipes(new ValidationPipe({ transform: true }))
  async incrementCounter(@Param('id') id: string, @Body() body: UpdateCounterDto) {
    // If count is provided in body, use it, otherwise default to 1
    return this.dhikrService.incrementCounter(id, body.count || 1);
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
  async getHistory(@CurrentUser() user: CurrentUserData) {
    return this.dhikrService.getHistory(user.userId);
  }

  @Get('phrases')
  async getAvailablePhrases() {
    return this.dictionaryService.getAllPhrases();
  }
}
