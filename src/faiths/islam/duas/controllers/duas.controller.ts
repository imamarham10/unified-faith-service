import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { DuasService } from '../services/duas.service';

@Controller('api/v1/islam/duas')
export class DuasController {
  constructor(private readonly duasService: DuasService) {}

  @Get()
  async getDuas(@Query() filters: any) {
    return this.duasService.getDuas(filters);
  }

  @Get(':id')
  async getDua(@Param('id') id: string) {
    return this.duasService.getDua(id);
  }

  @Get('categories')
  async getCategories() {
    return this.duasService.getCategories();
  }

  @Get('search')
  async searchDuas(@Query('q') query: string) {
    return this.duasService.searchDuas(query);
  }

  @Post('custom')
  async createCustomDua(@Body() createDuaDto: any) {
    return this.duasService.createCustomDua(createDuaDto);
  }

  @Post('favorites')
  async addFavorite(@Body() favoriteDto: any) {
    return this.duasService.addFavorite(favoriteDto);
  }

  @Get('favorites')
  async getFavorites(@Query('userId') userId: string) {
    return this.duasService.getFavorites(userId);
  }

  @Get('daily')
  async getDailyDua() {
    return this.duasService.getDailyDua();
  }
}
