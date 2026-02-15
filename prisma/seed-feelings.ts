
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

async function main() {
  console.log('Start seeding emotions and remedies...');

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

    console.log(`Upserted emotion: ${emotion.name}`);

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

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
