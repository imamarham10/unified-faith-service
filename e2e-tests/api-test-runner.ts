// ANSI color codes
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

interface TestResult {
  name: string;
  suite: string;
  passed: boolean;
  error?: string;
  duration: number;
}

interface TestSuite {
  name: string;
  tests: Array<{ name: string; fn: () => Promise<void> }>;
  beforeAll?: () => Promise<void>;
  afterAll?: () => Promise<void>;
  beforeEach?: () => Promise<void>;
  afterEach?: () => Promise<void>;
}

const suites: TestSuite[] = [];
let currentSuite: TestSuite | null = null;

export function describe(name: string, fn: () => void): void {
  currentSuite = { name, tests: [] };
  fn();
  suites.push(currentSuite);
  currentSuite = null;
}

export function it(name: string, fn: () => Promise<void>): void {
  if (!currentSuite) throw new Error('it() must be called inside describe()');
  currentSuite.tests.push({ name, fn });
}

export function beforeAll(fn: () => Promise<void>): void {
  if (!currentSuite) throw new Error('beforeAll() must be called inside describe()');
  currentSuite.beforeAll = fn;
}

export function afterAll(fn: () => Promise<void>): void {
  if (!currentSuite) throw new Error('afterAll() must be called inside describe()');
  currentSuite.afterAll = fn;
}

export function beforeEach(fn: () => Promise<void>): void {
  if (!currentSuite) throw new Error('beforeEach() must be called inside describe()');
  currentSuite.beforeEach = fn;
}

export function afterEach(fn: () => Promise<void>): void {
  if (!currentSuite) throw new Error('afterEach() must be called inside describe()');
  currentSuite.afterEach = fn;
}

async function runAllTests(): Promise<void> {
  console.log(`\n${BOLD}${CYAN}========================================${RESET}`);
  console.log(`${BOLD}${CYAN}  Faith Backend API Test Suite${RESET}`);
  console.log(`${BOLD}${CYAN}========================================${RESET}\n`);

  const testFiles = [
    './auth.api.test',
    './prayers.api.test',
    './quran.api.test',
    './dhikr.api.test',
    './calendar.api.test',
    './names.api.test',
    './feelings.api.test',
    './duas.api.test',
    './settings.api.test',
  ];

  console.log(`${CYAN}Loading test files...${RESET}`);
  for (const file of testFiles) {
    try {
      require(file);
      console.log(`  ${GREEN}✓${RESET} ${file}`);
    } catch (err: any) {
      console.log(`  ${RED}✗${RESET} ${file} — ${err.message}`);
    }
  }

  const results: TestResult[] = [];
  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  for (const suite of suites) {
    console.log(`\n${BOLD}  ${suite.name}${RESET}`);

    if (suite.beforeAll) {
      try {
        await suite.beforeAll();
      } catch (err: any) {
        console.log(`    ${RED}beforeAll failed: ${err.message}${RESET}`);
        suite.tests.forEach((t) => {
          totalSkipped++;
          console.log(`    ${YELLOW}○ SKIP${RESET} ${t.name}`);
        });
        if (suite.afterAll) await suite.afterAll().catch(() => {});
        continue;
      }
    }

    for (const test of suite.tests) {
      if (suite.beforeEach) {
        try { await suite.beforeEach(); } catch (err: any) {
          console.log(`    ${YELLOW}○ SKIP${RESET} ${test.name} (beforeEach failed)`);
          totalSkipped++;
          continue;
        }
      }

      const start = Date.now();
      try {
        await test.fn();
        const duration = Date.now() - start;
        totalPassed++;
        results.push({ name: test.name, suite: suite.name, passed: true, duration });
        console.log(`    ${GREEN}✓ PASS${RESET} ${test.name} ${CYAN}(${duration}ms)${RESET}`);
      } catch (err: any) {
        const duration = Date.now() - start;
        totalFailed++;
        results.push({ name: test.name, suite: suite.name, passed: false, error: err.message, duration });
        console.log(`    ${RED}✗ FAIL${RESET} ${test.name} ${CYAN}(${duration}ms)${RESET}`);
        console.log(`           ${RED}${err.message}${RESET}`);
      }

      if (suite.afterEach) {
        await suite.afterEach().catch(() => {});
      }
    }

    if (suite.afterAll) {
      await suite.afterAll().catch(() => {});
    }
  }

  // Summary
  console.log(`\n${BOLD}${CYAN}========================================${RESET}`);
  console.log(`${BOLD}  API Test Results${RESET}`);
  console.log(`${CYAN}========================================${RESET}`);
  console.log(`  ${GREEN}Passed:  ${totalPassed}${RESET}`);
  console.log(`  ${RED}Failed:  ${totalFailed}${RESET}`);
  if (totalSkipped > 0) console.log(`  ${YELLOW}Skipped: ${totalSkipped}${RESET}`);
  console.log(`  Total:   ${totalPassed + totalFailed + totalSkipped}`);
  console.log(`${CYAN}========================================${RESET}\n`);

  if (totalFailed > 0) {
    console.log(`${BOLD}${RED}Failed Tests:${RESET}`);
    results.filter((r) => !r.passed).forEach((r) => {
      console.log(`  ${RED}✗${RESET} [${r.suite}] ${r.name}`);
      console.log(`    ${RED}${r.error}${RESET}`);
    });
    console.log('');
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error(`${RED}Fatal error:${RESET}`, err);
  process.exit(1);
});
