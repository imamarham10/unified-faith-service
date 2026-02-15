import { Module } from '@nestjs/common';
import { PrayersModule } from './prayers/prayers.module';
import { QuranModule } from './quran/quran.module';
import { DhikrModule } from './dhikr/dhikr.module';
import { CalendarModule } from './calendar/calendar.module';
import { DuasModule } from './duas/duas.module';
import { NamesModule } from './names/names.module';
import { QiblaModule } from './qibla/qibla.module';

@Module({
  imports: [
    PrayersModule,
    QuranModule,
    DhikrModule,
    CalendarModule,
    DuasModule,
    NamesModule,
    QiblaModule,
  ],
  exports: [
    PrayersModule,
    QuranModule,
    DhikrModule,
    CalendarModule,
    DuasModule,
    NamesModule,
    QiblaModule,
  ],
})
export class IslamModule {}
