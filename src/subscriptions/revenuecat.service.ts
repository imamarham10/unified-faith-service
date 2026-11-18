import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { PrismaService } from '../common/utils/prisma.service';

/**
 * A RevenueCat webhook event, narrowed to the fields we act on.
 *
 * RevenueCat sends many more; everything not listed here is deliberately
 * ignored rather than mapped, so a new event type cannot change a
 * subscription by accident.
 */
export interface RevenueCatEvent {
  type: string;
  app_user_id?: string;
  original_app_user_id?: string;
  product_id?: string;
  store?: string;
  period_type?: string;
  expiration_at_ms?: number;
  purchased_at_ms?: number;
  environment?: string;
}

@Injectable()
export class RevenueCatService {
  private readonly logger = new Logger(RevenueCatService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Whether this request really came from RevenueCat.
   *
   * RevenueCat lets you set an Authorization header in its dashboard and
   * sends it with every POST; checking it is the documented way to
   * authenticate the webhook. The comparison is constant-time, because a
   * byte-by-byte early return leaks the secret to anyone willing to time
   * enough requests.
   *
   * Returns false when no secret is configured. That is deliberate: an
   * unconfigured deployment refuses webhooks rather than accepting every
   * one of them. The alternative — treating "no secret set" as "allow" —
   * means anyone who learns the URL can post themselves a subscription,
   * and it is the kind of default that survives into production because
   * nothing visibly breaks.
   */
  verifyWebhookAuth(header: string | undefined): boolean {
    const expected = this.config.get<string>('REVENUECAT_WEBHOOK_AUTH');
    if (!expected) {
      this.logger.error(
        'REVENUECAT_WEBHOOK_AUTH is not set — refusing the webhook. ' +
          'Set it here and in the RevenueCat dashboard.',
      );
      return false;
    }
    if (!header) return false;

    const a = Buffer.from(header);
    const b = Buffer.from(expected);
    // timingSafeEqual throws on a length mismatch, which is itself a leak of
    // the secret's length if allowed to propagate as a different outcome.
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }

  /**
   * Apply an event to the user's subscription.
   *
   * Returns the user id whose entitlement changed, or null when the event is
   * one we do not act on — the caller grants or revokes the premium role from
   * that.
   */
  async apply(event: RevenueCatEvent): Promise<{
    userId: string;
    active: boolean;
  } | null> {
    // `app_user_id` is our own User.id: the app calls Purchases.logIn with it
    // at sign-in, which is the only thing tying a store purchase to an
    // account. `original_app_user_id` is the anonymous id from before that
    // call and is not ours to trust as a key.
    const userId = event.app_user_id;
    if (!userId) {
      this.logger.warn(`RevenueCat ${event.type} with no app_user_id — ignored`);
      return null;
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      this.logger.warn(`RevenueCat ${event.type} for unknown user ${userId}`);
      return null;
    }

    const GRANTS = [
      'INITIAL_PURCHASE',
      'RENEWAL',
      'UNCANCELLATION',
      'SUBSCRIPTION_EXTENDED',
      'PRODUCT_CHANGE',
    ];
    // CANCELLATION is NOT here on purpose: a cancelled subscription keeps its
    // entitlement until the period it was paid for runs out, and RevenueCat
    // sends EXPIRATION when that happens. Revoking on CANCELLATION would take
    // away a month somebody has already paid for.
    const REVOKES = ['EXPIRATION', 'BILLING_ISSUE'];

    const grants = GRANTS.includes(event.type);
    const revokes = REVOKES.includes(event.type);
    if (!grants && !revokes) {
      this.logger.log(`RevenueCat ${event.type} — not an entitlement change`);
      return null;
    }

    const expiresAt = event.expiration_at_ms
      ? new Date(event.expiration_at_ms)
      : null;

    // A store subscription is one row per user per provider, rewritten as
    // events arrive, rather than one row per event — the entitlement is a
    // current state, not a ledger.
    const existing = await this.prisma.subscription.findFirst({
      where: { userId, provider: 'revenuecat' },
    });

    const data = {
      provider: 'revenuecat',
      revenueCatUserId: userId,
      storeProductId: event.product_id ?? null,
      store: event.store ?? null,
      plan: this.planFor(event.product_id),
      status: grants ? 'active' : 'expired',
      currentPeriodStart: event.purchased_at_ms
        ? new Date(event.purchased_at_ms)
        : null,
      currentPeriodEnd: expiresAt,
      cancelledAt: revokes ? new Date() : null,
    };

    if (existing) {
      await this.prisma.subscription.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await this.prisma.subscription.create({ data: { ...data, userId } });
    }

    this.logger.log(
      `RevenueCat ${event.type}: user ${userId} is now ${data.status}`,
    );
    return { userId, active: grants };
  }

  /**
   * Which plan a store product is.
   *
   * The product ids are set in Play Console and App Store Connect, so this
   * matches on what they contain rather than on an exact string — renaming a
   * product in the console should not silently file every purchase as
   * monthly.
   */
  private planFor(productId?: string): string {
    const id = (productId ?? '').toLowerCase();
    if (id.includes('year') || id.includes('annual')) return 'yearly';
    if (id.includes('month')) return 'monthly';
    this.logger.warn(
      `Store product "${productId}" names no period — recording it as monthly`,
    );
    return 'monthly';
  }
}
