import { Injectable, Logger } from '@nestjs/common';
import { HinduFestival } from '@prisma/client';
import { getDailyPanchang } from 'panchang-ts';
import { PrismaService } from '../../../../common/utils/prisma.service';
import { TithiRule, RuleSpec } from '../types/rule-spec';

export interface FestivalOccurrence {
  festival: HinduFestival;
  /** ISO date (YYYY-MM-DD) — UTC midnight of the matching civil day. */
  date: string;
}

/**
 * Resolves Hindu festivals against panchang state.
 *
 * v1 supports only `tithi`-type rules: a festival matches a date when the
 * tithi active at sunrise has the rule's (paksha, tithi-number) AND the
 * day's lunar month (chandramasa) matches the rule's month.
 *
 * The panchang-ts library exposes both:
 *   - `masa` — SOLAR masa (Mesha..Meena). NOT what we want.
 *   - `chandramasa` — lunar masa, with both `purnimantaName` (North Indian)
 *     and `amantaName` (South Indian) variants.
 *
 * Festival rules are authored against the purnimanta naming (which is also
 * the panchang-ts default), but we accept either system at match-time so
 * the resolver works regardless of how the library's masaSystem option is
 * later configured.
 */
@Injectable()
export class FestivalRuleService {
  private readonly logger = new Logger(FestivalRuleService.name);

  constructor(private prisma: PrismaService) {}

  async findFestivalsForDate(
    date: Date,
    lat: number,
    lng: number,
    timezone: string,
  ): Promise<HinduFestival[]> {
    const panchang = getDailyPanchang(
      date,
      { latitude: lat, longitude: lng },
      { timezone },
    );
    if (!panchang) return [];
    const festivals = await this.prisma.hinduFestival.findMany();
    return festivals.filter((f) =>
      this.matchesPanchang(f.ruleSpec as unknown as RuleSpec, panchang),
    );
  }

  async findUpcoming(
    fromDate: Date,
    days: number,
    lat: number,
    lng: number,
    timezone: string,
  ): Promise<FestivalOccurrence[]> {
    const festivals = await this.prisma.hinduFestival.findMany();
    const occurrences: FestivalOccurrence[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(fromDate);
      d.setUTCDate(d.getUTCDate() + i);
      const panchang = getDailyPanchang(
        d,
        { latitude: lat, longitude: lng },
        { timezone },
      );
      if (!panchang) continue;
      for (const f of festivals) {
        if (
          this.matchesPanchang(f.ruleSpec as unknown as RuleSpec, panchang)
        ) {
          occurrences.push({
            festival: f,
            date: d.toISOString().slice(0, 10),
          });
        }
      }
    }
    return occurrences;
  }

  private matchesPanchang(rule: RuleSpec, panchang: any): boolean {
    if (!rule || rule.type !== 'tithi') return false;
    return this.matchesTithi(rule, panchang);
  }

  private matchesTithi(rule: TithiRule, panchang: any): boolean {
    const activeTithi =
      panchang.tithis.find((t: any) => t.isActiveAtSunrise) ??
      panchang.tithis[0];
    if (!activeTithi) return false;

    const tithiPaksha = String(activeTithi.paksha).toLowerCase();
    if (tithiPaksha !== rule.paksha) return false;

    // Sentinel 30 = Amavasya (Krishna 15). Library reports paksha='Krishna'
    // and number=15 for the new-moon tithi.
    if (rule.tithi === 30) {
      if (activeTithi.number === 15 && tithiPaksha === 'krishna') {
        // fall through to month check
      } else if (/amavasya/i.test(activeTithi.name || '')) {
        // fall through to month check
      } else {
        return false;
      }
    } else if (activeTithi.number !== rule.tithi) {
      return false;
    }

    const panchangMonth = this.extractHinduMonth(panchang);
    if (!panchangMonth) {
      this.logger.warn(
        `Could not extract Hindu month from panchang result; festival in ${rule.month} skipped`,
      );
      return false;
    }
    return panchangMonth.toLowerCase() === rule.month;
  }

  /**
   * Extract the lunar month name from the panchang result.
   *
   * Our festival seed authors rules in the **purnimanta** convention
   * (North Indian — month boundary at Purnima / full moon), which is also
   * the panchang-ts default. We pin to `chandramasa.purnimantaName` so
   * rule matching is deterministic regardless of how the library's
   * `masaSystem` option may later be flipped at the calling site.
   *
   * Falls back to `chandramasa.name` if `purnimantaName` is absent.
   *
   * NOTE: `panchang.masa` is the SOLAR masa (Mesha/Vrishabha/...), not the
   * lunar month — do NOT use it here.
   */
  private extractHinduMonth(panchang: any): string | null {
    const cm = panchang?.chandramasa;
    if (!cm) return null;
    if (typeof cm.purnimantaName === 'string') return cm.purnimantaName;
    if (typeof cm.name === 'string') return cm.name;
    return null;
  }
}
