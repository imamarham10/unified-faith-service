import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/utils/prisma.service';
import { gregorianToHijri, hijriToGregorian } from '@tabby_ai/hijri-converter';

export interface HijriDateInfo {
  hijriDay: number;
  hijriMonth: number;
  hijriYear: number;
  hijriMonthName: string;
  gregorianDate: string;
  dayOfWeek: string;
  events?: Array<{
    name: string;
    nameArabic?: string;
    description?: string;
    importance: string;
  }>;
}

export interface CalendarMonth {
  month: number;
  year: number;
  monthName: string;
  days: HijriDateInfo[];
}

@Injectable()
export class CalendarService {
  private readonly hijriMonthNames = [
    'Muharram',
    'Safar',
    'Rabi\' al-Awwal',
    'Rabi\' al-Thani',
    'Jumada al-Awwal',
    'Jumada al-Thani',
    'Rajab',
    'Sha\'ban',
    'Ramadan',
    'Shawwal',
    'Dhu al-Qi\'dah',
    'Dhu al-Hijjah'
  ];

  private readonly hijriMonthNamesArabic = [
    'مُحَرَّم',
    'صَفَر',
    'رَبِيع ٱلْأَوَّل',
    'رَبِيع ٱلثَّانِي',
    'جُمَادَىٰ ٱلْأُولَىٰ',
    'جُمَادَىٰ ٱلثَّانِيَة',
    'رَجَب',
    'شَعْبَان',
    'رَمَضَان',
    'شَوَّال',
    'ذُو ٱلْقَعْدَة',
    'ذُو ٱلْحِجَّة'
  ];

