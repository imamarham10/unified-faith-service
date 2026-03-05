import { Module } from '@nestjs/common';
import { NamesController } from './controllers/names.controller';
import { NamesService } from './services/names.service';
@Module({
  controllers: [NamesController],
  providers: [NamesService],
  exports: [NamesService],
})
export class NamesModule {}
