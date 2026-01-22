import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { PreferencesService } from '../services/preferences.service';
import { UpdatePreferencesDto } from '../dto/update-preferences.dto';
import { JwtAuthGuard } from '../../auth-service/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth-service/guards/roles.guard';
import { Roles } from '../../auth-service/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../../auth-service/decorators/current-user.decorator';

@Controller('users/preferences')
@UseGuards(JwtAuthGuard)
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  /**
   * Get current user's preferences
   */
  @Get()
  async getPreferences(@CurrentUser() user: CurrentUserData) {
    return this.preferencesService.getPreferences(user.userId);
  }

  /**
   * Update current user's preferences
   */
  @Put()
  async updatePreferences(
    @CurrentUser() user: CurrentUserData,
    @Body() updatePreferencesDto: UpdatePreferencesDto,
  ) {
    return this.preferencesService.updatePreferences(user.userId, updatePreferencesDto);
  }

  /**
   * Get user preferences by ID (admin only)
   */
  @Get(':userId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getPreferencesByUserId(@Param('userId') userId: string) {
    try {
      return await this.preferencesService.getPreferencesByUserId(userId);
    } catch (error) {
      throw new NotFoundException(`Preferences for user ${userId} not found`);
    }
  }
}
