import { Injectable } from '@nestjs/common';

export interface Mantra {
  sanskrit: string;
  transliteration: string;
  english: string;
  category: 'mahamantra' | 'gayatri' | 'shanti' | 'beej' | 'devotional';
  deityKey?: string;
}

const MANTRAS: Mantra[] = [
  { sanskrit: 'ॐ भूर्भुवः स्वः तत्सवितुर्वरेण्यं भर्गो देवस्य धीमहि धियो यो नः प्रचोदयात्', transliteration: 'Om Bhur Bhuvah Svah Tat Savitur Varenyam Bhargo Devasya Dhimahi Dhiyo Yo Nah Prachodayat', english: 'Gayatri Mantra — invocation of the Sun for divine illumination', category: 'gayatri' },
  { sanskrit: 'ॐ नमः शिवाय', transliteration: 'Om Namah Shivaya', english: 'Salutations to Shiva', category: 'mahamantra', deityKey: 'shiva' },
  { sanskrit: 'ॐ नमो भगवते वासुदेवाय', transliteration: 'Om Namo Bhagavate Vasudevaya', english: 'Salutations to Vishnu/Krishna', category: 'mahamantra', deityKey: 'vishnu' },
  { sanskrit: 'ॐ नमो नारायणाय', transliteration: 'Om Namo Narayanaya', english: 'Salutations to Narayana (Vishnu)', category: 'mahamantra', deityKey: 'vishnu' },
  { sanskrit: 'हरे कृष्ण हरे कृष्ण कृष्ण कृष्ण हरे हरे हरे राम हरे राम राम राम हरे हरे', transliteration: 'Hare Krishna Hare Krishna Krishna Krishna Hare Hare Hare Rama Hare Rama Rama Rama Hare Hare', english: 'Hare Krishna Mahamantra', category: 'mahamantra', deityKey: 'krishna' },
  { sanskrit: 'ॐ श्री गणेशाय नमः', transliteration: 'Om Shri Ganeshaya Namah', english: 'Salutations to Ganesha', category: 'mahamantra', deityKey: 'ganesha' },
  { sanskrit: 'ॐ हनुमते नमः', transliteration: 'Om Hanumate Namah', english: 'Salutations to Hanuman', category: 'mahamantra', deityKey: 'hanuman' },
  { sanskrit: 'ॐ श्री रामाय नमः', transliteration: 'Om Shri Ramaya Namah', english: 'Salutations to Rama', category: 'mahamantra', deityKey: 'rama' },
  { sanskrit: 'ॐ ऐं सरस्वत्यै नमः', transliteration: 'Om Aim Saraswatyai Namah', english: 'Salutations to Saraswati', category: 'beej', deityKey: 'devi' },
  { sanskrit: 'ॐ श्रीं महालक्ष्म्यै नमः', transliteration: 'Om Shreem Mahalakshmyai Namah', english: 'Salutations to Mahalakshmi', category: 'beej', deityKey: 'devi' },
  { sanskrit: 'ॐ दुं दुर्गायै नमः', transliteration: 'Om Dum Durgayai Namah', english: 'Salutations to Durga', category: 'beej', deityKey: 'devi' },
  { sanskrit: 'ॐ त्र्यम्बकं यजामहे सुगन्धिं पुष्टिवर्धनम् उर्वारुकमिव बन्धनान्मृत्योर्मुक्षीय मामृतात्', transliteration: 'Om Tryambakam Yajamahe Sugandhim Pushtivardhanam Urvarukamiva Bandhanan Mrityor Mukshiya Mamritat', english: 'Maha Mrityunjaya Mantra — for healing and liberation', category: 'mahamantra', deityKey: 'shiva' },
  { sanskrit: 'वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ निर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा', transliteration: 'Vakratunda Mahakaya Suryakoti Samaprabha Nirvighnam Kuru Me Deva Sarvakaryeshu Sarvada', english: 'Ganesha invocation — remover of obstacles', category: 'devotional', deityKey: 'ganesha' },
  { sanskrit: 'सर्वमङ्गलमाङ्गल्ये शिवे सर्वार्थसाधिके शरण्ये त्र्यम्बके गौरि नारायणि नमोऽस्तु ते', transliteration: 'Sarva Mangala Mangalye Shive Sarvartha Sadhike Sharanye Tryambake Gauri Narayani Namostu Te', english: 'Salutations to Devi, the auspicious goddess', category: 'devotional', deityKey: 'devi' },
  { sanskrit: 'ॐ शान्ति शान्ति शान्तिः', transliteration: 'Om Shanti Shanti Shantih', english: 'Om peace peace peace', category: 'shanti' },
  { sanskrit: 'असतो मा सद्गमय तमसो मा ज्योतिर्गमय मृत्योर्मा अमृतं गमय', transliteration: 'Asato Ma Sadgamaya Tamaso Ma Jyotirgamaya Mrityorma Amritam Gamaya', english: 'Lead me from untruth to truth, from darkness to light, from death to immortality', category: 'shanti' },
  { sanskrit: 'सर्वेषाम् स्वस्तिर्भवतु सर्वेषाम् शान्तिर्भवतु सर्वेषाम् पूर्णम् भवतु सर्वेषाम् मङ्गलम् भवतु', transliteration: 'Sarvesham Svastir Bhavatu Sarvesham Shantir Bhavatu Sarvesham Purnam Bhavatu Sarvesham Mangalam Bhavatu', english: 'May all beings have wellbeing, peace, fullness, and auspiciousness', category: 'shanti' },
  { sanskrit: 'लोकाः समस्ताः सुखिनो भवन्तु', transliteration: 'Lokah Samastah Sukhino Bhavantu', english: 'May all beings everywhere be happy and free', category: 'shanti' },
  { sanskrit: 'ॐ क्लीं कृष्णाय नमः', transliteration: 'Om Kleem Krishnaya Namah', english: 'Beej mantra of Krishna', category: 'beej', deityKey: 'krishna' },
  { sanskrit: 'ॐ मणिपद्मे हूँ', transliteration: 'Om Mani Padme Hum', english: 'Universal compassion mantra (also revered in Buddhism)', category: 'mahamantra' },
];

@Injectable()
export class MantraDictionaryService {
  getAll(): Mantra[] {
    return MANTRAS;
  }

  getByCategory(category: Mantra['category']): Mantra[] {
    return MANTRAS.filter((m) => m.category === category);
  }

  getByDeity(deityKey: string): Mantra[] {
    return MANTRAS.filter((m) => m.deityKey === deityKey);
  }
}
