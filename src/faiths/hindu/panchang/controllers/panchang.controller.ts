import {
  Controller,
  Get,
  Param,
  Query,
  ParseFloatPipe,
  ParseIntPipe,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PanchangService } from '../services/panchang.service';
import { FestivalRuleService } from '../services/festival-rule.service';
import { PrismaService } from '../../../../common/utils/prisma.service';
import { Public } from '../../../../auth-service/decorators/public.decorator';

@Controller('api/v1/hindu/panchang')
export class PanchangController {
  constructor(
    private readonly panchangService: PanchangService,
    private readonly festivalRuleService: FestivalRuleService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Get('today')
  async getToday(
    @Query('lat', ParseFloatPipe) lat: number,
    @Query('lng', ParseFloatPipe) lng: number,
    @Query('timezone') timezone = 'UTC',
  ) {
    this.validateCoords(lat, lng);
    return this.panchangService.getPanchang(new Date(), lat, lng, timezone);
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
      throw new BadRequestException('date must be in YYYY-MM-DD format');
    }
    const date = new Date(`${dateStr}T00:00:00Z`);
    if (isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date');
    }
    return this.panchangService.getPanchang(date, lat, lng, timezone);
  }

  @Public()
  @Get('month')
  async getMonth(
    @Query('year', ParseIntPipe) year: number,
    @Query('month', ParseIntPipe) month: number,
    @Query('lat', ParseFloatPipe) lat: number,
    @Query('lng', ParseFloatPipe) lng: number,
    @Query('timezone') timezone = 'UTC',
  ) {
    this.validateCoords(lat, lng);
    if (year < 1900 || year > 2100) {
      throw new BadRequestException('year must be between 1900 and 2100');
    }
    if (month < 1 || month > 12) {
      throw new BadRequestException('month must be between 1 and 12');
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    const days = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(Date.UTC(year, month - 1, day));
      days.push(await this.panchangService.getPanchang(date, lat, lng, timezone));
    }
    return { year, month, days };
  }

  @Public()
  @Get('auspicious')
  async getAuspicious(
    @Query('lat', ParseFloatPipe) lat: number,
    @Query('lng', ParseFloatPipe) lng: number,
    @Query('date') dateStr?: string,
    @Query('timezone') timezone = 'UTC',
  ) {
    this.validateCoords(lat, lng);
    let date: Date;
    if (dateStr) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        throw new BadRequestException('date must be in YYYY-MM-DD format');
      }
      date = new Date(`${dateStr}T00:00:00Z`);
      if (isNaN(date.getTime())) {
        throw new BadRequestException('Invalid date');
      }
    } else {
      date = new Date();
    }
    const full = await this.panchangService.getPanchang(date, lat, lng, timezone);
    return { date: full.date, timezone: full.timezone, auspicious: full.auspicious };
  }

  // -------- Festival endpoints (Bundle J) --------
  // NOTE: declare `festivals/upcoming` BEFORE `festivals/:slug` so Nest's
  // route matcher doesn't shadow `upcoming` as a slug parameter.

  @Public()
  @Get('festivals')
  async listAllFestivals() {
    return this.prisma.hinduFestival.findMany({ orderBy: { slug: 'asc' } });
  }

  @Public()
  @Get('festivals/upcoming')
  async upcomingFestivals(
    @Query('lat', ParseFloatPipe) lat: number,
    @Query('lng', ParseFloatPipe) lng: number,
    @Query('days') daysStr = '90',
    @Query('timezone') timezone = 'UTC',
  ) {
    this.validateCoords(lat, lng);
    const days = Math.min(Math.max(parseInt(daysStr, 10) || 90, 1), 365);
    const fromDate = new Date();
    const occurrences = await this.festivalRuleService.findUpcoming(
      fromDate,
      days,
      lat,
      lng,
      timezone,
    );
    return {
      fromDate: fromDate.toISOString().slice(0, 10),
      days,
      occurrences,
    };
  }

  @Public()
  @Get('festivals/:slug')
  async getFestival(@Param('slug') slug: string) {
    const festival = await this.prisma.hinduFestival.findUnique({
      where: { slug },
    });
    if (!festival) {
      throw new NotFoundException(`Festival '${slug}' not found`);
    }
    return festival;
  }

  private validateCoords(lat: number, lng: number) {
    if (lat < -90 || lat > 90) {
      throw new BadRequestException('lat must be between -90 and 90');
    }
    if (lng < -180 || lng > 180) {
      throw new BadRequestException('lng must be between -180 and 180');
    }
  }
}
