import { NamesService } from '../services/names.service';
import { CreateFavoriteDto } from '../dto/create-favorite.dto';
export declare class NamesController {
    private readonly namesService;
    constructor(namesService: NamesService);
    getAllNames(): Promise<any>;
    getName(id: string): Promise<any>;
    addFavorite(user: any, favoriteDto: CreateFavoriteDto): Promise<any>;
    getDailyName(): Promise<any>;
    getAllMuhammadNames(): Promise<any>;
    getDailyMuhammadName(): Promise<any>;
    getUserMuhammadFavorites(user: any): Promise<any>;
    addMuhammadFavorite(user: any, favoriteDto: CreateFavoriteDto): Promise<any>;
    getMuhammadName(id: string): Promise<any>;
}
