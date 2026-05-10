import { Module } from '@nestjs/common';
import { IslamModule } from './islam/islam.module';
import { HinduModule } from './hindu/hindu.module';

@Module({
  imports: [IslamModule, HinduModule],
  exports: [IslamModule, HinduModule],
})
export class FaithModule {}
