import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  JUZ_LIMIT_DEFAULT,
  JUZ_LIMIT_MAX,
  JUZ_PAGE_DEFAULT,
} from '../juz-boundaries';

/**
 * Query DTO for `GET /api/v1/islam/quran/juz/:number`.
 *
 * Frozen contract: `docs/contracts/quran-juz-api.md` §2. Where this and the
 * contract disagree, the contract is right and this is the bug.
 *
 * `number` itself is *not* here: the contract requires an out-of-range juz to
 * be a `400` naming the range, and a route-param DTO would surface it as a
 * generic validation error, so the controller parses and checks it explicitly.
 */
export class GetJuzQueryDto {
  /**
   * §2 — "same semantics as `GET /surah/:id`", defaulting to the app default.
   *
   * CONTRACT DEFECT (reported, implemented as the nearest real thing): this
   * schema has no translation-edition identifier. `QuranTranslation.id` is a
   * per-verse row uuid — there are 6,236 of them per edition — and
   * `GET /translations` returns `{ authorName, isPremium }` with no id at all.
   * `GET /surah/:id`, which the contract points at, selects by `lang`, not by
   * any id. The only edition identity the API exposes anywhere is
   * `authorName`, so that is what this accepts: the value a client reads out
   * of `GET /translations`.
   */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  translationId?: string;

  /** §2 — 1-based. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = JUZ_PAGE_DEFAULT;

  /**
   * §2 — default 50, max 300. Over the max is a `400` rather than a silent
   * clamp: a client asking for 500 and receiving 300 without being told would
   * quietly drop verses off the end of its own pagination arithmetic.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(JUZ_LIMIT_MAX)
  limit: number = JUZ_LIMIT_DEFAULT;
}
