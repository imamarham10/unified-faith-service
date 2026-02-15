import { Controller, Get, Post, Body, Query, ValidationPipe, UsePipes, UseGuards, BadRequestException } from '@nestjs/common';
import { PrayersService } from '../services/prayers.service';
import { GetPrayerTimesDto, LogPrayerDto } from '../dto/prayers.dto';
import { JwtAuthGuard } from '../../../../auth-service/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../../../../auth-service/decorators/current-user.decorator';
import { Public } from '../../../../auth-service/decorators/public.decorator';

@Controller('api/v1/islam/prayers')
@UseGuards(JwtAuthGuard)
export class PrayersController {
  constructor(private readonly prayersService: PrayersService) {}

  @Public()
  @Get('times')
  @UsePipes(new ValidationPipe({ transform: true }))
  async getPrayerTimes(@Query() query: GetPrayerTimesDto) {
    return this.prayersService.getPrayerTimes(
      query.lat,
      query.lng,
      query.date,
      query.method
    );
  }

  @Public()
  @Get('current')
  async getCurrentPrayer(
    @Query('lat') lat: string, 
    @Query('lng') lng: string,
    @Query('method') method?: string
  ) {
    if (!lat || !lng) {
        throw new BadRequestException('Latitude and longitude are required');
    }
    return this.prayersService.getCurrentPrayer(parseFloat(lat), parseFloat(lng), method);
  }

  @Post('log')
  @UsePipes(new ValidationPipe({ transform: true }))
  async logPrayer(@CurrentUser() user: CurrentUserData, @Body() body: LogPrayerDto) {
    return this.prayersService.logPrayer(user.userId, body);
  }

  @Get('logs')
  async getPrayerLogs(
    @CurrentUser() user: CurrentUserData,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.prayersService.getPrayerLogs(user.userId, fromDate, toDate);
  }

  @Get('stats')
  async getPrayerStats(@CurrentUser() user: CurrentUserData) {
    return this.prayersService.getPrayerStats(user.userId);
  }
}
