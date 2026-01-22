import { Injectable, UnauthorizedException, NotFoundException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../repositories/prisma.service';
import { OtpService } from './otp.service';
import { TokenService } from './token.service';
import { RolesService } from './roles.service';
import { JwtPayload } from '../dto/jwt-payload.dto';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';

/**
 * User data structure (from users-service)
 * TODO: Replace with actual users-service client
 */
interface UserData {
  id: string;
  email: string;
  isActive: boolean;
  isVerified: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private otpService: OtpService,
    private tokenService: TokenService,
    private rolesService: RolesService,
    private configService: ConfigService,
  ) {}

  /**
   * Register a new user with email and password
   */
  async register(registerDto: RegisterDto): Promise<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    isVerified: boolean;
    createdAt: Date;
  }> {
    // Check if user with this email already exists
    const existingUserByEmail = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUserByEmail) {
      throw new ConflictException('User with this email already exists');
    }

    // Check if user with this phone number already exists (if phone is provided)
    if (registerDto.phone) {
      const existingUserByPhone = await this.prisma.user.findFirst({
        where: { phone: registerDto.phone },
      });

      if (existingUserByPhone) {
        throw new ConflictException('User with this phone number already exists');
      }
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(registerDto.password, saltRounds);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        passwordHash,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        phone: registerDto.phone,
        isActive: true,
        isVerified: false, // Email verification can be done via OTP later
      },
    });

    // Assign default 'user' role
    const userRole = await this.prisma.role.findUnique({
      where: { name: 'user' },
    });

    if (userRole) {
      await this.prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: userRole.id,
          assignedBy: null,
        },
      });
    }

    // Return user data (without password hash)
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    };
  }

  /**
   * Login with email and password
   */
  async login(loginDto: LoginDto, deviceInfo?: any): Promise<{
    access_token: string;
    refresh_token: string;
    user: {
      id: string;
      email: string;
      roles: string[];
    };
    expiresIn: number;
  }> {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    // Check if user has a password (password-based login)
    if (!user.passwordHash) {
      throw new UnauthorizedException('Password not set. Please use OTP login.');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Update last login timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Get user roles
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId: user.id },
      include: { role: true },
    });

    const roleNames = userRoles.map((ur) => ur.role.name);

    // If user has no roles, assign default 'user' role
    if (roleNames.length === 0) {
      const defaultRole = await this.prisma.role.findUnique({
        where: { name: 'user' },
      });
      if (defaultRole) {
        await this.prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: defaultRole.id,
            assignedBy: null,
          },
        });
        roleNames.push('user');
      }
    }

    // Get permissions for roles
    const permissions = await this.rolesService.getAllPermissionsByRoles(roleNames);

    // Generate tokens
    const jwtPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: roleNames,
      permissions,
    };

    // Log JWT_SECRET being used for token generation
    const jwtSecret = process.env.JWT_SECRET;

    const accessToken = await this.tokenService.generateAccessToken(jwtPayload);
    const refreshToken = await this.tokenService.generateRefreshToken(user.id, deviceInfo);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        roles: roleNames,
      },
      expiresIn: this.configService.get<number>('JWT_ACCESS_TOKEN_EXPIRES_IN', 3600),
    };
  }

  /**
   * Request OTP for login
   */
  async requestOtp(email: string): Promise<{ message: string; expiresIn: number }> {
    // TODO: Validate user exists in users-service
    // For now, we'll just send OTP (validation happens on verify)
    // const user = await this.usersServiceClient.getUserByEmail(email);
    // if (!user || !user.isActive) {
    //   throw new NotFoundException('User not found or inactive');
    // }

    return this.otpService.requestOtp(email);
  }

  /**
   * Verify OTP and generate tokens
   */
  async verifyOtp(email: string, otp: string, deviceInfo?: any): Promise<{
    access_token: string;
    refresh_token: string;
    user: {
      id: string;
      email: string;
      roles: string[];
    };
    expiresIn: number;
  }> {
    // Verify OTP
    await this.otpService.verifyOtp(email, otp);

    // TODO: Get user from users-service
    // For testing: Use hardcoded user ID for imamarham10@gmail.com
    // In production, replace with actual users-service call
    let user: UserData;
    
    if (email === 'imamarham10@gmail.com') {
      // Test user - this ID should match what's in user_roles table
      // Run: npx ts-node scripts/test-setup.ts to get/create this ID
      user = {
        id: '00000000-0000-0000-0000-000000000001', // Test user ID - update after running test-setup.ts
        email,
        isActive: true,
        isVerified: true,
      };
    } else {
      // Placeholder for other users
      user = {
        id: 'user-uuid-placeholder',
        email,
        isActive: true,
        isVerified: true,
      };
    }

    // if (!user || !user.isActive) {
    //   throw new UnauthorizedException('User not found or inactive');
    // }

    // Get user roles from database
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId: user.id },
      include: { role: true },
    });

    const roleNames = userRoles.map((ur) => ur.role.name);

    // If user has no roles, assign default 'user' role
    if (roleNames.length === 0) {
      // TODO: Get 'user' role ID and assign it
      // For now, add default role
      roleNames.push('user');
    }

    // Get permissions for roles
    const permissions = await this.rolesService.getAllPermissionsByRoles(roleNames);

    // Generate tokens
    const jwtPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: roleNames,
      permissions,
    };

    const accessToken = await this.tokenService.generateAccessToken(jwtPayload);
    const refreshToken = await this.tokenService.generateRefreshToken(user.id, deviceInfo);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        roles: roleNames,
      },
      expiresIn: this.configService.get<number>('JWT_ACCESS_TOKEN_EXPIRES_IN', 3600),
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string, deviceInfo?: any): Promise<{
    access_token: string;
    refresh_token: string;
    expiresIn: number;
  }> {
    // Validate refresh token
    const { userId, tokenId } = await this.tokenService.validateRefreshToken(refreshToken);

    // TODO: Get user from users-service to verify still active
    // const user = await this.usersServiceClient.getUser(userId);
    // if (!user || !user.isActive) {
    //   await this.tokenService.revokeRefreshToken(tokenId, 'user_inactive');
    //   throw new UnauthorizedException('User not found or inactive');
    // }

    // Get user roles
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });

    const roleNames = userRoles.map((ur) => ur.role.name);
    const permissions = await this.rolesService.getAllPermissionsByRoles(roleNames);

    // Generate new tokens (rotate refresh token)
    const jwtPayload: JwtPayload = {
      sub: userId,
      email: 'user@example.com', // TODO: Get from users-service
      roles: roleNames,
      permissions,
    };

    const accessToken = await this.tokenService.generateAccessToken(jwtPayload);
    const newRefreshToken = await this.tokenService.rotateRefreshToken(tokenId, userId, deviceInfo);

    // Update last used
    await this.tokenService.updateLastUsed(tokenId);

    return {
      access_token: accessToken,
      refresh_token: newRefreshToken,
      expiresIn: this.configService.get<number>('JWT_ACCESS_TOKEN_EXPIRES_IN', 3600),
    };
  }

  /**
   * Logout - revoke refresh token
   */
  async logout(userId: string, refreshToken?: string): Promise<{ message: string }> {
    if (refreshToken) {
      try {
        const { tokenId } = await this.tokenService.validateRefreshToken(refreshToken);
        await this.tokenService.revokeRefreshToken(tokenId, 'logout');
      } catch (error) {
        // Token might be invalid, continue with logout
      }
    } else {
      // Revoke all tokens for user
      await this.tokenService.revokeAllUserTokens(userId);
    }

    return { message: 'Logged out successfully' };
  }

  /**
   * Validate JWT payload (used by JWT strategy)
   */
  async validateJwtPayload(payload: JwtPayload): Promise<JwtPayload> {
    // Validate user exists and is active
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        isActive: true,
        isVerified: true,
        deletedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    if (user.deletedAt) {
      throw new UnauthorizedException('User account has been deleted');
    }

    return payload;
  }

  /**
   * Get user permissions for a user ID
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    const allPermissions = new Set<string>();
    userRoles.forEach((userRole) => {
      userRole.role.rolePermissions.forEach((rp) => {
        allPermissions.add(rp.permission.name);
      });
    });

    return Array.from(allPermissions);
  }
}
