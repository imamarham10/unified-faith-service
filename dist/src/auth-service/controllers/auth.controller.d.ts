import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { RequestOtpDto } from '../dto/request-otp.dto';
import { VerifyOtpDto } from '../dto/verify-otp.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { CurrentUserData } from '../decorators/current-user.decorator';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(registerDto: RegisterDto): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        isActive: boolean;
        isVerified: boolean;
        createdAt: Date;
    }>;
    login(loginDto: LoginDto, req: any, res: Response): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string;
            roles: string[];
        };
        expiresIn: number;
    }>;
    requestOtp(requestOtpDto: RequestOtpDto): Promise<{
        message: string;
        expiresIn: number;
    }>;
    verifyOtp(verifyOtpDto: VerifyOtpDto, req: any, res: Response): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string;
            roles: string[];
        };
        expiresIn: number;
    }>;
    refreshToken(refreshTokenDto: RefreshTokenDto, req: Request, res: Response): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
    }>;
    logout(user: CurrentUserData, res: Response, body?: {
        refresh_token?: string;
    }): Promise<{
        message: string;
    }>;
    getProfile(user: CurrentUserData): CurrentUserData;
    validateToken(user: CurrentUserData): Promise<{
        valid: boolean;
        user: {
            id: string;
            email: string;
            roles: string[];
        };
    }>;
}
