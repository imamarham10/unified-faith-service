import { Module } from '@nestjs/common';
import { HinduFeelingsController } from './controllers/feelings.controller';
import { HinduFeelingsService } from './services/feelings.service';

@Module({
  controllers: [HinduFeelingsController],
  providers: [HinduFeelingsService],
  exports: [HinduFeelingsService],
})
export class HinduFeelingsModule {}
