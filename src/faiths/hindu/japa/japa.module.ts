import { Module } from '@nestjs/common';
import { JapaController } from './controllers/japa.controller';
import { JapaCounterService } from './services/japa-counter.service';
import { JapaGoalService } from './services/japa-goal.service';
import { JapaHistoryService } from './services/japa-history.service';
import { MantraDictionaryService } from './services/mantra-dictionary.service';

@Module({
  controllers: [JapaController],
  providers: [JapaCounterService, JapaGoalService, JapaHistoryService, MantraDictionaryService],
  exports: [JapaCounterService, JapaGoalService, JapaHistoryService, MantraDictionaryService],
})
export class JapaModule {}
