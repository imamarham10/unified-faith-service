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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../../common/utils/prisma.service");
const hijri_converter_1 = require("@tabby_ai/hijri-converter");
let CalendarService = class CalendarService {
    constructor(prisma) {
        this.prisma = prisma;
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
    getDateInTimezone(timezone) {
        if (!timezone) {
            return new Date();
        }
        const dateStr = new Date().toLocaleString('en-US', { timeZone: timezone });
        return new Date(dateStr);
    }
    async gregorianToHijri(date, timezone) {
        let adjustedDate = date;
        if (timezone) {
            const dateStr = date.toLocaleString('en-US', { timeZone: timezone });
            adjustedDate = new Date(dateStr);
        }
        const hijriDate = (0, hijri_converter_1.gregorianToHijri)({
            year: adjustedDate.getFullYear(),
            month: adjustedDate.getMonth() + 1,
            day: adjustedDate.getDate()
        });
        const events = await this.getEventsForHijriDate(hijriDate.month, hijriDate.day);
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
    async getGregorianMonthCalendar(year, month, timezone) {
        const daysInMonth = new Date(year, month, 0).getDate();
        const days = [];
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
    async getToday(timezone) {
        const today = this.getDateInTimezone(timezone);
        return this.gregorianToHijri(today, timezone);
    }
    async getAllEvents() {
        return this.prisma.islamicEvent.findMany({
            orderBy: [
                { hijriMonth: 'asc' },
                { hijriDay: 'asc' }
            ]
        });
    }
    async getUpcomingEvents(days = 90, timezone) {
        const today = this.getDateInTimezone(timezone);
        const upcomingEvents = [];
        const allEvents = await this.getAllEvents();
        for (let i = 0; i < days; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() + i);
            const hijriDate = await this.gregorianToHijri(checkDate, timezone);
            const eventsOnDay = allEvents.filter(e => e.hijriMonth === hijriDate.hijriMonth && e.hijriDay === hijriDate.hijriDay);
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
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CalendarService);
//# sourceMappingURL=calendar.service.js.map