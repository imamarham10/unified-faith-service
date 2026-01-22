import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  NotFoundException,
  Req,
  Headers,
  Logger,
} from '@nestjs/common';
import { DeviceTokenService } from '../services/device-token.service';
import { RegisterDeviceTokenDto } from '../dto/register-device-token.dto';
import { JwtAuthGuard } from '../../auth-service/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../../auth-service/decorators/current-user.decorator';

@Controller('users/device-tokens')
@UseGuards(JwtAuthGuard)
export class DeviceTokenController {
  private readonly logger = new Logger(DeviceTokenController.name);

  constructor(private readonly deviceTokenService: DeviceTokenService) {}

  /**
   * Register or update device token (FCM/APNS)
   * Auto-detects platform and device name from User-Agent if not provided
   */
  @Post()
  async registerDeviceToken(
    @CurrentUser() user: CurrentUserData,
    @Body() registerDto: RegisterDeviceTokenDto,
    @Req() req: any,
    @Headers('user-agent') userAgentHeader?: string,
  ) {
    this.logger.log(`[DeviceToken] ====== ENDPOINT CALLED ======`);
    this.logger.log(`[DeviceToken] Registration request received for user: ${user.userId}`);
    
    try {
    
    // Try multiple ways to get User-Agent (NestJS Express compatibility)
    const userAgent = userAgentHeader || req.get?.('user-agent') || req.headers?.['user-agent'] || '';
    
    this.logger.log(`[DeviceToken] User-Agent: ${userAgent || '(empty)'}`);
    this.logger.log(`[DeviceToken] Request body - platform: ${registerDto.platform || '(not provided)'}, deviceName: ${registerDto.deviceName || '(not provided)'}, token: [REDACTED]`);
    
    let platform = registerDto.platform;
    
    if (!platform) {
      // Auto-detect platform from User-Agent
      const ua = userAgent.toLowerCase();
      this.logger.log(`[DeviceToken] Auto-detecting platform from User-Agent: ${ua}`);
      
      if (ua.includes('android')) {
        platform = 'android';
        this.logger.log('[DeviceToken] ✅ Detected platform: android');
      } else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) {
        platform = 'ios';
        this.logger.log('[DeviceToken] ✅ Detected platform: ios');
      } else {
        platform = 'web'; // Default to web for browsers/Postman
        this.logger.log('[DeviceToken] ✅ Detected platform: web (default)');
      }
    } else {
      this.logger.log(`[DeviceToken] Using provided platform: ${platform}`);
    }
    
    // Auto-detect device name from User-Agent if not provided
    let deviceName = registerDto.deviceName;
    if (!deviceName && userAgent) {
      // Extract device name from User-Agent
      const ua = userAgent;
      let detectedName: string | undefined;
      
      // Try to extract device model/name
      if (ua.includes('iPhone')) {
        const match = ua.match(/iPhone[^)]*/);
        detectedName = match ? match[0] : 'iPhone';
      } else if (ua.includes('iPad')) {
        const match = ua.match(/iPad[^)]*/);
        detectedName = match ? match[0] : 'iPad';
      } else if (ua.includes('Android')) {
        // Try to extract Android device model
        const match = ua.match(/Android[^;)]*/);
        detectedName = match ? match[0] : 'Android Device';
      } else if (ua.includes('Windows')) {
        detectedName = 'Windows Device';
      } else if (ua.includes('Mac')) {
        detectedName = 'Mac Device';
      } else if (ua.includes('Linux')) {
        detectedName = 'Linux Device';
      } else if (ua.includes('Postman')) {
        detectedName = 'Postman';
      } else {
        detectedName = 'Unknown Device';
      }
      
      deviceName = detectedName;
      this.logger.log(`[DeviceToken] ✅ Auto-detected device name: ${deviceName}`);
    } else if (deviceName) {
      this.logger.log(`[DeviceToken] Using provided device name: ${deviceName}`);
    } else {
      this.logger.log('[DeviceToken] No device name provided and User-Agent is empty');
    }

    // Create updated DTO with auto-detected values
    const enrichedDto: RegisterDeviceTokenDto = {
      ...registerDto,
      platform, // Now guaranteed to be set
      deviceName: deviceName || registerDto.deviceName,
    };

    this.logger.log(`[DeviceToken] Final DTO - platform: ${enrichedDto.platform}, deviceName: ${enrichedDto.deviceName || '(none)'}`);

    const result = await this.deviceTokenService.registerDeviceToken(user.userId, enrichedDto);
    this.logger.log(`[DeviceToken] ✅ Device token registered successfully - ID: ${result.id}`);
    
    return result;
    } catch (error) {
      this.logger.error(`[DeviceToken] ❌ Error registering device token: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get all active device tokens for current user
   */
  @Get()
  async getDeviceTokens(@CurrentUser() user: CurrentUserData) {
    return this.deviceTokenService.getUserDeviceTokens(user.userId);
  }

  /**
   * Remove a specific device token
   */
  @Delete(':tokenId')
  async removeDeviceToken(
    @CurrentUser() user: CurrentUserData,
    @Param('tokenId') tokenId: string,
  ) {
    try {
      await this.deviceTokenService.removeDeviceToken(user.userId, tokenId);
      return { message: 'Device token removed successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException(`Device token with ID ${tokenId} not found`);
    }
  }

  /**
   * Remove all device tokens for current user (logout all devices)
   */
  @Delete()
  async removeAllDeviceTokens(@CurrentUser() user: CurrentUserData) {
    await this.deviceTokenService.removeAllDeviceTokens(user.userId);
    return { message: 'All device tokens removed successfully' };
  }
}
