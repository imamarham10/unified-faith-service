import { PrismaService } from '../repositories/prisma.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UserProfileResponseDto } from '../dto/user-profile-response.dto';
export declare class ProfileService {
    private prisma;
    constructor(prisma: PrismaService);
    private formatDate;
    getProfile(userId: string): Promise<UserProfileResponseDto>;
    updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<UserProfileResponseDto>;
    createProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<UserProfileResponseDto>;
    getProfileByUserId(userId: string): Promise<UserProfileResponseDto>;
    private createDefaultProfile;
}
