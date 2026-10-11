import { Module } from '@nestjs/common';
import { IslamModule } from './islam/islam.module';
import { HinduModule } from './hindu/hindu.module';
import { CollectionsModule } from './collections/collections.module';

@Module({
  imports: [IslamModule, HinduModule, CollectionsModule],
  exports: [IslamModule, HinduModule, CollectionsModule],
})
export class FaithModule {}
