import { Module } from '@nestjs/common';
import { TempleLocatorController } from './controllers/temple-locator.controller';
import { TempleLocatorService } from './services/temple-locator.service';

@Module({
  controllers: [TempleLocatorController],
  providers: [TempleLocatorService],
  exports: [TempleLocatorService],
})
export class TempleLocatorModule {}
