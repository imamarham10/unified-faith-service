import { Controller, Get, Query } from '@nestjs/common';
import { CalendarService } from '../services/calendar.service';

@Controller('api/v1/islam/calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('hijri')
  async getHijriDate(@Query('date') date: string) {
    return this.calendarService.getHijriDate(date);
  }

  @Get('convert')
  async convertDate(@Query('date') date: string, @Query('to') to: string) {
    return this.calendarService.convertDate(date, to);
  }

  @Get('events')
  async getEvents() {
    return this.calendarService.getEvents();
  }

  @Get('upcoming')
  async getUpcomingEvents() {
    return this.calendarService.getUpcomingEvents();
  }
}
