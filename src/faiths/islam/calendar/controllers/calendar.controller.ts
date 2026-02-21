import { Controller, Get, Query, ValidationPipe, UsePipes, UseGuards } from '@nestjs/common';
import { CalendarService } from '../services/calendar.service';
import {
  ConvertToHijriDto,
  ConvertToGregorianDto,
  GetGregorianMonthDto,
  GetHijriMonthDto,
  GetUpcomingEventsDto,
  GetTodayDto
} from '../dto/calendar.dto';
import { JwtAuthGuard } from '../../../../auth-service/guards/jwt-auth.guard';
import { Public } from '../../../../auth-service/decorators/public.decorator';

@Controller('api/v1/islam/calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  /**
   * Get today's date in both Gregorian and Hijri calendars
   * Supports timezone parameter for accurate "today" calculation
   */
  @Public()
  @Get('today')
  @UsePipes(new ValidationPipe({ transform: true }))
  async getToday(@Query() query: GetTodayDto) {
    return this.calendarService.getToday(query.timezone, query.calendarAdjust ?? 0);
  }

  /**
   * Convert Gregorian date to Hijri
   * Supports timezone parameter for accurate date interpretation
   */
  @Public()
  @Get('convert/to-hijri')
  @UsePipes(new ValidationPipe({ transform: true }))
  async convertToHijri(@Query() query: ConvertToHijriDto) {
    const date = query.date ? new Date(query.date) : new Date();
    return this.calendarService.gregorianToHijri(date, query.timezone, query.calendarAdjust ?? 0);
  }

  /**
   * Convert Hijri date to Gregorian
   * Supports timezone parameter for result interpretation
   */
  @Public()
  @Get('convert/to-gregorian')
  @UsePipes(new ValidationPipe({ transform: true }))
  async convertToGregorian(@Query() query: ConvertToGregorianDto) {
    return this.calendarService.hijriToGregorian(
      query.year,
      query.month,
      query.day,
      query.timezone
    );
  }

  /**
   * Get calendar for a Gregorian month with Hijri dates
   * Supports timezone parameter for accurate date mapping
   */
  @Public()
  @Get('gregorian-month')
  @UsePipes(new ValidationPipe({ transform: true }))
  async getGregorianMonth(@Query() query: GetGregorianMonthDto) {
    return this.calendarService.getGregorianMonthCalendar(
      query.year,
      query.month,
      query.timezone,
      query.calendarAdjust ?? 0
    );
  }

  /**
   * Get calendar for a Hijri month with Gregorian dates
   * Supports timezone parameter for accurate date mapping
   */
  @Public()
  @Get('hijri-month')
  @UsePipes(new ValidationPipe({ transform: true }))
  async getHijriMonth(@Query() query: GetHijriMonthDto) {
    return this.calendarService.getHijriMonthCalendar(
      query.year,
      query.month,
      query.timezone
    );
  }

  /**
   * Get all Islamic events
   */
  @Public()
  @Get('events')
  async getAllEvents() {
    return this.calendarService.getAllEvents();
  }

  /**
   * Get upcoming Islamic events
   * Supports timezone parameter for accurate "today" and date calculations
   */
  @Public()
  @Get('events/upcoming')
  @UsePipes(new ValidationPipe({ transform: true }))
  async getUpcomingEvents(@Query() query: GetUpcomingEventsDto) {
    return this.calendarService.getUpcomingEvents(query.days, query.timezone, query.calendarAdjust ?? 0);
  }

  /**
   * Get Hijri month names
   */
  @Public()
  @Get('months')
  async getHijriMonths() {
    return this.calendarService.getHijriMonthNames();
  }
}
