import { Module } from '@nestjs/common';
import { DuasController } from './controllers/duas.controller';
import { DuasService } from './services/duas.service';
@Module({
  controllers: [DuasController],
  providers: [DuasService],
  exports: [DuasService],
})
export class DuasModule {}
