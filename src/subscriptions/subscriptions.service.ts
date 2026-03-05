import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/utils/prisma.service';
import { RazorpayService } from './razorpay.service';
import { TokenService } from '../auth-service/services/token.service';

@Injectable()
export class SubscriptionsService {
  constructor(
    private prisma: PrismaService,
    private razorpayService: RazorpayService,
    private configService: ConfigService,
    private tokenService: TokenService,
  ) {}

  async createSubscription(userId: string, plan: string) {
    // Check if user already has an active subscription
    const existing = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: ['created', 'authenticated', 'active'] } },
    });
    if (existing) {
      throw new BadRequestException('You already have an active subscription');
    }

    const planId = plan === 'yearly'
      ? this.configService.get<string>('RAZORPAY_PLAN_ID_YEARLY')
      : this.configService.get<string>('RAZORPAY_PLAN_ID_MONTHLY');

    if (!planId) {
      throw new BadRequestException('Subscription plan not configured');
    }

    const razorpaySub = await this.razorpayService.createSubscription(planId, userId);

    const subscription = await this.prisma.subscription.create({
      data: {
        userId,
        razorpaySubscriptionId: razorpaySub.id,
        razorpayPlanId: planId,
        plan,
        status: 'created',
      },
    });

    return { subscriptionId: razorpaySub.id, id: subscription.id };
  }

  async verifyAndActivate(
    userId: string,
    paymentId: string,
    subscriptionId: string,
    signature: string,
  ) {
    const isValid = this.razorpayService.verifyPaymentSignature(
      paymentId,
      subscriptionId,
      signature,
    );

    if (!isValid) {
      throw new BadRequestException('Invalid payment signature');
    }

    // Update subscription status
    await this.prisma.subscription.update({
      where: { razorpaySubscriptionId: subscriptionId },
      data: { status: 'active', currentPeriodStart: new Date() },
    });

    // Assign premium_user role
    await this.assignPremiumRole(userId);

    // Generate new tokens with updated roles
    const tokens = await this.generateNewTokens(userId);

    return { success: true, ...tokens };
  }

  async getSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: ['active', 'authenticated', 'created', 'pending'] } },
      orderBy: { createdAt: 'desc' },
    });
    return subscription;
  }

  async cancelSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: ['active', 'authenticated'] } },
    });

    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    await this.razorpayService.cancelSubscription(subscription.razorpaySubscriptionId);

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'cancelled', cancelledAt: new Date() },
    });

    // Revoke premium role
    await this.revokePremiumRole(userId);

    return { success: true };
  }

  async handleWebhookEvent(event: any) {
    const eventType = event.event;
    const subscriptionEntity = event.payload?.subscription?.entity;

    if (!subscriptionEntity) return;

    const razorpaySubId = subscriptionEntity.id;

    switch (eventType) {
      case 'subscription.activated': {
        const sub = await this.prisma.subscription.findUnique({
          where: { razorpaySubscriptionId: razorpaySubId },
        });
        if (sub) {
          await this.prisma.subscription.update({
            where: { id: sub.id },
            data: { status: 'active' },
          });
          await this.assignPremiumRole(sub.userId);
        }
        break;
      }

      case 'subscription.charged': {
        const sub = await this.prisma.subscription.findUnique({
          where: { razorpaySubscriptionId: razorpaySubId },
        });
        if (sub) {
          const currentEnd = subscriptionEntity.current_end
            ? new Date(subscriptionEntity.current_end * 1000)
            : undefined;
          await this.prisma.subscription.update({
            where: { id: sub.id },
            data: {
              status: 'active',
              currentPeriodEnd: currentEnd,
            },
          });
        }
        break;
      }

      case 'subscription.halted':
      case 'subscription.cancelled': {
        const sub = await this.prisma.subscription.findUnique({
          where: { razorpaySubscriptionId: razorpaySubId },
        });
        if (sub) {
          await this.prisma.subscription.update({
            where: { id: sub.id },
            data: {
              status: eventType === 'subscription.halted' ? 'halted' : 'cancelled',
              cancelledAt: eventType === 'subscription.cancelled' ? new Date() : undefined,
            },
          });
          await this.revokePremiumRole(sub.userId);
        }
        break;
      }

      case 'subscription.pending': {
        const sub = await this.prisma.subscription.findUnique({
          where: { razorpaySubscriptionId: razorpaySubId },
        });
        if (sub) {
          await this.prisma.subscription.update({
            where: { id: sub.id },
            data: { status: 'pending' },
          });
        }
        break;
      }
    }
  }

  private async assignPremiumRole(userId: string) {
    const premiumRole = await this.prisma.role.findUnique({
      where: { name: 'premium_user' },
    });
    if (!premiumRole) return;

    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId: premiumRole.id } },
      update: {},
      create: { userId, roleId: premiumRole.id, assignedBy: 'system' },
    });
  }

  private async revokePremiumRole(userId: string) {
    const premiumRole = await this.prisma.role.findUnique({
      where: { name: 'premium_user' },
    });
    if (!premiumRole) return;

    await this.prisma.userRole.deleteMany({
      where: { userId, roleId: premiumRole.id },
    });
  }

  private async generateNewTokens(userId: string) {
    // Fetch user with updated roles
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user) throw new NotFoundException('User not found');

    const roleNames = user.userRoles.map((ur) => ur.role.name);

    // Fetch permissions for roles
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleId: { in: user.userRoles.map((ur) => ur.roleId) } },
      include: { permission: true },
    });
    const permissions = [...new Set(rolePermissions.map((rp) => rp.permission.name))];

    // Generate real JWT tokens with updated roles
    const accessToken = await this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      roles: roleNames,
      permissions,
    });
    const refreshToken = await this.tokenService.generateRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: roleNames,
        permissions,
      },
    };
  }
}
