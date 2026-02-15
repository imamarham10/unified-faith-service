import { Module } from '@nestjs/common';
import { DuasController } from './controllers/duas.controller';
import { DuasService } from './services/duas.service';
import { PrismaService } from '../../../common/utils/prisma.service';

@Module({
  controllers: [DuasController],
  providers: [DuasService, PrismaService],
  exports: [DuasService],
})
export class DuasModule {}
