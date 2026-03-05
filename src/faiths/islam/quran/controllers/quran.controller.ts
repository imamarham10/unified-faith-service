import { Controller, Get, Post, Delete, Body, Query, Param, ValidationPipe, UsePipes, UseGuards, BadRequestException } from '@nestjs/common';
import { QuranService } from '../services/quran.service';
import { AddBookmarkDto, SearchVersesDto } from '../dto/quran.dto';
import { JwtAuthGuard } from '../../../../auth-service/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../auth-service/guards/roles.guard';
import { Roles } from '../../../../auth-service/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../../../../auth-service/decorators/current-user.decorator';
import { Public } from '../../../../auth-service/decorators/public.decorator';

@Controller('api/v1/islam/quran')
@UseGuards(JwtAuthGuard)
export class QuranController {
  constructor(private readonly quranService: QuranService) {}

  @Public()
  @Get('translations')
  async getAvailableTranslations(@Query('lang') lang: string = 'en') {
    return this.quranService.getAvailableTranslations(lang);
  }

  @Public()
  @Get('reciters')
  async getReciters() {
    return this.quranService.getReciters();
  }

  @Public()
  @Get('surahs')
  async getAllSurahs() {
    return this.quranService.getAllSurahs();
  }

  @Get('surah/:id/premium')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('premium_user', 'admin')
  async getSurahPremium(
    @Param('id') id: string,
    @Query('lang') lang: string = 'en',
    @Query('translations') translations: string = 'Saheeh International',
    @Query('transliteration') transliteration: string = 'false',
    @Query('script') script: string = 'simple',
  ) {
    const surahId = parseInt(id);
    if (isNaN(surahId)) throw new BadRequestException('Invalid Surah ID');
    const translationList = translations.split(',').map(t => t.trim());
    const validScripts = ['simple', 'uthmani', 'indopak'];
    const safeScript = validScripts.includes(script) ? script as any : 'simple';
    return this.quranService.getSurahPremium(surahId, lang, translationList, transliteration === 'true', true, safeScript);
  }

  @Get('surah/:id/audio')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('premium_user', 'admin')
  async getSurahAudio(
    @Param('id') id: string,
    @Query('reciter') reciterSlug: string = 'ar.alafasy',
  ) {
    const surahId = parseInt(id);
    if (isNaN(surahId)) throw new BadRequestException('Invalid Surah ID');
    return this.quranService.getSurahAudioUrls(reciterSlug, surahId);
  }

  @Public()
  @Get('surah/:id')
  async getSurah(
      @Param('id') id: string,
      @Query('lang') lang: string = 'en',
      @Query('script') script: string = 'simple',
  ) {
    const surahId = parseInt(id);
    if (isNaN(surahId)) {
        throw new BadRequestException('Invalid Surah ID');
    }
    const validScripts = ['simple', 'uthmani', 'indopak'];
    const safeScript = validScripts.includes(script) ? script as any : 'simple';
    return this.quranService.getSurah(surahId, lang, safeScript);
  }

  @Public()
  @Get('verse/:id')
  async getVerse(
      @Param('id') id: string,
      @Query('lang') lang: string = 'en'
  ) {
    return this.quranService.getVerse(id, lang);
  }

  @Public()
  @Get('search')
  async searchVerses(
      @Query('q') query: string,
      @Query('lang') lang: string = 'en'
  ) {
    if (!query) {
        throw new BadRequestException('Search query is required');
    }
    return this.quranService.searchVerses(query, lang);
  }

  @Post('bookmarks')
  @UsePipes(new ValidationPipe({ transform: true }))
  async addBookmark(@CurrentUser() user: CurrentUserData, @Body() body: AddBookmarkDto) {
    return this.quranService.addBookmark(user.userId, body);
  }

  @Get('bookmarks')
  async getBookmarks(@CurrentUser() user: CurrentUserData) {
    return this.quranService.getBookmarks(user.userId);
  }

  @Delete('bookmarks/:id')
  @UseGuards(JwtAuthGuard)
  async deleteBookmark(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    return this.quranService.deleteBookmark(user.userId, id);
  }
}
