import { Controller, Get, Post, Body, Param, UseGuards, ValidationPipe } from '@nestjs/common';
import { NamesService } from '../services/names.service';
import { CreateFavoriteDto } from '../dto/create-favorite.dto';
import { JwtAuthGuard } from '../../../../auth-service/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../auth-service/decorators/current-user.decorator';

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
  @UseGuards(JwtAuthGuard)
  async addFavorite(
    @CurrentUser() user: any,
    @Body(ValidationPipe) favoriteDto: CreateFavoriteDto,
  ) {
    return this.namesService.addFavorite(user.userId, favoriteDto.nameId);
  }

  @Get('daily')
  async getDailyName() {
    return this.namesService.getDailyName();
  }
}
