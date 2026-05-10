import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../common/utils/prisma.service';
import { CreateJapaCounterDto } from '../dto/create-japa-counter.dto';
import { UpdateJapaCounterDto } from '../dto/update-japa-counter.dto';

@Injectable()
export class JapaCounterService {
  constructor(private prisma: PrismaService) {}

  async listCounters(userId: string) {
    return this.prisma.japaCounter.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCounter(userId: string, dto: CreateJapaCounterDto) {
    return this.prisma.japaCounter.create({
      data: {
        userId,
        name: dto.name,
        mantraSanskrit: dto.mantraSanskrit,
        mantraEnglish: dto.mantraEnglish,
        count: 0,
        targetCount: dto.targetCount,
        deityKey: dto.deityKey,
        isActive: true,
      },
    });
  }

  async updateCounter(userId: string, id: string, dto: UpdateJapaCounterDto) {
    const counter = await this.prisma.japaCounter.findUnique({ where: { id } });
    if (!counter || counter.userId !== userId) {
      throw new NotFoundException('Japa counter not found');
    }
    const updated = await this.prisma.japaCounter.update({
      where: { id },
      data: {
        ...(dto.count !== undefined ? { count: dto.count } : {}),
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.targetCount !== undefined ? { targetCount: dto.targetCount } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    // If the count was incremented, also write a JapaHistory row for streak/stats tracking
    if (dto.count !== undefined && dto.count > counter.count) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const incrementDelta = dto.count - counter.count;
      await this.prisma.japaHistory.create({
        data: {
          userId,
          mantra: counter.mantraSanskrit ?? counter.mantraEnglish ?? counter.name,
          count: incrementDelta,
          date: today,
        },
      });
    }

    return updated;
  }

  async deleteCounter(userId: string, id: string) {
    const counter = await this.prisma.japaCounter.findUnique({ where: { id } });
    if (!counter || counter.userId !== userId) {
      throw new NotFoundException('Japa counter not found');
    }
    await this.prisma.japaCounter.delete({ where: { id } });
    return { deleted: true };
  }
}
