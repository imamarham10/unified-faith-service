import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../repositories/prisma.service';
import { UpdatePreferencesDto } from '../dto/update-preferences.dto';
import { UserPreferencesResponseDto } from '../dto/user-preferences-response.dto';

@Injectable()
export class PreferencesService {
  private readonly logger = new Logger(PreferencesService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get user preferences by user ID
   */
  async getPreferences(userId: string): Promise<UserPreferencesResponseDto> {
    let preferences = await this.prisma.userPreference.findUnique({
      where: { userId },
    });

    // If preferences don't exist, create default ones
    if (!preferences) {
      preferences = await this.createDefaultPreferences(userId);
    }

    return {
      id: preferences.id,
      userId: preferences.userId,
      faith: preferences.faith || undefined,
      language: preferences.language || undefined,
      countryCode: preferences.countryCode || undefined,
      timezone: preferences.timezone || undefined,
      notificationPreferences: (preferences.notificationPreferences as any) || undefined,
      contentPreferences: (preferences.contentPreferences as any) || undefined,
      createdAt: preferences.createdAt,
      updatedAt: preferences.updatedAt,
    };
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    userId: string,
    updatePreferencesDto: UpdatePreferencesDto,
  ): Promise<UserPreferencesResponseDto> {
    // Check if preferences exist
    const existingPreferences = await this.prisma.userPreference.findUnique({
      where: { userId },
    });

    let preferences;
    if (!existingPreferences) {
      // Create new preferences with defaults
      preferences = await this.prisma.userPreference.create({
        data: {
          userId,
          faith: updatePreferencesDto.faith || null,
          language: updatePreferencesDto.language || 'en', // Default to English
          countryCode: updatePreferencesDto.countryCode || null,
          timezone: updatePreferencesDto.timezone || null,
          notificationPreferences: updatePreferencesDto.notificationPreferences
            ? (JSON.parse(JSON.stringify(updatePreferencesDto.notificationPreferences)) as any)
            : {},
          contentPreferences: updatePreferencesDto.contentPreferences
            ? (JSON.parse(JSON.stringify(updatePreferencesDto.contentPreferences)) as any)
            : {},
        },
      });
    } else {
      // Update existing preferences (only update provided fields)
      const updateData: any = {};
      
      if (updatePreferencesDto.faith !== undefined) {
        updateData.faith = updatePreferencesDto.faith || null;
      }
      if (updatePreferencesDto.language !== undefined) {
        updateData.language = updatePreferencesDto.language || null;
      }
      if (updatePreferencesDto.countryCode !== undefined) {
        updateData.countryCode = updatePreferencesDto.countryCode || null;
      }
      if (updatePreferencesDto.timezone !== undefined) {
        updateData.timezone = updatePreferencesDto.timezone || null;
      }
      if (updatePreferencesDto.notificationPreferences !== undefined) {
        updateData.notificationPreferences = {
          ...(existingPreferences.notificationPreferences as any || {}),
          ...(JSON.parse(JSON.stringify(updatePreferencesDto.notificationPreferences)) as any),
        };
      }
      if (updatePreferencesDto.contentPreferences !== undefined) {
        updateData.contentPreferences = {
          ...(existingPreferences.contentPreferences as any || {}),
          ...(JSON.parse(JSON.stringify(updatePreferencesDto.contentPreferences)) as any),
        };
      }

      preferences = await this.prisma.userPreference.update({
        where: { userId },
        data: updateData,
      });
    }

    // Validate: If push notifications are enabled, check if device tokens exist
    const finalPreferences = updatePreferencesDto.notificationPreferences 
      ? { ...(preferences.notificationPreferences as any || {}), ...updatePreferencesDto.notificationPreferences }
      : (preferences.notificationPreferences as any || {});
    
    if (finalPreferences.push === true) {
      const deviceTokens = await this.prisma.deviceToken.findMany({
        where: {
          userId,
          isActive: true,
        },
      });

      if (deviceTokens.length === 0) {
        this.logger.warn(
          `User ${userId} enabled push notifications but has no registered device tokens. ` +
          `Please register a device token via POST /users/device-tokens`
        );
        // Don't throw error, just log warning - user can register token later
      }
    }

    return {
      id: preferences.id,
      userId: preferences.userId,
      faith: preferences.faith || undefined,
      language: preferences.language || undefined,
      countryCode: preferences.countryCode || undefined,
      timezone: preferences.timezone || undefined,
      notificationPreferences: (preferences.notificationPreferences as any) || undefined,
      contentPreferences: (preferences.contentPreferences as any) || undefined,
      createdAt: preferences.createdAt,
      updatedAt: preferences.updatedAt,
    };
  }

  /**
   * Get preferences by user ID (admin only)
   */
  async getPreferencesByUserId(userId: string): Promise<UserPreferencesResponseDto> {
    return this.getPreferences(userId);
  }

  /**
   * Create default preferences for user
   */
  private async createDefaultPreferences(userId: string) {
    return this.prisma.userPreference.create({
      data: {
        userId,
        language: 'en', // Default to English
        notificationPreferences: {
          push: true,
          email: true,
          sms: false,
          dailyPacket: true,
          aiGuru: true,
        },
        contentPreferences: {
          showAds: true,
          audioQuality: 'standard',
          downloadQuality: 'standard',
        },
      },
    });
  }
}
