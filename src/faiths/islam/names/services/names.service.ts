import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/utils/prisma.service';

@Injectable()
export class NamesService {
  constructor(private prisma: PrismaService) {}

  async getAllNames() {
    return (this.prisma as any).allahName.findMany({
      orderBy: {
        id: 'asc',
      },
    });
  }

  async getName(id: number) {
    const name = await (this.prisma as any).allahName.findUnique({
      where: { id },
    });

    if (!name) {
      throw new Error(`Name with ID ${id} not found`);
    }

    return name;
  }

  async addFavorite(userId: string, nameId: number) {
    // Check if name exists
    const name = await this.getName(nameId);

    // Create favorite
    return (this.prisma as any).userFavoriteAllahName.create({
      data: {
        userId,
        nameId,
      },
    });
  }

  async getDailyName() {
    const today = new Date();
    const start = new Date(today.getFullYear(), 0, 0);
    const diff = today.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    
    // There are 99 names, so we cycle through them
    // ID starts from 1
    const id = (dayOfYear % 99) + 1;
    
    return this.getName(id);
  }
}
