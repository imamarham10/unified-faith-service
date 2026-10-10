import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../../../../common/utils/prisma.service';
import { gregorianToHijri, hijriToGregorian } from '@tabby_ai/hijri-converter';

const CACHE_TTL = {
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  HOUR: 60 * 60 * 1000,
};

/**
 * One event as `HijriDateInfo.events` carries it.
 *
 * Exactly the four columns `getEventsForHijriDate` selects. The month
 * calendars build their events from `getAllEvents()`, which returns whole
 * rows, so the projection has to be explicit or the month response would
 * quietly grow `id`, `hijriMonth`, `hijriDay` and friends that the per-date
 * response never had.
 */
export interface IslamicEventSummary {
  name: string;
  nameArabic?: string;
  description?: string;
  importance: string;
}

export interface HijriDateInfo {
  hijriDay: number;
  hijriMonth: number;
  hijriYear: number;
  hijriMonthName: string;
  gregorianDate: string;
  dayOfWeek: string;
  events?: IslamicEventSummary[];
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

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

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
   * Extract the calendar date (YYYY-MM-DD), day-of-week, and components for a Date
   * in a given timezone WITHOUT relying on toISOString() (which always returns UTC and
   * causes off-by-one errors when the server runs in a non-UTC timezone like IST).
   */
  private extractDateInTimezone(
    date: Date,
    timezone?: string,
  ): { dateStr: string; dayOfWeek: string; year: number; month: number; day: number } {
    const tz = timezone || 'UTC';
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      weekday: 'long',
    }).formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    const year = parseInt(get('year'));
    const month = parseInt(get('month'));
    const day = parseInt(get('day'));
    const weekday = get('weekday');
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { dateStr, dayOfWeek: weekday, year, month, day };
  }

  /**
   * Convert Gregorian date to Hijri
   * @param date Gregorian date
   * @param timezone Optional IANA timezone to interpret the date in
   * @param calendarAdjust 0=standard/Gulf (default), 1=India/Pakistan/Bangladesh
   *
   * Always uses the local `@tabby_ai/hijri-converter`-based converter (same
   * library `hijriToGregorian()` uses) — this used to prefer the Aladhan API
   * when reachable, but Aladhan and the local converter disagree with each
   * other by a day independent of calendarAdjust, which made this function
   * and `hijriToGregorian()` NOT true inverses of each other (e.g. "today"
   * and the calendar grid could show different Hijri dates for the same
   * Gregorian day). Consistency between the two directions was chosen over
   * Aladhan's live-network freshness — see calendar_repository.dart's
   * kCalendarAdjust doc comment on the mobile side for the full story.
   */
  async gregorianToHijri(date: Date, timezone?: string, calendarAdjust: number = 0): Promise<HijriDateInfo> {
    // Use timezone-aware date extraction so the cache key and gregorianDate are always correct,
    // regardless of the server's local timezone (avoids toISOString() UTC shift).
    const { dateStr, dayOfWeek, year, month, day } = this.extractDateInTimezone(date, timezone);
    const cacheKey = `hijri:${dateStr}:${timezone || 'UTC'}:${calendarAdjust}`;
    const cached = await this.cacheManager.get<HijriDateInfo>(cacheKey);
    if (cached) return cached;

    // Build a UTC-midnight Date for the local-converter lookup (avoids time-of-day noise)
    const lookupDate = new Date(Date.UTC(year, month - 1, day));

    const { hijriDay, hijriMonth, hijriYear } = this.localGregorianToHijriNumbers(lookupDate, calendarAdjust);

    // Single-date lookups keep reading the table directly, so an event added
    // today shows up on this path at once. The month calendars go through the
    // week-cached `getAllEvents()` instead — see `getEventIndex`.
    const events = await this.getEventsForHijriDate(hijriMonth, hijriDay);

    const result = this.buildHijriInfo(
      { hijriDay, hijriMonth, hijriYear },
      dateStr,
      dayOfWeek,
      events,
    );

    await this.cacheManager.set(cacheKey, result, CACHE_TTL.DAY);
    return result;
  }

  /**
   * Assemble one `HijriDateInfo`. Pure — no cache, no database.
   *
   * Extracted so the month calendars can build 30 days without 30 round
   * trips. Both of them used to call the per-date methods in a loop, and each
   * of those does a cache get, an events query and a cache set; a 31-day
   * Gregorian month was ~93 sequential network calls, which is where its 21
   * seconds came from. The conversion arithmetic itself is ~0.01ms a day.
   */
  private buildHijriInfo(
    hijri: { hijriDay: number; hijriMonth: number; hijriYear: number },
    gregorianDate: string,
    dayOfWeek: string,
    events: IslamicEventSummary[],
  ): HijriDateInfo {
    return {
      hijriDay: hijri.hijriDay,
      hijriMonth: hijri.hijriMonth,
      hijriYear: hijri.hijriYear,
      hijriMonthName: this.hijriMonthNames[hijri.hijriMonth - 1],
      gregorianDate,
      dayOfWeek,
      events,
    };
  }

  /**
   * Every Islamic event, indexed by `hijriMonth:hijriDay`.
   *
   * One read of the week-cached `getAllEvents()` instead of one
   * `getEventsForHijriDate` per day. `islamic_events` is small, static
   * reference data — Ramadan, the two Eids, Ashura — and `getUpcomingEvents`
   * has always read it this way; this extends the same treatment to the two
   * month calendars.
   *
   * Projected to `IslamicEventSummary` because `getAllEvents()` returns whole
   * rows while the per-date path selects four columns, and the two must
   * produce the same `events` array for the same day.
   */
  private async getEventIndex(): Promise<Map<string, IslamicEventSummary[]>> {
    const rows: Array<Record<string, any>> = await this.getAllEvents();
    const index = new Map<string, IslamicEventSummary[]>();
    for (const row of rows ?? []) {
      const key = `${row.hijriMonth}:${row.hijriDay}`;
      const summary: IslamicEventSummary = {
        name: row.name,
        nameArabic: row.nameArabic,
        description: row.description,
        importance: row.importance,
      };
      const bucket = index.get(key);
      if (bucket) bucket.push(summary);
      else index.set(key, [summary]);
    }
    return index;
  }

  /**
   * The in-memory twin of `getEventsForHijriDate`, including its guard.
   *
   * The guard is not decoration: an undefined or NaN month/day would make
   * Prisma drop the filter and return **every** event for that day, so the
   * index lookup has to refuse the same inputs the query does.
   */
  private eventsOn(
    index: Map<string, IslamicEventSummary[]>,
    month: number,
    day: number,
  ): IslamicEventSummary[] {
    if (!Number.isFinite(month) || !Number.isFinite(day) || month < 1 || day < 1) {
      return [];
    }
    return index.get(`${month}:${day}`) ?? [];
  }

  /**
   * Convert Hijri date to Gregorian
   * @param year Hijri year
   * @param month Hijri month
   * @param day Hijri day
   * @param timezone Optional IANA timezone for the result
   * @param calendarAdjust 0=standard/Gulf (default), 1=India/Pakistan/Bangladesh —
   *   shifts the result forward by N days, the inverse of gregorianToHijri's
   *   "shift the lookup date back by N days" so the two stay true inverses of
   *   each other (see gregorianToHijri's doc comment for the same convention).
   */
  async hijriToGregorian(year: number, month: number, day: number, timezone?: string, calendarAdjust: number = 0): Promise<HijriDateInfo> {
    const events = await this.getEventsForHijriDate(month, day);
    return this.fromHijri(year, month, day, timezone, calendarAdjust, events);
  }

  /**
   * `hijriToGregorian` with its events already in hand. No database, no cache.
   *
   * The split exists for `getHijriMonthCalendar`: calling the public method
   * per day meant one `islamic_events` query per day, which is the whole of
   * that endpoint's 6.8 seconds. The date arithmetic is ~0.01ms.
   */
  private fromHijri(
    year: number,
    month: number,
    day: number,
    timezone: string | undefined,
    calendarAdjust: number,
    events: IslamicEventSummary[],
  ): HijriDateInfo {
    const gregorianDate = hijriToGregorian({ year, month, day });
    // Build as UTC midnight (not local midnight) — the server can run in any
    // timezone (e.g. Asia/Calcutta, UTC+5:30), and a local-midnight Date's
    // .toISOString()/.getDay() silently roll back to the previous UTC day in
    // any positive-offset timezone. Same bug class getGregorianMonthCalendar
    // already documents and avoids via Date.UTC (see its comment above) —
    // this method just hadn't been fixed the same way yet.
    const date = new Date(Date.UTC(gregorianDate.year, gregorianDate.month - 1, gregorianDate.day));
    date.setUTCDate(date.getUTCDate() + calendarAdjust);

    const { dateStr, dayOfWeek } = this.extractDateInTimezone(date, timezone);

    return this.buildHijriInfo(
      { hijriDay: day, hijriMonth: month, hijriYear: year },
      dateStr,
      dayOfWeek,
      events,
    );
  }

  /**
   * Get calendar for a specific Gregorian month
   * @param year Gregorian year
   * @param month Gregorian month (1-12)
   * @param timezone Optional IANA timezone
   * @param calendarAdjust 0=standard/Gulf, 1=India/Pakistan/Bangladesh
   */
  async getGregorianMonthCalendar(year: number, month: number, timezone?: string, calendarAdjust: number = 0): Promise<CalendarMonth> {
    const cacheKey = `cal:greg:${year}:${month}:${timezone || 'UTC'}:${calendarAdjust}`;
    const cached = await this.cacheManager.get<CalendarMonth>(cacheKey);
    if (cached) return cached;

    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const days: HijriDateInfo[] = [];

    // One read of the event index for the whole month. This loop used to call
    // `gregorianToHijri` per day — a cache get, an events query and a cache
    // set each — so a cold key was ~93 sequential network round trips and
    // took 21 seconds. The month cache below was hiding that, not fixing it:
    // every new month, every TTL expiry and every unseen timezone paid it.
    const eventIndex = await this.getEventIndex();

    for (let day = 1; day <= daysInMonth; day++) {
      // Use Date.UTC so toISOString() always returns YYYY-MM-DD matching the calendar day,
      // regardless of server local timezone (avoids IST midnight → previous UTC day shift)
      const date = new Date(Date.UTC(year, month - 1, day));
      const { dateStr, dayOfWeek, year: y, month: m, day: d } =
        this.extractDateInTimezone(date, timezone);
      const hijri = this.localGregorianToHijriNumbers(
        new Date(Date.UTC(y, m - 1, d)),
        calendarAdjust,
      );
      days.push(
        this.buildHijriInfo(
          hijri,
          dateStr,
          dayOfWeek,
          this.eventsOn(eventIndex, hijri.hijriMonth, hijri.hijriDay),
        ),
      );
    }

    const result: CalendarMonth = {
      month,
      year,
      monthName: new Date(year, month - 1).toLocaleString('en-US', { month: 'long' }),
      days
    };

    await this.cacheManager.set(cacheKey, result, CACHE_TTL.DAY);
    return result;
  }

  /**
   * Get calendar for a specific Hijri month
   * @param year Hijri year
   * @param month Hijri month (1-12)
   * @param timezone Optional IANA timezone
   * @param calendarAdjust 0=standard/Gulf, 1=India/Pakistan/Bangladesh
   */
  async getHijriMonthCalendar(year: number, month: number, timezone?: string, calendarAdjust: number = 0): Promise<CalendarMonth> {
    // Hijri months are typically 29 or 30 days
    const daysInMonth = this.getHijriMonthLength(year, month);
    const days: HijriDateInfo[] = [];

    // Deliberately NOT cached, unlike its Gregorian sibling. Every day of a
    // Hijri month shares one `(month, day)` event lookup pattern, so the whole
    // month is one read of the week-cached event index plus ~0.3ms of date
    // arithmetic. A second cache layer over that would buy nothing and would
    // add a key to invalidate — the asymmetry with
    // `getGregorianMonthCalendar` is now simply that one of them no longer
    // needs the crutch.
    const eventIndex = await this.getEventIndex();

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(
        this.fromHijri(
          year,
          month,
          day,
          timezone,
          calendarAdjust,
          this.eventsOn(eventIndex, month, day),
        ),
      );
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
   * @param calendarAdjust 0=standard/Gulf, 1=India/Pakistan/Bangladesh
   */
  async getToday(timezone?: string, calendarAdjust: number = 0) {
    const today = this.getDateInTimezone(timezone);
    const info = await this.gregorianToHijri(today, timezone, calendarAdjust);

    // Additive nested aliases: the mobile client parses {gregorian:{date},
    // hijri:{year,month,day,monthName}}; web keeps reading the flat fields.
    return {
      ...info,
      gregorian: {
        date: info.gregorianDate,
        dayOfWeek: info.dayOfWeek,
      },
      hijri: {
        year: info.hijriYear,
        month: info.hijriMonth,
        day: info.hijriDay,
        monthName: info.hijriMonthName,
        monthNameArabic: this.hijriMonthNamesArabic[info.hijriMonth - 1],
      },
    };
  }

  /**
   * Get all Islamic events
   */
  async getAllEvents() {
    const cacheKey = `islamic-events`;
    const cached = await this.cacheManager.get<any>(cacheKey);
    if (cached) return cached;

    const result = await this.prisma.islamicEvent.findMany({
      orderBy: [
        { hijriMonth: 'asc' },
        { hijriDay: 'asc' }
      ]
    });

    await this.cacheManager.set(cacheKey, result, CACHE_TTL.WEEK);
    return result;
  }

  /**
   * Fast local-only Gregorian → Hijri conversion (no network calls).
   * Used for bulk iteration (e.g. getUpcomingEvents) where Aladhan precision
   * is not needed and 90 API calls would cause timeouts.
   *
   * @param calendarAdjust 0=standard/Gulf, 1=India/Pakistan/Bangladesh (Ramadan starts 1 day later)
   */
  private localGregorianToHijriNumbers(
    date: Date,
    calendarAdjust: number = 0,
  ): { hijriDay: number; hijriMonth: number; hijriYear: number } {
    // Shift the lookup date back by calendarAdjust days so that:
    // - India (adjust=1): Feb 19 → lookup Feb 18 → Ramadan 1 ✓ (Ramadan 1 falls on Feb 19)
    // - Gulf  (adjust=0): Feb 18 → lookup Feb 18 → Ramadan 1 ✓
    const lookupDate = new Date(date);
    lookupDate.setDate(date.getDate() - calendarAdjust);

    try {
      const h = gregorianToHijri({
        year: lookupDate.getFullYear(),
        month: lookupDate.getMonth() + 1,
        day: lookupDate.getDate(),
      });
      return { hijriDay: h.day, hijriMonth: h.month, hijriYear: h.year };
    } catch {
      // If local converter fails (out of range), use a rough manual calculation
      const jd = this.toJulianDay(lookupDate);
      const { year, month, day } = this.julianDayToHijri(jd);
      return { hijriDay: day, hijriMonth: month, hijriYear: year };
    }
  }

  /** Convert Date to Julian Day Number */
  private toJulianDay(date: Date): number {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const a = Math.floor((14 - m) / 12);
    const yr = y + 4800 - a;
    const mo = m + 12 * a - 3;
    return d + Math.floor((153 * mo + 2) / 5) + 365 * yr + Math.floor(yr / 4) - Math.floor(yr / 100) + Math.floor(yr / 400) - 32045;
  }

  /** Convert Julian Day Number to Hijri */
  private julianDayToHijri(jd: number): { year: number; month: number; day: number } {
    const z = jd - 1948439 + 10632;
    const n = Math.floor((z - 1) / 10631);
    const z2 = z - 10631 * n + 354;
    const j = Math.floor((10985 - z2) / 5316) * Math.floor((50 * z2) / 17719) + Math.floor(z2 / 5670) * Math.floor((43 * z2) / 15238);
    const z3 = z2 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
    const month = Math.floor((24 * z3) / 709);
    const day = z3 - Math.floor((709 * month) / 24);
    const year = 30 * n + j - 30;
    return { year, month, day };
  }

  /**
   * Get upcoming Islamic events (next N days)
   * @param days Number of days to look ahead
   * @param timezone Optional IANA timezone
   * @param calendarAdjust 0=standard/Gulf, 1=India/Pakistan/Bangladesh
   */
  async getUpcomingEvents(days: number = 90, timezone?: string, calendarAdjust: number = 0) {
    const cacheKey = `upcoming-events:${days || 90}:${timezone || 'UTC'}:${calendarAdjust}`;
    const cached = await this.cacheManager.get<any>(cacheKey);
    if (cached) return cached;

    const today = this.getDateInTimezone(timezone);
    const upcomingEvents: Array<{
      event: any;
      gregorianDate: string;
      daysUntil: number;
    }> = [];

    const allEvents = await this.getAllEvents();

    // Use local-only converter to avoid 90 Aladhan API calls on cold start.
    // calendarAdjust shifts the Hijri lookup date (see localGregorianToHijriNumbers).
    for (let i = 0; i < days; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + i);

      const { hijriMonth, hijriDay } = this.localGregorianToHijriNumbers(checkDate, calendarAdjust);

      const eventsOnDay = allEvents.filter(
        e => e.hijriMonth === hijriMonth && e.hijriDay === hijriDay
      );

      for (const event of eventsOnDay) {
        upcomingEvents.push({
          event,
          gregorianDate: checkDate.toISOString().split('T')[0],
          daysUntil: i
        });
      }
    }

    const result = upcomingEvents.sort((a, b) => a.daysUntil - b.daysUntil);
    await this.cacheManager.set(cacheKey, result, CACHE_TTL.HOUR);
    return result;
  }

  /**
   * Get events for a specific Hijri date
   */
  private async getEventsForHijriDate(month: number, day: number) {
    // Guard: if month or day are invalid (undefined/NaN), Prisma would ignore the
    // filter and return ALL events. Return empty instead.
    if (!Number.isFinite(month) || !Number.isFinite(day) || month < 1 || day < 1) {
      return [];
    }

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
