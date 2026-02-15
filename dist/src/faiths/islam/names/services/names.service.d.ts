import { PrismaService } from '../../../../common/utils/prisma.service';
export declare class NamesService {
    private prisma;
    constructor(prisma: PrismaService);
    getAllNames(): Promise<any>;
    getName(id: number): Promise<any>;
    addFavorite(userId: string, nameId: number): Promise<any>;
    getDailyName(): Promise<any>;
}
