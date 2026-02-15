
import { Module } from '@nestjs/common';
import { FeelingsController } from './controllers/feelings.controller';
import { FeelingsService } from './services/feelings.service';
import { Public } from '../../../auth-service/decorators/public.decorator';
import { PrismaService } from '../../../common/utils/prisma.service';

@Module({
  controllers: [FeelingsController],
  providers: [FeelingsService, PrismaService],
})
export class FeelingsModule {}
