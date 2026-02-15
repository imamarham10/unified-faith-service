import { Module } from '@nestjs/common';
import { NamesController } from './controllers/names.controller';
import { NamesService } from './services/names.service';
import { PrismaService } from '../../../common/utils/prisma.service';

@Module({
  controllers: [NamesController],
  providers: [NamesService, PrismaService],
  exports: [NamesService],
})
export class NamesModule {}
