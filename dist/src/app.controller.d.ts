import { AppService } from './app.service';
export declare class AppController {
    private readonly appService;
    constructor(appService: AppService);
    getHello(): string;
    getSupportedFaiths(): import("./common/constants/faiths.constant").SupportedFaith[];
}
