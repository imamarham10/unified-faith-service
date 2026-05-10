import { Injectable, Logger } from '@nestjs/common';
import { getDailyPanchang } from 'panchang-ts';

export interface SunMoonTimes {
  sunrise: string;
  sunset: string;
  moonrise?: string;
  moonset?: string;
}

/**
 * Thin wrapper around panchang-ts for sunrise/sunset/moonrise/moonset.
 * Exported by PanchangModule so Bundle K (Puja-times) can compute Sandhya
 * times without depending on the full PanchangService.
 */
@Injectable()
export class SunPositionService {
  private readonly logger = new Logger(SunPositionService.name);

  computeSunMoonTimes(
    date: Date,
    lat: number,
    lng: number,
    timezone: string,
  ): SunMoonTimes {
    const result = getDailyPanchang(
      date,
      { latitude: lat, longitude: lng },
      { timezone },
    );

    if (!result) {
      throw new Error(
        `panchang-ts returned null for ${date.toISOString()} at (${lat}, ${lng}) — likely a polar edge case where sunrise does not occur on this date.`,
      );
    }

    return {
      sunrise: result.sunrise.toISOString(),
      sunset: result.sunset.toISOString(),
      moonrise: result.moonrise ? result.moonrise.toISOString() : undefined,
      moonset: result.moonset ? result.moonset.toISOString() : undefined,
    };
  }
}
