import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Disable SSL verification for Aiven self-signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl.replace('sslmode=require', ''),
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Events to seed
// ---------------------------------------------------------------------------
const MAJOR_EVENTS = [
  { hijriMonth: 1,  hijriDay: 1,  name: 'Islamic New Year',              nameArabic: 'رأس السنة الهجرية',        description: 'First day of Muharram - start of the Islamic lunar year', importance: 'moderate' },
  { hijriMonth: 1,  hijriDay: 10, name: 'Day of Ashura',                  nameArabic: 'يوم عاشوراء',              description: 'Day of fasting and remembrance',                          importance: 'moderate' },
  { hijriMonth: 3,  hijriDay: 12, name: 'Mawlid an-Nabi',                 nameArabic: 'المولد النبوي',            description: 'Birthday of Prophet Muhammad (PBUH)',                    importance: 'moderate' },
  { hijriMonth: 7,  hijriDay: 27, name: "Isra and Mi'raj",                nameArabic: 'الإسراء والمعراج',         description: 'Night Journey and Ascension of the Prophet',              importance: 'moderate' },
  { hijriMonth: 8,  hijriDay: 15, name: "Mid-Sha'ban",                    nameArabic: 'ليلة النصف من شعبان',     description: "Night of mid-Sha'ban",                                    importance: 'minor'    },
  { hijriMonth: 9,  hijriDay: 1,  name: 'Ramadan Begins',                 nameArabic: 'رمضان',                    description: 'The holy month of fasting',                               importance: 'major'    },
  { hijriMonth: 9,  hijriDay: 27, name: 'Laylat al-Qadr (Night of Power)', nameArabic: 'ليلة القدر',             description: 'The night when the Quran was first revealed',              importance: 'major'    },
  { hijriMonth: 10, hijriDay: 1,  name: 'Eid al-Fitr',                    nameArabic: 'عيد الفطر',               description: 'Festival of Breaking the Fast',                           importance: 'major'    },
  { hijriMonth: 12, hijriDay: 9,  name: 'Day of Arafah',                  nameArabic: 'يوم عرفة',                description: 'The second day of Hajj pilgrimage',                       importance: 'major'    },
  { hijriMonth: 12, hijriDay: 10, name: 'Eid al-Adha',                    nameArabic: 'عيد الأضحى',              description: 'Festival of Sacrifice',                                   importance: 'major'    },
];

// ---------------------------------------------------------------------------
// Aladhan helper: convert Hijri → Gregorian
// ---------------------------------------------------------------------------
async function hijriToGregorian(
  day: number,
  month: number,
  year: number,
): Promise<string> {
  const url = `https://api.aladhan.com/v1/hToG/${day}-${month}-${year}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return `[HTTP ${res.status}]`;
    }
    const json = (await res.json()) as any;
    if (json?.code === 200 && json?.data?.gregorian) {
      const g = json.data.gregorian;
      return `${g.day} ${g.month.en} ${g.year}`;
    }
    return '[unknown]';
  } catch (err) {
    return `[fetch error: ${(err as Error).message}]`;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('='.repeat(70));
  console.log('Seeding Islamic Events from Aladhan API');
  console.log('='.repeat(70));

  const hijriYears = [1447, 1448];
  let upserted = 0;
  let errors = 0;

  for (const hijriYear of hijriYears) {
    console.log(`\n--- Hijri Year ${hijriYear} ---`);

    for (const event of MAJOR_EVENTS) {
      const { hijriMonth, hijriDay, name, nameArabic, description, importance } = event;

      // Fetch Gregorian date from Aladhan for confirmation/logging
      const gregorianDate = await hijriToGregorian(hijriDay, hijriMonth, hijriYear);

      console.log(
        `  [${hijriYear}] ${String(hijriMonth).padStart(2, '0')}/${String(hijriDay).padStart(2, '0')} | ${name.padEnd(38)} | Gregorian: ${gregorianDate}`,
      );

      // Upsert into the database (keyed by hijriMonth + hijriDay + name, year-agnostic)
      try {
        await prisma.islamicEvent.upsert({
          where: {
            hijriMonth_hijriDay_name: { hijriMonth, hijriDay, name },
          },
          update: {
            nameArabic,
            description,
            importance,
          },
          create: {
            name,
            nameArabic,
            description,
            hijriMonth,
            hijriDay,
            importance,
          },
        });
        upserted++;
      } catch (err) {
        console.error(`    ERROR upserting "${name}":`, (err as Error).message);
        errors++;
      }

      // Small delay to be polite to the Aladhan API
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`Done. ${upserted} upserts completed, ${errors} errors.`);
  console.log('='.repeat(70));
}

main()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
