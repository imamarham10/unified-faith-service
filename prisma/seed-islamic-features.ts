import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { prismaSchemaOptions } from '../src/common/utils/db-schema';
import { Pool } from 'pg';
import * as https from 'https';
import { seedMuhammadNames } from './seed-muhammad-names';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const connectionString = databaseUrl.replace('sslmode=require', '');

const pool = new Pool({ 
  connectionString,
  ssl: { rejectUnauthorized: false } 
});
const adapter = new PrismaPg(pool, prismaSchemaOptions());
const prisma = new PrismaClient({ adapter });

// Helper to fetch JSON from URL
function fetchJson(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            // Use setEncoding to properly handle multi-byte UTF-8 characters
            // that may span chunk boundaries (prevents U+FFFD corruption)
            res.setEncoding('utf-8');
            let data = '';
            res.on('data', (chunk: string) => (data += chunk));
            res.on('end', () => {
                try {
                resolve(JSON.parse(data));
                } catch (e) {
                reject(e);
                }
            });
        }).on('error', (err) => reject(err));
    });
}

async function main() {
    console.log('🌙 Starting Islamic features seed...');

    try {
        // 1. Seed 99 Names of Allah
        await seedAllahNames();

        // 1.5. Seed 99 Names of Muhammad (saw)
        await seedMuhammadNames(prisma);

        // 2. Seed Prayer Calculation Methods
        await seedCalculationMethods();

        // 3. Seed Islamic Events
        await seedIslamicEvents();

        // 4. Seed Dua Categories and Sample Duas
        await seedDuas();

        // 5. Seed Quran (Surahs, Verses, Translations)
        await seedQuran();

        // 6. Seed "I am Feeling" Emotions and Remedies
        await seedFeelings();

        console.log('✅ Islamic features seed completed successfully!');
    } catch (error) {
        console.error('❌ Error during seed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

async function seedAllahNames() {
    console.log('📿 Seeding 99 Names of Allah...');

    const apiUrl = 'https://api.aladhan.com/v1/asmaAlHusna';
    
    try {
        const response = await fetchJson(apiUrl);
        const names = response.data;

        if (!names || !Array.isArray(names)) {
        throw new Error('Invalid response from AlAdhan API');
        }

        console.log(`   Fetched ${names.length} names from API.`);

        for (const name of names) {
            await prisma.allahName.upsert({
                where: { id: parseInt(name.number) },
                update: {
                nameArabic: name.name,
                nameTranslit: name.transliteration,
                nameEnglish: name.en.meaning,
                meaning: name.en.meaning,
                description: `The ${name.en.meaning}`,
                },
                create: {
                id: parseInt(name.number),
                nameArabic: name.name,
                nameTranslit: name.transliteration,
                nameEnglish: name.en.meaning,
                meaning: name.en.meaning,
                description: `The ${name.en.meaning}`,
                },
            });
        }
        console.log(`✅ Seeded ${names.length} Names of Allah`);
    } catch (error) {
        console.warn('   ⚠️ Failed to fetch names from API. Ensure network connectivity. Skipping...');
        console.error(error);
    }
}

async function seedCalculationMethods() {
    console.log('🕌 Seeding prayer calculation methods...');

    const methods = [
        {
        name: 'Muslim World League',
        slug: 'mwl',
        fajrAngle: 18.0,
        ishaAngle: 17.0,
        description: 'Muslim World League method',
        },
        {
        name: 'Islamic Society of North America',
        slug: 'isna',
        fajrAngle: 15.0,
        ishaAngle: 15.0,
        description: 'Islamic Society of North America (ISNA) method',
        },
        {
        name: 'Egyptian General Authority of Survey',
        slug: 'egypt',
        fajrAngle: 19.5,
        ishaAngle: 17.5,
        description: 'Egyptian General Authority of Survey method',
        },
        {
        name: 'Umm Al-Qura University, Makkah',
        slug: 'makkah',
        fajrAngle: 18.5,
        ishaAngle: 0,
        description: 'Umm Al-Qura University, Makkah',
        },
        {
        name: 'University of Islamic Sciences, Karachi',
        slug: 'karachi',
        fajrAngle: 18.0,
        ishaAngle: 18.0,
        description: 'University of Islamic Sciences, Karachi',
        },
        {
        name: 'Kuwait',
        slug: 'kuwait',
        fajrAngle: 18.0,
        ishaAngle: 17.5,
        description: 'Kuwait',
        },
        {
        name: 'Qatar',
        slug: 'qatar',
        fajrAngle: 18.0,
        ishaAngle: 0,
        description: 'Qatar',
        },
        {
        name: 'Majlis Ugama Islam Singapura',
        slug: 'singapore',
        fajrAngle: 20.0,
        ishaAngle: 18.0,
        description: 'Singapore',
        }
    ];

    for (const method of methods) {
        await prisma.calculationMethod.upsert({
        where: { slug: method.slug },
        update: method,
        create: method,
        });
    }

    console.log(`✅ Seeded ${methods.length} calculation methods`);
}

async function seedIslamicEvents() {
    console.log('📅 Seeding Islamic events...');

    const events = [
        {
        name: 'Ramadan Begins',
        nameArabic: 'رمضان',
        description: 'The holy month of fasting',
        hijriMonth: 9,
        hijriDay: 1,
        importance: 'major',
        },
        {
        name: 'Laylat al-Qadr (Night of Power)',
        nameArabic: 'ليلة القدر',
        description: 'The night when the Quran was first revealed',
        hijriMonth: 9,
        hijriDay: 27,
        importance: 'major',
        },
        {
        name: 'Eid al-Fitr',
        nameArabic: 'عيد الفطر',
        description: 'Festival of Breaking the Fast',
        hijriMonth: 10,
        hijriDay: 1,
        importance: 'major',
        },
        {
        name: 'Day of Arafah',
        nameArabic: 'يوم عرفة',
        description: 'The second day of Hajj pilgrimage',
        hijriMonth: 12,
        hijriDay: 9,
        importance: 'major',
        },
        {
        name: 'Eid al-Adha',
        nameArabic: 'عيد الأضحى',
        description: 'Festival of Sacrifice',
        hijriMonth: 12,
        hijriDay: 10,
        importance: 'major',
        },
        {
        name: 'Islamic New Year',
        nameArabic: 'رأس السنة الهجرية',
        description: 'First day of Muharram',
        hijriMonth: 1,
        hijriDay: 1,
        importance: 'moderate',
        },
        {
        name: 'Day of Ashura',
        nameArabic: 'يوم عاشوراء',
        description: 'Day of fasting and remembrance',
        hijriMonth: 1,
        hijriDay: 10,
        importance: 'moderate',
        },
        {
        name: 'Mawlid an-Nabi',
        nameArabic: 'المولد النبوي',
        description: 'Birthday of Prophet Muhammad (PBUH)',
        hijriMonth: 3,
        hijriDay: 12,
        importance: 'moderate',
        },
        {
        name: 'Isra and Mi\'raj',
        nameArabic: 'الإسراء والمعراج',
        description: 'Night Journey and Ascension',
        hijriMonth: 7,
        hijriDay: 27,
        importance: 'moderate',
        },
        {
        name: 'Mid-Sha\'ban',
        nameArabic: 'ليلة النصف من شعبان',
        description: 'Night of mid-Sha\'ban',
        hijriMonth: 8,
        hijriDay: 15,
        importance: 'minor',
        },
    ];

    for (const event of events) {
        const existing = await prisma.islamicEvent.findFirst({
            where: {
                hijriMonth: event.hijriMonth,
                hijriDay: event.hijriDay,
            }
        });

        if (!existing) {
            await prisma.islamicEvent.create({
                data: event,
            });
        }
    }

    console.log(`✅ Seeded ${events.length} Islamic events`);
}

async function seedDuas() {
    console.log('🤲 Seeding duas...');

    const categories = [
        { name: 'Morning', nameArabic: 'أذكار الصباح', description: 'Morning remembrance and supplications' },
        { name: 'Evening', nameArabic: 'أذكار المساء', description: 'Evening remembrance and supplications' },
        { name: 'Before Sleep', nameArabic: 'أذكار النوم', description: 'Supplications before sleeping' },
        { name: 'Food & Drink', nameArabic: 'الطعام والشراب', description: 'Supplications related to eating and drinking' },
        { name: 'Travel', nameArabic: 'السفر', description: 'Supplications for traveling' },
        { name: 'Entering Mosque', nameArabic: 'دخول المسجد', description: 'Supplications when entering the mosque' },
        { name: 'General', nameArabic: 'عامة', description: 'General supplications' },
        { name: 'Prayer', nameArabic: 'الصلاة', description: 'Supplications during and after prayer' },
        { name: 'Hajj & Umrah', nameArabic: 'الحج والعمرة', description: 'Supplications for Hajj and Umrah' },
        { name: 'Protection', nameArabic: 'التحصين', description: 'Supplications for protection' },
    ];

    const createdCategories: any[] = [];
    for (const cat of categories) {
        const c = await prisma.duaCategory.upsert({
            where: { name: cat.name },
            update: cat,
            create: cat,
        });
        createdCategories.push(c);
    }

    const duas = [
        {
        category: 'Morning',
        titleArabic: 'دعاء الصباح',
        titleEnglish: 'Morning Supplication',
        textArabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ',
        textTranslit: 'Asbahna wa-asbahal-mulku lillah, walhamdu lillah',
        textEnglish: 'We have reached the morning, and the dominion belongs to Allah, and all praise is for Allah',
        reference: 'Muslim 4/2088',
        },
        {
        category: 'Evening',
        titleArabic: 'دعاء المساء',
        titleEnglish: 'Evening Supplication',
        textArabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ',
        textTranslit: 'Amsayna wa-amsal-mulku lillah, walhamdu lillah',
        textEnglish: 'We have reached the evening, and the dominion belongs to Allah, and all praise is for Allah',
        reference: 'Muslim 4/2088',
        },
        {
        category: 'Food & Drink',
        titleArabic: 'دعاء قبل الطعام',
        titleEnglish: 'Before Eating',
        textArabic: 'بِسْمِ اللهِ',
        textTranslit: 'Bismillah',
        textEnglish: 'In the name of Allah',
        reference: 'Abu Dawud 3/347',
        },
        {
        category: 'Food & Drink',
        titleArabic: 'دعاء بعد الطعام',
        titleEnglish: 'After Eating',
        textArabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا، وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ',
        textTranslit: 'Alhamdu lillahil-lathee at\'amani hatha, wa razaqaneehi min ghayri hawlin minnee wa la quwwah',
        textEnglish: 'All praise is due to Allah who has fed me this and provided it for me without any might or power from me',
        reference: 'Abu Dawud 4/318',
        },
        {
        category: 'Travel',
        titleArabic: 'دعاء السفر',
        titleEnglish: 'Travel Supplication',
        textArabic: 'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ، وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ',
        textTranslit: 'Subhanal-lathee sakhkhara lana hatha wa ma kunna lahu muqrineen, wa inna ila rabbina lamunqaliboon',
        textEnglish: 'Glory is to Him Who has subjected this to us, and we could never have it (by our efforts). And verily, to Our Lord we indeed are to return',
        reference: 'Tirmidhi 5/501',
        },
        {
        category: 'General',
        titleArabic: 'سيد الاستغفار',
        titleEnglish: 'Master of Seeking Forgiveness',
        textArabic: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ',
        textTranslit: 'Allahumma anta rabbee la ilaha illa ant, khalaqtanee wa-ana \'abduk, wa-ana \'ala \'ahdika wa wa\'dika mas-tata\'t',
        textEnglish: 'O Allah, You are my Lord, none has the right to be worshiped except You. You created me and I am Your servant',
        reference: 'Bukhari 7/150',
        },
    ];

    let count = 0;
    for (const dua of duas) {
        const cat = createdCategories.find(c => c.name === dua.category);
        if (!cat) continue;
        
        const existing = await prisma.dua.findFirst({
            where: { titleArabic: dua.titleArabic, categoryId: cat.id }
        });

        if (!existing) {
            await prisma.dua.create({ 
                data: {
                    categoryId: cat.id,
                    titleArabic: dua.titleArabic,
                    titleEnglish: dua.titleEnglish,
                    textArabic: dua.textArabic,
                    textTranslit: dua.textTranslit,
                    textEnglish: dua.textEnglish,
                    reference: dua.reference,
                } 
            });
            count++;
        }
    }

    console.log(`✅ Seeded ${createdCategories.length} categories and ${duas.length} sample duas`);
}

async function seedQuran() {
    console.log('📖 Seeding Quran...');

    const arabicUrl = 'https://cdn.jsdelivr.net/npm/quran-json@3.1.2/dist/quran.json';
    const englishUrl = 'https://cdn.jsdelivr.net/npm/quran-json@3.1.2/dist/quran_en.json';

    console.log('   Fetching Quran JSON data (this may take a few seconds)...');
    
    try {
        const [arabicData, englishData] = await Promise.all([
            fetchJson(arabicUrl),
            fetchJson(englishUrl)
        ]);

        if (!arabicData || !englishData) {
            throw new Error('Failed to fetch complete Quran data');
        }

        console.log('   Data fetched. Processing...');

        // 2. Surahs
        const surahCount = await prisma.quranSurah.count();
        if (surahCount === 114) {
            console.log('   Surahs already seeded.');
        } else {
            console.log('   Seeding Surahs...');
            for (const surah of arabicData) {
                await prisma.quranSurah.upsert({
                    where: { id: surah.id },
                    update: {
                        nameArabic: surah.name,
                        nameEnglish: surah.translation || surah.transliteration,
                        nameTransliteration: surah.transliteration,
                        revelationPlace: surah.type,
                        verseCount: surah.total_verses
                    },
                    create: {
                        id: surah.id,
                        nameArabic: surah.name,
                        nameEnglish: surah.translation || surah.transliteration,
                        nameTransliteration: surah.transliteration,
                        revelationPlace: surah.type,
                        verseCount: surah.total_verses
                    }
                });
            }
            console.log('   ✅ Seeded 114 Surahs');
        }

        // 3. Verses
        const verseCount = await prisma.quranVerse.count();
        if (verseCount >= 6236) {
            console.log('   Verses already seeded.');
        } else {
            console.log('   Seeding Verses...');
            
            for (const surah of arabicData) {
                const versesData = surah.verses.map((v: any) => ({
                    surahId: surah.id,
                    verseNumber: v.id,
                    textArabic: v.text,
                    textSimple: v.text,
                }));

                await prisma.quranVerse.createMany({
                    data: versesData,
                    skipDuplicates: true,
                });
            }
            console.log('   ✅ Seeded 6236 Verses');
        }

        // 4. Translations
        const translationCount = await prisma.quranTranslation.count({ where: { language: 'en' } });
        if (translationCount > 0) {
            console.log('   English translations already seeded.');
        } else {
            console.log('   Seeding English Translations...');
            
            for (const surahEn of englishData) {
                const surahId = surahEn.id;
                
                const verses = await prisma.quranVerse.findMany({
                    where: { surahId: surahId },
                    select: { id: true, verseNumber: true }
                });

                if (verses.length === 0) continue;

                const verseMap = new Map();
                verses.forEach(v => verseMap.set(v.verseNumber, v.id));

                const translationData = [];

                for (const vEn of surahEn.verses) {
                    const verseId = verseMap.get(vEn.id);
                    if (verseId) {
                        translationData.push({
                            verseId: verseId,
                            language: 'en',
                            authorName: 'Saheeh International',
                            text: vEn.translation
                        });
                    }
                }

                if (translationData.length > 0) {
                    await prisma.quranTranslation.createMany({
                        data: translationData,
                        skipDuplicates: true
                    });
                }
            }
            console.log('   ✅ Seeded English Translations');
        }

    } catch (error) {
        console.warn('   ⚠️ Failed to seed Quran data. Ensure network connectivity.');
        console.error(error);
    }
}

main();

async function seedFeelings() {
    console.log('❤️ Seeding "I am Feeling" emotions...');

    const emotionsData = [
        {
          name: "Angry",
          slug: "angry",
          icon: "😠",
          remedies: [
            {
              arabicText: "أَعُوْذُ بِاللهِ مِنَ الشَّيْطَانِ الرَّجِيْمِ",
              transliteration: "Aʿūdhu bi-llāhi mina-sh-Shayṭāni-r-rajīm",
              translation: "I seek protection in Allah from the rejected Shayṭān.",
              source: "Quran 16:98 / Abu Daud 4781"
            },
            {
              arabicText: "إِنَّ الْغَضَبَ مِنَ الشَّيْطَانِ وَإِنَّ الشَّيْطَانَ خُلِقَ مِنَ النَّارِ وَإِنَّمَا تُطْفَأُ النَّارُ بِالْمَاءِ فَإِذَا غَضِبَ أَحَدُكُمْ فَلْيَتَوَضَّأْ",
              transliteration: "Innal-ghadaba minash-shaitani wa innash-shaitana khuliqa minan-nari wa innama tutfa'un-naru bil-ma'i fa'idha ghadiba ahadukum falyatawadda'",
              translation: "Anger comes from the devil, the devil was created of fire, and fire is extinguished only with water; so when one of you becomes angry, he should perform ablution.",
              source: "Sunan Abi Dawud 4784"
            }
          ]
        },
        {
          name: "Anxious",
          slug: "anxious",
          icon: "😰",
          remedies: [
            {
              arabicText: "اَللّٰهُمَّ إِنِّيْ أَعُوْذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ ، وَالْعَجْزِ وَالْكَسَلِ ، وَالْبُخْلِ وَالْجُبْنِ ، وَضَلَعِ الدَّيْنِ وَغَلَبَةِ الرِّجَالِ",
              transliteration: "Allāhumma innī aʿūdhu bika minal-hammi wal-ḥazan, wal-ʿajzi wal-kasal, wal-bukhli wal-jubn, wa ḍalaʿid-dayni wa ghalabatir-rijāl.",
              translation: "O Allah, I seek Your protection from anxiety and grief, incapacity and laziness, miserliness and cowardice, and from being overwhelmed by debt and overpowered by men.",
              source: "Sahih al-Bukhari 6363"
            },
            {
              arabicText: "يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ ۚ إِنَّ اللَّهَ مَعَ الصَّابِرِينَ",
              transliteration: "Ya ayyuha allatheena amanoo ista'eenoo bissabri wassalati inna Allaha ma'a assabireen.",
              translation: "O you who have believed, seek help through patience and prayer. Indeed, Allah is with the patient.",
              source: "Quran 2:153"
            }
          ]
        },
        {
          name: "Depressed",
          slug: "depressed",
          icon: "😔",
          remedies: [
            {
              arabicText: "يَا حَيُّ يَا قَيُّوْمُ بِرَحْمَتِكَ أَسْتَغِيْثُ",
              transliteration: "Yā Ḥayyu yā Qayyūm, bi-raḥmatika astaghīth.",
              translation: "O Ever-Living, O Self-Sustaining, by Your mercy I seek help.",
              source: "Tirmidhi 3524"
            },
            {
              arabicText: "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا ۔ إِنَّ مَعَ الْعُسْرِ يُسْرًا",
              transliteration: "Fa inna ma'al 'usri yusra. Inna ma'al 'usri yusra.",
              translation: "For indeed, with hardship [will be] ease. Indeed, with hardship [will be] ease.",
              source: "Quran 94:5-6"
            }
          ]
        },
        {
          name: "Doubtful",
          slug: "doubtful",
          icon: "🤔",
          remedies: [
            {
              arabicText: "يَا مُقَلِّبَ الْقُلُوْبِ ثَبِّتْ قَلْبِيْ عَلَىٰ دِيْنِكَ",
              transliteration: "Yā Muqalliba-l-qulūbi thabbit qalbī ʿalā dīnik.",
              translation: "O Changer of hearts, make my heart firm upon Your religion.",
              source: "Tirmidhi 3522"
            },
            {
              arabicText: "الْحَقُّ مِنْ رَبِّكَ فَلَا تَكُونَنَّ مِنَ الْمُمْتَرِينَ",
              transliteration: "Al haqqu mir rabbika fala takunanna minal mumtareen.",
              translation: "The truth is from your Lord, so never be among the doubters.",
              source: "Quran 2:147"
            }
          ]
        },
        {
          name: "Grateful",
          slug: "grateful",
          icon: "🤲",
          remedies: [
            {
              arabicText: "اَللّٰهُمَّ أَعِنِّيْ عَلَىٰ ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ",
              transliteration: "Allāhumma aʿinnī ʿalā dhikrika wa shukrika wa ḥusni ʿibādatik.",
              translation: "O Allah, help me in remembering You, being grateful to You, and worshipping You in an excellent manner.",
              source: "Abu Dawud 1522"
            },
            {
              arabicText: "لَئِن شَكَرْتُمْ لَأَزِيدَنَّكُمْ",
              transliteration: "La-in shakartum la-azeedannakum",
              translation: "If you are grateful, I will surely increase you [in favor].",
              source: "Quran 14:7"
            }
          ]
        },
        {
          name: "Hurt",
          slug: "hurt",
          icon: "🤕",
          remedies: [
            {
              arabicText: "وَلَا تَهِنُوا وَلَا تَحْزَنُوا وَأَنْتُمُ الْأَعْلَوْنَ إِنْ كُنْتُمْ مُؤْمِنِينَ",
              transliteration: "Wala tahinoo wala tahzanoo waantumu ala'lawna in kuntum mu'mineen.",
              translation: "So do not weaken and do not grieve, and you will be superior if you are [true] believers.",
              source: "Quran 3:139"
            }
          ]
        },
        {
          name: "Jealous",
          slug: "jealous",
          icon: "😒",
          remedies: [
            {
              arabicText: "رَبَّنَا اغْفِرْ لَنَا وَلِإِخْوَانِنَا الَّذِينَ سَبَقُونَا بِالْإِيمَانِ وَلَا تَجْعَلْ فِي قُلُوبِنَا غِلًّا لِلَّذِينَ آمَنُوا رَبَّنَا إِنَّكَ رَءُوفٌ رَحِيمٌ",
              transliteration: "Rabbana aghfir lana wali-ikhwanina allatheena sabaqoona bil-eemani wala taj'al fee quloobina ghillan lillatheena amanoo rabbana innaka raoofun raheem.",
              translation: "Our Lord, forgive us and our brothers who preceded us in faith and put not in our hearts [any] resentment toward those who have believed. Our Lord, indeed You are Kind and Merciful.",
              source: "Quran 59:10"
            }
          ]
        },
        {
          name: "Lost",
          slug: "lost",
          icon: "🔦",
          remedies: [
            {
              arabicText: "وَوَجَدَكَ ضَالًّا فَهَدَىٰ",
              transliteration: "Wawajadaka dallan fahada.",
              translation: "And He found you lost and guided [you].",
              source: "Quran 93:7"
            }
          ]
        },
        {
          name: "Nervous",
          slug: "nervous",
          icon: "😰",
          remedies: [
            {
              arabicText: "رَبِّ اشْرَحْ لِيْ صَدْرِيْ ، وَيَسِّرْ لِيْ أَمْرِيْ ، وَاحْلُلْ عُقْدَةً مِّنْ لِّسَانِيْ ، يَفْقَهُوْا قَوْلِيْ",
              transliteration: "Rabbi-shraḥ lī ṣadrī, wa yassir lī amrī, wa-ḥlul ʿuqdatam-min-lisānī, yafqahū qawlī.",
              translation: "My Lord, expand for me my breast. And ease for me my task. And untie the knot from my tongue. That they may understand my speech.",
              source: "Quran 20:25-28"
            }
          ]
        },
        {
          name: "Overwhelmed",
          slug: "overwhelmed",
          icon: "🤯",
          remedies: [
            {
              arabicText: "حَسْبُنَا اللهُ وَنِعْمَ الْوَكِيْلُ",
              transliteration: "Ḥasbunallāhu wa niʿma-l-Wakīl.",
              translation: "Allah is sufficient for us, and He is the best Disposer of affairs.",
              source: "Quran 3:173"
            }
          ]
        },
        {
          name: "Sad",
          slug: "sad",
          icon: "😢",
          remedies: [
            {
              arabicText: "إِنَّمَا أَشْكُو بَثِّي وَحُزْنِي إِلَى اللَّهِ",
              transliteration: "Innama ashkoo bathee wahuznee ila Allah.",
              translation: "I only complain of my suffering and my grief to Allah.",
              source: "Quran 12:86"
            }
          ]
        },
        {
          name: "Scared",
          slug: "scared",
          icon: "😨",
          remedies: [
            {
              arabicText: "رَبَّنَا أَفْرِغْ عَلَيْنَا صَبْرًا وَثَبِّتْ أَقْدَامَنَا وَانْصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ",
              transliteration: "Rabbana afrigh 'alayna sabran wathabbit aqdamana wansurna 'alal-qawmil-kafireen.",
              translation: "Our Lord, pour upon us patience and plant firmly our feet and give us victory over the disbelieving people.",
              source: "Quran 2:250"
            }
          ]
        },
        {
          name: "Tired",
          slug: "tired",
          icon: "😴",
          remedies: [
            {
              arabicText: "لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا",
              transliteration: "La yukallifu Allahu nafsan illa wus'aha.",
              translation: "Allah does not charge a soul except [with that within] its capacity.",
              source: "Quran 2:286"
            },
            {
              arabicText: "سُبْحَانَ اللهِ (33) ، الْحَمْدُ لِلّٰهِ (33) ، اللهُ أَكْبَرُ (34)",
              transliteration: "SubhanAllah (33), Alhamdulillah (33), Allahu Akbar (34)",
              translation: "Recite SubhanAllah (33 times), Alhamdulillah (33 times), and Allahu Akbar (34 times) before sleeping.",
              source: "Sahih al-Bukhari 3113"
            }
          ]
        },
        {
          name: "Weak",
          slug: "weak",
          icon: "🥀",
          remedies: [
            {
              arabicText: "رَبِّ إِنِّيْ لِمَآ أَنْزَلْتَ إِلَيَّ مِنْ خَيْرٍ فَقِيْرٌ",
              transliteration: "Rabbi innī limā anzalta illayya min khayrin faqīr.",
              translation: "My Lord, truly I am in dire need of any good which You may send me.",
              source: "Quran 28:24"
            },
            {
              arabicText: "اَللّٰهُمَّ عافِني في بَدَني، اَللّٰهُمَّ عافِني في سَمْعي، اَللّٰهُمَّ عافِني في بَصَري، لَا إِلٰهَ إِلَّا أَنْتَ",
              transliteration: "Allāhumma ʿāfinī fī badanī, Allāhumma ʿāfinī fī samʿī, Allāhumma ʿāfinī fī baṣarī, lā ilāha illā Ant.",
              translation: "O Allah, grant me well-being in my body. O Allah, grant me well-being in my hearing. O Allah, grant me well-being in my sight. There is no god worthy of worship except You.",
              source: "Abu Dawud 5090"
            }
          ]
        }
    ];

    for (const emotionData of emotionsData) {
        const { remedies, ...emotionInfo } = emotionData;

        const emotion = await prisma.emotion.upsert({
            where: { slug: emotionInfo.slug },
            update: {
                name: emotionInfo.name,
                icon: emotionInfo.icon,
            },
            create: {
                name: emotionInfo.name,
                slug: emotionInfo.slug,
                icon: emotionInfo.icon,
            },
        });

        // Create remedies for the emotion
        for (const remedy of remedies) {
            // Check if remedy exists for this emotion to avoid duplicates (based on source and text)
            const existingRemedy = await prisma.emotionRemedy.findFirst({
                where: {
                    emotionId: emotion.id,
                    source: remedy.source,
                    arabicText: remedy.arabicText,
                },
            });

            if (!existingRemedy) {
                await prisma.emotionRemedy.create({
                    data: {
                        ...remedy,
                        emotionId: emotion.id,
                    },
                });
            }
        }
    }

    console.log(`   ✅ Seeded ${emotionsData.length} emotions and their remedies`);
}
