export class TimeBand {
  start: string;
  end: string;
}

export class SandhyaInfo {
  name: 'pratah' | 'madhyahna' | 'sayam';
  nameSanskrit: string;
  nameEnglish: string;
  band: TimeBand;
  isCurrent: boolean;
}

export class PujaTimesResponseDto {
  date: string;
  timezone: string;
  sunrise: string;
  sunset: string;
  solarNoon: string;
  sandhyas: SandhyaInfo[];
  next?: { sandhya: 'pratah' | 'madhyahna' | 'sayam'; startsInSeconds: number };
}
