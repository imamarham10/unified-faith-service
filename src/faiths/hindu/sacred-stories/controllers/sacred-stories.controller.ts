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
import { SacredStoriesService } from '../services/sacred-stories.service';
import { CreateStoryFavoriteDto } from '../dto/create-story-favorite.dto';
import { JwtAuthGuard } from '../../../../auth-service/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../../../../auth-service/decorators/current-user.decorator';
import { Public } from '../../../../auth-service/decorators/public.decorator';

@Controller('api/v1/hindu/stories')
export class SacredStoriesController {
  constructor(private readonly storiesService: SacredStoriesService) {}

  // NOTE: static routes (collections, search, favorites) MUST be declared before ':id'

  @Public()
  @Get('collections')
  getCollections() {
    return this.storiesService.getCollections();
  }

  @Public()
  @Get('search')
  search(@Query('q') q?: string) {
    if (!q || !q.trim()) {
      throw new BadRequestException('Query parameter "q" is required');
    }
    return this.storiesService.search(q.trim());
  }

  // ----- Favorites (auth) -----
  @UseGuards(JwtAuthGuard)
  @Post('favorites')
  addFavorite(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateStoryFavoriteDto,
  ) {
    return this.storiesService.addFavorite(user.userId, dto.storyId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('favorites')
  getFavorites(@CurrentUser() user: CurrentUserData) {
    return this.storiesService.getFavorites(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('favorites/:storyId')
  removeFavorite(
    @CurrentUser() user: CurrentUserData,
    @Param('storyId') storyId: string,
  ) {
    return this.storiesService.removeFavorite(user.userId, storyId);
  }

  // ----- Lists + detail (public) -----
  @Public()
  @Get()
  getStories(
    @Query('collection') collection?: string,
    @Query('deity') deity?: string,
  ) {
    return this.storiesService.getStories({ collection, deity });
  }

  @Public()
  @Get(':id')
  getStory(@Param('id') id: string) {
    return this.storiesService.getStoryById(id);
  }
}
