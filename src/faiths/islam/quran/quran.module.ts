import { Module } from '@nestjs/common';
import { QuranController } from './controllers/quran.controller';
import { QuranService } from './services/quran.service';
@Module({
  controllers: [QuranController],
  providers: [QuranService],
  exports: [QuranService],
})
export class QuranModule {}
