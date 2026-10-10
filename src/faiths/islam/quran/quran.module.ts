import { Module } from '@nestjs/common';
import { QuranController } from './controllers/quran.controller';
import { JuzController } from './controllers/juz.controller';
import { QuranService } from './services/quran.service';
import { JuzService } from './services/juz.service';
@Module({
  controllers: [QuranController, JuzController],
  providers: [QuranService, JuzService],
  exports: [QuranService, JuzService],
})
export class QuranModule {}
