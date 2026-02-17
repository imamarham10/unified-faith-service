import { PrismaService } from '../../../../common/utils/prisma.service';
export declare class NamesService {
    private prisma;
    constructor(prisma: PrismaService);
    getAllNames(): Promise<any>;
    getName(id: number): Promise<any>;
    addFavorite(userId: string, nameId: number): Promise<any>;
    getDailyName(): Promise<any>;
    getAllMuhammadNames(): Promise<any>;
    getMuhammadName(id: number): Promise<any>;
    addMuhammadFavorite(userId: string, nameId: number): Promise<any>;
    getDailyMuhammadName(): Promise<any>;
    getUserMuhammadFavorites(userId: string): Promise<any>;
}
