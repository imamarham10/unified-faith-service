import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JuzController } from './juz.controller';
import { JuzService } from '../services/juz.service';
import { GetJuzQueryDto } from '../dto/juz.dto';
import { JUZ_LIMIT_MAX } from '../juz-boundaries';

/**
 * Controller-level specs for `docs/contracts/quran-juz-api.md` §2.
 *
 * The thing worth pinning here is the status code. The contract is explicit
 * that an out-of-range juz is a **400, not a 404** — "the resource class is
 * valid, the value isn't" — and that is exactly the distinction a careless
 * refactor to `NotFoundException` would erase without any test noticing.
 *
 * No database: `JuzService` is replaced by a stub, and the two files that
 * exercise its real behaviour (`juz.service.spec.ts`,
 * `juz-boundaries.spec.ts`) make no connection either.
 */

const query = (over: Partial<GetJuzQueryDto> = {}): GetJuzQueryDto =>
  Object.assign(new GetJuzQueryDto(), { page: 1, limit: 50 }, over);

async function makeController() {
  const service = { getJuzIndex: jest.fn(), getJuz: jest.fn() };
  const moduleRef = await Test.createTestingModule({
    controllers: [JuzController],
  })
    .useMocker((token) => (token === JuzService ? service : undefined))
    .compile();
  return { controller: moduleRef.get(JuzController), service };
}

describe('JuzController — :number validation (contract §2)', () => {
  it.each(['0', '31', '-1', 'abc', '', ' ', '1.5', '2x', '١٢', '1e1', 'null'])(
    'rejects %p with 400',
    async (bad) => {
      const { controller, service } = await makeController();
      await expect(controller.getJuz(bad, query())).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(service.getJuz).not.toHaveBeenCalled();
    },
  );

  it.each(['1', '15', '30'])(
    'accepts %p and passes it through as a number',
    async (good) => {
      const { controller, service } = await makeController();
      await controller.getJuz(good, query({ page: 2, limit: 100 }));
      expect(service.getJuz).toHaveBeenCalledWith(Number(good), {
        translationId: undefined,
        page: 2,
        limit: 100,
      });
    },
  );

  it('forwards translationId untouched', async () => {
    const { controller, service } = await makeController();
    await controller.getJuz('7', query({ translationId: 'Pickthall' }));
    expect(service.getJuz).toHaveBeenCalledWith(7, {
      translationId: 'Pickthall',
      page: 1,
      limit: 50,
    });
  });
});

describe('GetJuzQueryDto — pagination bounds (contract §2)', () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    transformOptions: { enableImplicitConversion: true },
  });
  const meta = { type: 'query' as const, metatype: GetJuzQueryDto };

  it('defaults to page 1, limit 50', async () => {
    const dto = await pipe.transform({}, meta);
    expect(dto).toMatchObject({ page: 1, limit: 50 });
    expect(dto.translationId).toBeUndefined();
  });

  it(`accepts limit up to ${JUZ_LIMIT_MAX}`, async () => {
    await expect(
      pipe.transform({ limit: String(JUZ_LIMIT_MAX) }, meta),
    ).resolves.toMatchObject({ limit: JUZ_LIMIT_MAX });
  });

  it('rejects a limit over the max rather than silently clamping it', async () => {
    // Silently returning 300 for a request of 500 would desync the client's
    // own pagination arithmetic and quietly drop verses.
    await expect(pipe.transform({ limit: '301' }, meta)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it.each(['0', '-1', 'abc', '1.5'])('rejects page %p', async (page) => {
    await expect(pipe.transform({ page }, meta)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
