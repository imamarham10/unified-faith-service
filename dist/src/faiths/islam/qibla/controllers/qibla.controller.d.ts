import { QiblaService } from '../services/qibla.service';
import { GetQiblaDto } from '../dto/qibla.dto';
export declare class QiblaController {
    private readonly qiblaService;
    constructor(qiblaService: QiblaService);
    getQiblaDirection(query: GetQiblaDto): Promise<{
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
}
