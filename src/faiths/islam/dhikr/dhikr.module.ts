import { Module } from '@nestjs/common';
import { DhikrController } from './controllers/dhikr.controller';
import { DhikrService } from './services/dhikr.service';
import { DhikrDictionaryService } from './services/dhikr-dictionary.service';
@Module({
  controllers: [DhikrController],
  providers: [DhikrService, DhikrDictionaryService],
  exports: [DhikrService, DhikrDictionaryService],
})
export class DhikrModule {}
