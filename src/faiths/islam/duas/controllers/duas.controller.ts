import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { DuasService } from '../services/duas.service';
import { JwtAuthGuard } from '../../../../auth-service/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../../../../auth-service/decorators/current-user.decorator';

@Controller('api/v1/islam/duas')
export class DuasController {
  constructor(private readonly duasService: DuasService) {}

  // Static routes MUST come before `:id` to avoid being swallowed by the dynamic segment

  @Get('categories')
  async getCategories() {
    return this.duasService.getCategories();
  }

  @Get('search')
  async searchDuas(@Query('q') query: string) {
    return this.duasService.searchDuas(query);
  }

  @Get('daily')
  async getDailyDua() {
    return this.duasService.getDailyDua();
  }

  @Post('favorites')
  @UseGuards(JwtAuthGuard)
  async addFavorite(
    @CurrentUser() user: CurrentUserData,
    @Body() body: { duaId: string },
  ) {
    return this.duasService.addFavorite(user.userId, body.duaId);
  }

  @Get('favorites')
  @UseGuards(JwtAuthGuard)
  async getFavorites(@CurrentUser() user: CurrentUserData) {
    return this.duasService.getFavorites(user.userId);
  }

  @Post('custom')
  async createCustomDua(@Body() createDuaDto: any) {
    return this.duasService.createCustomDua(createDuaDto);
  }

  @Get()
  async getDuas(@Query() filters: any) {
    return this.duasService.getDuas(filters);
  }

  // Dynamic segment last — prevents it from matching static paths above
  @Get(':id')
  async getDua(@Param('id') id: string) {
    return this.duasService.getDua(id);
  }
}
