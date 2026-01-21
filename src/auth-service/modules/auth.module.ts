import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from '../controllers/auth.controller';
import { RolesController } from '../controllers/roles.controller';
import { PermissionsController } from '../controllers/permissions.controller';
import { AuthService } from '../services/auth.service';
import { RolesService } from '../services/roles.service';
import { PermissionsService } from '../services/permissions.service';
import { OtpService } from '../services/otp.service';
import { TokenService } from '../services/token.service';
import { JwtStrategy } from '../services/jwt.strategy';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { PrismaService } from '../repositories/prisma.service';
import { EmailService } from '../providers/email/email.service';
import { SmtpProvider } from '../providers/email/smtp.provider';
import { SesProvider } from '../providers/email/ses.provider';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      signOptions: {
        expiresIn: '3600s',
      },
    }),
  ],
        controllers: [AuthController, RolesController, PermissionsController],
  providers: [
    // Core Services
    AuthService,
    OtpService,
    TokenService,
    
    // RBAC Services
    RolesService,
    PermissionsService,
    
    // Database
    PrismaService,
    
    // Email Providers
    SmtpProvider,
    SesProvider,
    EmailService,
    
    // JWT Strategy & Guards
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
  ],
  exports: [
    AuthService,
    RolesService,
    PermissionsService,
    OtpService,
    TokenService,
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
    PrismaService,
  ],
})
export class AuthModule {}
