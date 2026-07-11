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
import { TempleLocatorService } from '../services/temple-locator.service';
import { CreateTempleFavoriteDto } from '../dto/create-temple-favorite.dto';
import { JwtAuthGuard } from '../../../../auth-service/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../../../../auth-service/decorators/current-user.decorator';
import { Public } from '../../../../auth-service/decorators/public.decorator';

@Controller('api/v1/hindu/temples')
export class TempleLocatorController {
  constructor(private readonly templeService: TempleLocatorService) {}

  // NOTE: static routes (states, nearby, favorites) MUST be declared before ':id'

  @Public()
  @Get('states')
  getStates() {
    return this.templeService.getStates();
  }

  @Public()
  @Get('nearby')
  getNearby(
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radiusKm') radiusKm?: string,
  ) {
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (
      lat === undefined ||
      lng === undefined ||
      lat === '' ||
      lng === '' ||
      !Number.isFinite(latNum) ||
      !Number.isFinite(lngNum)
    ) {
      throw new BadRequestException(
        'Query parameters "lat" and "lng" are required and must be finite numbers',
      );
    }
    const radiusNum =
      radiusKm !== undefined && radiusKm !== '' ? Number(radiusKm) : 100;
    if (!Number.isFinite(radiusNum) || radiusNum <= 0) {
      throw new BadRequestException('"radiusKm" must be a positive number');
    }
    return this.templeService.getNearby(latNum, lngNum, radiusNum);
  }

  // ----- Favorites (auth) -----
  @UseGuards(JwtAuthGuard)
  @Post('favorites')
  addFavorite(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateTempleFavoriteDto,
  ) {
    return this.templeService.addFavorite(user.userId, dto.templeId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('favorites')
  getFavorites(@CurrentUser() user: CurrentUserData) {
    return this.templeService.getFavorites(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('favorites/:templeId')
  removeFavorite(
    @CurrentUser() user: CurrentUserData,
    @Param('templeId') templeId: string,
  ) {
    return this.templeService.removeFavorite(user.userId, templeId);
  }

  // ----- Lists + detail (public) -----
  @Public()
  @Get()
  getTemples(
    @Query('deity') deity?: string,
    @Query('state') state?: string,
    @Query('q') q?: string,
  ) {
    return this.templeService.getTemples({ deity, state, q });
  }

  @Public()
  @Get(':id')
  getTemple(@Param('id') id: string) {
    return this.templeService.getTempleById(id);
  }
}
