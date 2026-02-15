import { PrismaService } from '../../../../common/utils/prisma.service';
export declare class DuasService {
    private prisma;
    constructor(prisma: PrismaService);
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
