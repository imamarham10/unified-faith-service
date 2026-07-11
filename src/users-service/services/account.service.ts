import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/utils/prisma.service';

@Injectable()
export class AccountService {
  constructor(private prisma: PrismaService) {}

  /**
   * Permanently delete a user account and every row of user-owned data.
   *
   * Hard delete (not the soft-delete `deletedAt` flag): both Google Play's
   * Account Deletion policy and Apple Guideline 5.1.1(v) require that user
   * data is actually removed. Children are deleted explicitly inside one
   * transaction because the schema does not declare onDelete cascades.
   */
  async deleteAccount(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const p = this.prisma as any;
    await this.prisma.$transaction([
      // Auth & session
      p.refreshToken.deleteMany({ where: { userId } }),
      p.userRole.deleteMany({ where: { userId } }),
      p.otpCode.deleteMany({
        where: { identifier: { in: [user.email, user.phone].filter(Boolean) } },
      }),
      // Profile & device
      p.userProfile.deleteMany({ where: { userId } }),
      p.userPreference.deleteMany({ where: { userId } }),
      p.deviceToken.deleteMany({ where: { userId } }),
      p.userLocation.deleteMany({ where: { userId } }),
      // Islam features
      p.prayerLog.deleteMany({ where: { userId } }),
      p.prayerQadaCount.deleteMany({ where: { userId } }),
      p.userQuranBookmark.deleteMany({ where: { userId } }),
      p.userQuranProgress.deleteMany({ where: { userId } }),
      p.dhikrCounter.deleteMany({ where: { userId } }),
      p.dhikrGoal.deleteMany({ where: { userId } }),
      p.dhikrHistory.deleteMany({ where: { userId } }),
      p.userCustomDua.deleteMany({ where: { userId } }),
      p.userFavoriteDua.deleteMany({ where: { userId } }),
      p.userFavoriteHadith.deleteMany({ where: { userId } }),
      p.userFavoriteAllahName.deleteMany({ where: { userId } }),
      p.userFavoriteMuhammadName.deleteMany({ where: { userId } }),
      // Hindu features
      p.userFavoriteDeityName.deleteMany({ where: { userId } }),
      p.hinduScriptureBookmark.deleteMany({ where: { userId } }),
      p.japaCounter.deleteMany({ where: { userId } }),
      p.japaGoal.deleteMany({ where: { userId } }),
      p.japaHistory.deleteMany({ where: { userId } }),
      p.pujaLog.deleteMany({ where: { userId } }),
      p.userFavoriteStotra.deleteMany({ where: { userId } }),
      p.userFavoriteTemple.deleteMany({ where: { userId } }),
      p.userFavoriteHinduStory.deleteMany({ where: { userId } }),
      // Billing records (payment history lives in Razorpay's ledger)
      p.subscription.deleteMany({ where: { userId } }),
      // Finally, the account itself
      p.user.delete({ where: { id: userId } }),
    ]);

    return { success: true, message: 'Account and all associated data permanently deleted' };
  }
}
