import { PrismaService } from '../../../../common/utils/prisma.service';
export declare class QiblaService {
    private prisma;
    constructor(prisma: PrismaService);
    getQiblaDirection(lat: number, lng: number): Promise<{
        direction: number;
        distance: number;
        unit: string;
        location: {
            lat: number;
            lng: number;
        };
        kaaba: {
            lat: number;
            lng: number;
        };
    }>;
    calculateQibla(calculateDto: any): Promise<{
        direction: number;
        distance: number;
        unit: string;
        location: {
            lat: number;
            lng: number;
        };
        kaaba: {
            lat: number;
            lng: number;
        };
    }>;
    private calculateDistance;
    private deg2rad;
}
