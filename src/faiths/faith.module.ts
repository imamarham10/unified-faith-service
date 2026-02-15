import { Module } from '@nestjs/common';
import { IslamModule } from './islam/islam.module';

@Module({
  imports: [IslamModule],
  exports: [IslamModule],
})
export class FaithModule {}
