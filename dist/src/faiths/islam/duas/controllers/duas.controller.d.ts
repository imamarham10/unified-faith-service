import { DuasService } from '../services/duas.service';
export declare class DuasController {
    private readonly duasService;
    constructor(duasService: DuasService);
    getDuas(filters: any): Promise<any[]>;
    getDua(id: string): Promise<any>;
    getCategories(): Promise<any[]>;
    searchDuas(query: string): Promise<any[]>;
    createCustomDua(createDuaDto: any): Promise<{
        success: boolean;
    }>;
    addFavorite(favoriteDto: any): Promise<{
        success: boolean;
    }>;
    getFavorites(userId: string): Promise<any[]>;
    getDailyDua(): Promise<any>;
}
