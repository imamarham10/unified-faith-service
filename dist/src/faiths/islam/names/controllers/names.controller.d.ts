import { NamesService } from '../services/names.service';
import { CreateFavoriteDto } from '../dto/create-favorite.dto';
export declare class NamesController {
    private readonly namesService;
    constructor(namesService: NamesService);
    getAllNames(): Promise<any>;
    getName(id: string): Promise<any>;
    addFavorite(user: any, favoriteDto: CreateFavoriteDto): Promise<any>;
    getDailyName(): Promise<any>;
}
