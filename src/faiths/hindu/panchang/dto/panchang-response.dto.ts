export class TithiInfo {
  number: number;
  name: string;
  nameSanskrit: string;
  paksha: 'shukla' | 'krishna';
  endTime?: string;
}

export class NakshatraInfo {
  number: number;
  name: string;
  nameSanskrit: string;
  deity: string;
  endTime?: string;
}

export class YogaInfo {
  number: number;
  name: string;
  nameSanskrit: string;
}

export class KaranaInfo {
  number: number;
  name: string;
  nameSanskrit: string;
  isAuspicious: boolean;
}

export class VaaraInfo {
  number: number;
  name: string;
  nameSanskrit: string;
}

export class TimeBand {
  start: string;
  end: string;
}

export class AuspiciousTimes {
  brahmaMuhurta: TimeBand;
  abhijitMuhurta: TimeBand;
  rahuKaal: TimeBand;
  yamagandam: TimeBand;
  gulika: TimeBand;
}

export class FestivalSummary {
  slug: string;
  nameEnglish: string;
  nameSanskrit?: string;
}

export class PanchangResponseDto {
  date: string;
  timezone: string;
  tithi: TithiInfo;
  nakshatra: NakshatraInfo;
  yoga: YogaInfo;
  karana: KaranaInfo;
  vaara: VaaraInfo;
  sunrise: string;
  sunset: string;
  moonrise?: string;
  moonset?: string;
  auspicious: AuspiciousTimes;
  festivals: FestivalSummary[];
}
