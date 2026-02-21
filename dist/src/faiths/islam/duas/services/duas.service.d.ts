import { PrismaService } from '../../../../common/utils/prisma.service';
export declare class DuasService {
    private prisma;
    constructor(prisma: PrismaService);
    getDuas(filters: any): Promise<any>;
    getDua(id: string): Promise<any>;
    getCategories(): Promise<any>;
    searchDuas(query: string): Promise<any>;
    createCustomDua(createDuaDto: any): Promise<{
        success: boolean;
        message: string;
    }>;
    addFavorite(userId: string, duaId: string): Promise<any>;
    getFavorites(userId: string): Promise<any>;
    getDailyDua(): Promise<any>;
}
