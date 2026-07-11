import { Module } from '@nestjs/common';
import { SacredStoriesController } from './controllers/sacred-stories.controller';
import { SacredStoriesService } from './services/sacred-stories.service';

@Module({
  controllers: [SacredStoriesController],
  providers: [SacredStoriesService],
  exports: [SacredStoriesService],
})
export class SacredStoriesModule {}
