import { Injectable } from '@nestjs/common';
import { Test } from '@nestjs/testing';

/**
 * Smoke test for the Jest harness itself: proves ts-jest compiles TypeScript,
 * that `emitDecoratorMetadata` survives the transform (NestJS constructor
 * injection depends on it), and that async specs resolve. These classes are
 * deliberately local to this file -- no application code is under test here.
 */
@Injectable()
class Dependency {
  value(): string {
    return 'injected';
  }
}

@Injectable()
class Consumer {
  constructor(readonly dependency: Dependency) {}
}

describe('jest harness', () => {
  it('resolves NestJS constructor injection in an async spec', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [Consumer, Dependency],
    }).compile();

    const consumer = moduleRef.get(Consumer);

    expect(consumer).toBeInstanceOf(Consumer);
    expect(consumer.dependency).toBeInstanceOf(Dependency);
    expect(consumer.dependency.value()).toBe('injected');
  });
});
