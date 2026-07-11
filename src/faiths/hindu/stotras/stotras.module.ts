import { Module } from '@nestjs/common';
import { StotrasController } from './controllers/stotras.controller';
import { StotrasService } from './services/stotras.service';

@Module({
  controllers: [StotrasController],
  providers: [StotrasService],
  exports: [StotrasService],
})
export class StotrasModule {}
