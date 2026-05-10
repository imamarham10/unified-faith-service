import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Query,
} from '@nestjs/common';
import { JapaCounterService } from '../services/japa-counter.service';
import { JapaGoalService } from '../services/japa-goal.service';
import { JapaHistoryService } from '../services/japa-history.service';
import { MantraDictionaryService } from '../services/mantra-dictionary.service';
import { CreateJapaCounterDto } from '../dto/create-japa-counter.dto';
import { UpdateJapaCounterDto } from '../dto/update-japa-counter.dto';
import { CreateJapaGoalDto } from '../dto/create-japa-goal.dto';
import { JwtAuthGuard } from '../../../../auth-service/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../../../../auth-service/decorators/current-user.decorator';
import { Public } from '../../../../auth-service/decorators/public.decorator';

@Controller('api/v1/hindu/japa')
export class JapaController {
  constructor(
    private readonly counterService: JapaCounterService,
    private readonly goalService: JapaGoalService,
    private readonly historyService: JapaHistoryService,
    private readonly dictionaryService: MantraDictionaryService,
  ) {}

  // ----- Counters -----
  @UseGuards(JwtAuthGuard)
  @Get('counters')
  listCounters(@CurrentUser() user: CurrentUserData) {
    return this.counterService.listCounters(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('counters')
  createCounter(@CurrentUser() user: CurrentUserData, @Body() dto: CreateJapaCounterDto) {
    return this.counterService.createCounter(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('counters/:id')
  updateCounter(@CurrentUser() user: CurrentUserData, @Param('id') id: string, @Body() dto: UpdateJapaCounterDto) {
    return this.counterService.updateCounter(user.userId, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('counters/:id')
  deleteCounter(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.counterService.deleteCounter(user.userId, id);
  }

  // ----- Goals -----
  @UseGuards(JwtAuthGuard)
  @Get('goals')
  listGoals(@CurrentUser() user: CurrentUserData) {
    return this.goalService.listGoals(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('goals')
  createGoal(@CurrentUser() user: CurrentUserData, @Body() dto: CreateJapaGoalDto) {
    return this.goalService.createGoal(user.userId, dto);
  }

  // ----- History + Stats -----
  @UseGuards(JwtAuthGuard)
  @Get('history')
  listHistory(@CurrentUser() user: CurrentUserData) {
    return this.historyService.listHistory(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('stats')
  getStats(@CurrentUser() user: CurrentUserData) {
    return this.historyService.getStats(user.userId);
  }

  // ----- Mantra Dictionary (public) -----
  @Public()
  @Get('mantras')
  listMantras(@Query('category') category?: string, @Query('deity') deity?: string) {
    if (deity) return this.dictionaryService.getByDeity(deity);
    if (category) return this.dictionaryService.getByCategory(category as any);
    return this.dictionaryService.getAll();
  }
}
