import { NamesService } from '../services/names.service';
export declare class NamesController {
    private readonly namesService;
    constructor(namesService: NamesService);
    getAllNames(): Promise<any[]>;
    getName(id: string): Promise<any>;
    addFavorite(favoriteDto: any): Promise<{
        success: boolean;
    }>;
    getDailyName(): Promise<any>;
}
