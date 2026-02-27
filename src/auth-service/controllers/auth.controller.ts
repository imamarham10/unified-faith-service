import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
} from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { RequestOtpDto } from '../dto/request-otp.dto';
import { VerifyOtpDto } from '../dto/verify-otp.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { Public } from '../decorators/public.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Req() req: any) {
    const deviceInfo = {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };

    return this.authService.login(loginDto, deviceInfo);
  }

  @Public()
  @Post('login/request-otp')
  async requestOtp(@Body() requestOtpDto: RequestOtpDto) {
    return this.authService.requestOtp(requestOtpDto.email);
  }

  @Public()
  @Post('login/verify-otp')
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto, @Req() req: any) {
    const deviceInfo = {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };

    return this.authService.verifyOtp(verifyOtpDto.email, verifyOtpDto.otp, deviceInfo);
  }

  @Public()
  @Post('refresh')
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto, @Req() req: any) {
    const deviceInfo = {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };

    const token = refreshTokenDto.refresh_token;
    return this.authService.refreshToken(token, deviceInfo);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@CurrentUser() user: CurrentUserData, @Body() body?: { refresh_token?: string }) {
    return this.authService.logout(user.userId, body?.refresh_token);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@CurrentUser() user: CurrentUserData) {
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Get('validate')
  async validateToken(@CurrentUser() user: CurrentUserData) {
    return {
      valid: true,
      user: {
        id: user.userId,
        email: user.email,
        roles: user.roles,
      },
    };
  }
}
