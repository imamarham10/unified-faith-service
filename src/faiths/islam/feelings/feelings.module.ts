
import { Module } from '@nestjs/common';
import { FeelingsController } from './controllers/feelings.controller';
import { FeelingsService } from './services/feelings.service';
import { Public } from '../../../auth-service/decorators/public.decorator';
@Module({
  controllers: [FeelingsController],
  providers: [FeelingsService],
})
export class FeelingsModule {}
