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
import { ScripturesService } from '../services/scriptures.service';
import { CreateBookmarkDto } from '../dto/create-bookmark.dto';
import { JwtAuthGuard } from '../../../../auth-service/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../../../../auth-service/decorators/current-user.decorator';
import { Public } from '../../../../auth-service/decorators/public.decorator';

@Controller('api/v1/hindu/scriptures')
export class ScripturesController {
  constructor(private readonly scripturesService: ScripturesService) {}

  // ----- Texts (public) -----
  @Public()
  @Get('texts')
  getTexts() {
    return this.scripturesService.getTexts();
  }

  @Public()
  @Get('texts/:slug')
  getText(@Param('slug') slug: string) {
    return this.scripturesService.getTextBySlug(slug);
  }

  @Public()
  @Get('texts/:slug/chapters/:chapterNumber')
  getChapter(
    @Param('slug') slug: string,
    @Param('chapterNumber') chapterNumber: string,
    @Query('lang') lang?: string,
  ) {
    const chapterNum = Number(chapterNumber);
    if (!Number.isInteger(chapterNum)) {
      throw new BadRequestException('chapterNumber must be an integer');
    }
    return this.scripturesService.getChapter(slug, chapterNum, lang || 'en');
  }

  @Public()
  @Get('texts/:slug/chapters/:chapterNumber/audio')
  getChapterAudio(
    @Param('slug') slug: string,
    @Param('chapterNumber') chapterNumber: string,
  ) {
    const chapterNum = Number(chapterNumber);
    if (!Number.isInteger(chapterNum)) {
      throw new BadRequestException('chapterNumber must be an integer');
    }
    return this.scripturesService.getChapterAudio(slug, chapterNum);
  }

  // ----- Featured + search (public) -----
  @Public()
  @Get('featured')
  getFeatured(@Query('lang') lang?: string, @Query('slug') slug?: string) {
    return this.scripturesService.getFeatured(lang || 'en', slug);
  }

  @Public()
  @Get('search')
  search(@Query('q') q?: string, @Query('lang') lang?: string) {
    if (!q || !q.trim()) {
      throw new BadRequestException('Query parameter "q" is required');
    }
    return this.scripturesService.search(q.trim(), lang || 'en');
  }

  // ----- Verses (public) -----
  @Public()
  @Get('verses/:id')
  getVerse(@Param('id') id: string, @Query('lang') lang?: string) {
    return this.scripturesService.getVerse(id, lang || 'en');
  }

  // ----- Bookmarks (auth) -----
  @UseGuards(JwtAuthGuard)
  @Post('bookmarks')
  addBookmark(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateBookmarkDto,
  ) {
    return this.scripturesService.addBookmark(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('bookmarks')
  getBookmarks(@CurrentUser() user: CurrentUserData) {
    return this.scripturesService.getBookmarks(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('bookmarks/:verseId')
  removeBookmark(
    @CurrentUser() user: CurrentUserData,
    @Param('verseId') verseId: string,
  ) {
    return this.scripturesService.removeBookmark(user.userId, verseId);
  }
}
