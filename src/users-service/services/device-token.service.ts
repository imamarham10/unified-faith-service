import { Injectable, NotFoundException } from '@nestjs/common';
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

@Injectable()
export class DeviceTokenService {
  constructor(private prisma: PrismaService) {}

  /**
   * Register or update device token (upsert)
   * Note: platform should be set by the controller (auto-detected if not provided)
   */
  async registerDeviceToken(
    userId: string,
    registerDto: RegisterDeviceTokenDto,
  ): Promise<DeviceTokenResponse> {
    // Ensure platform is set (should be set by controller, but fallback to 'web' if not)
    const platform = registerDto.platform || 'web';
    
    // Upsert device token (update if exists, create if not)
    const deviceToken = await this.prisma.deviceToken.upsert({
      where: {
        userId_token: {
          userId,
          token: registerDto.token,
        },
      },
      update: {
        platform,
        deviceId: registerDto.deviceId,
        deviceName: registerDto.deviceName,
        isActive: true,
        lastUsedAt: new Date(),
      },
      create: {
        userId,
        token: registerDto.token,
        platform,
        deviceId: registerDto.deviceId,
        deviceName: registerDto.deviceName,
        isActive: true,
        lastUsedAt: new Date(),
      },
    });

    return {
      id: deviceToken.id,
      userId: deviceToken.userId,
      token: deviceToken.token,
      platform: deviceToken.platform,
      deviceId: deviceToken.deviceId || undefined,
      deviceName: deviceToken.deviceName || undefined,
      isActive: deviceToken.isActive,
      lastUsedAt: deviceToken.lastUsedAt || undefined,
      createdAt: deviceToken.createdAt,
      updatedAt: deviceToken.updatedAt,
    };
  }

  /**
   * Get all active device tokens for a user
   */
  async getUserDeviceTokens(userId: string): Promise<DeviceTokenResponse[]> {
    const tokens = await this.prisma.deviceToken.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: {
        lastUsedAt: 'desc',
      },
    });

    return tokens.map((token) => ({
      id: token.id,
      userId: token.userId,
      token: token.token,
      platform: token.platform,
      deviceId: token.deviceId || undefined,
      deviceName: token.deviceName || undefined,
      isActive: token.isActive,
      lastUsedAt: token.lastUsedAt || undefined,
      createdAt: token.createdAt,
      updatedAt: token.updatedAt,
    }));
  }

  /**
   * Remove device token (deactivate)
   */
  async removeDeviceToken(userId: string, tokenId: string): Promise<void> {
    const deviceToken = await this.prisma.deviceToken.findFirst({
      where: {
        id: tokenId,
        userId,
      },
    });

    if (!deviceToken) {
      throw new NotFoundException(`Device token with ID ${tokenId} not found`);
    }

    await this.prisma.deviceToken.update({
      where: { id: tokenId },
      data: { isActive: false },
    });
  }

  /**
   * Remove all device tokens for a user (logout all devices)
   */
  async removeAllDeviceTokens(userId: string): Promise<void> {
    await this.prisma.deviceToken.updateMany({
      where: {
        userId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });
  }

  /**
   * Get active FCM tokens for a user (for sending push notifications)
   */
  async getActiveFcmTokens(userId: string): Promise<string[]> {
    const tokens = await this.prisma.deviceToken.findMany({
      where: {
        userId,
        isActive: true,
        platform: {
          in: ['android', 'ios', 'web'], // All platforms use FCM/APNS
        },
      },
      select: {
        token: true,
      },
    });

    return tokens.map((t) => t.token);
  }
}
