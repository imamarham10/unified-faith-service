import { Module } from '@nestjs/common';
import { ScripturesController } from './controllers/scriptures.controller';
import { ScripturesService } from './services/scriptures.service';

@Module({
  controllers: [ScripturesController],
  providers: [ScripturesService],
  exports: [ScripturesService],
})
export class ScripturesModule {}
