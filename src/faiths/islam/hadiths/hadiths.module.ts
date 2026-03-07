import { Module } from '@nestjs/common';
import { HadithsController } from './controllers/hadiths.controller';
import { HadithsService } from './services/hadiths.service';

@Module({
  controllers: [HadithsController],
  providers: [HadithsService],
  exports: [HadithsService],
})
export class HadithsModule {}
