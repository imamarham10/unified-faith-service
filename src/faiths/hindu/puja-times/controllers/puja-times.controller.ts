import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  ParseFloatPipe,
  BadRequestException,
} from '@nestjs/common';
import { PujaTimesService } from '../services/puja-times.service';
import { PujaLogService } from '../services/puja-log.service';
import { CreatePujaLogDto } from '../dto/create-puja-log.dto';
import { JwtAuthGuard } from '../../../../auth-service/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserData,
} from '../../../../auth-service/decorators/current-user.decorator';
import { Public } from '../../../../auth-service/decorators/public.decorator';

@Controller('api/v1/hindu/puja-times')
export class PujaTimesController {
  constructor(
    private readonly pujaTimesService: PujaTimesService,
    private readonly pujaLogService: PujaLogService,
  ) {}

  @Public()
  @Get('today')
  async getToday(
    @Query('lat', ParseFloatPipe) lat: number,
    @Query('lng', ParseFloatPipe) lng: number,
    @Query('timezone') timezone = 'UTC',
  ) {
    this.validateCoords(lat, lng);
    // "Today" must be the user's calendar date, not the server's UTC date —
    // at 1:00 AM IST the server is still on yesterday.
    const today = this.pujaTimesService.wallClockNow(timezone);
    return this.pujaTimesService.getTimesForDate(today, lat, lng, timezone);
  }

  @Public()
  @Get('date/:date')
  async getByDate(
    @Param('date') dateStr: string,
    @Query('lat', ParseFloatPipe) lat: number,
    @Query('lng', ParseFloatPipe) lng: number,
    @Query('timezone') timezone = 'UTC',
  ) {
    this.validateCoords(lat, lng);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new BadRequestException('date must be YYYY-MM-DD');
    }
    return this.pujaTimesService.getTimesForDate(
      new Date(`${dateStr}T00:00:00Z`),
      lat,
      lng,
      timezone,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('log')
  async logSandhya(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreatePujaLogDto,
  ) {
    return this.pujaLogService.log(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('logs')
  async listLogs(
    @CurrentUser() user: CurrentUserData,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.pujaLogService.listLogs(user.userId, fromDate, toDate);
  }

  @UseGuards(JwtAuthGuard)
  @Get('stats')
  async getStats(@CurrentUser() user: CurrentUserData) {
    return this.pujaLogService.getStats(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('log/:id')
  async deleteLog(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    return this.pujaLogService.deleteLog(user.userId, id);
  }

  private validateCoords(lat: number, lng: number) {
    if (lat < -90 || lat > 90) throw new BadRequestException('lat -90 to 90');
    if (lng < -180 || lng > 180) throw new BadRequestException('lng -180 to 180');
  }
}
