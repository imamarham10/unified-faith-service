import { DeviceTokenService } from '../services/device-token.service';
import { RegisterDeviceTokenDto } from '../dto/register-device-token.dto';
import { CurrentUserData } from '../../auth-service/decorators/current-user.decorator';
export declare class DeviceTokenController {
    private readonly deviceTokenService;
    private readonly logger;
    constructor(deviceTokenService: DeviceTokenService);
    registerDeviceToken(user: CurrentUserData, registerDto: RegisterDeviceTokenDto, req: any, userAgentHeader?: string): Promise<import("../services/device-token.service").DeviceTokenResponse>;
    getDeviceTokens(user: CurrentUserData): Promise<import("../services/device-token.service").DeviceTokenResponse[]>;
    removeDeviceToken(user: CurrentUserData, tokenId: string): Promise<{
        message: string;
    }>;
    removeAllDeviceTokens(user: CurrentUserData): Promise<{
        message: string;
    }>;
}
