import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../repositories/prisma.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UserProfileResponseDto } from '../dto/user-profile-response.dto';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  /**
   * Format date to YYYY-MM-DD (UTC)
   */
  private formatDate(date: Date | null | undefined): string | undefined {
    if (!date) return undefined;
    const d = new Date(date);
    // Use UTC methods to avoid timezone issues
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Get user profile by user ID
   * Fetches basic user info from auth service and profile from users service
   */
  async getProfile(userId: string): Promise<UserProfileResponseDto> {
    // Fetch user from auth database (same database)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Fetch profile from users database (same database)
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    // If profile doesn't exist, create a default one
    if (!profile) {
      return this.createDefaultProfile(userId, user);
    }

    return {
      id: profile.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone || undefined,
      avatarUrl: profile.avatarUrl || undefined,
      bio: profile.bio || undefined,
      dateOfBirth: this.formatDate(profile.dateOfBirth),
      gender: profile.gender || undefined,
      address: profile.address as any || undefined,
      socialLinks: profile.socialLinks as any || undefined,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<UserProfileResponseDto> {
    // Check if profile exists
    const existingProfile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    let profile;
    if (!existingProfile) {
      // Create new profile
      profile = await this.prisma.userProfile.create({
        data: {
          userId,
          avatarUrl: updateProfileDto.avatarUrl,
          bio: updateProfileDto.bio,
          dateOfBirth: updateProfileDto.dateOfBirth
            ? new Date(updateProfileDto.dateOfBirth)
            : null,
          gender: updateProfileDto.gender,
          address: updateProfileDto.address
            ? (JSON.parse(JSON.stringify(updateProfileDto.address)) as any)
            : null,
          socialLinks: updateProfileDto.socialLinks
            ? (JSON.parse(JSON.stringify(updateProfileDto.socialLinks)) as any)
            : null,
        },
      });
    } else {
      // Update existing profile - only update fields that are provided
      const updateData: any = {};
      
      if (updateProfileDto.avatarUrl !== undefined) {
        updateData.avatarUrl = updateProfileDto.avatarUrl;
      }
      if (updateProfileDto.bio !== undefined) {
        updateData.bio = updateProfileDto.bio;
      }
      if (updateProfileDto.dateOfBirth !== undefined) {
        updateData.dateOfBirth = updateProfileDto.dateOfBirth
          ? new Date(updateProfileDto.dateOfBirth)
          : null;
      }
      if (updateProfileDto.gender !== undefined) {
        updateData.gender = updateProfileDto.gender;
      }
      if (updateProfileDto.address !== undefined) {
        updateData.address = updateProfileDto.address
          ? (JSON.parse(JSON.stringify(updateProfileDto.address)) as any)
          : null;
      }
      if (updateProfileDto.socialLinks !== undefined) {
        updateData.socialLinks = updateProfileDto.socialLinks
          ? (JSON.parse(JSON.stringify(updateProfileDto.socialLinks)) as any)
          : null;
      }

      profile = await this.prisma.userProfile.update({
        where: { userId },
        data: updateData,
      });
    }

    // Update firstName, lastName, phone in User table if provided
    if (updateProfileDto.firstName || updateProfileDto.lastName || updateProfileDto.phone !== undefined) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(updateProfileDto.firstName && { firstName: updateProfileDto.firstName }),
          ...(updateProfileDto.lastName && { lastName: updateProfileDto.lastName }),
          ...(updateProfileDto.phone !== undefined && { phone: updateProfileDto.phone || null }),
        },
      });
    }

    // Fetch updated user data
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
      },
    });

    return {
      id: profile.id,
      email: user?.email || '',
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || undefined,
      avatarUrl: profile.avatarUrl || undefined,
      bio: profile.bio || undefined,
      dateOfBirth: this.formatDate(profile.dateOfBirth),
      gender: profile.gender || undefined,
      address: profile.address as any || undefined,
      socialLinks: profile.socialLinks as any || undefined,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  /**
   * Create profile for user
   */
  async createProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<UserProfileResponseDto> {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Check if profile already exists
    const existingProfile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      throw new ConflictException(`Profile for user ${userId} already exists. Use PUT to update.`);
    }

    // Update user fields if provided
    if (updateProfileDto.firstName || updateProfileDto.lastName || updateProfileDto.phone !== undefined) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(updateProfileDto.firstName && { firstName: updateProfileDto.firstName }),
          ...(updateProfileDto.lastName && { lastName: updateProfileDto.lastName }),
          ...(updateProfileDto.phone !== undefined && { phone: updateProfileDto.phone || null }),
        },
      });
    }

    // Fetch updated user data
    const updatedUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
      },
    });

    // Create profile
    const profile = await this.prisma.userProfile.create({
      data: {
        userId,
        avatarUrl: updateProfileDto.avatarUrl,
        bio: updateProfileDto.bio,
        dateOfBirth: updateProfileDto.dateOfBirth
          ? new Date(updateProfileDto.dateOfBirth)
          : null,
        gender: updateProfileDto.gender,
        address: updateProfileDto.address
          ? (JSON.parse(JSON.stringify(updateProfileDto.address)) as any)
          : null,
        socialLinks: updateProfileDto.socialLinks
          ? (JSON.parse(JSON.stringify(updateProfileDto.socialLinks)) as any)
          : null,
      },
    });

    return {
      id: profile.id,
      email: updatedUser?.email || user.email,
      firstName: updatedUser?.firstName || user.firstName,
      lastName: updatedUser?.lastName || user.lastName,
      phone: updatedUser?.phone || user.phone || undefined,
      avatarUrl: profile.avatarUrl || undefined,
      bio: profile.bio || undefined,
      dateOfBirth: this.formatDate(profile.dateOfBirth),
      gender: profile.gender || undefined,
      address: profile.address as any || undefined,
      socialLinks: profile.socialLinks as any || undefined,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  /**
   * Get profile by user ID (admin only)
   */
  async getProfileByUserId(userId: string): Promise<UserProfileResponseDto> {
    return this.getProfile(userId);
  }

  /**
   * Create default profile for user
   */
  private async createDefaultProfile(userId: string, user?: { email: string; firstName: string; lastName: string; phone?: string | null }) {
    // Fetch user if not provided
    if (!user) {
      const fetchedUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      });
      if (!fetchedUser) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }
      user = fetchedUser;
    }

    const profile = await this.prisma.userProfile.create({
      data: {
        userId,
      },
    });

    return {
      id: profile.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone || undefined,
      avatarUrl: undefined,
      bio: undefined,
      dateOfBirth: undefined,
      gender: undefined,
      address: undefined,
      socialLinks: undefined,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }
}
