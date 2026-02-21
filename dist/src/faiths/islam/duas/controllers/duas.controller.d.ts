import { DuasService } from '../services/duas.service';
import { CurrentUserData } from '../../../../auth-service/decorators/current-user.decorator';
export declare class DuasController {
    private readonly duasService;
    constructor(duasService: DuasService);
    getCategories(): Promise<any>;
    searchDuas(query: string): Promise<any>;
    getDailyDua(): Promise<any>;
    addFavorite(user: CurrentUserData, body: {
        duaId: string;
    }): Promise<any>;
    getFavorites(user: CurrentUserData): Promise<any>;
    createCustomDua(createDuaDto: any): Promise<{
        success: boolean;
        message: string;
    }>;
    getDuas(filters: any): Promise<any>;
    getDua(id: string): Promise<any>;
}
