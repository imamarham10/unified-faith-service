import { PrismaService } from '../repositories/prisma.service';
import { RegisterDeviceTokenDto } from '../dto/register-device-token.dto';
export interface DeviceTokenResponse {
    id: string;
    userId: string;
    token: string;
    platform: string;
    deviceId?: string;
    deviceName?: string;
    isActive: boolean;
    lastUsedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare class DeviceTokenService {
    private prisma;
    constructor(prisma: PrismaService);
    registerDeviceToken(userId: string, registerDto: RegisterDeviceTokenDto): Promise<DeviceTokenResponse>;
    getUserDeviceTokens(userId: string): Promise<DeviceTokenResponse[]>;
    removeDeviceToken(userId: string, tokenId: string): Promise<void>;
    removeAllDeviceTokens(userId: string): Promise<void>;
    getActiveFcmTokens(userId: string): Promise<string[]>;
}
