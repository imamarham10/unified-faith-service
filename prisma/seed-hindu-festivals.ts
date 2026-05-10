import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// ── Database setup (mirrors seed-hadiths.ts for Aiven self-signed certs) ─
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

// ── Types ───────────────────────────────────────────────────────────────
interface FestivalSeed {
  slug: string;
  nameEnglish: string;
  nameSanskrit?: string;
  nameHindi?: string;
  ruleSpec: {
    type: 'tithi';
    month: string;
    paksha: 'shukla' | 'krishna';
    tithi: number;
  };
  deityKey?: string;
  regions: string[];
  description: string;
}

// ── Seed data — 25 major Hindu tithi-based festivals (purnimanta) ──────
const FESTIVALS: FestivalSeed[] = [
  {
    slug: 'dhanteras',
    nameEnglish: 'Dhanteras',
    nameSanskrit: 'धनत्रयोदशी',
    nameHindi: 'धनतेरस',
    ruleSpec: { type: 'tithi', month: 'kartika', paksha: 'krishna', tithi: 13 },
    deityKey: 'lakshmi',
    regions: ['pan-india'],
    description:
      'First day of Diwali festivities; worship of Dhanvantari and Lakshmi.',
  },
  {
    slug: 'naraka-chaturdashi',
    nameEnglish: 'Naraka Chaturdashi',
    nameSanskrit: 'नरक चतुर्दशी',
    nameHindi: 'नरक चतुर्दशी',
    ruleSpec: { type: 'tithi', month: 'kartika', paksha: 'krishna', tithi: 14 },
    deityKey: 'krishna',
    regions: ['pan-india'],
    description:
      'Choti Diwali; commemorates Krishna defeating Narakasura.',
  },
  {
    slug: 'diwali',
    nameEnglish: 'Diwali',
    nameSanskrit: 'दीपावली',
    nameHindi: 'दिवाली',
    ruleSpec: { type: 'tithi', month: 'kartika', paksha: 'krishna', tithi: 30 },
    deityKey: 'lakshmi',
    regions: ['pan-india'],
    description:
      'Festival of lights — Lakshmi puja on Kartika Amavasya.',
  },
  {
    slug: 'govardhan-puja',
    nameEnglish: 'Govardhan Puja',
    nameSanskrit: 'गोवर्धन पूजा',
    nameHindi: 'गोवर्धन पूजा',
    ruleSpec: { type: 'tithi', month: 'kartika', paksha: 'shukla', tithi: 1 },
    deityKey: 'krishna',
    regions: ['north', 'pan-india'],
    description:
      'Worship of Krishna and Govardhan Hill, day after Diwali.',
  },
  {
    slug: 'bhai-dooj',
    nameEnglish: 'Bhai Dooj',
    nameSanskrit: 'भ्रातृ द्वितीया',
    nameHindi: 'भाई दूज',
    ruleSpec: { type: 'tithi', month: 'kartika', paksha: 'shukla', tithi: 2 },
    regions: ['north', 'pan-india'],
    description: 'Sisters honor brothers; second day after Diwali.',
  },
  {
    slug: 'kartika-purnima',
    nameEnglish: 'Kartika Purnima',
    nameSanskrit: 'कार्तिक पूर्णिमा',
    nameHindi: 'कार्तिक पूर्णिमा',
    ruleSpec: { type: 'tithi', month: 'kartika', paksha: 'shukla', tithi: 15 },
    regions: ['pan-india'],
    description:
      'Sacred full-moon day; commemorates Shiva and the demon Tripurasura.',
  },
  {
    slug: 'navratri-start',
    nameEnglish: 'Sharad Navratri (begins)',
    nameSanskrit: 'शरद नवरात्रि',
    nameHindi: 'शरद नवरात्रि',
    ruleSpec: { type: 'tithi', month: 'ashwin', paksha: 'shukla', tithi: 1 },
    deityKey: 'devi',
    regions: ['pan-india'],
    description: 'Nine-night festival of Devi worship begins.',
  },
  {
    slug: 'durga-ashtami',
    nameEnglish: 'Durga Ashtami',
    nameSanskrit: 'दुर्गा अष्टमी',
    nameHindi: 'दुर्गा अष्टमी',
    ruleSpec: { type: 'tithi', month: 'ashwin', paksha: 'shukla', tithi: 8 },
    deityKey: 'devi',
    regions: ['pan-india'],
    description: 'Eighth day of Sharad Navratri; major Devi worship.',
  },
  {
    slug: 'dussehra',
    nameEnglish: 'Dussehra (Vijayadashami)',
    nameSanskrit: 'विजयादशमी',
    nameHindi: 'दशहरा',
    ruleSpec: { type: 'tithi', month: 'ashwin', paksha: 'shukla', tithi: 10 },
    deityKey: 'rama',
    regions: ['pan-india'],
    description: 'Victory of Rama over Ravana; concludes Navratri.',
  },
  {
    slug: 'krishna-janmashtami',
    nameEnglish: 'Krishna Janmashtami',
    nameSanskrit: 'कृष्ण जन्माष्टमी',
    nameHindi: 'कृष्ण जन्माष्टमी',
    ruleSpec: {
      type: 'tithi',
      month: 'bhadrapada',
      paksha: 'krishna',
      tithi: 8,
    },
    deityKey: 'krishna',
    regions: ['pan-india'],
    description: 'Birth of Lord Krishna.',
  },
  {
    slug: 'maha-shivaratri',
    nameEnglish: 'Maha Shivaratri',
    nameSanskrit: 'महाशिवरात्रि',
    nameHindi: 'महाशिवरात्रि',
    ruleSpec: {
      type: 'tithi',
      month: 'phalguna',
      paksha: 'krishna',
      tithi: 14,
    },
    deityKey: 'shiva',
    regions: ['pan-india'],
    description:
      'Great night of Shiva; observed with fasting and night-long worship.',
  },
  {
    slug: 'ganesh-chaturthi',
    nameEnglish: 'Ganesh Chaturthi',
    nameSanskrit: 'गणेश चतुर्थी',
    nameHindi: 'गणेश चतुर्थी',
    ruleSpec: {
      type: 'tithi',
      month: 'bhadrapada',
      paksha: 'shukla',
      tithi: 4,
    },
    deityKey: 'ganesha',
    regions: ['pan-india', 'maharashtra'],
    description: 'Birth of Lord Ganesha; ten-day festival.',
  },
  {
    slug: 'hanuman-jayanti',
    nameEnglish: 'Hanuman Jayanti',
    nameSanskrit: 'हनुमान जयन्ती',
    nameHindi: 'हनुमान जयंती',
    ruleSpec: { type: 'tithi', month: 'chaitra', paksha: 'shukla', tithi: 15 },
    deityKey: 'hanuman',
    regions: ['pan-india'],
    description: 'Birth of Hanuman on Chaitra Purnima.',
  },
  {
    slug: 'ram-navami',
    nameEnglish: 'Ram Navami',
    nameSanskrit: 'राम नवमी',
    nameHindi: 'राम नवमी',
    ruleSpec: { type: 'tithi', month: 'chaitra', paksha: 'shukla', tithi: 9 },
    deityKey: 'rama',
    regions: ['pan-india'],
    description: 'Birth of Lord Rama.',
  },
  {
    slug: 'holika-dahan',
    nameEnglish: 'Holika Dahan',
    nameSanskrit: 'होलिका दहन',
    nameHindi: 'होलिका दहन',
    ruleSpec: {
      type: 'tithi',
      month: 'phalguna',
      paksha: 'shukla',
      tithi: 15,
    },
    regions: ['north', 'pan-india'],
    description:
      'Bonfire night before Holi; destruction of demoness Holika.',
  },
  {
    slug: 'holi',
    nameEnglish: 'Holi',
    nameSanskrit: 'होली',
    nameHindi: 'होली',
    ruleSpec: { type: 'tithi', month: 'chaitra', paksha: 'krishna', tithi: 1 },
    regions: ['north', 'pan-india'],
    description: 'Festival of colors celebrating spring.',
  },
  {
    slug: 'raksha-bandhan',
    nameEnglish: 'Raksha Bandhan',
    nameSanskrit: 'रक्षा बन्धन',
    nameHindi: 'रक्षा बंधन',
    ruleSpec: {
      type: 'tithi',
      month: 'shravana',
      paksha: 'shukla',
      tithi: 15,
    },
    regions: ['north', 'pan-india'],
    description:
      'Sisters tie a sacred thread (rakhi) on brothers wrists.',
  },
  {
    slug: 'guru-purnima',
    nameEnglish: 'Guru Purnima',
    nameSanskrit: 'गुरु पूर्णिमा',
    nameHindi: 'गुरु पूर्णिमा',
    ruleSpec: { type: 'tithi', month: 'ashadha', paksha: 'shukla', tithi: 15 },
    regions: ['pan-india'],
    description:
      'Day to honor spiritual teachers; full moon of Ashadha.',
  },
  {
    slug: 'buddha-purnima',
    nameEnglish: 'Buddha Purnima',
    nameSanskrit: 'बुद्ध पूर्णिमा',
    nameHindi: 'बुद्ध पूर्णिमा',
    ruleSpec: {
      type: 'tithi',
      month: 'vaishakha',
      paksha: 'shukla',
      tithi: 15,
    },
    deityKey: 'vishnu',
    regions: ['pan-india'],
    description: 'Birth of Gautama Buddha.',
  },
  {
    slug: 'akshaya-tritiya',
    nameEnglish: 'Akshaya Tritiya',
    nameSanskrit: 'अक्षय तृतीया',
    nameHindi: 'अक्षय तृतीया',
    ruleSpec: {
      type: 'tithi',
      month: 'vaishakha',
      paksha: 'shukla',
      tithi: 3,
    },
    deityKey: 'vishnu',
    regions: ['pan-india'],
    description: 'Auspicious day for new beginnings.',
  },
  {
    slug: 'vasant-panchami',
    nameEnglish: 'Vasant Panchami',
    nameSanskrit: 'वसन्त पञ्चमी',
    nameHindi: 'बसंत पंचमी',
    ruleSpec: { type: 'tithi', month: 'magha', paksha: 'shukla', tithi: 5 },
    deityKey: 'devi',
    regions: ['pan-india'],
    description: 'Worship of Saraswati; arrival of spring.',
  },
  {
    slug: 'karwa-chauth',
    nameEnglish: 'Karwa Chauth',
    nameSanskrit: 'करवा चतुर्थी',
    nameHindi: 'करवा चौथ',
    ruleSpec: { type: 'tithi', month: 'kartika', paksha: 'krishna', tithi: 4 },
    regions: ['north'],
    description: 'Day-long fast for husbands long life.',
  },
  {
    slug: 'nag-panchami',
    nameEnglish: 'Nag Panchami',
    nameSanskrit: 'नाग पञ्चमी',
    nameHindi: 'नाग पंचमी',
    ruleSpec: {
      type: 'tithi',
      month: 'shravana',
      paksha: 'shukla',
      tithi: 5,
    },
    regions: ['pan-india'],
    description: 'Worship of serpents.',
  },
  {
    slug: 'mahavir-jayanti',
    nameEnglish: 'Mahavir Jayanti',
    nameSanskrit: 'महावीर जयन्ती',
    nameHindi: 'महावीर जयंती',
    ruleSpec: { type: 'tithi', month: 'chaitra', paksha: 'shukla', tithi: 13 },
    regions: ['pan-india'],
    description: 'Birth of Lord Mahavira (Jain festival).',
  },
  {
    slug: 'ganga-dussehra',
    nameEnglish: 'Ganga Dussehra',
    nameSanskrit: 'गङ्गा दशहरा',
    nameHindi: 'गंगा दशहरा',
    ruleSpec: {
      type: 'tithi',
      month: 'jyeshtha',
      paksha: 'shukla',
      tithi: 10,
    },
    regions: ['north', 'pan-india'],
    description: 'Commemorates the descent of Ganga.',
  },
];

async function main() {
  for (const seed of FESTIVALS) {
    await prisma.hinduFestival.upsert({
      where: { slug: seed.slug },
      update: {
        nameEnglish: seed.nameEnglish,
        nameSanskrit: seed.nameSanskrit,
        nameHindi: seed.nameHindi,
        ruleSpec: seed.ruleSpec as any,
        deityKey: seed.deityKey,
        regions: seed.regions,
        description: seed.description,
      },
      create: {
        slug: seed.slug,
        nameEnglish: seed.nameEnglish,
        nameSanskrit: seed.nameSanskrit,
        nameHindi: seed.nameHindi,
        ruleSpec: seed.ruleSpec as any,
        deityKey: seed.deityKey,
        regions: seed.regions,
        description: seed.description,
      },
    });
  }
  console.log(`Seeded ${FESTIVALS.length} Hindu festivals`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
