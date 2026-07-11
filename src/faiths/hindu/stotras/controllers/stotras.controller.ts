import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StotrasService } from '../services/stotras.service';
import { CreateStotraFavoriteDto } from '../dto/create-stotra-favorite.dto';
import { JwtAuthGuard } from '../../../../auth-service/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../../../../auth-service/decorators/current-user.decorator';
import { Public } from '../../../../auth-service/decorators/public.decorator';

@Controller('api/v1/hindu/stotras')
export class StotrasController {
  constructor(private readonly stotrasService: StotrasService) {}

  // NOTE: static routes (categories, search, favorites) MUST be declared before ':slug'

  @Public()
  @Get('categories')
  getCategories() {
    return this.stotrasService.getCategories();
  }

  @Public()
  @Get('search')
  search(@Query('q') q?: string) {
    if (!q || !q.trim()) {
      throw new BadRequestException('Query parameter "q" is required');
    }
    return this.stotrasService.search(q.trim());
  }

  // ----- Favorites (auth) -----
  @UseGuards(JwtAuthGuard)
  @Post('favorites')
  addFavorite(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateStotraFavoriteDto,
  ) {
    return this.stotrasService.addFavorite(user.userId, dto.stotraId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('favorites')
  getFavorites(@CurrentUser() user: CurrentUserData) {
    return this.stotrasService.getFavorites(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('favorites/:stotraId')
  removeFavorite(
    @CurrentUser() user: CurrentUserData,
    @Param('stotraId') stotraId: string,
  ) {
    return this.stotrasService.removeFavorite(user.userId, stotraId);
  }

  // ----- Lists + detail (public) -----
  @Public()
  @Get()
  getStotras(
    @Query('category') category?: string,
    @Query('deity') deity?: string,
    @Query('type') type?: string,
  ) {
    return this.stotrasService.getStotras({ category, deity, type });
  }

  @Public()
  @Get(':slug')
  getStotra(@Param('slug') slug: string, @Query('lang') lang?: string) {
    return this.stotrasService.getStotraBySlug(slug, lang || 'en');
  }
}
