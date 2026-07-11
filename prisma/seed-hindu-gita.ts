/**
 * Bhagavad Gita seed — Hindu vertical, spec §B1 (team/hindu-completion-spec.md).
 *
 * Seeds:
 *  - HinduText "bhagavad-gita"
 *  - all 18 HinduTextChapter rows (Sanskrit + English names)
 *  - HinduTextVerse rows: chapters 1 (47) and 2 (72) complete, plus 30 famous
 *    verses from chapters 3–18 flagged isFeatured (2.14/2.20/2.47/2.48/2.62/2.63
 *    are also flagged within the fully seeded chapter 2) — 149 verses total.
 *  - one English HinduTextTranslation per verse (Swami Swarupananda, 1909, public domain)
 *
 * Sources (fetched, not written from memory):
 *  - Devanagari sanskritText + transliteration: the Ved Vyas Foundation "gita" dataset
 *    (github.com/gita/gita, data/verse.json) — standard 700-verse recension.
 *  - English translation: Swami Swarupananda, "Srimad-Bhagavad-Gita" (1909),
 *    digitized at sacred-texts.com/hin/sbg/ (chapters sbg06.htm–sbg23.htm).
 *
 * Editorial notes on the translation text:
 *  - Swarupananda's chapter 13 edition omits the opening Arjuna verse; his 13.27 is the
 *    standard 13.28 seeded here (verified against the Sanskrit).
 *  - Where he renders a verse group as a single passage (1.4–6, 1.28–29, 2.42–44,
 *    12.13–14), each verse in the group carries the shared passage.
 *  - Three obvious digitization typos corrected against the 1909 print sense:
 *    2.20 "This in never born" → "This is never born"; 2.48 "evenness. of" → "evenness of";
 *    18.63 "declared to. thee" → "declared to thee". Chapter-end colophon lines removed.
 *
 * Idempotent: HinduText upserts on slug; chapters on @@unique([textId, chapterNumber]);
 * verses via findFirst-then-create/update (no unique composite on HinduTextVerse);
 * translations on @@unique([verseId, languageCode, authorName]). Safe to re-run.
 *
 * Run: npx ts-node prisma/seed-hindu-gita.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Same adapter pattern as prisma/seed.ts / PrismaService
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl?.replace('sslmode=require', ''),
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TRANSLATION_AUTHOR = 'Swami Swarupananda';
const TRANSLATION_LANGUAGE = 'en';

interface ChapterMeta {
  chapter: number;
  nameSanskrit: string;
  nameEnglish: string;
  /** Verse count of the full chapter in the standard recension (not all are seeded in v1). */
  verseCount: number;
}

interface VerseSeed {
  chapter: number;
  verse: number;
  sanskrit: string;
  translit: string;
  translation: string;
  featured?: boolean;
}

const GITA_CHAPTERS: ChapterMeta[] = [
  { chapter: 1, nameSanskrit: "अर्जुनविषादयोग", nameEnglish: "Arjuna Vishada Yoga", verseCount: 47 },
  { chapter: 2, nameSanskrit: "सांख्ययोग", nameEnglish: "Sankhya Yoga", verseCount: 72 },
  { chapter: 3, nameSanskrit: "कर्मयोग", nameEnglish: "Karma Yoga", verseCount: 43 },
  { chapter: 4, nameSanskrit: "ज्ञानकर्मसंन्यासयोग", nameEnglish: "Jnana Karma Sanyasa Yoga", verseCount: 42 },
  { chapter: 5, nameSanskrit: "कर्मसंन्यासयोग", nameEnglish: "Karma Sanyasa Yoga", verseCount: 29 },
  { chapter: 6, nameSanskrit: "ध्यानयोग", nameEnglish: "Dhyana Yoga", verseCount: 47 },
  { chapter: 7, nameSanskrit: "ज्ञानविज्ञानयोग", nameEnglish: "Jnana Vijnana Yoga", verseCount: 30 },
  { chapter: 8, nameSanskrit: "अक्षरब्रह्मयोग", nameEnglish: "Akshara Brahma Yoga", verseCount: 28 },
  { chapter: 9, nameSanskrit: "राजविद्याराजगुह्ययोग", nameEnglish: "Raja Vidya Raja Guhya Yoga", verseCount: 34 },
  { chapter: 10, nameSanskrit: "विभूतियोग", nameEnglish: "Vibhuti Yoga", verseCount: 42 },
  { chapter: 11, nameSanskrit: "विश्वरूपदर्शनयोग", nameEnglish: "Vishvarupa Darshana Yoga", verseCount: 55 },
  { chapter: 12, nameSanskrit: "भक्तियोग", nameEnglish: "Bhakti Yoga", verseCount: 20 },
  { chapter: 13, nameSanskrit: "क्षेत्र-क्षेत्रज्ञविभागयोग", nameEnglish: "Kshetra Kshetrajna Vibhaga Yoga", verseCount: 35 },
  { chapter: 14, nameSanskrit: "गुणत्रयविभागयोग", nameEnglish: "Gunatraya Vibhaga Yoga", verseCount: 27 },
  { chapter: 15, nameSanskrit: "पुरुषोत्तमयोग", nameEnglish: "Purushottama Yoga", verseCount: 20 },
  { chapter: 16, nameSanskrit: "दैवासुरसम्पद्विभागयोग", nameEnglish: "Daivasura Sampad Vibhaga Yoga", verseCount: 24 },
  { chapter: 17, nameSanskrit: "श्रद्धात्रयविभागयोग", nameEnglish: "Shraddhatraya Vibhaga Yoga", verseCount: 28 },
  { chapter: 18, nameSanskrit: "मोक्षसंन्यासयोग", nameEnglish: "Moksha Sanyasa Yoga", verseCount: 78 },
];

