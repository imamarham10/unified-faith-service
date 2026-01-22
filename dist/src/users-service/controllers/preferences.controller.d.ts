import { PreferencesService } from '../services/preferences.service';
import { UpdatePreferencesDto } from '../dto/update-preferences.dto';
import { CurrentUserData } from '../../auth-service/decorators/current-user.decorator';
export declare class PreferencesController {
    private readonly preferencesService;
    constructor(preferencesService: PreferencesService);
    getPreferences(user: CurrentUserData): Promise<import("../dto/user-preferences-response.dto").UserPreferencesResponseDto>;
    updatePreferences(user: CurrentUserData, updatePreferencesDto: UpdatePreferencesDto): Promise<import("../dto/user-preferences-response.dto").UserPreferencesResponseDto>;
    getPreferencesByUserId(userId: string): Promise<import("../dto/user-preferences-response.dto").UserPreferencesResponseDto>;
}
