import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JuzService } from '../services/juz.service';
import { GetJuzQueryDto } from '../dto/juz.dto';
import { JUZ_MAX, JUZ_MIN } from '../juz-boundaries';
import { JwtAuthGuard } from '../../../../auth-service/guards/jwt-auth.guard';
import { Public } from '../../../../auth-service/decorators/public.decorator';

/**
 * Juz reading — `docs/contracts/quran-juz-api.md`.
 *
 * Shares the `api/v1/islam/quran` prefix with `QuranController` rather than
 * being added to it: the juz routes are new surface on a frozen contract and
 * the existing Qur'an endpoints are not to be touched. Nest resolves the two
 * independently and `juz` / `juz/:number` collide with nothing there.
 */
@Controller('api/v1/islam/quran')
@UseGuards(JwtAuthGuard)
export class JuzController {
  constructor(private readonly juzService: JuzService) {}

  /** §1 — the chooser. Exactly 30 entries, ascending, no parameters. */
  @Public()
  @Get('juz')
  async getJuzIndex() {
    return this.juzService.getJuzIndex();
  }

  /**
   * §2 — the reader.
   *
   * The `:number` check lives here rather than in a DTO because the contract
   * is specific about it: out of range is a `400`, *not* a `404`. Parsing it
   * by hand also matches how `QuranController` handles `surah/:id`.
   */
  @Public()
  @Get('juz/:number')
  async getJuz(
    @Param('number') number: string,
    @Query() query: GetJuzQueryDto,
  ) {
    // `Number('')` is 0 and `Number('2x')` is NaN; both must fail, and
    // `parseInt('2x')` would wrongly accept the second.
    const juzNumber = /^\d+$/.test(number?.trim() ?? '') ? Number(number) : NaN;
    if (
      !Number.isInteger(juzNumber) ||
      juzNumber < JUZ_MIN ||
      juzNumber > JUZ_MAX
    ) {
      throw new BadRequestException(
        `Juz number must be an integer between ${JUZ_MIN} and ${JUZ_MAX}`,
      );
    }

    return this.juzService.getJuz(juzNumber, {
      translationId: query.translationId,
      page: query.page,
      limit: query.limit,
    });
  }
}