  private readonly dayNames = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday'
  ];

  constructor(private prisma: PrismaService) {}

  /**
   * Get current date in a specific timezone
   * @param timezone IANA timezone string (e.g., 'Asia/Kolkata', 'America/New_York')
   * @returns Date object in the specified timezone
   */
  private getDateInTimezone(timezone?: string): Date {
    if (!timezone) {
      return new Date();
    }

    // Get current time in the specified timezone
    const dateStr = new Date().toLocaleString('en-US', { timeZone: timezone });
    return new Date(dateStr);
  }

  /**
   * Convert Gregorian date to Hijri
   * @param date Gregorian date
   * @param timezone Optional IANA timezone to interpret the date in
   */
  async gregorianToHijri(date: Date, timezone?: string): Promise<HijriDateInfo> {
    // If timezone is provided, adjust the date to that timezone
    let adjustedDate = date;
    if (timezone) {
      // Convert the date to the specified timezone
      const dateStr = date.toLocaleString('en-US', { timeZone: timezone });
      adjustedDate = new Date(dateStr);
    }

    const hijriDate = gregorianToHijri({
      year: adjustedDate.getFullYear(),
      month: adjustedDate.getMonth() + 1,
      day: adjustedDate.getDate()
    });

    const events = await this.getEventsForHijriDate(
      hijriDate.month,
      hijriDate.day
    );

    return {
      hijriDay: hijriDate.day,
      hijriMonth: hijriDate.month,
      hijriYear: hijriDate.year,
      hijriMonthName: this.hijriMonthNames[hijriDate.month - 1],
      gregorianDate: adjustedDate.toISOString().split('T')[0],
      dayOfWeek: this.dayNames[adjustedDate.getDay()],
      events
    };
  }

  /**
   * Convert Hijri date to Gregorian
   * @param year Hijri year
   * @param month Hijri month
   * @param day Hijri day
   * @param timezone Optional IANA timezone for the result
   */
  async hijriToGregorian(year: number, month: number, day: number, timezone?: string): Promise<HijriDateInfo> {
    const gregorianDate = hijriToGregorian({ year, month, day });
    const date = new Date(gregorianDate.year, gregorianDate.month - 1, gregorianDate.day);

    const events = await this.getEventsForHijriDate(month, day);

    return {
      hijriDay: day,
      hijriMonth: month,
      hijriYear: year,
      hijriMonthName: this.hijriMonthNames[month - 1],
      gregorianDate: date.toISOString().split('T')[0],
      dayOfWeek: this.dayNames[date.getDay()],
      events
    };
  }

  /**
   * Get calendar for a specific Gregorian month
   * @param year Gregorian year
   * @param month Gregorian month (1-12)
   * @param timezone Optional IANA timezone
   */
  async getGregorianMonthCalendar(year: number, month: number, timezone?: string): Promise<CalendarMonth> {
    const daysInMonth = new Date(year, month, 0).getDate();
    const days: HijriDateInfo[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const hijriInfo = await this.gregorianToHijri(date, timezone);
      days.push(hijriInfo);
    }

    return {
      month,
      year,
      monthName: new Date(year, month - 1).toLocaleString('en-US', { month: 'long' }),
      days
    };
  }

  /**
   * Get calendar for a specific Hijri month
   * @param year Hijri year
   * @param month Hijri month (1-12)
   * @param timezone Optional IANA timezone
   */
  async getHijriMonthCalendar(year: number, month: number, timezone?: string): Promise<CalendarMonth> {
    // Hijri months are typically 29 or 30 days
    const daysInMonth = this.getHijriMonthLength(year, month);
    const days: HijriDateInfo[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const hijriInfo = await this.hijriToGregorian(year, month, day, timezone);
      days.push(hijriInfo);
    }

    return {
      month,
      year,
      monthName: this.hijriMonthNames[month - 1],
      days
    };
  }

  /**
   * Get today's date in both calendars
   * @param timezone Optional IANA timezone (defaults to UTC)
   */
  async getToday(timezone?: string): Promise<HijriDateInfo> {
    const today = this.getDateInTimezone(timezone);
    return this.gregorianToHijri(today, timezone);
  }

  /**
   * Get all Islamic events
   */
  async getAllEvents() {
    return this.prisma.islamicEvent.findMany({
      orderBy: [
        { hijriMonth: 'asc' },
        { hijriDay: 'asc' }
      ]
    });
  }

  /**
   * Get upcoming Islamic events (next N days)
   * @param days Number of days to look ahead
   * @param timezone Optional IANA timezone
   */
  async getUpcomingEvents(days: number = 90, timezone?: string) {
    const today = this.getDateInTimezone(timezone);
    const upcomingEvents: Array<{
      event: any;
      gregorianDate: string;
      daysUntil: number;
    }> = [];

    const allEvents = await this.getAllEvents();

    for (let i = 0; i < days; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + i);

      const hijriDate = await this.gregorianToHijri(checkDate, timezone);

      const eventsOnDay = allEvents.filter(
        e => e.hijriMonth === hijriDate.hijriMonth && e.hijriDay === hijriDate.hijriDay
      );

      for (const event of eventsOnDay) {
        upcomingEvents.push({
          event,
          gregorianDate: checkDate.toISOString().split('T')[0],
          daysUntil: i
        });
      }
    }

    return upcomingEvents.sort((a, b) => a.daysUntil - b.daysUntil);
  }

  /**
   * Get events for a specific Hijri date
   */
  private async getEventsForHijriDate(month: number, day: number) {
    return this.prisma.islamicEvent.findMany({
      where: {
        hijriMonth: month,
        hijriDay: day
      },
      select: {
        name: true,
        nameArabic: true,
        description: true,
        importance: true
      }
    });
  }

  /**
   * Determine the length of a Hijri month (29 or 30 days)
   * This is a simplified version - actual length depends on moon sighting
   */
  private getHijriMonthLength(year: number, month: number): number {
    // Try converting day 30, if it fails, the month has 29 days
    try {
      hijriToGregorian({ year, month, day: 30 });
      return 30;
    } catch {
      return 29;
    }
  }

  /**
   * Get Hijri month names
   */
  getHijriMonthNames() {
    return this.hijriMonthNames.map((name, index) => ({
      number: index + 1,
      nameEnglish: name,
      nameArabic: this.hijriMonthNamesArabic[index]
    }));
  }
}
