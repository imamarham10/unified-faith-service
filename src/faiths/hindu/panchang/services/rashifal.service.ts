import { Injectable } from '@nestjs/common';
import { getDailyPanchang } from 'panchang-ts';

/** Today's reading for one rashi — the computation, not the words. */
export interface RashifalEntry {
  /** 1 = Mesha … 12 = Meena, matching the client's `Rashi.number`. */
  rashi: number;

  /**
   * Which house the transit Moon occupies counted from this rashi.
   * 1 = the rashi itself, 12 = the one before it.
   */
  house: number;

  /** Chandra Balam: 'shubha' when the Moon's position favours the rashi. */
  quality: 'shubha' | 'ashubha';

  /**
   * Today's hora ruled by this rashi's lord, as ISO instants.
   *
   * A real auspicious window rather than a decorative "lucky time": the
   * hora cycle runs from sunrise, so the lord's hour falls somewhere
   * different every day. Null when the lord gets no hora in the daylight
   * half — which happens, and inventing one would defeat the point.
   */
  shubhHora: { start: string; end: string } | null;
}

export interface RashifalDay {
  /** The day this was computed for, as YYYY-MM-DD in the caller's zone. */
  date: string;

  /** Where the Moon is today, 1..12. The same for everybody. */
  chandraRashi: number;

  /** 0 = Sunday … 6 = Saturday. The day's own graha. */
  vaar: number;

  /** All twelve. See the note below on why this is not filtered. */
  entries: RashifalEntry[];
}

/**
 * Daily rashifal, derived rather than written.
 *
 * A dainik rashifal is not twelve paragraphs somebody composes each morning;
 * it is Chandra Balam — where the transit Moon sits counted from your rashi —
 * read against the day. `panchang-ts` already computes that for the panchang,
 * so the reading comes out of the same ephemeris that produces the tithi.
 *
 * **Every rashi is returned, always.** The client knows which one is the
 * user's and shows that one. Asking the server for a single rashi would mean
 * sending it, and Dhruva's privacy policy says the user's rashi never leaves
 * the phone — a promise the onboarding screen makes and this endpoint has to
 * keep. Twelve small objects also cache for every user in a timezone instead
 * of once per person.
 *
 * **No words are returned.** The house number and its quality are the whole
 * computation; the sentences live in the app's ARBs so that both Hindi and
 * English come out of one source and a copy change does not need a deploy.
 */
@Injectable()
export class RashifalService {
  getToday(
    lat: number,
    lng: number,
    timezone: string,
    on: Date = new Date(),
  ): RashifalDay {
    const location = { latitude: lat, longitude: lng };

    const base = getDailyPanchang(on, location, { timezone });
    if (!base) {
      // Null is a polar edge case where the day has no sunrise, and a
      // panchang without one has no rashifal either.
      throw new Error(
        `panchang-ts returned null for ${on.toISOString()} at (${lat}, ${lng})`,
      );
    }

    const entries: RashifalEntry[] = [];
    for (let index = 0; index < 12; index++) {
      // `janmaRashi` is zero-based in the library and one-based in the app.
      const day = getDailyPanchang(on, location, {
        timezone,
        janmaRashi: index,
      });
      const balam = day?.chandraBalam;
      entries.push({
        rashi: index + 1,
        house: balam?.house ?? 1,
        quality: balam?.quality === 'strong' ? 'shubha' : 'ashubha',
        shubhHora: this.lordHora(base, index + 1),
      });
    }

    return {
      date: this.isoDate(on, timezone),
      chandraRashi: this.rashiNumber(base.chandraRashi),
      vaar: this.vaarIn(on, timezone),
      entries,
    };
  }

  /**
   * Which graha rules each rashi, in the library's Chaldean hora order
   * (0 Sun, 1 Venus, 2 Mercury, 3 Moon, 4 Saturn, 5 Jupiter, 6 Mars).
   *
   * Mesha and Vrishchika are Mangal's, Vrishabha and Tula are Shukra's, and
   * so on down the classical list.
   */
  private static readonly LORD = [
    6, 1, 2, 3, 0, 2, 1, 6, 5, 4, 4, 5,
  ];

  /** The first daytime hora belonging to this rashi's lord. */
  private lordHora(
    base: { hora?: { day?: { planetIndex: number; start: Date; end: Date }[] } },
    rashi: number,
  ): { start: string; end: string } | null {
    const lord = RashifalService.LORD[rashi - 1];
    const slot = base.hora?.day?.find((h) => h.planetIndex === lord);
    if (!slot) return null;
    return {
      start: new Date(slot.start).toISOString(),
      end: new Date(slot.end).toISOString(),
    };
  }

  /**
   * The rashi's 1..12 number.
   *
   * `RashiInfo` carries an index in some versions and only names in others,
   * so the name is the fallback rather than the primary — a reading that
   * silently defaults to Mesha would be wrong for eleven twelfths of the
   * zodiac and look like nothing was broken.
   */
  private rashiNumber(info: { index?: number; englishName?: string }): number {
    if (typeof info?.index === 'number') return info.index + 1;
    const names = [
      'Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya',
      'Tula', 'Vrishchika', 'Dhanu', 'Makara', 'Kumbha', 'Meena',
    ];
    const at = names.findIndex(
      (n) => n.toLowerCase() === (info?.englishName ?? '').toLowerCase(),
    );
    return at < 0 ? 1 : at + 1;
  }

  /** The weekday in the caller's zone, not the server's. */
  private vaarIn(on: Date, timezone: string): number {
    const name = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
    }).format(on);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const at = days.indexOf(name);
    return at < 0 ? on.getUTCDay() : at;
  }

  private isoDate(on: Date, timezone: string): string {
    // `en-CA` formats as YYYY-MM-DD, which is what the client parses.
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(on);
  }
}
