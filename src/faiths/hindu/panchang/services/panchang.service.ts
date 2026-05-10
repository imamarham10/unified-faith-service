import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { getDailyPanchang } from 'panchang-ts';
import {
  PanchangResponseDto,
  TithiInfo,
  NakshatraInfo,
  YogaInfo,
  KaranaInfo,
  VaaraInfo,
  AuspiciousTimes,
  FestivalSummary,
} from '../dto/panchang-response.dto';
import {
  TITHI_NAMES,
  NAKSHATRA_NAMES,
  YOGA_NAMES,
  KARANA_NAMES,
  VAARA_NAMES,
} from '../data/sanskrit-names';
import { FestivalRuleService } from './festival-rule.service';

/**
 * PanchangService computes Hindu calendar elements for a given date and location
 * using the panchang-ts library (MIT, pure JS — no swisseph). Sanskrit/Devanagari
 * names are sourced from local lookup tables since the library returns
 * transliterated English names only.
 *
 * Festival enrichment is deferred to Bundle J (FestivalRuleService).
 */
@Injectable()
export class PanchangService {
  private readonly logger = new Logger(PanchangService.name);

  constructor(private readonly festivalRuleService: FestivalRuleService) {}

  async getPanchang(
    date: Date,
    lat: number,
    lng: number,
    timezone: string,
  ): Promise<PanchangResponseDto> {
    const result = getDailyPanchang(
      date,
      { latitude: lat, longitude: lng },
      { timezone },
    );

    if (!result) {
      throw new InternalServerErrorException(
        `Panchang unavailable for ${date.toISOString().slice(0, 10)} at (${lat}, ${lng}) — polar-edge or no-sunrise day.`,
      );
    }

    // Pick the anga value active at sunrise (canonical convention for "the day's
    // tithi/nakshatra"). If no entry has isActiveAtSunrise, fall back to the first.
    const activeTithi =
      result.tithis.find((t) => t.isActiveAtSunrise) ?? result.tithis[0];
    const activeNakshatra =
      result.nakshatras.find((n) => n.isActiveAtSunrise) ?? result.nakshatras[0];
    const activeYoga =
      result.yogas.find((y) => y.isActiveAtSunrise) ?? result.yogas[0];
    // Karanas don't always carry isActiveAtSunrise; first entry is the day's headline karana.
    const activeKarana =
      result.karanas.find((k) => k.isActiveAtSunrise) ?? result.karanas[0];

    // panchang-ts tithi.index is 0-29 (Shukla 1..15 = 0..14, Krishna 1..15 = 15..29).
    // Our TITHI_NAMES is also 0-29 in the same order.
    const tithiIdx = activeTithi.index;
    const tithi: TithiInfo = {
      number: tithiIdx + 1,
      name: TITHI_NAMES[tithiIdx].name,
      nameSanskrit: TITHI_NAMES[tithiIdx].sanskrit,
      paksha: tithiIdx < 15 ? 'shukla' : 'krishna',
      endTime: activeTithi.endTime ? activeTithi.endTime.toISOString() : undefined,
    };

    const nakshatraIdx = activeNakshatra.index;
    const nakshatra: NakshatraInfo = {
      number: nakshatraIdx + 1,
      name: NAKSHATRA_NAMES[nakshatraIdx].name,
      nameSanskrit: NAKSHATRA_NAMES[nakshatraIdx].sanskrit,
      deity: NAKSHATRA_NAMES[nakshatraIdx].deity,
      endTime: activeNakshatra.endTime
        ? activeNakshatra.endTime.toISOString()
        : undefined,
    };

    const yogaIdx = activeYoga.index;
    const yoga: YogaInfo = {
      number: yogaIdx + 1,
      name: YOGA_NAMES[yogaIdx].name,
      nameSanskrit: YOGA_NAMES[yogaIdx].sanskrit,
    };

    // Karana: panchang-ts emits a running index 0–59 across the lunar cycle
    // (60 karanas per month). KARANA_NAMES is the 11-name canonical cycle, so
    // we map by name. Library names: Bava, Balava, Kaulava, Taitila, Gara(ja),
    // Vanija, Vishti, Shakuni, Chatushpada, Naga, Kimstughna. We tolerate the
    // Gara/Garaja spelling difference.
    const libKaranaName = activeKarana.name;
    const karanaCycleIdx = KARANA_NAMES.findIndex(
      (k) =>
        k.name.toLowerCase() === libKaranaName.toLowerCase() ||
        // Library uses "Gara"; our table uses "Garaja"
        (libKaranaName === 'Gara' && k.name === 'Garaja'),
    );
    const safeKaranaIdx = karanaCycleIdx >= 0 ? karanaCycleIdx : 0;
    const karana: KaranaInfo = {
      number: safeKaranaIdx + 1,
      name: KARANA_NAMES[safeKaranaIdx].name,
      nameSanskrit: KARANA_NAMES[safeKaranaIdx].sanskrit,
      isAuspicious: KARANA_NAMES[safeKaranaIdx].isAuspicious,
    };

    const vaaraIdx = result.vara.index;
    const vaara: VaaraInfo = {
      number: vaaraIdx,
      name: VAARA_NAMES[vaaraIdx].name,
      nameSanskrit: VAARA_NAMES[vaaraIdx].sanskrit,
    };

    const auspicious: AuspiciousTimes = {
      brahmaMuhurta: {
        start: result.brahmaMuhurta.start.toISOString(),
        end: result.brahmaMuhurta.end.toISOString(),
      },
      abhijitMuhurta: result.abhijitMuhurta
        ? {
            start: result.abhijitMuhurta.start.toISOString(),
            end: result.abhijitMuhurta.end.toISOString(),
          }
        : null,
      rahuKaal: {
        start: result.rahuKalam.start.toISOString(),
        end: result.rahuKalam.end.toISOString(),
      },
      yamagandam: {
        start: result.yamaganda.start.toISOString(),
        end: result.yamaganda.end.toISOString(),
      },
      gulika: {
        start: result.gulikaKalam.start.toISOString(),
        end: result.gulikaKalam.end.toISOString(),
      },
    };

    // Festivals: resolve via FestivalRuleService (Bundle J).
    const festivalRows = await this.festivalRuleService.findFestivalsForDate(
      date,
      lat,
      lng,
      timezone,
    );
    const festivals: FestivalSummary[] = festivalRows.map((f) => ({
      slug: f.slug,
      nameEnglish: f.nameEnglish,
      nameSanskrit: f.nameSanskrit ?? undefined,
    }));

    const isoDate = date.toISOString().slice(0, 10);

    return {
      date: isoDate,
      timezone,
      tithi,
      nakshatra,
      yoga,
      karana,
      vaara,
      sunrise: result.sunrise.toISOString(),
      sunset: result.sunset.toISOString(),
      moonrise: result.moonrise ? result.moonrise.toISOString() : undefined,
      moonset: result.moonset ? result.moonset.toISOString() : undefined,
      auspicious,
      festivals,
    };
  }
}