const GITA_VERSES: VerseSeed[] = [
  // ─── Chapter 1 — Arjuna Vishada Yoga (47/47 verses, complete) ───
  {
    chapter: 1,
    verse: 1,
    sanskrit: "धृतराष्ट्र उवाच\nधर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः।\nमामकाः पाण्डवाश्चैव किमकुर्वत सञ्जय।।1.1।।",
    translit: "dhṛitarāśhtra uvācha\ndharma-kṣhetre kuru-kṣhetre samavetā yuyutsavaḥ\nmāmakāḥ pāṇḍavāśhchaiva kimakurvata sañjaya",
    translation: "Dhritarâshtra said: Tell me, O Sanjaya! Assembled on Kurukshetra, the centre of religious activity, desirous to fight, what indeed did my people and the Pândavas do?",
  },
  {
    chapter: 1,
    verse: 2,
    sanskrit: "सञ्जय उवाच\nदृष्ट्वा तु पाण्डवानीकं व्यूढं दुर्योधनस्तदा।\nआचार्यमुपसङ्गम्य राजा वचनमब्रवीत्।।1.2।।",
    translit: "sañjaya uvācha\ndṛiṣhṭvā tu pāṇḍavānīkaṁ vyūḍhaṁ duryodhanastadā\nāchāryamupasaṅgamya rājā vachanamabravīt",
    translation: "Sanjaya said: But then King Duryodhana, having seen the Pândava forces in battle-array, approached his teacher Drona, and spoke these words:",
  },
  {
    chapter: 1,
    verse: 3,
    sanskrit: "पश्यैतां पाण्डुपुत्राणामाचार्य महतीं चमूम्।\nव्यूढां द्रुपदपुत्रेण तव शिष्येण धीमता।।1.3।।",
    translit: "paśhyaitāṁ pāṇḍu-putrāṇām āchārya mahatīṁ chamūm\nvyūḍhāṁ drupada-putreṇa tava śhiṣhyeṇa dhīmatā",
    translation: "\"Behold, O Teacher! this mighty army of the sons of Pându, arrayed by the son of Drupada, thy gifted pupil.",
  },
  {
    chapter: 1,
    verse: 4,
    sanskrit: "अत्र शूरा महेष्वासा भीमार्जुनसमा युधि।\nयुयुधानो विराटश्च द्रुपदश्च महारथः।।1.4।।",
    translit: "atra śhūrā maheṣhvāsā bhīmārjuna-samā yudhi\nyuyudhāno virāṭaśhcha drupadaśhcha mahā-rathaḥ",
    translation: "\"Here (are) heroes, mighty archers, the equals in battle of Bhima and Arjuna—the great warriors Yuyudhâna, Virâta, Drupada; the valiant Dhrishtaketu, Chekitâna and the king of Kâshi; the best of men, Purujit, Kunti-Bhoja and Shaivya; the powerful Yudhâmanyu, and the brave Uttamaujas, the son of Subhadrâ, and the sons of Draupadi,—lords of great chariots.",
  },
  {
    chapter: 1,
    verse: 5,
    sanskrit: "धृष्टकेतुश्चेकितानः काशिराजश्च वीर्यवान्।\nपुरुजित्कुन्तिभोजश्च शैब्यश्च नरपुङ्गवः।।1.5।।",
    translit: "dhṛiṣhṭaketuśhchekitānaḥ kāśhirājaśhcha vīryavān\npurujit kuntibhojaśhcha śhaibyaśhcha nara-puṅgavaḥ\nyudhāmanyuśhcha vikrānta uttamaujāśhcha vīryavān",
    translation: "\"Here (are) heroes, mighty archers, the equals in battle of Bhima and Arjuna—the great warriors Yuyudhâna, Virâta, Drupada; the valiant Dhrishtaketu, Chekitâna and the king of Kâshi; the best of men, Purujit, Kunti-Bhoja and Shaivya; the powerful Yudhâmanyu, and the brave Uttamaujas, the son of Subhadrâ, and the sons of Draupadi,—lords of great chariots.",
  },
  {
    chapter: 1,
    verse: 6,
    sanskrit: "युधामन्युश्च विक्रान्त उत्तमौजाश्च वीर्यवान्।\nसौभद्रो द्रौपदेयाश्च सर्व एव महारथाः।।1.6।।",
    translit: "saubhadro draupadeyāśhcha sarva eva mahā-rathāḥ",
    translation: "\"Here (are) heroes, mighty archers, the equals in battle of Bhima and Arjuna—the great warriors Yuyudhâna, Virâta, Drupada; the valiant Dhrishtaketu, Chekitâna and the king of Kâshi; the best of men, Purujit, Kunti-Bhoja and Shaivya; the powerful Yudhâmanyu, and the brave Uttamaujas, the son of Subhadrâ, and the sons of Draupadi,—lords of great chariots.",
  },
  {
    chapter: 1,
    verse: 7,
    sanskrit: "अस्माकं तु विशिष्टा ये तान्निबोध द्विजोत्तम।\nनायका मम सैन्यस्य संज्ञार्थं तान्ब्रवीमि ते।।1.7।।",
    translit: "asmākaṁ tu viśhiṣhṭā ye tānnibodha dwijottama\nnāyakā mama sainyasya sanjñārthaṁ tānbravīmi te",
    translation: "\"Hear also, O Best of the twice-born! the names of those who (are) distinguished amongst ourselves, the leaders of my army. These I relate (to you) for your information.",
  },
  {
    chapter: 1,
    verse: 8,
    sanskrit: "भवान्भीष्मश्च कर्णश्च कृपश्च समितिञ्जयः।\nअश्वत्थामा विकर्णश्च सौमदत्तिस्तथैव च।।1.8।।",
    translit: "bhavānbhīṣhmaśhcha karṇaśhcha kṛipaśhcha samitiñjayaḥ\naśhvatthāmā vikarṇaśhcha saumadattis tathaiva cha",
    translation: "\"Yourself and Bhishma and Karna and Kripa, the victorious in war. Asvatthâmâ and Vikarna and Jayadratha, the son of Somadatta.",
  },
  {
    chapter: 1,
    verse: 9,
    sanskrit: "अन्ये च बहवः शूरा मदर्थे त्यक्तजीविताः।\nनानाशस्त्रप्रहरणाः सर्वे युद्धविशारदाः।।1.9।।",
    translit: "anye cha bahavaḥ śhūrā madarthe tyaktajīvitāḥ\nnānā-śhastra-praharaṇāḥ sarve yuddha-viśhāradāḥ",
    translation: "\"And many other heroes also, well-skilled in fight, and armed with many kinds of weapons, are here, determined to lay down their lives for my sake.",
  },
  {
    chapter: 1,
    verse: 10,
    sanskrit: "अपर्याप्तं तदस्माकं बलं भीष्माभिरक्षितम्।\nपर्याप्तं त्विदमेतेषां बलं भीमाभिरक्षितम्।।1.10।।",
    translit: "aparyāptaṁ tadasmākaṁ balaṁ bhīṣhmābhirakṣhitam\nparyāptaṁ tvidameteṣhāṁ balaṁ bhīmābhirakṣhitam",
    translation: "\"This our army defended by Bhishma (is) impossible to be counted, but that army of theirs, defended by Bhima (is) easy to number.",
  },
  {
    chapter: 1,
    verse: 11,
    sanskrit: "अयनेषु च सर्वेषु यथाभागमवस्थिताः।\nभीष्ममेवाभिरक्षन्तु भवन्तः सर्व एव हि।।1.11।।",
    translit: "ayaneṣhu cha sarveṣhu yathā-bhāgamavasthitāḥ\nbhīṣhmamevābhirakṣhantu bhavantaḥ sarva eva hi",
    translation: "\"(Now) do, being stationed in your proper places in the divisions of the army, support Bhishma alone.\"",
  },
  {
    chapter: 1,
    verse: 12,
    sanskrit: "तस्य संजनयन्हर्षं कुरुवृद्धः पितामहः।\nसिंहनादं विनद्योच्चैः शङ्खं दध्मौ प्रतापवान्।।1.12।।",
    translit: "tasya sañjanayan harṣhaṁ kuru-vṛiddhaḥ pitāmahaḥ\nsiṁha-nādaṁ vinadyochchaiḥ śhaṅkhaṁ dadhmau pratāpavān",
    translation: "That powerful, oldest of the Kurus, Bhishma the grandsire, in order to cheer Duryodhana, now sounded aloud a lion-roar and blew his conch.",
  },
  {
    chapter: 1,
    verse: 13,
    sanskrit: "ततः शङ्खाश्च भेर्यश्च पणवानकगोमुखाः।\nसहसैवाभ्यहन्यन्त स शब्दस्तुमुलोऽभवत्।।1.13।।",
    translit: "tataḥ śhaṅkhāśhcha bheryaśhcha paṇavānaka-gomukhāḥ\nsahasaivābhyahanyanta sa śhabdastumulo ’bhavat",
    translation: "Then following Bhishma, conches and kettle-drums, tabors, trumpets and cowhorns blared forth suddenly from the Kaurava side and the noise was tremendous.",
  },
  {
    chapter: 1,
    verse: 14,
    sanskrit: "ततः श्वेतैर्हयैर्युक्ते महति स्यन्दने स्थितौ।\nमाधवः पाण्डवश्चैव दिव्यौ शङ्खौ प्रदध्मतुः।।1.14।।",
    translit: "tataḥ śhvetairhayairyukte mahati syandane sthitau\nmādhavaḥ pāṇḍavaśhchaiva divyau śhaṅkhau pradadhmatuḥ",
    translation: "Then, also, Mâdhava and Pândava, stationed in their magnificent chariot yoked with white horses, blew their divine conches with a furious noise.",
  },
  {
    chapter: 1,
    verse: 15,
    sanskrit: "पाञ्चजन्यं हृषीकेशो देवदत्तं धनंजयः।\nपौण्ड्रं दध्मौ महाशङ्खं भीमकर्मा वृकोदरः।।1.15।।",
    translit: "pāñchajanyaṁ hṛiṣhīkeśho devadattaṁ dhanañjayaḥ\npauṇḍraṁ dadhmau mahā-śhaṅkhaṁ bhīma-karmā vṛikodaraḥ",
    translation: "Hrishikesha blew the Pânchajanya, Dhananjaya, the Devadatta, and Vrikodara, the doer of terrific deeds, his large conch Paundra.",
  },
  {
    chapter: 1,
    verse: 16,
    sanskrit: "अनन्तविजयं राजा कुन्तीपुत्रो युधिष्ठिरः।\nनकुलः सहदेवश्च सुघोषमणिपुष्पकौ।।1.16।।",
    translit: "anantavijayaṁ rājā kuntī-putro yudhiṣhṭhiraḥ\nnakulaḥ sahadevaśhcha sughoṣha-maṇipuṣhpakau",
    translation: "King Yudhishthira, son of Kunti, blew the conch named Anantavijaya, and Nakula and Sahadeva, their Sughosha and Manipushpaka.",
  },
  {
    chapter: 1,
    verse: 17,
    sanskrit: "काश्यश्च परमेष्वासः शिखण्डी च महारथः।\nधृष्टद्युम्नो विराटश्च सात्यकिश्चापराजितः।।1.17।।",
    translit: "kāśhyaśhcha parameṣhvāsaḥ śhikhaṇḍī cha mahā-rathaḥ\ndhṛiṣhṭadyumno virāṭaśhcha sātyakiśh chāparājitaḥ",
    translation: "The expert bowman, king of Kâshi, and the great warrior Shikhandi, Dhrishtadyumna and Virâta and the unconquered Sâtyaki;",
  },
  {
    chapter: 1,
    verse: 18,
    sanskrit: "द्रुपदो द्रौपदेयाश्च सर्वशः पृथिवीपते।\nसौभद्रश्च महाबाहुः शङ्खान्दध्मुः पृथक्पृथक्।।1.18।।",
    translit: "drupado draupadeyāśhcha sarvaśhaḥ pṛithivī-pate\nsaubhadraśhcha mahā-bāhuḥ śhaṅkhāndadhmuḥ pṛithak pṛithak",
    translation: "O Lord of Earth! Drupada and the sons of Draupadi, and the mighty-armed son of Subhadrâ, all, also blew each his own conch.",
  },
  {
    chapter: 1,
    verse: 19,
    sanskrit: "स घोषो धार्तराष्ट्राणां हृदयानि व्यदारयत्।\nनभश्च पृथिवीं चैव तुमुलो व्यनुनादयन्।।1.19।।",
    translit: "sa ghoṣho dhārtarāṣhṭrāṇāṁ hṛidayāni vyadārayat\nnabhaśhcha pṛithivīṁ chaiva tumulo nunādayan",
    translation: "And the terrific noise resounding throughout heaven and earth rent the hearts of Dhritarâshtra's party.",
  },
  {
    chapter: 1,
    verse: 20,
    sanskrit: "अथ व्यवस्थितान् दृष्ट्वा धार्तराष्ट्रान्कपिध्वजः।\nप्रवृत्ते शस्त्रसंपाते धनुरुद्यम्य पाण्डवः।।1.20।।",
    translit: "atha vyavasthitān dṛiṣhṭvā dhārtarāṣhṭrān kapi-dhwajaḥ\npravṛitte śhastra-sampāte dhanurudyamya pāṇḍavaḥ\nhṛiṣhīkeśhaṁ tadā vākyam idam āha mahī-pate",
    translation: "Then, O Lord of Earth, seeing Dhritarâshtra's party standing marshalled and the shooting about to begin, that Pândava whose ensign was the monkey, raising his bow, said the following words to Krishna:",
  },
  {
    chapter: 1,
    verse: 21,
    sanskrit: "अर्जुन उवाच\nहृषीकेशं तदा वाक्यमिदमाह महीपते।\nसेनयोरुभयोर्मध्ये रथं स्थापय मेऽच्युत।।1.21।।",
    translit: "arjuna uvācha\nsenayor ubhayor madhye rathaṁ sthāpaya me ’chyuta",
    translation: "Arjuna said: Place my chariot, O Achyuta! between the two armies that I may see those who stand here prepared for war. On this eve of battle (let me know) with whom I have to fight.",
  },
  {
    chapter: 1,
    verse: 22,
    sanskrit: "यावदेतान्निरीक्षेऽहं योद्धुकामानवस्थितान्।\nकैर्मया सह योद्धव्यमस्मिन्रणसमुद्यमे।।1.22।।",
    translit: "yāvadetān nirīkṣhe ’haṁ yoddhu-kāmān avasthitān\nkairmayā saha yoddhavyam asmin raṇa-samudyame",
    translation: "Arjuna said: Place my chariot, O Achyuta! between the two armies that I may see those who stand here prepared for war. On this eve of battle (let me know) with whom I have to fight.",
  },
  {
    chapter: 1,
    verse: 23,
    sanskrit: "योत्स्यमानानवेक्षेऽहं य एतेऽत्र समागताः।\nधार्तराष्ट्रस्य दुर्बुद्धेर्युद्धे प्रियचिकीर्षवः।।1.23।।",
    translit: "yotsyamānān avekṣhe ’haṁ ya ete ’tra samāgatāḥ\ndhārtarāṣhṭrasya durbuddher yuddhe priya-chikīrṣhavaḥ",
    translation: "For I desire to observe those who are assembled here for fight, wishing to please the evil-minded Duryodhana by taking his side on this battle-field.",
  },
  {
    chapter: 1,
    verse: 24,
    sanskrit: "संजय उवाच\nएवमुक्तो हृषीकेशो गुडाकेशेन भारत।\nसेनयोरुभयोर्मध्ये स्थापयित्वा रथोत्तमम्।।1.24।।",
    translit: "sañjaya uvācha\nevam ukto hṛiṣhīkeśho guḍākeśhena bhārata\nsenayor ubhayor madhye sthāpayitvā rathottamam",
    translation: "Sanjaya said: Commanded thus by Gudâkesha, Hrishikesha, O Bhârata, drove that grandest of chariots to a place between the two hosts, facing Bhishma, Drona and all the rulers of the earth, and then spoke thus, \"Behold, O Pârtha, all the Kurus gathered together!\"",
  },
  {
    chapter: 1,
    verse: 25,
    sanskrit: "भीष्मद्रोणप्रमुखतः सर्वेषां च महीक्षिताम्।\nउवाच पार्थ पश्यैतान्समवेतान्कुरूनिति।।1.25।।",
    translit: "bhīṣhma-droṇa-pramukhataḥ sarveṣhāṁ cha mahī-kṣhitām\nuvācha pārtha paśhyaitān samavetān kurūn iti",
    translation: "Sanjaya said: Commanded thus by Gudâkesha, Hrishikesha, O Bhârata, drove that grandest of chariots to a place between the two hosts, facing Bhishma, Drona and all the rulers of the earth, and then spoke thus, \"Behold, O Pârtha, all the Kurus gathered together!\"",
  },
  {
    chapter: 1,
    verse: 26,
    sanskrit: "तत्रापश्यत्स्थितान्पार्थः पितृ़नथ पितामहान्।\nआचार्यान्मातुलान्भ्रातृ़न्पुत्रान्पौत्रान्सखींस्तथा।।1.26।।",
    translit: "tatrāpaśhyat sthitān pārthaḥ pitṝīn atha pitāmahān\nāchāryān mātulān bhrātṝīn putrān pautrān sakhīṁs tathā\nśhvaśhurān suhṛidaśh chaiva senayor ubhayor api",
    translation: "Then saw Pârtha stationed there in both the armies, grandfathers, fathers-in-law and uncles, brothers and cousins, his own and their sons and grandsons, and comrades, teachers, and other friends as well.",
  },
  {
    chapter: 1,
    verse: 27,
    sanskrit: "श्वशुरान्सुहृदश्चैव सेनयोरुभयोरपि।\nतान्समीक्ष्य स कौन्तेयः सर्वान्बन्धूनवस्थितान्।।1.27।।",
    translit: "tān samīkṣhya sa kaunteyaḥ sarvān bandhūn avasthitān\nkṛipayā parayāviṣhṭo viṣhīdann idam abravīt",
    translation: "Then he, the son of Kunti, seeing all those kinsmen stationed in their ranks, spoke thus sorrowfully, filled with deep compassion.",
  },
  {
    chapter: 1,
    verse: 28,
    sanskrit: "अर्जुन उवाच\nकृपया परयाऽऽविष्टो विषीदन्निदमब्रवीत्।\nदृष्ट्वेमं स्वजनं कृष्ण युयुत्सुं समुपस्थितम्।।1.28।।",
    translit: "arjuna uvācha\ndṛiṣhṭvemaṁ sva-janaṁ kṛiṣhṇa yuyutsuṁ samupasthitam",
    translation: "Arjuna said: Seeing, O Krishna, these my kinsmen gathered here, eager for fight, my limbs fail me, and my mouth is parched up. I shiver all over, and my hair stands on end. The bow Gândiva slips from my hand, and my skin burns.",
  },
  {
    chapter: 1,
    verse: 29,
    sanskrit: "सीदन्ति मम गात्राणि मुखं च परिशुष्यति।\nवेपथुश्च शरीरे मे रोमहर्षश्च जायते।।1.29।।",
    translit: "sīdanti mama gātrāṇi mukhaṁ cha pariśhuṣhyati\nvepathuśh cha śharīre me roma-harṣhaśh cha jāyate",
    translation: "Arjuna said: Seeing, O Krishna, these my kinsmen gathered here, eager for fight, my limbs fail me, and my mouth is parched up. I shiver all over, and my hair stands on end. The bow Gândiva slips from my hand, and my skin burns.",
  },
  {
    chapter: 1,
    verse: 30,
    sanskrit: "गाण्डीवं स्रंसते हस्तात्त्वक्चैव परिदह्यते।\nन च शक्नोम्यवस्थातुं भ्रमतीव च मे मनः।।1.30।।",
    translit: "gāṇḍīvaṁ sraṁsate hastāt tvak chaiva paridahyate\nna cha śhaknomy avasthātuṁ bhramatīva cha me manaḥ",
    translation: "Neither, O Keshava, can I stand upright. My mind is in a whirl. And I see adverse omens.",
  },
  {
    chapter: 1,
    verse: 31,
    sanskrit: "निमित्तानि च पश्यामि विपरीतानि केशव।\nन च श्रेयोऽनुपश्यामि हत्वा स्वजनमाहवे।।1.31।।",
    translit: "nimittāni cha paśhyāmi viparītāni keśhava\nna cha śhreyo ’nupaśhyāmi hatvā sva-janam āhave",
    translation: "Neither, O Krishna, do I see any good in killing these my own people in battle. I desire neither victory nor empire, nor yet pleasure.",
  },
  {
    chapter: 1,
    verse: 32,
    sanskrit: "न काङ्क्षे विजयं कृष्ण न च राज्यं सुखानि च।\nकिं नो राज्येन गोविन्द किं भोगैर्जीवितेन वा।।1.32।।",
    translit: "na kāṅkṣhe vijayaṁ kṛiṣhṇa na cha rājyaṁ sukhāni cha\nkiṁ no rājyena govinda kiṁ bhogair jīvitena vā",
    translation: "Of what avail is dominion to us, of what avail are pleasures and even life, if these, O Govinda! for whose sake it is desired that empire, enjoyment and pleasure should be ours, themselves stand here in battle, having renounced life and wealth—Teachers, uncles, sons and also grandfathers, maternal uncles, fathers-in-law, grandsons, brothers-in-law, besides other kinsmen.",
  },
  {
    chapter: 1,
    verse: 33,
    sanskrit: "येषामर्थे काङ्क्षितं नो राज्यं भोगाः सुखानि च।\nत इमेऽवस्थिता युद्धे प्राणांस्त्यक्त्वा धनानि च।।1.33।।",
    translit: "yeṣhām arthe kāṅkṣhitaṁ no rājyaṁ bhogāḥ sukhāni cha\nta ime ’vasthitā yuddhe prāṇāṁs tyaktvā dhanāni cha",
    translation: "Of what avail is dominion to us, of what avail are pleasures and even life, if these, O Govinda! for whose sake it is desired that empire, enjoyment and pleasure should be ours, themselves stand here in battle, having renounced life and wealth—Teachers, uncles, sons and also grandfathers, maternal uncles, fathers-in-law, grandsons, brothers-in-law, besides other kinsmen.",
  },
  {
    chapter: 1,
    verse: 34,
    sanskrit: "आचार्याः पितरः पुत्रास्तथैव च पितामहाः।\nमातुलाः श्चशुराः पौत्राः श्यालाः सम्बन्धिनस्तथा।।1.34।।",
    translit: "āchāryāḥ pitaraḥ putrās tathaiva cha pitāmahāḥ\nmātulāḥ śhvaśhurāḥ pautrāḥ śhyālāḥ sambandhinas tathā",
    translation: "Of what avail is dominion to us, of what avail are pleasures and even life, if these, O Govinda! for whose sake it is desired that empire, enjoyment and pleasure should be ours, themselves stand here in battle, having renounced life and wealth—Teachers, uncles, sons and also grandfathers, maternal uncles, fathers-in-law, grandsons, brothers-in-law, besides other kinsmen.",
  },
  {
    chapter: 1,
    verse: 35,
    sanskrit: "एतान्न हन्तुमिच्छामि घ्नतोऽपि मधुसूदन।\nअपि त्रैलोक्यराज्यस्य हेतोः किं नु महीकृते।।1.35।।",
    translit: "etān na hantum ichchhāmi ghnato ’pi madhusūdana\napi trailokya-rājyasya hetoḥ kiṁ nu mahī-kṛite",
    translation: "Even though these were to kill me, O slayer of Madhu, I could not wish to kill them, not even for the sake of dominion over the three worlds, how much less for the sake of the earth!",
  },
  {
    chapter: 1,
    verse: 36,
    sanskrit: "निहत्य धार्तराष्ट्रान्नः का प्रीतिः स्याज्जनार्दन।\nपापमेवाश्रयेदस्मान्हत्वैतानाततायिनः।।1.36।।",
    translit: "nihatya dhārtarāṣhṭrān naḥ kā prītiḥ syāj janārdana\npāpam evāśhrayed asmān hatvaitān ātatāyinaḥ",
    translation: "What pleasure indeed could be ours, O Jnanârdana, from killing these sons of Dhritarâshtra? Sin only could take hold of us by the slaying of these felons.",
  },
  {
    chapter: 1,
    verse: 37,
    sanskrit: "तस्मान्नार्हा वयं हन्तुं धार्तराष्ट्रान्स्वबान्धवान्।\nस्वजनं हि कथं हत्वा सुखिनः स्याम माधव।।1.37।।",
    translit: "tasmān nārhā vayaṁ hantuṁ dhārtarāṣhṭrān sa-bāndhavān\nsva-janaṁ hi kathaṁ hatvā sukhinaḥ syāma mādhava",
    translation: "Therefore ought we not to kill our kindred, the sons of Dhritarâshtra. For how could we, O Mâdhava, gain happiness by the slaying of our own kinsmen?",
  },
  {
    chapter: 1,
    verse: 38,
    sanskrit: "यद्यप्येते न पश्यन्ति लोभोपहतचेतसः।\nकुलक्षयकृतं दोषं मित्रद्रोहे च पातकम्।।1.38।।",
    translit: "yady apy ete na paśhyanti lobhopahata-chetasaḥ\nkula-kṣhaya-kṛitaṁ doṣhaṁ mitra-drohe cha pātakam",
    translation: "Though these, with understanding overpowered by greed, see no evil due to decay of families, and no sin in hostility to friends, why should we, O Janârdana, who see clearly the evil due to the decay of families, not turn away from this sin?",
  },
  {
    chapter: 1,
    verse: 39,
    sanskrit: "कथं न ज्ञेयमस्माभिः पापादस्मान्निवर्तितुम्।\nकुलक्षयकृतं दोषं प्रपश्यद्भिर्जनार्दन।।1.39।।",
    translit: "kathaṁ na jñeyam asmābhiḥ pāpād asmān nivartitum\nkula-kṣhaya-kṛitaṁ doṣhaṁ prapaśhyadbhir janārdana",
    translation: "Though these, with understanding overpowered by greed, see no evil due to decay of families, and no sin in hostility to friends, why should we, O Janârdana, who see clearly the evil due to the decay of families, not turn away from this sin?",
  },
  {
    chapter: 1,
    verse: 40,
    sanskrit: "कुलक्षये प्रणश्यन्ति कुलधर्माः सनातनाः।\nधर्मे नष्टे कुलं कृत्स्नमधर्मोऽभिभवत्युत।।1.40।।",
    translit: "kula-kṣhaye praṇaśhyanti kula-dharmāḥ sanātanāḥ\ndharme naṣhṭe kulaṁ kṛitsnam adharmo ’bhibhavaty uta",
    translation: "On the decay of a family the immemorial religious rites of that family die out. On the destruction of spirituality, impiety further overwhelms the whole of the family.",
  },
  {
    chapter: 1,
    verse: 41,
    sanskrit: "अधर्माभिभवात्कृष्ण प्रदुष्यन्ति कुलस्त्रियः।\nस्त्रीषु दुष्टासु वार्ष्णेय जायते वर्णसङ्करः।।1.41।।",
    translit: "adharmābhibhavāt kṛiṣhṇa praduṣhyanti kula-striyaḥ\nstrīṣhu duṣhṭāsu vārṣhṇeya jāyate varṇa-saṅkaraḥ",
    translation: "On the prevalence of impiety, O Krishna, the women of the family become corrupt; and women being corrupted, there arises, O Vârshneya, intermingling of castes.",
  },
  {
    chapter: 1,
    verse: 42,
    sanskrit: "सङ्करो नरकायैव कुलघ्नानां कुलस्य च।\nपतन्ति पितरो ह्येषां लुप्तपिण्डोदकक्रियाः।।1.42।।",
    translit: "saṅkaro narakāyaiva kula-ghnānāṁ kulasya cha\npatanti pitaro hy eṣhāṁ lupta-piṇḍodaka-kriyāḥ",
    translation: "Admixture of castes, indeed, is for the hell of the family and the destroyers of the family; their ancestors fall, deprived of the offerings of rice-ball and water.",
  },
  {
    chapter: 1,
    verse: 43,
    sanskrit: "दोषैरेतैः कुलघ्नानां वर्णसङ्करकारकैः।\nउत्साद्यन्ते जातिधर्माः कुलधर्माश्च शाश्वताः।।1.43।।",
    translit: "doṣhair etaiḥ kula-ghnānāṁ varṇa-saṅkara-kārakaiḥ\nutsādyante jāti-dharmāḥ kula-dharmāśh cha śhāśhvatāḥ",
    translation: "By these misdeeds of the destroyers of the family, bringing about confusion of castes, are the immemorial religious rites of the caste and the family destroyed.",
  },
  {
    chapter: 1,
    verse: 44,
    sanskrit: "उत्सन्नकुलधर्माणां मनुष्याणां जनार्दन।\nनरकेऽनियतं वासो भवतीत्यनुशुश्रुम।।1.44।।",
    translit: "utsanna-kula-dharmāṇāṁ manuṣhyāṇāṁ janārdana\nnarake ‘niyataṁ vāso bhavatītyanuśhuśhruma",
    translation: "We have heard, O Janârdana, that inevitable is the dwelling in hell of those men in whose families religious practices have been destroyed.",
  },
  {
    chapter: 1,
    verse: 45,
    sanskrit: "अहो बत महत्पापं कर्तुं व्यवसिता वयम्।\nयद्राज्यसुखलोभेन हन्तुं स्वजनमुद्यताः।।1.45।।",
    translit: "aho bata mahat pāpaṁ kartuṁ vyavasitā vayam\nyad rājya-sukha-lobhena hantuṁ sva-janam udyatāḥ",
    translation: "Alas, we are involved in a great sin, in that we are prepared to slay our kinsmen, from greed of the pleasures of a kingdom!",
  },
  {
    chapter: 1,
    verse: 46,
    sanskrit: "यदि मामप्रतीकारमशस्त्रं शस्त्रपाणयः।\nधार्तराष्ट्रा रणे हन्युस्तन्मे क्षेमतरं भवेत्।।1.46।।",
    translit: "yadi mām apratīkāram aśhastraṁ śhastra-pāṇayaḥ\ndhārtarāṣhṭrā raṇe hanyus tan me kṣhemataraṁ bhavet",
    translation: "Verily, if the sons of Dhritarâshtra, weapons in hand, were to slay me, unresisting and unarmed, in the battle, that would be better for me.",
  },
  {
    chapter: 1,
    verse: 47,
    sanskrit: "सञ्जय उवाच\nएवमुक्त्वाऽर्जुनः संख्ये रथोपस्थ उपाविशत्।\nविसृज्य सशरं चापं शोकसंविग्नमानसः।।1.47।।",
    translit: "sañjaya uvācha\nevam uktvārjunaḥ saṅkhye rathopastha upāviśhat\nvisṛijya sa-śharaṁ chāpaṁ śhoka-saṁvigna-mānasaḥ",
    translation: "Sanjaya said: Speaking thus in the midst of the battle-field, Arjuna casting away his bow and arrows, sank down on the seat of his chariot, with his mind distressed with sorrow.",
  },
  // ─── Chapter 2 — Sankhya Yoga (72/72 verses, complete) ───
  {
    chapter: 2,
    verse: 1,
    sanskrit: "सञ्जय उवाच\nतं तथा कृपयाऽविष्टमश्रुपूर्णाकुलेक्षणम्।\nविषीदन्तमिदं वाक्यमुवाच मधुसूदनः।।2.1।।",
    translit: "sañjaya uvācha\ntaṁ tathā kṛipayāviṣhṭamaśhru pūrṇākulekṣhaṇam\nviṣhīdantamidaṁ vākyam uvācha madhusūdanaḥ",
    translation: "Sanjaya said: To him who was thus overwhelmed with pity and sorrowing, and whose eyes were dimmed with tears, Madhusudana spoke these words:",
  },
  {
    chapter: 2,
    verse: 2,
    sanskrit: "श्री भगवानुवाच\nकुतस्त्वा कश्मलमिदं विषमे समुपस्थितम्।\nअनार्यजुष्टमस्वर्ग्यमकीर्तिकरमर्जुन।।2.2।।",
    translit: "śhrī bhagavān uvācha\nkutastvā kaśhmalamidaṁ viṣhame samupasthitam\nanārya-juṣhṭamaswargyam akīrti-karam arjuna",
    translation: "The Blessed Lord said: In such a crisis, whence comes upon thee, O Arjuna, this dejection, un-Aryalike, disgraceful and contrary to the attainment of heaven?",
  },
  {
    chapter: 2,
    verse: 3,
    sanskrit: "क्लैब्यं मा स्म गमः पार्थ नैतत्त्वय्युपपद्यते।\nक्षुद्रं हृदयदौर्बल्यं त्यक्त्वोत्तिष्ठ परन्तप।।2.3।।",
    translit: "klaibyaṁ mā sma gamaḥ pārtha naitat tvayyupapadyate\nkṣhudraṁ hṛidaya-daurbalyaṁ tyaktvottiṣhṭha parantapa",
    translation: "Yield not to unmanliness, O son of Prithâ! Ill doth it become thee. Cast off this mean faint-heartedness and arise, O scorcher of thine enemies!",
  },
  {
    chapter: 2,
    verse: 4,
    sanskrit: "अर्जुन उवाच\nकथं भीष्ममहं संख्ये द्रोणं च मधुसूदन।\nइषुभिः प्रतियोत्स्यामि पूजार्हावरिसूदन।।2.4।।",
    translit: "arjuna uvācha\nkathaṁ bhīṣhmam ahaṁ sankhye droṇaṁ cha madhusūdana\niṣhubhiḥ pratiyotsyāmi pūjārhāvari-sūdana",
    translation: "Arjuna said: —But how can I, in battle, O slayer of Madhu, fight with arrows against Bhishma and Drona, who are rather worthy to be worshipped, O destroyer of foes!",
  },
  {
    chapter: 2,
    verse: 5,
    sanskrit: "गुरूनहत्वा हि महानुभावान्\nश्रेयो भोक्तुं भैक्ष्यमपीह लोके।\nहत्वार्थकामांस्तु गुरूनिहैव\nभुञ्जीय भोगान् रुधिरप्रदिग्धान्।।2.5।।",
    translit: "gurūnahatvā hi mahānubhāvān\nśhreyo bhoktuṁ bhaikṣhyamapīha loke\nhatvārtha-kāmāṁstu gurūnihaiva\nbhuñjīya bhogān rudhira-pradigdhān",
    translation: "Surely it would be better even to eat the bread of beggary in this life than to slay these great-souled masters. But if I kill them, even in this world, all my enjoyment of wealth and desires will be stained with blood.",
  },
  {
    chapter: 2,
    verse: 6,
    sanskrit: "न चैतद्विद्मः कतरन्नो गरीयो\nयद्वा जयेम यदि वा नो जयेयुः।\nयानेव हत्वा न जिजीविषाम\nस्तेऽवस्थिताः प्रमुखे धार्तराष्ट्राः।।2.6।।",
    translit: "na chaitadvidmaḥ kataranno garīyo\nyadvā jayema yadi vā no jayeyuḥ\nyāneva hatvā na jijīviṣhāmas\nte ’vasthitāḥ pramukhe dhārtarāṣhṭrāḥ",
    translation: "And indeed I can scarcely tell which will be better, that we should conquer them, or that they should conquer us. The very sons of Dhritarâshtra,—after slaying whom we should not care to live,—stand facing us.",
  },
  {
    chapter: 2,
    verse: 7,
    sanskrit: "कार्पण्यदोषोपहतस्वभावः\nपृच्छामि त्वां धर्मसंमूढचेताः।\nयच्छ्रेयः स्यान्निश्िचतं ब्रूहि तन्मे\nशिष्यस्तेऽहं शाधि मां त्वां प्रपन्नम्।।2.7।।",
    translit: "kārpaṇya-doṣhopahata-svabhāvaḥ\npṛichchhāmi tvāṁ dharma-sammūḍha-chetāḥ\nyach-chhreyaḥ syānniśhchitaṁ brūhi tanme\nśhiṣhyaste ’haṁ śhādhi māṁ tvāṁ prapannam",
    translation: "With my nature overpowered by weak commiseration, with a mind in confusion about duty, I supplicate Thee. Say decidedly what is good for me. I am Thy disciple. Instruct me who have taken refuge in Thee.",
  },
  {
    chapter: 2,
    verse: 8,
    sanskrit: "न हि प्रपश्यामि ममापनुद्या\nद्यच्छोकमुच्छोषणमिन्द्रियाणाम्।\nअवाप्य भूमावसपत्नमृद्धम्\nराज्यं सुराणामपि चाधिपत्यम्।।2.8।।",
    translit: "na hi prapaśhyāmi mamāpanudyād\nyach-chhokam uchchhoṣhaṇam-indriyāṇām\navāpya bhūmāv-asapatnamṛiddhaṁ\nrājyaṁ surāṇāmapi chādhipatyam",
    translation: "I do not see anything to remove this sorrow which blasts my senses, even were I to obtain unrivalled and flourishing dominion over the earth, and mastery over the gods.",
  },
  {
    chapter: 2,
    verse: 9,
    sanskrit: "सञ्जय उवाच\nएवमुक्त्वा हृषीकेशं गुडाकेशः परन्तप।\nन योत्स्य इति गोविन्दमुक्त्वा तूष्णीं बभूव ह।।2.9।।",
    translit: "sañjaya uvācha\nevam-uktvā hṛiṣhīkeśhaṁ guḍākeśhaḥ parantapa\nna yotsya iti govindam uktvā tūṣhṇīṁ babhūva ha",
    translation: "Sanjaya said: Having spoken thus to the Lord of the senses, Gudâkesha, the scorcher of foes, said to Govinda, \"I shall not fight,\" and became silent.",
  },
  {
    chapter: 2,
    verse: 10,
    sanskrit: "तमुवाच हृषीकेशः प्रहसन्निव भारत।\nसेनयोरुभयोर्मध्ये विषीदन्तमिदं वचः।।2.10।।",
    translit: "tam-uvācha hṛiṣhīkeśhaḥ prahasanniva bhārata\nsenayorubhayor-madhye viṣhīdantam-idaṁ vachaḥ",
    translation: "To him who was sorrowing in the midst of the two armies, Hrishikesha, as if smiling, O descendant of Bharata! spoke these words.",
  },
  {
    chapter: 2,
    verse: 11,
    sanskrit: "श्री भगवानुवाच\nअशोच्यानन्वशोचस्त्वं प्रज्ञावादांश्च भाषसे।\nगतासूनगतासूंश्च नानुशोचन्ति पण्डिताः।।2.11।।",
    translit: "śhrī bhagavān uvācha\naśhochyān-anvaśhochas-tvaṁ prajñā-vādānśh cha bhāṣhase\ngatāsūn-agatāsūnśh-cha nānuśhochanti paṇḍitāḥ",
    translation: "The Blessed Lord said: Thou hast been mourning for them who should not be mourned for. Yet thou speakest words of wisdom. The (truly) wise grieve neither for the living nor the dead.",
  },
  {
    chapter: 2,
    verse: 12,
    sanskrit: "न त्वेवाहं जातु नासं न त्वं नेमे जनाधिपाः।\nन चैव न भविष्यामः सर्वे वयमतः परम्।।2.12।।",
    translit: "na tvevāhaṁ jātu nāsaṁ na tvaṁ neme janādhipāḥ\nna chaiva na bhaviṣhyāmaḥ sarve vayamataḥ param",
    translation: "It is not that I have never existed, nor thou, nor these kings. Nor is it that we shall cease to exist in the future.",
  },
  {
    chapter: 2,
    verse: 13,
    sanskrit: "देहिनोऽस्मिन्यथा देहे कौमारं यौवनं जरा।\nतथा देहान्तरप्राप्तिर्धीरस्तत्र न मुह्यति।।2.13।।",
    translit: "dehino ’smin yathā dehe kaumāraṁ yauvanaṁ jarā\ntathā dehāntara-prāptir dhīras tatra na muhyati",
    translation: "As are childhood, youth, and old age, in this body, to the embodied soul, so also is the attaining of another body. Calm souls are not deluded thereat.",
  },
  {
    chapter: 2,
    verse: 14,
    sanskrit: "मात्रास्पर्शास्तु कौन्तेय शीतोष्णसुखदुःखदाः।\nआगमापायिनोऽनित्यास्तांस्तितिक्षस्व भारत।।2.14।।",
    translit: "mātrā-sparśhās tu kaunteya śhītoṣhṇa-sukha-duḥkha-dāḥ\nāgamāpāyino ’nityās tans-titikṣhasva bhārata",
    translation: "Notions of heat and cold, of pain and pleasure, are born, O son of Kunti, only of the contact of the senses with their objects. They have a beginning and an end. They are impermanent in their nature. Bear them patiently, O descendant of Bharata.",
    featured: true,
  },
  {
    chapter: 2,
    verse: 15,
    sanskrit: "यं हि न व्यथयन्त्येते पुरुषं पुरुषर्षभ।\nसमदुःखसुखं धीरं सोऽमृतत्वाय कल्पते।।2.15।।",
    translit: "yaṁ hi na vyathayantyete puruṣhaṁ puruṣharṣhabha\nsama-duḥkha-sukhaṁ dhīraṁ so ’mṛitatvāya kalpate",
    translation: "That calm man who is the same in pain and pleasure, whom these cannot disturb, alone is able, O great amongst men, to attain to immortality.",
  },
  {
    chapter: 2,
    verse: 16,
    sanskrit: "नासतो विद्यते भावो नाभावो विद्यते सतः।\nउभयोरपि दृष्टोऽन्तस्त्वनयोस्तत्त्वदर्शिभिः।।2.16।।",
    translit: "nāsato vidyate bhāvo nābhāvo vidyate sataḥ\nubhayorapi dṛiṣhṭo ’nta stvanayos tattva-darśhibhiḥ",
    translation: "The unreal never is. The Real never is not. Men possessed of the knowledge of the Truth fully know both these.",
  },
  {
    chapter: 2,
    verse: 17,
    sanskrit: "अविनाशि तु तद्विद्धि येन सर्वमिदं ततम्।\nविनाशमव्ययस्यास्य न कश्चित् कर्तुमर्हति।।2.17।।",
    translit: "avināśhi tu tadviddhi yena sarvam idaṁ tatam\nvināśham avyayasyāsya na kaśhchit kartum arhati",
    translation: "That by which all this is pervaded,—That know for certain to be indestructible. None has the power to destroy this Immutable.",
  },
  {
    chapter: 2,
    verse: 18,
    sanskrit: "अन्तवन्त इमे देहा नित्यस्योक्ताः शरीरिणः।\nअनाशिनोऽप्रमेयस्य तस्माद्युध्यस्व भारत।।2.18।।",
    translit: "antavanta ime dehā nityasyoktāḥ śharīriṇaḥ\nanāśhino ’prameyasya tasmād yudhyasva bhārata",
    translation: "Of this indwelling Self, the ever-changeless, the indestructible, the illimitable,—these bodies are said to have an end. Fight therefore, O descendant of Bharata.",
  },
  {
    chapter: 2,
    verse: 19,
    sanskrit: "य एनं वेत्ति हन्तारं यश्चैनं मन्यते हतम्।\nउभौ तौ न विजानीतो नायं हन्ति न हन्यते।।2.19।।",
    translit: "ya enaṁ vetti hantāraṁ yaśh chainaṁ manyate hatam\nubhau tau na vijānīto nāyaṁ hanti na hanyate",
    translation: "He who takes the Self to be the slayer, he who takes It to be the slain, neither of these knows. It does not slay, nor is It slain.",
  },
  {
    chapter: 2,
    verse: 20,
    sanskrit: "न जायते म्रियते वा कदाचि\nन्नायं भूत्वा भविता वा न भूयः।\nअजो नित्यः शाश्वतोऽयं पुराणो\nन हन्यते हन्यमाने शरीरे।।2.20।।",
    translit: "na jāyate mriyate vā kadāchin\nnāyaṁ bhūtvā bhavitā vā na bhūyaḥ\najo nityaḥ śhāśhvato ’yaṁ purāṇo\nna hanyate hanyamāne śharīre",
    translation: "This is never born, nor does It die. It is not that not having been It again comes into being. (Or according to another view: It is not that having been It again ceases to be). This is unborn, eternal, changeless, ever-Itself. It is not killed when the body is killed.",
    featured: true,
  },
  {
    chapter: 2,
    verse: 21,
    sanskrit: "वेदाविनाशिनं नित्यं य एनमजमव्ययम्।\nकथं स पुरुषः पार्थ कं घातयति हन्ति कम्।।2.21।।",
    translit: "vedāvināśhinaṁ nityaṁ ya enam ajam avyayam\nkathaṁ sa puruṣhaḥ pārtha kaṁ ghātayati hanti kam",
    translation: "He that knows This to be indestructible, changeless, without birth, and immutable, how is he, O son of Prithâ, to slay or cause another to slay?",
  },
  {
    chapter: 2,
    verse: 22,
    sanskrit: "वासांसि जीर्णानि यथा विहाय\nनवानि गृह्णाति नरोऽपराणि।\nतथा शरीराणि विहाय जीर्णा\nन्यन्यानि संयाति नवानि देही।।2.22।।",
    translit: "vāsānsi jīrṇāni yathā vihāya\nnavāni gṛihṇāti naro ’parāṇi\ntathā śharīrāṇi vihāya jīrṇānya\nnyāni sanyāti navāni dehī",
    translation: "Even as a man casts off worn-out clothes, and puts on others which are new, so the embodied casts off worn-out bodies, and enters into others which are new.",
  },
  {
    chapter: 2,
    verse: 23,
    sanskrit: "नैनं छिन्दन्ति शस्त्राणि नैनं दहति पावकः।\nन चैनं क्लेदयन्त्यापो न शोषयति मारुतः।।2.23।।",
    translit: "nainaṁ chhindanti śhastrāṇi nainaṁ dahati pāvakaḥ\nna chainaṁ kledayantyāpo na śhoṣhayati mārutaḥ",
    translation: "This (Self), weapons cut not; This, fire burns not; This, water wets not; and This, wind dries not.",
  },
  {
    chapter: 2,
    verse: 24,
    sanskrit: "अच्छेद्योऽयमदाह्योऽयमक्लेद्योऽशोष्य एव च।\nनित्यः सर्वगतः स्थाणुरचलोऽयं सनातनः।।2.24।।",
    translit: "achchhedyo ’yam adāhyo ’yam akledyo ’śhoṣhya eva cha\nnityaḥ sarva-gataḥ sthāṇur achalo ’yaṁ sanātanaḥ",
    translation: "This Self cannot be cut, nor burnt, nor wetted, nor dried. Changeless, all-pervading, unmoving, immovable, the Self is eternal.",
  },
  {
    chapter: 2,
    verse: 25,
    sanskrit: "अव्यक्तोऽयमचिन्त्योऽयमविकार्योऽयमुच्यते।\nतस्मादेवं विदित्वैनं नानुशोचितुमर्हसि।।2.25।।",
    translit: "avyakto ’yam achintyo ’yam avikāryo ’yam uchyate\ntasmādevaṁ viditvainaṁ nānuśhochitum arhasi",
    translation: "This (Self) is said to be unmanifested, unthinkable, and unchangeable. Therefore, knowing This to be such, thou oughtest not to mourn.",
  },
  {
    chapter: 2,
    verse: 26,
    sanskrit: "अथ चैनं नित्यजातं नित्यं वा मन्यसे मृतम्।\nतथापि त्वं महाबाहो नैवं शोचितुमर्हसि।।2.26।।",
    translit: "atha chainaṁ nitya-jātaṁ nityaṁ vā manyase mṛitam\ntathāpi tvaṁ mahā-bāho naivaṁ śhochitum arhasi",
    translation: "But if thou shouldst take This to have constant birth and death, even in that case, O mighty-armed, thou oughtest not to mourn for This.",
  },
  {
    chapter: 2,
    verse: 27,
    sanskrit: "जातस्य हि ध्रुवो मृत्युर्ध्रुवं जन्म मृतस्य च।\nतस्मादपरिहार्येऽर्थे न त्वं शोचितुमर्हसि।।2.27।।",
    translit: "jātasya hi dhruvo mṛityur dhruvaṁ janma mṛitasya cha\ntasmād aparihārye ’rthe na tvaṁ śhochitum arhasi",
    translation: "Of that which is born, death is certain, of that which is dead, birth is certain. Over the unavoidable, therefore, thou oughtest not to grieve.",
  },
  {
    chapter: 2,
    verse: 28,
    sanskrit: "अव्यक्तादीनि भूतानि व्यक्तमध्यानि भारत।\nअव्यक्तनिधनान्येव तत्र का परिदेवना।।2.28।।",
    translit: "avyaktādīni bhūtāni vyakta-madhyāni bhārata\navyakta-nidhanānyeva tatra kā paridevanā",
    translation: "All beings are unmanifested in their beginning, O Bhârata, manifested in their middle state and unmanifested again in their end. What is there then to grieve about?",
  },
  {
    chapter: 2,
    verse: 29,
    sanskrit: "आश्चर्यवत्पश्यति कश्चिदेन\nमाश्चर्यवद्वदति तथैव चान्यः।\nआश्चर्यवच्चैनमन्यः श्रृणोति\nश्रुत्वाप्येनं वेद न चैव कश्चित्।।2.29।।",
    translit: "āśhcharya-vat paśhyati kaśhchid enan\nāśhcharya-vad vadati tathaiva chānyaḥ\nāśhcharya-vach chainam anyaḥ śhṛiṇoti\nśhrutvāpyenaṁ veda na chaiva kaśhchit",
    translation: "Some look upon the Self as marvellous. Others speak of It as wonderful. Others again hear of It as a wonder. And still others, though hearing, do not understand It at all.",
  },
  {
    chapter: 2,
    verse: 30,
    sanskrit: "देही नित्यमवध्योऽयं देहे सर्वस्य भारत।\nतस्मात्सर्वाणि भूतानि न त्वं शोचितुमर्हसि।।2.30।।",
    translit: "dehī nityam avadhyo ’yaṁ dehe sarvasya bhārata\ntasmāt sarvāṇi bhūtāni na tvaṁ śhochitum arhasi",
    translation: "This, the Indweller in the bodies of all, is ever indestructible, O descendant of Bharata. Wherefore thou oughtest not to mourn for any creature.",
  },
  {
    chapter: 2,
    verse: 31,
    sanskrit: "स्वधर्ममपि चावेक्ष्य न विकम्पितुमर्हसि।\nधर्म्याद्धि युद्धाछ्रेयोऽन्यत्क्षत्रियस्य न विद्यते।।2.31।।",
    translit: "swa-dharmam api chāvekṣhya na vikampitum arhasi\ndharmyāddhi yuddhāch chhreyo ’nyat kṣhatriyasya na vidyate",
    translation: "Looking at thine own Dharma, also, thou oughtest not to waver, for there is nothing higher for a Kshatriya than a righteous war.",
  },
  {
    chapter: 2,
    verse: 32,
    sanskrit: "यदृच्छया चोपपन्नं स्वर्गद्वारमपावृतम्।\nसुखिनः क्षत्रियाः पार्थ लभन्ते युद्धमीदृशम्।।2.32।।",
    translit: "yadṛichchhayā chopapannaṁ swarga-dvāram apāvṛitam\nsukhinaḥ kṣhatriyāḥ pārtha labhante yuddham īdṛiśham",
    translation: "Fortunate certainly are the Kshatriyas, O son of Prithâ, who are called to fight in such a battle, that comes unsought as an open gate to heaven.",
  },
  {
    chapter: 2,
    verse: 33,
    sanskrit: "अथ चैत्त्वमिमं धर्म्यं संग्रामं न करिष्यसि।\nततः स्वधर्मं कीर्तिं च हित्वा पापमवाप्स्यसि।।2.33।।",
    translit: "atha chet tvam imaṁ dharmyaṁ saṅgrāmaṁ na kariṣhyasi\ntataḥ sva-dharmaṁ kīrtiṁ cha hitvā pāpam avāpsyasi",
    translation: "But if thou refusest to engage in this righteous warfare, then, forfeiting thine own Dharma and honour, thou shalt incur sin.",
  },
  {
    chapter: 2,
    verse: 34,
    sanskrit: "अकीर्तिं चापि भूतानि कथयिष्यन्ति तेऽव्ययाम्।\nसंभावितस्य चाकीर्तिर्मरणादतिरिच्यते।।2.34।।",
    translit: "akīrtiṁ chāpi bhūtāni\nkathayiṣhyanti te ’vyayām\nsambhāvitasya chākīrtir\nmaraṇād atirichyate",
    translation: "The world also will ever hold thee in reprobation. To the honoured, disrepute is surely worse than death.",
  },
  {
    chapter: 2,
    verse: 35,
    sanskrit: "भयाद्रणादुपरतं मंस्यन्ते त्वां महारथाः।\nयेषां च त्वं बहुमतो भूत्वा यास्यसि लाघवम्।।2.35।।",
    translit: "bhayād raṇād uparataṁ mansyante tvāṁ mahā-rathāḥ\nyeṣhāṁ cha tvaṁ bahu-mato bhūtvā yāsyasi lāghavam",
    translation: "The great chariot-warriors will believe that thou hast withdrawn from the battle through fear. And thou wilt be lightly esteemed by them who have thought much of thee.",
  },
  {
    chapter: 2,
    verse: 36,
    sanskrit: "अवाच्यवादांश्च बहून् वदिष्यन्ति तवाहिताः।\nनिन्दन्तस्तव सामर्थ्यं ततो दुःखतरं नु किम्।।2.36।।",
    translit: "avāchya-vādānśh cha bahūn vadiṣhyanti tavāhitāḥ\nnindantastava sāmarthyaṁ tato duḥkhataraṁ nu kim",
    translation: "Thine enemies also, cavilling at thy great prowess, will say of thee things that are not to be uttered. What could be more intolerable than this?",
  },
  {
    chapter: 2,
    verse: 37,
    sanskrit: "हतो वा प्राप्स्यसि स्वर्गं जित्वा वा भोक्ष्यसे महीम्।\nतस्मादुत्तिष्ठ कौन्तेय युद्धाय कृतनिश्चयः।।2.37।।",
    translit: "hato vā prāpsyasi swargaṁ jitvā vā bhokṣhyase mahīm\ntasmād uttiṣhṭha kaunteya yuddhāya kṛita-niśhchayaḥ",
    translation: "Dying thou gainest heaven; conquering thou enjoyest the earth. Therefore, O son of Kunti, arise, resolved to fight.",
  },
  {
    chapter: 2,
    verse: 38,
    sanskrit: "सुखदुःखे समे कृत्वा लाभालाभौ जयाजयौ।\nततो युद्धाय युज्यस्व नैवं पापमवाप्स्यसि।।2.38।।",
    translit: "sukha-duḥkhe same kṛitvā lābhālābhau jayājayau\ntato yuddhāya yujyasva naivaṁ pāpam avāpsyasi",
    translation: "Having made pain and pleasure, gain and loss, conquest and defeat, the same, engage thou then in battle. So shalt thou incur no sin.",
  },
  {
    chapter: 2,
    verse: 39,
    sanskrit: "एषा तेऽभिहिता सांख्ये बुद्धिर्योगे त्विमां श्रृणु।\nबुद्ध्यायुक्तो यया पार्थ कर्मबन्धं प्रहास्यसि।।2.39।।",
    translit: "eṣhā te ’bhihitā sānkhye\nbuddhir yoge tvimāṁ śhṛiṇu\nbuddhyā yukto yayā pārtha\nkarma-bandhaṁ prahāsyasi",
    translation: "The wisdom of Self-realisation has been declared unto thee. Hearken thou now to the wisdom of Yoga, endued with which, O son of Prithâ, thou shalt break through the bonds of Karma.",
  },
  {
    chapter: 2,
    verse: 40,
    sanskrit: "नेहाभिक्रमनाशोऽस्ति प्रत्यवायो न विद्यते।\nस्वल्पमप्यस्य धर्मस्य त्रायते महतो भयात्।।2.40।।",
    translit: "nehābhikrama-nāśho ’sti pratyavāyo na vidyate\nsvalpam apyasya dharmasya trāyate mahato bhayāt",
    translation: "In this, there is no waste of the unfinished attempt, nor is there production of contrary results. Even very little of this Dharma protects from the great terror.",
  },
  {
    chapter: 2,
    verse: 41,
    sanskrit: "व्यवसायात्मिका बुद्धिरेकेह कुरुनन्दन।\nबहुशाखा ह्यनन्ताश्च बुद्धयोऽव्यवसायिनाम्।।2.41।।",
    translit: "vyavasāyātmikā buddhir ekeha kuru-nandana\nbahu-śhākhā hyanantāśh cha buddhayo ’vyavasāyinām",
    translation: "In this, O scion of Kuru, there is but a single one-pointed determination. The purposes of the undecided are innumerable and many-branching.",
  },
  {
    chapter: 2,
    verse: 42,
    sanskrit: "यामिमां पुष्पितां वाचं प्रवदन्त्यविपश्चितः।\nवेदवादरताः पार्थ नान्यदस्तीति वादिनः।।2.42।।",
    translit: "yāmimāṁ puṣhpitāṁ vāchaṁ pravadanty-avipaśhchitaḥ\nveda-vāda-ratāḥ pārtha nānyad astīti vādinaḥ\nkāmātmānaḥ swarga-parā janma-karma-phala-pradām\nkriyā-viśheṣha-bahulāṁ bhogaiśhwarya-gatiṁ prati",
    translation: "O Pârtha, no set determination is formed in the minds of those that are deeply attached to pleasure and power, and whose discrimination is stolen away by the flowery words of the unwise, who are full of desires and look upon heaven as their highest goal and who, taking pleasure in the panegyric words of the Vedas, declare that there is nothing else. Their (flowery) words are exuberant with various specific, rites as the means to pleasure and power and are the causes of (new) births as the result of their works (performed with desire).",
  },
  {
    chapter: 2,
    verse: 43,
    sanskrit: "कामात्मानः स्वर्गपरा जन्मकर्मफलप्रदाम्।\nक्रियाविशेषबहुलां भोगैश्वर्यगतिं प्रति।।2.43।।",
    translit: "kāmātmānaḥ svarga-parā\njanma-karma-phala-pradām\nkriyā-viśeṣa-bahulāṁ\nbhogaiśvarya-gatiṁ prati",
    translation: "O Pârtha, no set determination is formed in the minds of those that are deeply attached to pleasure and power, and whose discrimination is stolen away by the flowery words of the unwise, who are full of desires and look upon heaven as their highest goal and who, taking pleasure in the panegyric words of the Vedas, declare that there is nothing else. Their (flowery) words are exuberant with various specific, rites as the means to pleasure and power and are the causes of (new) births as the result of their works (performed with desire).",
  },
  {
    chapter: 2,
    verse: 44,
    sanskrit: "भोगैश्वर्यप्रसक्तानां तयापहृतचेतसाम्।\nव्यवसायात्मिका बुद्धिः समाधौ न विधीयते।।2.44।।",
    translit: "bhogaiśwvarya-prasaktānāṁ tayāpahṛita-chetasām\nvyavasāyātmikā buddhiḥ samādhau na vidhīyate",
    translation: "O Pârtha, no set determination is formed in the minds of those that are deeply attached to pleasure and power, and whose discrimination is stolen away by the flowery words of the unwise, who are full of desires and look upon heaven as their highest goal and who, taking pleasure in the panegyric words of the Vedas, declare that there is nothing else. Their (flowery) words are exuberant with various specific, rites as the means to pleasure and power and are the causes of (new) births as the result of their works (performed with desire).",
  },
  {
    chapter: 2,
    verse: 45,
    sanskrit: "त्रैगुण्यविषया वेदा निस्त्रैगुण्यो भवार्जुन।\nनिर्द्वन्द्वो नित्यसत्त्वस्थो निर्योगक्षेम आत्मवान्।।2.45।।",
    translit: "trai-guṇya-viṣhayā vedā nistrai-guṇyo bhavārjuna\nnirdvandvo nitya-sattva-stho niryoga-kṣhema ātmavān",
    translation: "The Vedas deal with the three Gunas. Be thou free, O Arjuna, from the triad of the Gunas, free from the pairs of opposites, ever-balanced, free from (the thought of) getting and keeping, and established in the Self.",
  },
  {
    chapter: 2,
    verse: 46,
    sanskrit: "यावानर्थ उदपाने सर्वतः संप्लुतोदके।\nतावान्सर्वेषु वेदेषु ब्राह्मणस्य विजानतः।।2.46।।",
    translit: "yāvān artha udapāne sarvataḥ samplutodake\ntāvānsarveṣhu vedeṣhu brāhmaṇasya vijānataḥ",
    translation: "To the Brâhmana who has known the Self, all the Vedas are of so much use as a reservoir is, when there is a flood everywhere.",
  },
  {
    chapter: 2,
    verse: 47,
    sanskrit: "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।\nमा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि।।2.47।।",
    translit: "karmaṇy-evādhikāras te mā phaleṣhu kadāchana\nmā karma-phala-hetur bhūr mā te saṅgo ’stvakarmaṇi",
    translation: "Thy right is to work only; but never to the fruits thereof. Be thou not the producer of the fruits of (thy) actions; neither let thy attachment be towards inaction.",
    featured: true,
  },
  {
    chapter: 2,
    verse: 48,
    sanskrit: "योगस्थः कुरु कर्माणि सङ्गं त्यक्त्वा धनञ्जय।\nसिद्ध्यसिद्ध्योः समो भूत्वा समत्वं योग उच्यते।।2.48।।",
    translit: "yoga-sthaḥ kuru karmāṇi saṅgaṁ tyaktvā dhanañjaya\nsiddhy-asiddhyoḥ samo bhūtvā samatvaṁ yoga uchyate",
    translation: "Being steadfast in Yoga, Dhananjaya, perform actions, abandoning attachment, remaining unconcerned as regards success and failure. This evenness of mind (in regard to success and failure) is known as Yoga.",
    featured: true,
  },
  {
    chapter: 2,
    verse: 49,
    sanskrit: "दूरेण ह्यवरं कर्म बुद्धियोगाद्धनञ्जय।\nबुद्धौ शरणमन्विच्छ कृपणाः फलहेतवः।।2.49।।",
    translit: "dūreṇa hy-avaraṁ karma buddhi-yogād dhanañjaya\nbuddhau śharaṇam anvichchha kṛipaṇāḥ phala-hetavaḥ",
    translation: "Work (with desire) is verily far inferior to that performed with the mind undisturbed by thoughts of results. O Dhananjaya, seek refuge in this evenness of mind. Wretched are they who act for results.",
  },
  {
    chapter: 2,
    verse: 50,
    sanskrit: "बुद्धियुक्तो जहातीह उभे सुकृतदुष्कृते।\nतस्माद्योगाय युज्यस्व योगः कर्मसु कौशलम्।।2.50।।",
    translit: "buddhi-yukto jahātīha ubhe sukṛita-duṣhkṛite\ntasmād yogāya yujyasva yogaḥ karmasu kauśhalam",
    translation: "Endued with this evenness of mind, one frees oneself in this life, alike from vice and virtue. Devote thyself, therefore, to this Yoga. Yoga is the very dexterity of work.",
  },
  {
    chapter: 2,
    verse: 51,
    sanskrit: "कर्मजं बुद्धियुक्ता हि फलं त्यक्त्वा मनीषिणः।\nजन्मबन्धविनिर्मुक्ताः पदं गच्छन्त्यनामयम्।।2.51।।",
    translit: "karma-jaṁ buddhi-yuktā hi phalaṁ tyaktvā manīṣhiṇaḥ\njanma-bandha-vinirmuktāḥ padaṁ gachchhanty-anāmayam",
    translation: "The wise, possessed of this evenness of mind, abandoning the fruits of their actions, freed for ever from the fetters of birth, go to that state which is beyond all evil.",
  },
  {
    chapter: 2,
    verse: 52,
    sanskrit: "यदा ते मोहकलिलं बुद्धिर्व्यतितरिष्यति।\nतदा गन्तासि निर्वेदं श्रोतव्यस्य श्रुतस्य च।।2.52।।",
    translit: "yadā te moha-kalilaṁ buddhir vyatitariṣhyati\ntadā gantāsi nirvedaṁ śhrotavyasya śhrutasya cha",
    translation: "When thy intellect crosses beyond the taint of illusion, then shalt thou attain to indifference, regarding things heard and things yet to be heard.",
  },
  {
    chapter: 2,
    verse: 53,
    sanskrit: "श्रुतिविप्रतिपन्ना ते यदा स्थास्यति निश्चला।\nसमाधावचला बुद्धिस्तदा योगमवाप्स्यसि।।2.53।।",
    translit: "śhruti-vipratipannā te yadā sthāsyati niśhchalā\nsamādhāv-achalā buddhis tadā yogam avāpsyasi",
    translation: "When thy intellect, tossed about by the conflict of opinions—has become immovable and firmly established in the Self, then thou shalt attain Self-realisation.",
  },
  {
    chapter: 2,
    verse: 54,
    sanskrit: "अर्जुन उवाच\nस्थितप्रज्ञस्य का भाषा समाधिस्थस्य केशव।\nस्थितधीः किं प्रभाषेत किमासीत व्रजेत किम्।।2.54।।",
    translit: "arjuna uvācha\nsthita-prajñasya kā bhāṣhā samādhi-sthasya keśhava\nsthita-dhīḥ kiṁ prabhāṣheta kim āsīta vrajeta kim",
    translation: "Arjuna said: What, O Keshava, is the description of the man of steady wisdom, merged in Samâdhi? How (on the other hand) does the man of steady wisdom speak, how sit, how walk?",
  },
  {
    chapter: 2,
    verse: 55,
    sanskrit: "श्री भगवानुवाच\nप्रजहाति यदा कामान् सर्वान् पार्थ मनोगतान्।\nआत्मन्येवात्मना तुष्टः स्थितप्रज्ञस्तदोच्यते।।2.55।।",
    translit: "śhrī bhagavān uvācha\nprajahāti yadā kāmān sarvān pārtha mano-gatān\nātmany-evātmanā tuṣhṭaḥ sthita-prajñas tadochyate",
    translation: "The Blessed Lord said: When a man completely casts away, O Pârtha, all the desires of the mind, satisfied in the Self alone by the Self, then is he said to be one of steady wisdom.",
  },
  {
    chapter: 2,
    verse: 56,
    sanskrit: "दुःखेष्वनुद्विग्नमनाः सुखेषु विगतस्पृहः।\nवीतरागभयक्रोधः स्थितधीर्मुनिरुच्यते।।2.56।।",
    translit: "duḥkheṣhv-anudvigna-manāḥ sukheṣhu vigata-spṛihaḥ\nvīta-rāga-bhaya-krodhaḥ sthita-dhīr munir uchyate",
    translation: "He whose mind is not shaken by adversity, who does not hanker after happiness, who has become free from affection, fear, and wrath, is indeed the Muni of steady wisdom.",
  },
  {
    chapter: 2,
    verse: 57,
    sanskrit: "यः सर्वत्रानभिस्नेहस्तत्तत्प्राप्य शुभाशुभम्।\nनाभिनन्दति न द्वेष्टि तस्य प्रज्ञा प्रतिष्ठिता।।2.57।।",
    translit: "yaḥ sarvatrānabhisnehas tat tat prāpya śhubhāśhubham\nnābhinandati na dveṣhṭi tasya prajñā pratiṣhṭhitā",
    translation: "He who is everywhere unattached, not pleased at receiving good, nor vexed at evil, his wisdom is fixed.",
  },
  {
    chapter: 2,
    verse: 58,
    sanskrit: "यदा संहरते चायं कूर्मोऽङ्गानीव सर्वशः।\nइन्द्रियाणीन्द्रियार्थेभ्यस्तस्य प्रज्ञा प्रतिष्ठिता।।2.58।।",
    translit: "yadā sanharate chāyaṁ kūrmo ’ṅgānīva sarvaśhaḥ\nindriyāṇīndriyārthebhyas tasya prajñā pratiṣhṭhitā",
    translation: "When also, like the tortoise its limbs, he can completely withdraw the senses from their objects, then his wisdom becomes steady.",
  },
  {
    chapter: 2,
    verse: 59,
    sanskrit: "विषया विनिवर्तन्ते निराहारस्य देहिनः।\nरसवर्जं रसोऽप्यस्य परं दृष्ट्वा निवर्तते।।2.59।।",
    translit: "viṣhayā vinivartante nirāhārasya dehinaḥ\nrasa-varjaṁ raso ’pyasya paraṁ dṛiṣhṭvā nivartate",
    translation: "Objects fall away from the abstinent man, leaving the longing behind. But his longing also ceases, who sees the Supreme.",
  },
  {
    chapter: 2,
    verse: 60,
    sanskrit: "यततो ह्यपि कौन्तेय पुरुषस्य विपश्चितः।\nइन्द्रियाणि प्रमाथीनि हरन्ति प्रसभं मनः।।2.60।।",
    translit: "yatato hyapi kaunteya puruṣhasya vipaśhchitaḥ\nindriyāṇi pramāthīni haranti prasabhaṁ manaḥ",
    translation: "The turbulent senses, O son of Kunti, do violently snatch away the mind of even a wise man, striving after perfection.",
  },
  {
    chapter: 2,
    verse: 61,
    sanskrit: "तानि सर्वाणि संयम्य युक्त आसीत मत्परः।\nवशे हि यस्येन्द्रियाणि तस्य प्रज्ञा प्रतिष्ठिता।।2.61।।",
    translit: "tāni sarvāṇi sanyamya yukta āsīta mat-paraḥ\nvaśhe hi yasyendriyāṇi tasya prajñā pratiṣhṭhitā",
    translation: "The steadfast, having controlled them all, sits focussed on Me as the Supreme. His wisdom is steady, whose senses are under control.",
  },
  {
    chapter: 2,
    verse: 62,
    sanskrit: "ध्यायतो विषयान्पुंसः सङ्गस्तेषूपजायते।\nसङ्गात् संजायते कामः कामात्क्रोधोऽभिजायते।।2.62।।",
    translit: "dhyāyato viṣhayān puṁsaḥ saṅgas teṣhūpajāyate\nsaṅgāt sañjāyate kāmaḥ kāmāt krodho ’bhijāyate",
    translation: "Thinking of objects, attachment to them is formed in a man. From attachment longing, and from longing anger grows.",
    featured: true,
  },
  {
    chapter: 2,
    verse: 63,
    sanskrit: "क्रोधाद्भवति संमोहः संमोहात्स्मृतिविभ्रमः।\nस्मृतिभ्रंशाद् बुद्धिनाशो बुद्धिनाशात्प्रणश्यति।।2.63।।",
    translit: "krodhād bhavati sammohaḥ sammohāt smṛiti-vibhramaḥ\nsmṛiti-bhranśhād buddhi-nāśho buddhi-nāśhāt praṇaśhyati",
    translation: "From anger comes delusion, and from delusion loss of memory. From loss of memory comes the ruin of discrimination, and from the ruin of discrimination he perishes.",
    featured: true,
  },
  {
    chapter: 2,
    verse: 64,
    sanskrit: "रागद्वेषवियुक्तैस्तु विषयानिन्द्रियैश्चरन्।\nआत्मवश्यैर्विधेयात्मा प्रसादमधिगच्छति।।2.64।।",
    translit: "rāga-dveṣha-viyuktais tu viṣhayān indriyaiśh charan\nātma-vaśhyair-vidheyātmā prasādam adhigachchhati",
    translation: "But the self-controlled man, moving among objects with senses under restraint, and free from attraction and aversion, attains to tranquillity.",
  },
  {
    chapter: 2,
    verse: 65,
    sanskrit: "प्रसादे सर्वदुःखानां हानिरस्योपजायते।\nप्रसन्नचेतसो ह्याशु बुद्धिः पर्यवतिष्ठते।।2.65।।",
    translit: "prasāde sarva-duḥkhānāṁ hānir asyopajāyate\nprasanna-chetaso hyāśhu buddhiḥ paryavatiṣhṭhate",
    translation: "In tranquillity, all sorrow is destroyed. For the intellect of him who is tranquil-minded, is soon established in firmness.",
  },
  {
    chapter: 2,
    verse: 66,
    sanskrit: "नास्ति बुद्धिरयुक्तस्य न चायुक्तस्य भावना।\nन चाभावयतः शान्तिरशान्तस्य कुतः सुखम्।।2.66।।",
    translit: "nāsti buddhir-ayuktasya na chāyuktasya bhāvanā\nna chābhāvayataḥ śhāntir aśhāntasya kutaḥ sukham",
    translation: "No knowledge (of the Self) has the unsteady. Nor has he meditation. To the unmeditative there is no peace. And how can one without peace have happiness?",
  },
  {
    chapter: 2,
    verse: 67,
    sanskrit: "इन्द्रियाणां हि चरतां यन्मनोऽनुविधीयते।\nतदस्य हरति प्रज्ञां वायुर्नावमिवाम्भसि।।2.67।।",
    translit: "indriyāṇāṁ hi charatāṁ yan mano ’nuvidhīyate\ntadasya harati prajñāṁ vāyur nāvam ivāmbhasi",
    translation: "For, the mind which follows in the wake of the wandering senses, carries away his discrimination, as a wind (carries away from its course) a boat on the waters.",
  },
  {
    chapter: 2,
    verse: 68,
    sanskrit: "तस्माद्यस्य महाबाहो निगृहीतानि सर्वशः।\nइन्द्रियाणीन्द्रियार्थेभ्यस्तस्य प्रज्ञा प्रतिष्ठिता।।2.68।।",
    translit: "tasmād yasya mahā-bāho nigṛihītāni sarvaśhaḥ\nindriyāṇīndriyārthebhyas tasya prajñā pratiṣhṭhitā",
    translation: "Therefore, O mighty-armed, his knowledge is steady, whose senses are completely restrained from their objects.",
  },
  {
    chapter: 2,
    verse: 69,
    sanskrit: "या निशा सर्वभूतानां तस्यां जागर्ति संयमी।\nयस्यां जाग्रति भूतानि सा निशा पश्यतो मुनेः।।2.69।।",
    translit: "yā niśhā sarva-bhūtānāṁ tasyāṁ jāgarti sanyamī\nyasyāṁ jāgrati bhūtāni sā niśhā paśhyato muneḥ",
    translation: "That which is night to all beings, in that the self-controlled man wakes. That in which all beings wake, is night to the Self-seeing Muni.",
  },
  {
    chapter: 2,
    verse: 70,
    sanskrit: "आपूर्यमाणमचलप्रतिष्ठं\nसमुद्रमापः प्रविशन्ति यद्वत्।\nतद्वत्कामा यं प्रविशन्ति सर्वे\nस शान्तिमाप्नोति न कामकामी।।2.70।।",
    translit: "āpūryamāṇam achala-pratiṣhṭhaṁ\nsamudram āpaḥ praviśhanti yadvat\ntadvat kāmā yaṁ praviśhanti sarve\nsa śhāntim āpnoti na kāma-kāmī",
    translation: "As into the ocean,—brimful, and still,—flow the waters, even so the Muni into whom enter all desires, he, and not the desirer of desires, attains to peace.",
  },
  {
    chapter: 2,
    verse: 71,
    sanskrit: "विहाय कामान्यः सर्वान्पुमांश्चरति निःस्पृहः।\nनिर्ममो निरहंकारः स शांतिमधिगच्छति।।2.71।।",
    translit: "vihāya kāmān yaḥ sarvān pumānśh charati niḥspṛihaḥ\nnirmamo nirahankāraḥ sa śhāntim adhigachchhati",
    translation: "That man who lives devoid of longing, abandoning all desires, without the sense of 'I' and 'mine,' he attains to peace.",
  },
  {
    chapter: 2,
    verse: 72,
    sanskrit: "एषा ब्राह्मी स्थितिः पार्थ नैनां प्राप्य विमुह्यति।\nस्थित्वाऽस्यामन्तकालेऽपि ब्रह्मनिर्वाणमृच्छति।।2.72।।",
    translit: "eṣhā brāhmī sthitiḥ pārtha naināṁ prāpya vimuhyati\nsthitvāsyām anta-kāle ’pi brahma-nirvāṇam ṛichchhati",
    translation: "This is to have one's being in Brahman, O son of Prithâ. None, attaining to this, becomes deluded. Being established therein, even at the end of life, a man attains to oneness with Brahman.",
  },
  // ─── Chapter 3 — Karma Yoga (3/43 verses, famous verses only) ───
  {
    chapter: 3,
    verse: 19,
    sanskrit: "तस्मादसक्तः सततं कार्यं कर्म समाचर।\nअसक्तो ह्याचरन्कर्म परमाप्नोति पूरुषः।।3.19।।",
    translit: "tasmād asaktaḥ satataṁ kāryaṁ karma samāchara\nasakto hyācharan karma param āpnoti pūruṣhaḥ",
    translation: "Therefore, do thou always perform actions which are obligatory, without attachment;—by performing action without attachment, one attains to the highest.",
    featured: true,
  },
  {
    chapter: 3,
    verse: 21,
    sanskrit: "यद्यदाचरति श्रेष्ठस्तत्तदेवेतरो जनः।\nस यत्प्रमाणं कुरुते लोकस्तदनुवर्तते।।3.21।।",
    translit: "yad yad ācharati śhreṣhṭhas tat tad evetaro janaḥ\nsa yat pramāṇaṁ kurute lokas tad anuvartate",
    translation: "Whatsoever the superior person does, that is followed by others. What he demonstrates by action, that, people follow.",
    featured: true,
  },
  {
    chapter: 3,
    verse: 35,
    sanskrit: "श्रेयान्स्वधर्मो विगुणः परधर्मात्स्वनुष्ठितात्।\nस्वधर्मे निधनं श्रेयः परधर्मो भयावहः।।3.35।।",
    translit: "śhreyān swa-dharmo viguṇaḥ para-dharmāt sv-anuṣhṭhitāt\nswa-dharme nidhanaṁ śhreyaḥ para-dharmo bhayāvahaḥ",
    translation: "Better is one's own Dharma, (though) imperfect, than the Dharma of another well-performed. Better is death in one's own Dharma: the Dharma of another is fraught with fear.",
    featured: true,
  },
  // ─── Chapter 4 — Jnana Karma Sanyasa Yoga (3/42 verses, famous verses only) ───
  {
    chapter: 4,
    verse: 7,
    sanskrit: "यदा यदा हि धर्मस्य ग्लानिर्भवति भारत।\nअभ्युत्थानमधर्मस्य तदाऽऽत्मानं सृजाम्यहम्।।4.7।।",
    translit: "yadā yadā hi dharmasya glānir bhavati bhārata\nabhyutthānam adharmasya tadātmānaṁ sṛijāmyaham",
    translation: "Whenever, O descendant of Bharata, there is decline of Dharma, and rise of Adharma, then I body Myself forth.",
    featured: true,
  },
  {
    chapter: 4,
    verse: 8,
    sanskrit: "परित्राणाय साधूनां विनाशाय च दुष्कृताम्।\nधर्मसंस्थापनार्थाय संभवामि युगे युगे।।4.8।।",
    translit: "paritrāṇāya sādhūnāṁ vināśhāya cha duṣhkṛitām\ndharma-sansthāpanārthāya sambhavāmi yuge yuge",
    translation: "For the protection of the good, for the destruction of the wicked, and for the establishment of Dharma, I come into being in every age.",
    featured: true,
  },
  {
    chapter: 4,
    verse: 38,
    sanskrit: "न हि ज्ञानेन सदृशं पवित्रमिह विद्यते।\nतत्स्वयं योगसंसिद्धः कालेनात्मनि विन्दति।।4.38।।",
    translit: "na hi jñānena sadṛiśhaṁ pavitramiha vidyate\ntatsvayaṁ yogasansiddhaḥ kālenātmani vindati",
    translation: "Verily there exists nothing in this world purifying like knowledge. In good time, having reached perfection in Yoga, one realises that oneself in one's own heart.",
    featured: true,
  },
  // ─── Chapter 5 — Karma Sanyasa Yoga (1/29 verses, famous verse only) ───
  {
    chapter: 5,
    verse: 10,
    sanskrit: "ब्रह्मण्याधाय कर्माणि सङ्गं त्यक्त्वा करोति यः।\nलिप्यते न स पापेन पद्मपत्रमिवाम्भसा।।5.10।।",
    translit: "brahmaṇyādhāya karmāṇi saṅgaṁ tyaktvā karoti yaḥ\nlipyate na sa pāpena padma-patram ivāmbhasā",
    translation: "He who does actions forsaking attachment, resigning them to Brahman, is not soiled by evil, like unto a lotus-leaf by water.",
    featured: true,
  },
  // ─── Chapter 6 — Dhyana Yoga (4/47 verses, famous verses only) ───
  {
    chapter: 6,
    verse: 5,
    sanskrit: "उद्धरेदात्मनाऽऽत्मानं नात्मानमवसादयेत्।\nआत्मैव ह्यात्मनो बन्धुरात्मैव रिपुरात्मनः।।6.5।।",
    translit: "uddhared ātmanātmānaṁ nātmānam avasādayet\nātmaiva hyātmano bandhur ātmaiva ripur ātmanaḥ",
    translation: "A man should uplift himself by his own self, so let him not weaken this self. For this self is the friend of oneself, and this self is the enemy of oneself.",
    featured: true,
  },
  {
    chapter: 6,
    verse: 6,
    sanskrit: "बन्धुरात्माऽऽत्मनस्तस्य येनात्मैवात्मना जितः।\nअनात्मनस्तु शत्रुत्वे वर्तेतात्मैव शत्रुवत्।।6.6।।",
    translit: "bandhur ātmātmanas tasya yenātmaivātmanā jitaḥ\nanātmanas tu śhatrutve vartetātmaiva śhatru-vat",
    translation: "The self (the active part of our nature) is the friend of the self, for him who has conquered himself by this self. But to the unconquered self, this self is inimical, (and behaves) like (an external) foe.",
    featured: true,
  },
  {
    chapter: 6,
    verse: 19,
    sanskrit: "यथा दीपो निवातस्थो नेङ्गते सोपमा स्मृता।\nयोगिनो यतचित्तस्य युञ्जतो योगमात्मनः।।6.19।।",
    translit: "yathā dīpo nivāta-stho neṅgate sopamā smṛitā\nyogino yata-chittasya yuñjato yogam ātmanaḥ",
    translation: "\"As a lamp in a spot sheltered from the wind does not flicker,\"—even such has been the simile used for a Yogi of subdued mind, practising concentration in the Self.",
    featured: true,
  },
  {
    chapter: 6,
    verse: 35,
    sanskrit: "श्री भगवानुवाच\nअसंशयं महाबाहो मनो दुर्निग्रहं चलं।\nअभ्यासेन तु कौन्तेय वैराग्येण च गृह्यते।।6.35।।",
    translit: "śhrī bhagavān uvācha\nasanśhayaṁ mahā-bāho mano durnigrahaṁ chalam\nabhyāsena tu kaunteya vairāgyeṇa cha gṛihyate",
    translation: "The Blessed Lord said: Without doubt, O mighty-armed, the mind is restless, and difficult to control; but through practice and renunciation, O son of Kunti, it may be governed.",
    featured: true,
  },
  // ─── Chapter 7 — Jnana Vijnana Yoga (1/30 verses, famous verse only) ───
  {
    chapter: 7,
    verse: 19,
    sanskrit: "बहूनां जन्मनामन्ते ज्ञानवान्मां प्रपद्यते।\nवासुदेवः सर्वमिति स महात्मा सुदुर्लभः।।7.19।।",
    translit: "bahūnāṁ janmanām ante jñānavān māṁ prapadyate\nvāsudevaḥ sarvam iti sa mahātmā su-durlabhaḥ",
    translation: "At the end of many births, the man of wisdom takes refuge in Me, realising that all this is Vâsudeva (the innermost Self). Very rare is that great soul.",
    featured: true,
  },
  // ─── Chapter 8 — Akshara Brahma Yoga (2/28 verses, famous verses only) ───
  {
    chapter: 8,
    verse: 5,
    sanskrit: "अन्तकाले च मामेव स्मरन्मुक्त्वा कलेवरम्।\nयः प्रयाति स मद्भावं याति नास्त्यत्र संशयः।।8.5।।",
    translit: "anta-kāle cha mām eva smaran muktvā kalevaram\nyaḥ prayāti sa mad-bhāvaṁ yāti nāstyatra sanśhayaḥ",
    translation: "And he, who at the time of death, meditating on Me alone, goes forth, leaving the body, attains My Being: there is no doubt about this.",
    featured: true,
  },
  {
    chapter: 8,
    verse: 6,
    sanskrit: "यं यं वापि स्मरन्भावं त्यजत्यन्ते कलेवरम्।\nतं तमेवैति कौन्तेय सदा तद्भावभावितः।।8.6।।",
    translit: "yaṁ yaṁ vāpi smaran bhāvaṁ tyajatyante kalevaram\ntaṁ tam evaiti kaunteya sadā tad-bhāva-bhāvitaḥ",
    translation: "Remembering whatever object, at the end, he leaves the body, that alone is reached by him, O son of Kunti, (because) of his constant thought of that object.",
    featured: true,
  },
  // ─── Chapter 9 — Raja Vidya Raja Guhya Yoga (3/34 verses, famous verses only) ───
  {
    chapter: 9,
    verse: 22,
    sanskrit: "अनन्याश्चिन्तयन्तो मां ये जनाः पर्युपासते।\nतेषां नित्याभियुक्तानां योगक्षेमं वहाम्यहम्।।9.22।।",
    translit: "ananyāśh chintayanto māṁ ye janāḥ paryupāsate\nteṣhāṁ nityābhiyuktānāṁ yoga-kṣhemaṁ vahāmyaham",
    translation: "Persons who, meditating on Me as non-separate, worship Me in all beings, to them thus ever jealously engaged, I carry what they lack and preserve what they already have.",
    featured: true,
  },
  {
    chapter: 9,
    verse: 26,
    sanskrit: "पत्रं पुष्पं फलं तोयं यो मे भक्त्या प्रयच्छति।\nतदहं भक्त्युपहृतमश्नामि प्रयतात्मनः।।9.26।।",
    translit: "patraṁ puṣhpaṁ phalaṁ toyaṁ yo me bhaktyā prayachchhati\ntadahaṁ bhaktyupahṛitam aśhnāmi prayatātmanaḥ",
    translation: "Whoever with devotion offers Me a leaf, a flower, a fruit, or water, that I accept—the devout gift of the pure-minded.",
    featured: true,
  },
  {
    chapter: 9,
    verse: 27,
    sanskrit: "यत्करोषि यदश्नासि यज्जुहोषि ददासि यत्।\nयत्तपस्यसि कौन्तेय तत्कुरुष्व मदर्पणम्।।9.27।।",
    translit: "yat karoṣhi yad aśhnāsi yaj juhoṣhi dadāsi yat\nyat tapasyasi kaunteya tat kuruṣhva mad-arpaṇam",
    translation: "Whatever thou doest, whatever thou eatest, whatever thou offerest in sacrifice, whatever thou givest away, whatever austerity thou practisest, O son of Kunti, do that as an offering unto Me.",
    featured: true,
  },
  // ─── Chapter 10 — Vibhuti Yoga (1/42 verses, famous verse only) ───
  {
    chapter: 10,
    verse: 20,
    sanskrit: "अहमात्मा गुडाकेश सर्वभूताशयस्थितः।\nअहमादिश्च मध्यं च भूतानामन्त एव च।।10.20।।",
    translit: "aham ātmā guḍākeśha sarva-bhūtāśhaya-sthitaḥ\naham ādiśh cha madhyaṁ cha bhūtānām anta eva cha",
    translation: "I am the Self, O Gudâkesha, existent in the heart of all beings; I am the beginning, the middle, and also the end of all beings.",
    featured: true,
  },
  // ─── Chapter 11 — Vishvarupa Darshana Yoga (1/55 verses, famous verse only) ───
  {
    chapter: 11,
    verse: 32,
    sanskrit: "श्री भगवानुवाच\nकालोऽस्मि लोकक्षयकृत्प्रवृद्धो\nलोकान्समाहर्तुमिह प्रवृत्तः।\nऋतेऽपि त्वां न भविष्यन्ति सर्वे\nयेऽवस्थिताः प्रत्यनीकेषु योधाः।।11.32।।",
    translit: "śhrī-bhagavān uvācha\nkālo ’smi loka-kṣhaya-kṛit pravṛiddho\nlokān samāhartum iha pravṛittaḥ\nṛite ’pi tvāṁ na bhaviṣhyanti sarve\nye ’vasthitāḥ pratyanīkeṣhu yodhāḥ",
    translation: "The Blessed Lord said: I am the mighty world-destroying Time, here made manifest for the purpose of infolding the world. Even without thee, none of the warriors arrayed in the hostile armies shall live.",
    featured: true,
  },
  // ─── Chapter 12 — Bhakti Yoga (2/20 verses, famous verses only) ───
  {
    chapter: 12,
    verse: 13,
    sanskrit: "अद्वेष्टा सर्वभूतानां मैत्रः करुण एव च।निर्ममो निरहङ्कारः समदुःखसुखः क्षमी।।12.13।।",
    translit: "adveṣhṭā sarva-bhūtānāṁ maitraḥ karuṇa eva cha\nnirmamo nirahankāraḥ sama-duḥkha-sukhaḥ kṣhamī",
    translation: "He who hates no creature, and is friendly and compassionate towards all, who is free from the feelings of 'I and mine,' even-minded in pain and pleasure, forbearing, ever content, steady in meditation, self-controlled, and possessed of firm conviction, with mind and intellect fixed on Me,—he who is thus devoted to Me, is dear to Me.",
    featured: true,
  },
  {
    chapter: 12,
    verse: 14,
    sanskrit: "सन्तुष्टः सततं योगी यतात्मा दृढनिश्चयः।मय्यर्पितमनोबुद्धिर्यो मद्भक्तः स मे प्रियः।।12.14।।",
    translit: "santuṣhṭaḥ satataṁ yogī yatātmā dṛiḍha-niśhchayaḥ\nmayy arpita-mano-buddhir yo mad-bhaktaḥ sa me priyaḥ",
    translation: "He who hates no creature, and is friendly and compassionate towards all, who is free from the feelings of 'I and mine,' even-minded in pain and pleasure, forbearing, ever content, steady in meditation, self-controlled, and possessed of firm conviction, with mind and intellect fixed on Me,—he who is thus devoted to Me, is dear to Me.",
    featured: true,
  },
  // ─── Chapter 13 — Kshetra Kshetrajna Vibhaga Yoga (1/35 verses, famous verse only) ───
  {
    chapter: 13,
    verse: 28,
    sanskrit: "समं सर्वेषु भूतेषु तिष्ठन्तं परमेश्वरम्।विनश्यत्स्वविनश्यन्तं यः पश्यति स पश्यति।।13.28।।",
    translit: "samaṁ sarveṣhu bhūteṣhu tiṣhṭhantaṁ parameśhvaram\nvinaśhyatsv avinaśhyantaṁ yaḥ paśhyati sa paśhyati",
    translation: "He sees, who sees the Lord Supreme, existing equally in all beings, deathless in the dying.",
    featured: true,
  },
  // ─── Chapter 14 — Gunatraya Vibhaga Yoga (1/27 verses, famous verse only) ───
  {
    chapter: 14,
    verse: 26,
    sanskrit: "मां च योऽव्यभिचारेण भक्ितयोगेन सेवते।स गुणान्समतीत्यैतान् ब्रह्मभूयाय कल्पते।।14.26।।",
    translit: "māṁ cha yo ’vyabhichāreṇa bhakti-yogena sevate\nsa guṇān samatītyaitān brahma-bhūyāya kalpate",
    translation: "And he who serves Me with an unswerving devotion, he, going beyond the Gunas, is fitted for becoming Brahman.",
    featured: true,
  },
  // ─── Chapter 15 — Purushottama Yoga (1/20 verses, famous verse only) ───
  {
    chapter: 15,
    verse: 7,
    sanskrit: "ममैवांशो जीवलोके जीवभूतः सनातनः।मनःषष्ठानीन्द्रियाणि प्रकृतिस्थानि कर्षति।।15.7।।",
    translit: "mamaivānśho jīva-loke jīva-bhūtaḥ sanātanaḥ\nmanaḥ-ṣhaṣhṭhānīndriyāṇi prakṛiti-sthāni karṣhati",
    translation: "An eternal portion of Myself having become a living soul in the world of life, draws (to itself) the (five) senses with mind for the sixth, abiding in Prakriti.",
    featured: true,
  },
  // ─── Chapter 16 — Daivasura Sampad Vibhaga Yoga (1/24 verses, famous verse only) ───
  {
    chapter: 16,
    verse: 21,
    sanskrit: "त्रिविधं नरकस्येदं द्वारं नाशनमात्मनः।कामः क्रोधस्तथा लोभस्तस्मादेतत्त्रयं त्यजेत्।।16.21।।",
    translit: "tri-vidhaṁ narakasyedaṁ dvāraṁ nāśhanam ātmanaḥ\nkāmaḥ krodhas tathā lobhas tasmād etat trayaṁ tyajet",
    translation: "Triple is this gate of hell, destructive of the self,—lust, anger and greed; therefore one should forsake these three.",
    featured: true,
  },
  // ─── Chapter 17 — Shraddhatraya Vibhaga Yoga (1/28 verses, famous verse only) ───
  {
    chapter: 17,
    verse: 3,
    sanskrit: "सत्त्वानुरूपा सर्वस्य श्रद्धा भवति भारत।श्रद्धामयोऽयं पुरुषो यो यच्छ्रद्धः स एव सः।।17.3।।",
    translit: "sattvānurūpā sarvasya śhraddhā bhavati bhārata\nśhraddhā-mayo ‘yaṁ puruṣho yo yach-chhraddhaḥ sa eva saḥ",
    translation: "The Shraddhâ of each is according to his natural disposition, O descendant of Bharata. The man consists of his Shraddhâ; he verily is what his Shraddhâ is.",
    featured: true,
  },
  // ─── Chapter 18 — Moksha Sanyasa Yoga (4/78 verses, famous verses only) ───
  {
    chapter: 18,
    verse: 46,
    sanskrit: "यतः प्रवृत्तिर्भूतानां येन सर्वमिदं ततम्।स्वकर्मणा तमभ्यर्च्य सिद्धिं विन्दति मानवः।।18.46।।",
    translit: "yataḥ pravṛittir bhūtānāṁ yena sarvam idaṁ tatam\nsva-karmaṇā tam abhyarchya siddhiṁ vindati mānavaḥ",
    translation: "From whom is the evolution of all beings, by whom all this is pervaded, worshipping Him with his own duty, a man attains perfection.",
    featured: true,
  },
  {
    chapter: 18,
    verse: 63,
    sanskrit: "इति ते ज्ञानमाख्यातं गुह्याद्गुह्यतरं मया।विमृश्यैतदशेषेण यथेच्छसि तथा कुरु।।18.63।।",
    translit: "iti te jñānam ākhyātaṁ guhyād guhyataraṁ mayā\nvimṛiśhyaitad aśheṣheṇa yathechchhasi tathā kuru",
    translation: "Thus has wisdom more profound than all profundities, been declared to thee by Me; reflecting over it fully, act as thou likest.",
    featured: true,
  },
  {
    chapter: 18,
    verse: 65,
    sanskrit: "मन्मना भव मद्भक्तो मद्याजी मां नमस्कुरु।मामेवैष्यसि सत्यं ते प्रतिजाने प्रियोऽसि मे।।18.65।।",
    translit: "man-manā bhava mad-bhakto mad-yājī māṁ namaskuru\nmām evaiṣhyasi satyaṁ te pratijāne priyo ‘si me",
    translation: "Occupy thy mind with Me, be devoted to Me, sacrifice to Me, bow down to Me. Thou shalt reach Myself; truly do I promise unto thee, (for) thou art dear to Me.",
    featured: true,
  },
  {
    chapter: 18,
    verse: 66,
    sanskrit: "सर्वधर्मान्परित्यज्य मामेकं शरणं व्रज।अहं त्वा सर्वपापेभ्यो मोक्षयिष्यामि मा शुचः।।18.66।।",
    translit: "sarva-dharmān parityajya mām ekaṁ śharaṇaṁ vraja\nahaṁ tvāṁ sarva-pāpebhyo mokṣhayiṣhyāmi mā śhuchaḥ",
    translation: "Relinquishing all Dharmas take refuge in Me alone; I will liberate thee from all sins; grieve not.",
    featured: true,
  },
];

