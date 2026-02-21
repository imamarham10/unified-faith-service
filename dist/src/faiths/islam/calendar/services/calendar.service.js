"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarService = void 0;
const common_1 = require("@nestjs/common");
const cache_manager_1 = require("@nestjs/cache-manager");
const prisma_service_1 = require("../../../../common/utils/prisma.service");
const hijri_converter_1 = require("@tabby_ai/hijri-converter");
const CACHE_TTL = {
    DAY: 24 * 60 * 60 * 1000,
    WEEK: 7 * 24 * 60 * 60 * 1000,
    HOUR: 60 * 60 * 1000,
};
let CalendarService = class CalendarService {
    constructor(prisma, cacheManager) {
        this.prisma = prisma;
        this.cacheManager = cacheManager;
        this.hijriMonthNames = [
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
        this.hijriMonthNamesArabic = [
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
        this.dayNames = [
            'Sunday',
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday'
        ];
    }
    async aladhanGToH(date, calendarAdjust = 0) {
        try {
            const lookupDate = new Date(date);
            lookupDate.setDate(date.getDate() - calendarAdjust);
            const dd = String(lookupDate.getDate()).padStart(2, '0');
            const mm = String(lookupDate.getMonth() + 1).padStart(2, '0');
            const yyyy = lookupDate.getFullYear();
            const cacheKey = `aladhan:gtoh:${yyyy}-${mm}-${dd}`;
            const cached = await this.cacheManager.get(cacheKey);
            if (cached)
                return cached;
            const url = `https://api.aladhan.com/v1/gToH/${dd}-${mm}-${yyyy}`;
            const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
            if (!res.ok)
                return null;
            const json = await res.json();
            if (json.code !== 200)
                return null;
            const h = json.data.hijri;
            const result = {
                day: parseInt(h.day),
                month: h.month.number,
                year: parseInt(h.year),
                monthName: h.month.en,
            };
            await this.cacheManager.set(cacheKey, result, CACHE_TTL.DAY);
            return result;
        }
        catch {
            return null;
        }
    }
    getDateInTimezone(timezone) {
        if (!timezone) {
            return new Date();
        }
        const dateStr = new Date().toLocaleString('en-US', { timeZone: timezone });
        return new Date(dateStr);
    }
    extractDateInTimezone(date, timezone) {
        const tz = timezone || 'UTC';
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            weekday: 'long',
        }).formatToParts(date);
        const get = (type) => parts.find((p) => p.type === type)?.value ?? '';
        const year = parseInt(get('year'));
        const month = parseInt(get('month'));
        const day = parseInt(get('day'));
        const weekday = get('weekday');
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return { dateStr, dayOfWeek: weekday, year, month, day };
    }
    async gregorianToHijri(date, timezone, calendarAdjust = 0) {
        const { dateStr, dayOfWeek, year, month, day } = this.extractDateInTimezone(date, timezone);
        const cacheKey = `hijri:${dateStr}:${timezone || 'UTC'}:${calendarAdjust}`;
        const cached = await this.cacheManager.get(cacheKey);
        if (cached)
            return cached;
        const lookupDate = new Date(Date.UTC(year, month - 1, day));
        const aladhanResult = await this.aladhanGToH(lookupDate, calendarAdjust);
        let hijriDay, hijriMonth, hijriYear;
        if (aladhanResult) {
            hijriDay = aladhanResult.day;
            hijriMonth = aladhanResult.month;
            hijriYear = aladhanResult.year;
        }
        else {
            const { hijriDay: d, hijriMonth: m, hijriYear: y } = this.localGregorianToHijriNumbers(lookupDate, calendarAdjust);
            hijriDay = d;
            hijriMonth = m;
            hijriYear = y;
        }
        const events = await this.getEventsForHijriDate(hijriMonth, hijriDay);
        const result = {
            hijriDay,
            hijriMonth,
            hijriYear,
            hijriMonthName: this.hijriMonthNames[hijriMonth - 1],
            gregorianDate: dateStr,
            dayOfWeek,
            events
        };
        await this.cacheManager.set(cacheKey, result, CACHE_TTL.DAY);
        return result;
    }
    async hijriToGregorian(year, month, day, timezone) {
        const gregorianDate = (0, hijri_converter_1.hijriToGregorian)({ year, month, day });
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
    async getGregorianMonthCalendar(year, month, timezone, calendarAdjust = 0) {
        const cacheKey = `cal:greg:${year}:${month}:${timezone || 'UTC'}:${calendarAdjust}`;
        const cached = await this.cacheManager.get(cacheKey);
        if (cached)
            return cached;
        const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
        const days = [];
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(Date.UTC(year, month - 1, day));
            const hijriInfo = await this.gregorianToHijri(date, timezone, calendarAdjust);
            days.push(hijriInfo);
        }
        const result = {
            month,
            year,
            monthName: new Date(year, month - 1).toLocaleString('en-US', { month: 'long' }),
            days
        };
        await this.cacheManager.set(cacheKey, result, CACHE_TTL.DAY);
        return result;
    }
    async getHijriMonthCalendar(year, month, timezone) {
        const daysInMonth = this.getHijriMonthLength(year, month);
        const days = [];
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
    async getToday(timezone, calendarAdjust = 0) {
        const today = this.getDateInTimezone(timezone);
        return this.gregorianToHijri(today, timezone, calendarAdjust);
    }
    async getAllEvents() {
        const cacheKey = `islamic-events`;
        const cached = await this.cacheManager.get(cacheKey);
        if (cached)
            return cached;
        const result = await this.prisma.islamicEvent.findMany({
            orderBy: [
                { hijriMonth: 'asc' },
                { hijriDay: 'asc' }
            ]
        });
        await this.cacheManager.set(cacheKey, result, CACHE_TTL.WEEK);
        return result;
    }
    localGregorianToHijriNumbers(date, calendarAdjust = 0) {
        const lookupDate = new Date(date);
        lookupDate.setDate(date.getDate() - calendarAdjust);
        try {
            const h = (0, hijri_converter_1.gregorianToHijri)({
                year: lookupDate.getFullYear(),
                month: lookupDate.getMonth() + 1,
                day: lookupDate.getDate(),
            });
            return { hijriDay: h.day, hijriMonth: h.month, hijriYear: h.year };
        }
        catch {
            const jd = this.toJulianDay(lookupDate);
            const { year, month, day } = this.julianDayToHijri(jd);
            return { hijriDay: day, hijriMonth: month, hijriYear: year };
        }
    }
    toJulianDay(date) {
        const y = date.getFullYear();
        const m = date.getMonth() + 1;
        const d = date.getDate();
        const a = Math.floor((14 - m) / 12);
        const yr = y + 4800 - a;
        const mo = m + 12 * a - 3;
        return d + Math.floor((153 * mo + 2) / 5) + 365 * yr + Math.floor(yr / 4) - Math.floor(yr / 100) + Math.floor(yr / 400) - 32045;
    }
    julianDayToHijri(jd) {
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
    async getUpcomingEvents(days = 90, timezone, calendarAdjust = 0) {
        const cacheKey = `upcoming-events:${days || 90}:${timezone || 'UTC'}:${calendarAdjust}`;
        const cached = await this.cacheManager.get(cacheKey);
        if (cached)
            return cached;
        const today = this.getDateInTimezone(timezone);
        const upcomingEvents = [];
        const allEvents = await this.getAllEvents();
        for (let i = 0; i < days; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() + i);
            const { hijriMonth, hijriDay } = this.localGregorianToHijriNumbers(checkDate, calendarAdjust);
            const eventsOnDay = allEvents.filter(e => e.hijriMonth === hijriMonth && e.hijriDay === hijriDay);
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
    async getEventsForHijriDate(month, day) {
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
    getHijriMonthLength(year, month) {
        try {
            (0, hijri_converter_1.hijriToGregorian)({ year, month, day: 30 });
            return 30;
        }
        catch {
            return 29;
        }
    }
    getHijriMonthNames() {
        return this.hijriMonthNames.map((name, index) => ({
            number: index + 1,
            nameEnglish: name,
            nameArabic: this.hijriMonthNamesArabic[index]
        }));
    }
};
exports.CalendarService = CalendarService;
exports.CalendarService = CalendarService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, Object])
], CalendarService);
//# sourceMappingURL=calendar.service.js.map