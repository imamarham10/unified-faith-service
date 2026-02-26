import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
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
  async login(@Body() loginDto: LoginDto, @Req() req: any, @Res({ passthrough: true }) res: Response) {
    const deviceInfo = {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };

    const result = await this.authService.login(loginDto, deviceInfo);

    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
      path: '/',
    });
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return result;
  }

  @Public()
  @Post('login/request-otp')
  async requestOtp(@Body() requestOtpDto: RequestOtpDto) {
    return this.authService.requestOtp(requestOtpDto.email);
  }

  @Public()
  @Post('login/verify-otp')
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto, @Req() req: any, @Res({ passthrough: true }) res: Response) {
    const deviceInfo = {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };

    const result = await this.authService.verifyOtp(verifyOtpDto.email, verifyOtpDto.otp, deviceInfo);

    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
      path: '/',
    });
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return result;
  }

  @Public()
  @Post('refresh')
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const deviceInfo = {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };

    const token = refreshTokenDto.refresh_token || req.cookies?.refreshToken;
    const result = await this.authService.refreshToken(token, deviceInfo);

    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
      path: '/',
    });
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@CurrentUser() user: CurrentUserData, @Res({ passthrough: true }) res: Response, @Body() body?: { refresh_token?: string }) {
    const result = await this.authService.logout(user.userId, body?.refresh_token);
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });
    return result;
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
