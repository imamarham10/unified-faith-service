import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../repositories/prisma.service';
import { OtpService } from './otp.service';
import { TokenService } from './token.service';
import { RolesService } from './roles.service';
import { JwtPayload } from '../dto/jwt-payload.dto';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
export declare class AuthService {
    private prisma;
    private otpService;
    private tokenService;
    private rolesService;
    private configService;
    constructor(prisma: PrismaService, otpService: OtpService, tokenService: TokenService, rolesService: RolesService, configService: ConfigService);
    register(registerDto: RegisterDto): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        isActive: boolean;
        isVerified: boolean;
        createdAt: Date;
    }>;
    login(loginDto: LoginDto, deviceInfo?: any): Promise<{
        access_token: string;
        refresh_token: string;
        user: {
            id: string;
            email: string;
            roles: string[];
        };
        expiresIn: number;
    }>;
    requestOtp(email: string): Promise<{
        message: string;
        expiresIn: number;
    }>;
    verifyOtp(email: string, otp: string, deviceInfo?: any): Promise<{
        access_token: string;
        refresh_token: string;
        user: {
            id: string;
            email: string;
            roles: string[];
        };
        expiresIn: number;
    }>;
    refreshToken(refreshToken: string, deviceInfo?: any): Promise<{
        access_token: string;
        refresh_token: string;
        expiresIn: number;
    }>;
    logout(userId: string, refreshToken?: string): Promise<{
        message: string;
    }>;
    validateJwtPayload(payload: JwtPayload): Promise<JwtPayload>;
    getUserPermissions(userId: string): Promise<string[]>;
}
