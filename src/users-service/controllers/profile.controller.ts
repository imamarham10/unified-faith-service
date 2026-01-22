import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  UseGuards,
  Param,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ProfileService } from '../services/profile.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { JwtAuthGuard } from '../../auth-service/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth-service/guards/roles.guard';
import { Roles } from '../../auth-service/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../../auth-service/decorators/current-user.decorator';

@Controller('users/profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  /**
   * Get current user's profile
   */
  @Get()
  async getProfile(@CurrentUser() user: CurrentUserData) {
    return this.profileService.getProfile(user.userId);
  }

  /**
   * Create profile for current user
   */
  @Post()
  async createProfile(
    @CurrentUser() user: CurrentUserData,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.profileService.createProfile(user.userId, updateProfileDto);
  }

  /**
   * Update current user's profile
   */
  @Put()
  async updateProfile(
    @CurrentUser() user: CurrentUserData,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.profileService.updateProfile(user.userId, updateProfileDto);
  }

  /**
   * Get user profile by ID (admin only)
   */
  @Get(':userId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getProfileByUserId(@Param('userId') userId: string) {
    try {
      return await this.profileService.getProfileByUserId(userId);
    } catch (error) {
      throw new NotFoundException(`Profile for user ${userId} not found`);
    }
  }

  /**
   * Create profile for a user (admin only)
   */
  @Post(':userId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async createProfileForUser(
    @Param('userId') userId: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    try {
      return await this.profileService.createProfile(userId, updateProfileDto);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new NotFoundException(`User ${userId} not found`);
    }
  }
}
