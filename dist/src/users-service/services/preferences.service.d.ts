import { PrismaService } from '../repositories/prisma.service';
import { UpdatePreferencesDto } from '../dto/update-preferences.dto';
import { UserPreferencesResponseDto } from '../dto/user-preferences-response.dto';
export declare class PreferencesService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getPreferences(userId: string): Promise<UserPreferencesResponseDto>;
    updatePreferences(userId: string, updatePreferencesDto: UpdatePreferencesDto): Promise<UserPreferencesResponseDto>;
    getPreferencesByUserId(userId: string): Promise<UserPreferencesResponseDto>;
    private createDefaultPreferences;
}
