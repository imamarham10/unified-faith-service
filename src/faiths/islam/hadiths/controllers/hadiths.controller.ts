import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { HadithsService } from '../services/hadiths.service';
import { JwtAuthGuard } from '../../../../auth-service/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../../../auth-service/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../../../auth-service/guards/roles.guard';
import { Roles } from '../../../../auth-service/decorators/roles.decorator';
import {
  CurrentUser,
  CurrentUserData,
} from '../../../../auth-service/decorators/current-user.decorator';
import { AddFavoriteHadithDto } from '../dto/add-favorite.dto';

@Controller('api/v1/islam/hadiths')
export class HadithsController {
  constructor(private readonly hadithsService: HadithsService) {}

  // Static routes MUST come before `:id` to avoid being swallowed by the dynamic segment

  @Get('books')
  async getBooks() {
    return this.hadithsService.getBooks();
  }

  @Get('daily')
  async getDailyHadith() {
    return this.hadithsService.getDailyHadith();
  }

  @Get('search')
  async searchHadiths(@Query('q') query: string) {
    return this.hadithsService.searchHadiths(query, false);
  }

  @Get('search/premium')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('premium_user', 'admin')
  async searchHadithsPremium(@Query('q') query: string) {
    return this.hadithsService.searchHadiths(query, true);
  }

  @Post('favorites')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('premium_user', 'admin')
  async addFavorite(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: AddFavoriteHadithDto,
  ) {
    return this.hadithsService.addFavorite(user.userId, dto.hadithId);
  }

  @Get('favorites')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('premium_user', 'admin')
  async getFavorites(@CurrentUser() user: CurrentUserData) {
    return this.hadithsService.getFavorites(user.userId);
  }

  @Post('favorites/remove')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('premium_user', 'admin')
  async removeFavorite(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: AddFavoriteHadithDto,
  ) {
    return this.hadithsService.removeFavorite(user.userId, dto.hadithId);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async getHadiths(
    @CurrentUser() user: CurrentUserData | null,
    @Query('bookId') bookId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const isPremium = user?.roles?.includes('premium_user') || user?.roles?.includes('admin') || false;
    return this.hadithsService.getHadiths(bookId, pageNum, limitNum, isPremium);
  }

  // Dynamic segment last — prevents it from matching static paths above
  @Get(':id')
  async getHadith(@Param('id') id: string) {
    return this.hadithsService.getHadith(id);
  }
}
