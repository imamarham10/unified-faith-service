export interface DhikrPhrase {
  arabic: string;
  transliteration: string;
  english: string;
  category?: string;
}

export const COMMON_DHIKR_PHRASES: DhikrPhrase[] = [
  {
    arabic: 'سُبْحَانَ اللَّهِ',
    transliteration: 'SubhanAllah',
    english: 'Glory be to Allah',
    category: 'tasbih'
  },
  {
    arabic: 'الْحَمْدُ لِلَّهِ',
    transliteration: 'Alhamdulillah',
    english: 'Praise be to Allah',
    category: 'tasbih'
  },
  {
    arabic: 'اللَّهُ أَكْبَرُ',
    transliteration: 'Allahu Akbar',
    english: 'Allah is the Greatest',
    category: 'tasbih'
  },
  {
    arabic: 'أَسْتَغْفِرُ اللَّهَ',
    transliteration: 'Astaghfirullah',
    english: 'I seek forgiveness from Allah',
    category: 'istighfar'
  },
  {
    arabic: 'لَا إِلَٰهَ إِلَّا ٱللَّٰهُ',
    transliteration: 'La ilaha illallah',
    english: 'There is no god but Allah',
    category: 'tawhid'
  },
  {
    arabic: 'بِسْمِ ٱللَّٰهِ',
    transliteration: 'Bismillah',
    english: 'In the name of Allah',
    category: 'general'
  },
  {
    arabic: 'اَللّٰهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ',
    transliteration: 'Allahumma salli ala Muhammad',
    english: 'O Allah, send blessings upon Muhammad',
    category: 'salawat'
  },
  {
    arabic: 'حَسْبُنَا اللهُ وَنِعْمَ الْوَكِيْلُ',
    transliteration: 'Hasbunallahu wa ni\'ma al-wakil',
    english: 'Allah is sufficient for us, and He is the best Disposer of affairs',
    category: 'general'
  },
  {
    arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
    transliteration: 'La hawla wa la quwwata illa billah',
    english: 'There is no power or strength except with Allah',
    category: 'general'
  },
  {
    arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
    transliteration: 'Subhanallah wa bihamdihi',
    english: 'Glory be to Allah and in His praise',
    category: 'tasbih'
  },
  {
    arabic: 'سُبْحَانَ اللَّهِ العَظِيمِ',
    transliteration: 'Subhanallah al-atheem',
    english: 'Glory be to Allah, the Most Great',
    category: 'tasbih'
  },
  {
    arabic: 'أَعُوْذُ بِاللهِ مِنَ الشَّيْطَانِ الرَّجِيْمِ',
    transliteration: 'A\'udhu billahi min ash-shaytan ar-rajim',
    english: 'I seek protection in Allah from the rejected Shaytan',
    category: 'istiadhah'
  },
  {
    arabic: 'يَا حَيُّ يَا قَيُّوْمُ بِرَحْمَتِكَ أَسْتَغِيْثُ',
    transliteration: 'Ya Hayyu ya Qayyum, bi-rahmatika astagheeth',
    english: 'O Ever-Living, O Self-Sustaining, by Your mercy I seek help',
    category: 'dua'
  },
  {
    arabic: 'اَللّٰهُمَّ إِنِّيْ أَعُوْذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ',
    transliteration: 'Allahumma inni a\'udhu bika min al-hamm wa al-huzn',
    english: 'O Allah, I seek Your protection from anxiety and grief',
    category: 'dua'
  },
  {
    arabic: 'وَآخِرُ دَعْوَانَا أَنِ الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
    transliteration: 'Wa akhira da\'wana an alhamdulillahi rabb al-alameen',
    english: 'And the last of our call is that all praise is for Allah, Lord of the worlds',
    category: 'general'
  },
  {
    arabic: 'اللهم اغفر لي',
    transliteration: 'Allahumma ighfir li',
    english: 'O Allah, forgive me',
    category: 'istighfar'
  },
  {
    arabic: 'اللهم أعني على ذكرك وشكرك وحسن عبادتك',
    transliteration: 'Allahumma a\'inni ala dhikrika wa shukrika wa husn ibadatik',
    english: 'O Allah, help me remember You, be grateful to You, and worship You well',
    category: 'dua'
  },
  {
    arabic: 'لا إله إلا أنت سبحانك إني كنت من الظالمين',
    transliteration: 'La ilaha illa anta subhanaka inni kuntu min az-zalimeen',
    english: 'There is no god but You, glory be to You, indeed I was among the wrongdoers',
    category: 'dua'
  },
  {
    arabic: 'ما شاء الله لا قوة إلا بالله',
    transliteration: 'Ma sha Allah la quwwata illa billah',
    english: 'What Allah willed, there is no power except with Allah',
    category: 'general'
  }
];

// Normalize Arabic text by removing diacritics
export function normalizeArabic(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F]/g, '') // Remove diacritics (tashkeel)
    .replace(/\s+/g, ' ');
}

// Normalize English text by lowercasing and removing extra punctuation
export function normalizeEnglish(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation except spaces and word characters
    .replace(/\s+/g, ' ');
}

// Create lookup maps for O(1) performance
export const DHIKR_BY_ARABIC = new Map<string, DhikrPhrase>(
  COMMON_DHIKR_PHRASES.map(phrase => [normalizeArabic(phrase.arabic), phrase])
);

export const DHIKR_BY_ENGLISH = new Map<string, DhikrPhrase>(
  COMMON_DHIKR_PHRASES.map(phrase => [normalizeEnglish(phrase.english), phrase])
);
