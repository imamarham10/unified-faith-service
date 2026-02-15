export interface SupportedFaith {
  id: string; // Internal identifier
  name: string; // Display name
  description: string;
  status: 'active' | 'beta' | 'planned';
  features: string[]; // List of available/planned features
  icon?: string; // Optional remote URL or local token name
}

export const SUPPORTED_FAITHS: SupportedFaith[] = [
  {
    id: 'islam',
    name: 'Islam',
    description: 'Complete suite of Islamic features designed to assist in daily worship and spiritual growth.',
    status: 'active',
    features: [
      'Prayer Times',
      'Quran',
      'Dhikr & Dua',
      'Qibla Direction',
      'Islamic Calendar',
      '99 Names of Allah'
    ],
    icon: 'crescent-moon',
  },
  {
    id: 'christianity',
    name: 'Christianity',
    description: 'Upcoming suite of Christian features including Bible reading and daily devotionals.',
    status: 'planned',
    features: [
      'Bible',
      'Daily Devotionals',
      'Prayer Request',
      'Church Finder'
    ],
    icon: 'cross',
  },
  {
    id: 'hinduism',
    name: 'Hinduism',
    description: 'Upcoming suite of Hindu features including panchang, mantras, and temple locator.',
    status: 'planned',
    features: [
      'Panchang',
      'Mantras',
      'Temple Locator',
      'Daily Horoscope'
    ],
    icon: 'om',
  }
];
