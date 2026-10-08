import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { prismaSchemaOptions } from '../src/common/utils/db-schema';
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const pool = new Pool({ 
  connectionString: databaseUrl?.replace('sslmode=require', ''),
  ssl: { rejectUnauthorized: false } 
});
const adapter = new PrismaPg(pool, prismaSchemaOptions());
const prisma = new PrismaClient({ adapter });

const islamicEvents = [
  // Muharram (Month 1)
  {
    name: 'Islamic New Year',
    nameArabic: 'رأس السنة الهجرية',
    description: 'The first day of the Islamic calendar year',
    hijriMonth: 1,
    hijriDay: 1,
    importance: 'major'
  },
  {
    name: 'Day of Ashura',
    nameArabic: 'يوم عاشوراء',
    description: 'Commemorates the day when Moses and the Israelites were saved from Pharaoh',
    hijriMonth: 1,
    hijriDay: 10,
    importance: 'major'
  },

  // Rabi' al-Awwal (Month 3)
  {
    name: 'Mawlid al-Nabi (Prophet\'s Birthday)',
    nameArabic: 'المولد النبوي',
    description: 'Celebration of the birth of Prophet Muhammad (peace be upon him)',
    hijriMonth: 3,
    hijriDay: 12,
    importance: 'major'
  },

  // Rajab (Month 7)
  {
    name: 'Isra and Mi\'raj',
    nameArabic: 'الإسراء والمعراج',
    description: 'The Night Journey and Ascension of Prophet Muhammad',
    hijriMonth: 7,
    hijriDay: 27,
    importance: 'major'
  },

  // Sha'ban (Month 8)
  {
    name: 'Laylat al-Bara\'ah (Night of Forgiveness)',
    nameArabic: 'ليلة البراءة',
    description: 'The night when Allah forgives sins',
    hijriMonth: 8,
    hijriDay: 15,
    importance: 'moderate'
  },

  // Ramadan (Month 9)
  {
    name: 'First Day of Ramadan',
    nameArabic: 'أول رمضان',
    description: 'Beginning of the holy month of fasting',
    hijriMonth: 9,
    hijriDay: 1,
    importance: 'major'
  },
  {
    name: 'Laylat al-Qadr (Night of Power)',
    nameArabic: 'ليلة القدر',
    description: 'The night when the Quran was first revealed, better than a thousand months',
    hijriMonth: 9,
    hijriDay: 27,
    importance: 'major'
  },

  // Shawwal (Month 10)
  {
    name: 'Eid al-Fitr',
    nameArabic: 'عيد الفطر',
    description: 'Festival of Breaking the Fast, marks the end of Ramadan',
    hijriMonth: 10,
    hijriDay: 1,
    importance: 'major'
  },

  // Dhu al-Hijjah (Month 12)
  {
    name: 'Day of Arafah',
    nameArabic: 'يوم عرفة',
    description: 'The day when pilgrims stand at the plain of Arafah during Hajj',
    hijriMonth: 12,
    hijriDay: 9,
    importance: 'major'
  },
  {
    name: 'Eid al-Adha',
    nameArabic: 'عيد الأضحى',
    description: 'Festival of Sacrifice, commemorates Prophet Ibrahim\'s willingness to sacrifice his son',
    hijriMonth: 12,
    hijriDay: 10,
    importance: 'major'
  },
  {
    name: 'Tashriq Days (Day 1)',
    nameArabic: 'أيام التشريق',
    description: 'Days of remembrance and celebration after Eid al-Adha',
    hijriMonth: 12,
    hijriDay: 11,
    importance: 'moderate'
  },
  {
    name: 'Tashriq Days (Day 2)',
    nameArabic: 'أيام التشريق',
    description: 'Days of remembrance and celebration after Eid al-Adha',
    hijriMonth: 12,
    hijriDay: 12,
    importance: 'moderate'
  },
  {
    name: 'Tashriq Days (Day 3)',
    nameArabic: 'أيام التشريق',
    description: 'Days of remembrance and celebration after Eid al-Adha',
    hijriMonth: 12,
    hijriDay: 13,
    importance: 'moderate'
  }
];

async function main() {
  console.log('🌙 Seeding Islamic Calendar Events...');

  for (const event of islamicEvents) {
    await prisma.islamicEvent.upsert({
      where: {
        // Create a unique constraint based on month, day, and name
        hijriMonth_hijriDay_name: {
          hijriMonth: event.hijriMonth,
          hijriDay: event.hijriDay,
          name: event.name
        }
      },
      update: {
        nameArabic: event.nameArabic,
        description: event.description,
        importance: event.importance
      },
      create: event
    });
  }

  console.log(`✅ Seeded ${islamicEvents.length} Islamic events`);
  console.log('🎉 Islamic Calendar Events seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
