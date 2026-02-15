import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/utils/prisma.service';
import { Coordinates, Qibla } from 'adhan';

@Injectable()
export class QiblaService {
  constructor(private prisma: PrismaService) {}

  async getQiblaDirection(lat: number, lng: number) {
    const kaabaLat = 21.4225;
    const kaabaLng = 39.8262;

    const coordinates = new Coordinates(lat, lng);
    const direction = Qibla(coordinates);
    const distance = this.calculateDistance(lat, lng, kaabaLat, kaabaLng);

    return {
      direction: direction,
      distance: Math.round(distance), // in km
      unit: 'km',
      location: { lat, lng },
      kaaba: { lat: kaabaLat, lng: kaabaLng }
    };
  }

  async calculateQibla(calculateDto: any) {
    const { lat, lng } = calculateDto;
    return this.getQiblaDirection(lat, lng);
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
      const R = 6371; // Radius of the earth in km
      const dLat = this.deg2rad(lat2 - lat1);
      const dLon = this.deg2rad(lon2 - lon1);
      const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const d = R * c; // Distance in km
      return d;
  }

  private deg2rad(deg: number): number {
      return deg * (Math.PI / 180);
  }
}
