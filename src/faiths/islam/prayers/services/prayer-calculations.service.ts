import { Injectable } from '@nestjs/common';
import { Coordinates, CalculationMethod, PrayerTimes, Madhab, HighLatitudeRule, Qibla } from 'adhan';

@Injectable()
export class PrayerCalculationsService {
  /**
   * Calculate prayer times for a specific location and date
   */
  calculatePrayerTimes(
    lat: number, 
    lng: number, 
    date: Date, 
    methodSlug: string = 'mwl',
    madhab: 'shafi' | 'hanafi' = 'shafi'
  ) {
    const coordinates = new Coordinates(lat, lng);
    const params = this.getCalculationMethod(methodSlug);
    
    // Set Madhab (Asr calculation)
    if (madhab === 'hanafi') {
      params.madhab = Madhab.Hanafi;
    } else {
      params.madhab = Madhab.Shafi;
    }

    // Set High Latitude Rule (optional, default is Middle of the Night usually safe)
    params.highLatitudeRule = HighLatitudeRule.MiddleOfTheNight;

    const prayerTimes = new PrayerTimes(coordinates, date, params);

    return {
      fajr: prayerTimes.fajr,
      sunrise: prayerTimes.sunrise,
      dhuhr: prayerTimes.dhuhr,
      asr: prayerTimes.asr,
      maghrib: prayerTimes.maghrib,
      isha: prayerTimes.isha,
    };
  }

  /**
   * Calculate current and next prayer relative to now
   */
  getCurrentPrayer(lat: number, lng: number, date: Date = new Date(), methodSlug: string = 'mwl') {
    const coordinates = new Coordinates(lat, lng);
    const params = this.getCalculationMethod(methodSlug);
    const prayerTimes = new PrayerTimes(coordinates, date, params);
    
    const current = prayerTimes.currentPrayer();
    const next = prayerTimes.nextPrayer();
    
    // Map adhan prayer names to our standard slugs if needed
    // adhan returns: 'fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha', 'none'
    
    return {
      current,
      next,
      times: {
        fajr: prayerTimes.fajr,
        sunrise: prayerTimes.sunrise,
        dhuhr: prayerTimes.dhuhr,
        asr: prayerTimes.asr,
        maghrib: prayerTimes.maghrib,
        isha: prayerTimes.isha,
      }
    };
  }

  /**
   * Get Qibla direction from degrees North (clockwise)
   */
  getQiblaDirection(lat: number, lng: number): number {
    const coordinates = new Coordinates(lat, lng);
    return Qibla(coordinates);
  }

  private getCalculationMethod(slug: string) {
    switch (slug?.toLowerCase()) {
      case 'mwl': return CalculationMethod.MuslimWorldLeague();
      case 'isna': return CalculationMethod.NorthAmerica();
      case 'egypt': return CalculationMethod.Egyptian();
      case 'makkah': return CalculationMethod.UmmAlQura();
      case 'karachi': return CalculationMethod.Karachi();
      case 'kuwait': return CalculationMethod.Kuwait();
      case 'qatar': return CalculationMethod.Qatar();
      case 'singapore': return CalculationMethod.Singapore();
      case 'tehran': return CalculationMethod.Tehran();
      case 'turkey': return CalculationMethod.Turkey();
      default: return CalculationMethod.MuslimWorldLeague();
    }
  }
}
