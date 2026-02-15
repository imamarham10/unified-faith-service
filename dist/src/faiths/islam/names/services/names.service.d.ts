import { PrismaService } from '../../../../common/utils/prisma.service';
export declare class NamesService {
    private prisma;
    constructor(prisma: PrismaService);
    getAllNames(): Promise<any[]>;
    getName(id: number): Promise<any>;
    addFavorite(favoriteDto: any): Promise<{
        success: boolean;
    }>;
    getDailyName(): Promise<any>;
}
