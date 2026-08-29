import { Module } from '@nestjs/common';
import { FeedbackController } from './controllers/feedback.controller';
import { FeedbackService } from './services/feedback.service';
import { GoogleSheetsService } from './services/google-sheets.service';
import { PrismaService } from '../common/utils/prisma.service';
import { AuthModule } from '../auth-service/modules/auth.module';

@Module({
  imports: [AuthModule], // For EmailService, JwtAuthGuard, RolesGuard, OptionalJwtAuthGuard
  controllers: [FeedbackController],
  providers: [FeedbackService, GoogleSheetsService, PrismaService],
})
export class FeedbackModule {}
