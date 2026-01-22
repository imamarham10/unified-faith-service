import { ProfileService } from '../services/profile.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { CurrentUserData } from '../../auth-service/decorators/current-user.decorator';
export declare class ProfileController {
    private readonly profileService;
    constructor(profileService: ProfileService);
    getProfile(user: CurrentUserData): Promise<import("../dto/user-profile-response.dto").UserProfileResponseDto>;
    createProfile(user: CurrentUserData, updateProfileDto: UpdateProfileDto): Promise<import("../dto/user-profile-response.dto").UserProfileResponseDto>;
    updateProfile(user: CurrentUserData, updateProfileDto: UpdateProfileDto): Promise<import("../dto/user-profile-response.dto").UserProfileResponseDto>;
    getProfileByUserId(userId: string): Promise<import("../dto/user-profile-response.dto").UserProfileResponseDto>;
    createProfileForUser(userId: string, updateProfileDto: UpdateProfileDto): Promise<import("../dto/user-profile-response.dto").UserProfileResponseDto>;
}