async function main() {
  console.log('🕉️  Seeding Bhagavad Gita...');

  // Sanity checks before touching the database.
  const ch1 = GITA_VERSES.filter((v) => v.chapter === 1).length;
  const ch2 = GITA_VERSES.filter((v) => v.chapter === 2).length;
  const featured = GITA_VERSES.filter((v) => v.featured).length;
  if (ch1 !== 47 || ch2 !== 72 || featured !== 36 || GITA_VERSES.length !== 149) {
    throw new Error(
      `Seed data integrity check failed: ch1=${ch1} (want 47), ch2=${ch2} (want 72), featured=${featured} (want 36), total=${GITA_VERSES.length} (want 149)`,
    );
  }

  const text = await prisma.hinduText.upsert({
    where: { slug: 'bhagavad-gita' },
    update: {
      nameEnglish: 'Bhagavad Gita',
      nameSanskrit: 'श्रीमद्भगवद्गीता',
      type: 'gita',
      totalVerses: 700,
      isPremium: false,
    },
    create: {
      slug: 'bhagavad-gita',
      nameEnglish: 'Bhagavad Gita',
      nameSanskrit: 'श्रीमद्भगवद्गीता',
      type: 'gita',
      totalVerses: 700,
      isPremium: false,
    },
  });
  console.log(`📖 HinduText upserted: ${text.slug} (${text.id})`);

  const chapterIdByNumber = new Map<number, string>();
  for (const ch of GITA_CHAPTERS) {
    const row = await prisma.hinduTextChapter.upsert({
      where: {
        textId_chapterNumber: { textId: text.id, chapterNumber: ch.chapter },
      },
      update: { nameSanskrit: ch.nameSanskrit, nameEnglish: ch.nameEnglish },
      create: {
        textId: text.id,
        chapterNumber: ch.chapter,
        nameSanskrit: ch.nameSanskrit,
        nameEnglish: ch.nameEnglish,
      },
    });
    chapterIdByNumber.set(ch.chapter, row.id);
  }
  console.log(`📚 ${GITA_CHAPTERS.length} chapters upserted`);

  let versesCreated = 0;
  let versesUpdated = 0;
  const seededPerChapter = new Map<number, number>();

  for (const v of GITA_VERSES) {
    const chapterId = chapterIdByNumber.get(v.chapter);
    if (!chapterId) throw new Error(`Chapter ${v.chapter} was not upserted`);

    // HinduTextVerse has no unique composite (only an index), so upsert manually.
    const existing = await prisma.hinduTextVerse.findFirst({
      where: { textId: text.id, chapterId, verseNumber: v.verse },
      select: { id: true },
    });

    // NOTE: `isFeatured` lands with the add_hindu_content_fields migration; the generated
    // client may not know it yet, hence the cast. Remove after prisma generate.
    const verseData = {
      sanskritText: v.sanskrit,
      transliteration: v.translit,
      isFeatured: v.featured === true,
    } as any;

    let verseId: string;
    if (existing) {
      await prisma.hinduTextVerse.update({ where: { id: existing.id }, data: verseData });
      verseId = existing.id;
      versesUpdated++;
    } else {
      const created = await prisma.hinduTextVerse.create({
        data: {
          textId: text.id,
          chapterId,
          verseNumber: v.verse,
          ...verseData,
        },
      });
      verseId = created.id;
      versesCreated++;
    }

    await prisma.hinduTextTranslation.upsert({
      where: {
        verseId_languageCode_authorName: {
          verseId,
          languageCode: TRANSLATION_LANGUAGE,
          authorName: TRANSLATION_AUTHOR,
        },
      },
      update: { text: v.translation, isPremium: false },
      create: {
        verseId,
        languageCode: TRANSLATION_LANGUAGE,
        authorName: TRANSLATION_AUTHOR,
        text: v.translation,
        isPremium: false,
      },
    });

    seededPerChapter.set(v.chapter, (seededPerChapter.get(v.chapter) ?? 0) + 1);
  }

  console.log(`✅ Verses: ${versesCreated} created, ${versesUpdated} updated (${GITA_VERSES.length} total)`);
  console.log(`✅ Translations upserted: ${GITA_VERSES.length} (${TRANSLATION_AUTHOR}, ${TRANSLATION_LANGUAGE})`);
  for (const ch of GITA_CHAPTERS) {
    const seeded = seededPerChapter.get(ch.chapter) ?? 0;
    console.log(`   ch ${String(ch.chapter).padStart(2)} ${ch.nameEnglish}: ${seeded}/${ch.verseCount} verses seeded`);
  }
  console.log('🕉️  Bhagavad Gita seed complete');
}

main()
  .catch((e) => {
    console.error('❌ Gita seed failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
