import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/utils/prisma.service';

@Injectable()
export class NamesService {
  constructor(private prisma: PrismaService) {}

  async getAllNames() {
    // TODO: Fetch all 99 names of Allah
    return [];
  }

  async getName(id: number) {
    // TODO: Fetch specific name
    return null;
  }

  async addFavorite(favoriteDto: any) {
    // TODO: Add name to favorites
    return { success: true };
  }

  async getDailyName() {
    // TODO: Get daily name of Allah
    return null;
  }
}
