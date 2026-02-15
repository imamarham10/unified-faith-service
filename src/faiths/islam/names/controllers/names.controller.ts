import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { NamesService } from '../services/names.service';

@Controller('api/v1/islam/names')
export class NamesController {
  constructor(private readonly namesService: NamesService) {}

  @Get('allah')
  async getAllNames() {
    return this.namesService.getAllNames();
  }

  @Get('allah/:id')
  async getName(@Param('id') id: string) {
    return this.namesService.getName(parseInt(id));
  }

  @Post('favorites')
  async addFavorite(@Body() favoriteDto: any) {
    return this.namesService.addFavorite(favoriteDto);
  }

  @Get('daily')
  async getDailyName() {
    return this.namesService.getDailyName();
  }
}
