import { Injectable, Logger } from '@nestjs/common';
import { SunPositionService } from '../../panchang/services/sun-position.service';
import { PujaTimesResponseDto, SandhyaInfo, TimeBand } from '../dto/puja-times-response.dto';

const SANDHYA_INFO = {
  pratah: { sanskrit: 'प्रातः सन्ध्या', english: 'Pratah Sandhya' },
  madhyahna: { sanskrit: 'माध्याह्न सन्ध्या', english: 'Madhyahna Sandhya' },
  sayam: { sanskrit: 'सायं सन्ध्या', english: 'Sayam Sandhya' },
} as const;

@Injectable()
export class PujaTimesService {
  private readonly logger = new Logger(PujaTimesService.name);

  constructor(private readonly sunPositionService: SunPositionService) {}

  async getTimesForDate(
    date: Date,
    lat: number,
    lng: number,
    timezone: string,
  ): Promise<PujaTimesResponseDto> {
    const sunMoon = this.sunPositionService.computeSunMoonTimes(date, lat, lng, timezone);
    const sunrise = new Date(sunMoon.sunrise);
    const sunset = new Date(sunMoon.sunset);
    const solarNoon = new Date((sunrise.getTime() + sunset.getTime()) / 2);

    // Pratah: 90 min before sunrise to 30 min after
    const pratahBand: TimeBand = {
      start: new Date(sunrise.getTime() - 90 * 60 * 1000).toISOString(),
      end: new Date(sunrise.getTime() + 30 * 60 * 1000).toISOString(),
    };

    // Madhyahna: 30 min before solar noon to 30 min after
    const madhyahnaBand: TimeBand = {
      start: new Date(solarNoon.getTime() - 30 * 60 * 1000).toISOString(),
      end: new Date(solarNoon.getTime() + 30 * 60 * 1000).toISOString(),
    };

    // Sayam: 30 min before sunset to 45 min after
    const sayamBand: TimeBand = {
      start: new Date(sunset.getTime() - 30 * 60 * 1000).toISOString(),
      end: new Date(sunset.getTime() + 45 * 60 * 1000).toISOString(),
    };

    // The sun-position library returns "wall-clock-as-UTC" timestamps (a
    // 5:31 AM IST sunrise arrives as 05:31Z). Comparing them against the
    // real UTC instant shifts everything by the user's UTC offset — so
    // "now" must be encoded the same way: the current wall-clock in the
    // requested timezone, stamped as if it were UTC.
    const now = this.wallClockNow(timezone);
    const isInBand = (band: TimeBand): boolean => {
      const start = new Date(band.start).getTime();
      const end = new Date(band.end).getTime();
      const t = now.getTime();
      return t >= start && t <= end;
    };

    const sandhyas: SandhyaInfo[] = [
      {
        name: 'pratah',
        nameSanskrit: SANDHYA_INFO.pratah.sanskrit,
        nameEnglish: SANDHYA_INFO.pratah.english,
        band: pratahBand,
        isCurrent: isInBand(pratahBand),
      },
      {
        name: 'madhyahna',
        nameSanskrit: SANDHYA_INFO.madhyahna.sanskrit,
        nameEnglish: SANDHYA_INFO.madhyahna.english,
        band: madhyahnaBand,
        isCurrent: isInBand(madhyahnaBand),
      },
      {
        name: 'sayam',
        nameSanskrit: SANDHYA_INFO.sayam.sanskrit,
        nameEnglish: SANDHYA_INFO.sayam.english,
        band: sayamBand,
        isCurrent: isInBand(sayamBand),
      },
    ];

    // Next upcoming sandhya
    const upcoming = sandhyas
      .filter((s) => new Date(s.band.start).getTime() > now.getTime())
      .sort((a, b) => new Date(a.band.start).getTime() - new Date(b.band.start).getTime())[0];
    const next = upcoming
      ? {
          sandhya: upcoming.name,
          startsInSeconds: Math.round(
            (new Date(upcoming.band.start).getTime() - now.getTime()) / 1000,
          ),
        }
      : undefined;

    return {
      date: date.toISOString().slice(0, 10),
      timezone,
      sunrise: sunMoon.sunrise,
      sunset: sunMoon.sunset,
      solarNoon: solarNoon.toISOString(),
      sandhyas,
      next,
    };
  }

  /**
   * Current wall-clock in `timezone`, encoded as-if-UTC — the same
   * convention the sun-position timestamps use. Falls back to the real
   * instant if the timezone string is invalid.
   */
  wallClockNow(timezone: string): Date {
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).formatToParts(new Date());
      const get = (type: string) =>
        Number(parts.find((p) => p.type === type)?.value ?? NaN);
      const hour = get('hour') === 24 ? 0 : get('hour');
      const wall = new Date(
        Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second')),
      );
      return isNaN(wall.getTime()) ? new Date() : wall;
    } catch {
      return new Date();
    }
  }
}
