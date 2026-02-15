import { Controller, Get, Post, Body, Query, ValidationPipe, UsePipes } from '@nestjs/common';
import { QiblaService } from '../services/qibla.service';
import { GetQiblaDto } from '../dto/qibla.dto';

@Controller('api/v1/islam/qibla')
export class QiblaController {
  constructor(private readonly qiblaService: QiblaService) {}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true }))
  async getQiblaDirection(@Query() query: GetQiblaDto) {
    return this.qiblaService.getQiblaDirection(query.lat, query.lng);
  }

  @Post('calculate')
  async calculateQibla(@Body() calculateDto: any) {
      // Deprecated or same as Get
    return this.qiblaService.calculateQibla(calculateDto);
  }
}
