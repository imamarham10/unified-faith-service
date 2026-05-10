import { Injectable, Logger } from '@nestjs/common';
import {
  PanchangResponseDto,
  TithiInfo,
  NakshatraInfo,
  YogaInfo,
  KaranaInfo,
  VaaraInfo,
  TimeBand,
  AuspiciousTimes,
} from '../dto/panchang-response.dto';
import {
  TITHI_NAMES,
  NAKSHATRA_NAMES,
  YOGA_NAMES,
  KARANA_NAMES,
  VAARA_NAMES,
} from '../data/sanskrit-names';

/**
 * PanchangService computes Hindu calendar elements for a given date and location.
 * Real calculation lands in Bundle H. This is the skeleton — returns a STUB response.
 *
 * Library: panchang-ts (MIT). See ../data/library-notes.md.
 */
@Injectable()
export class PanchangService {
  private readonly logger = new Logger(PanchangService.name);

  async getPanchang(
    date: Date,
    lat: number,
    lng: number,
    timezone: string,
  ): Promise<PanchangResponseDto> {
    this.logger.debug(`getPanchang(${date.toISOString()}, ${lat}, ${lng}, ${timezone})`);

    // STUB — Bundle H replaces this with real panchang-ts integration.
    const vaaraIdx = date.getDay();
    const tithiIdx = 0;
    const nakshatraIdx = 0;
    const yogaIdx = 0;
    const karanaIdx = 0;

    const tithi: TithiInfo = {
      number: tithiIdx + 1,
      name: TITHI_NAMES[tithiIdx].name,
      nameSanskrit: TITHI_NAMES[tithiIdx].sanskrit,
      paksha: tithiIdx < 15 ? 'shukla' : 'krishna',
    };

    const nakshatra: NakshatraInfo = {
      number: nakshatraIdx + 1,
      name: NAKSHATRA_NAMES[nakshatraIdx].name,
      nameSanskrit: NAKSHATRA_NAMES[nakshatraIdx].sanskrit,
      deity: NAKSHATRA_NAMES[nakshatraIdx].deity,
    };

    const yoga: YogaInfo = {
      number: yogaIdx + 1,
      name: YOGA_NAMES[yogaIdx].name,
      nameSanskrit: YOGA_NAMES[yogaIdx].sanskrit,
    };

    const karana: KaranaInfo = {
      number: karanaIdx + 1,
      name: KARANA_NAMES[karanaIdx].name,
      nameSanskrit: KARANA_NAMES[karanaIdx].sanskrit,
      isAuspicious: KARANA_NAMES[karanaIdx].isAuspicious,
    };

    const vaara: VaaraInfo = {
      number: vaaraIdx,
      name: VAARA_NAMES[vaaraIdx].name,
      nameSanskrit: VAARA_NAMES[vaaraIdx].sanskrit,
    };

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const stubBand = (start: number, end: number): TimeBand => {
      const s = new Date(dayStart);
      s.setHours(start);
      const e = new Date(dayStart);
      e.setHours(end);
      return { start: s.toISOString(), end: e.toISOString() };
    };

    const auspicious: AuspiciousTimes = {
      brahmaMuhurta: stubBand(4, 5),
      abhijitMuhurta: stubBand(11, 13),
      rahuKaal: stubBand(15, 16),
      yamagandam: stubBand(13, 15),
      gulika: stubBand(7, 9),
    };

    const isoDate = date.toISOString().slice(0, 10);

    return {
      date: isoDate,
      timezone,
      tithi,
      nakshatra,
      yoga,
      karana,
      vaara,
      sunrise: stubBand(6, 7).start,
      sunset: stubBand(18, 19).start,
      auspicious,
      festivals: [],
    };
  }
}
