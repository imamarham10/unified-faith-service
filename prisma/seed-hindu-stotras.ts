import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Same adapter pattern as PrismaService / other seeds.
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

// ---------------------------------------------------------------------------
// Content provenance
// Devanagari + IAST for every Sanskrit stotra below were sourced from public
// canonical repositories (greenmesg.org, sanskritdocuments.org) — all original
// texts are centuries-old and in the public domain. English translations are
// original faithful renderings written for this project (spec §B2 permits
// "public-domain or your own faithful rendering"). Om Jai Jagdish Hare (a 19th
// c. Hindi aarti) Devanagari from public aarti sources; IAST + English here.
//
// v1 ships 8 of the 9 stotras in the spec. Vishnu Sahasranama Dhyanam is
// deferred (canonical source fetch unavailable at seed time) — tracked as a
// content backlog item; the API/UI are generic and it slots in with no code
// change.
// ---------------------------------------------------------------------------

interface CategorySeed {
  slug: string;
  name: string;
  deityKey: string | null;
}

interface VerseSeed {
  sanskrit: string;
  translit: string;
  english: string;
}

interface StotraSeed {
  slug: string;
  titleSanskrit: string;
  titleEnglish: string;
  categorySlug: string;
  deityKey: string | null;
  type: 'stotra' | 'aarti' | 'bhajan';
  verses: VerseSeed[];
}

const CATEGORIES: CategorySeed[] = [
  { slug: 'ganesha', name: 'Ganesha', deityKey: 'ganesha' },
  { slug: 'shiva', name: 'Shiva', deityKey: 'shiva' },
  { slug: 'vishnu-krishna', name: 'Vishnu & Krishna', deityKey: 'vishnu' },
  { slug: 'devi', name: 'Devi', deityKey: 'devi' },
  { slug: 'hanuman', name: 'Hanuman', deityKey: 'hanuman' },
  { slug: 'aarti', name: 'Aartis', deityKey: null },
];

const STOTRAS: StotraSeed[] = [
  // 1. GANESHA PANCHARATNAM ------------------------------------------------
  {
    slug: 'ganesha-pancharatnam',
    titleSanskrit: 'गणेशपञ्चरत्नम्',
    titleEnglish: 'Ganesha Pancharatnam',
    categorySlug: 'ganesha',
    deityKey: 'ganesha',
    type: 'stotra',
    verses: [
      {
        sanskrit: 'मुदाकरात्तमोदकं सदा विमुक्तिसाधकं कलाधरावतंसकं विलासिलोकरक्षकम् । अनायकैकनायकं विनाशितेभदैत्यकं नताशुभाशुनाशकं नमामि तं विनायकम् ॥१॥',
        translit:
          'Mudā-Karātta-Modakaṃ Sadā Vimukti-Sādhakaṃ Kalā-Dharāvataṃsakaṃ Vilāsi-Loka-Rakṣakam | Anāyakaika-Nāyakaṃ Vināśitebha-Daityakaṃ Natāśubhāśu-Nāśakaṃ Namāmi Taṃ Vināyakam ||1||',
        english:
          'I bow to Vinayaka — who joyfully holds a sweet modaka in his hand, who is ever the granter of liberation, who wears the crescent moon as an ornament, protector of the radiant worlds; the one leader of those who have none, destroyer of the elephant-demon, who swiftly dispels the misfortunes of those who bow to him.',
      },
      {
        sanskrit: 'नतेतरातिभीकरं नवोदितार्कभास्वरं नमत्सुरारिनिर्जरं नताधिकापदुद्धरम् । सुरेश्वरं निधीश्वरं गजेश्वरं गणेश्वरं महेश्वरं तमाश्रये परात्परं निरन्तरम् ॥२॥',
        translit:
          'Natetarāti-Bhīkaraṃ Navodita-Arka-Bhāsvaraṃ Namat-Surāri-Nirjaraṃ Natādhikāpad-Uddharam | Sureśvaraṃ Nidhīśvaraṃ Gajeśvaraṃ Gaṇeśvaraṃ Maheśvaraṃ Tamāśraye Parātparaṃ Nirantaram ||2||',
        english:
          'Terrible to those who do not bow, radiant as the newly risen sun, worshipped by gods and immortals, lifter of the great distress of his devotees — I take refuge forever in that Lord of gods, master of treasures, lord of elephants, lord of the ganas, the great Lord higher than the highest.',
      },
      {
        sanskrit: 'समस्तलोकशंकरं निरस्तदैत्यकुञ्जरं दरेतरोदरं वरं वरेभवक्त्रमक्षरम् । कृपाकरं क्षमाकरं मुदाकरं यशस्करं मनस्करं नमस्कृतां नमस्करोमि भास्वरम् ॥३॥',
        translit:
          'Samasta-Loka-Śaṃkaraṃ Nirasta-Daitya-Kuñjaraṃ Daretarodaraṃ Varaṃ Varebha-Vaktram-Akṣaram | Kṛpā-Karaṃ Kṣamā-Karaṃ Mudā-Karaṃ Yaśas-Karaṃ Manas-Karaṃ Namas-Kṛtāṃ Namas-Karomi Bhāsvaram ||3||',
        english:
          'Bringer of good to all the worlds, who cast away the demon-elephant, boon-giving, with the noble elephant face and imperishable, whose belly is large — the doer of grace, of forgiveness, of joy, of glory and of wisdom for those who bow: to that radiant one I offer my salutation.',
      },
      {
        sanskrit: 'अकिंचनार्तिमार्जनं चिरन्तनोक्तिभाजनं पुरारिपूर्वनन्दनं सुरारिगर्वचर्वणम् । प्रपञ्चनाशभीषणं धनंजयादिभूषणं कपोलदानवारणं भजे पुराणवारणम् ॥४॥',
        translit:
          'Akiṃcanārti-Mārjanaṃ Cirantanokti-Bhājanaṃ Purāri-Pūrva-Nandanaṃ Surāri-Garva-Carvaṇam | Prapañca-Nāśa-Bhīṣaṇaṃ Dhanaṃjayādi-Bhūṣaṇaṃ Kapola-Dāna-Vāraṇaṃ Bhaje Purāṇa-Vāraṇam ||4||',
        english:
          'Wiper-away of the poor and afflicted, vessel of the eternal scriptures, the elder son of Shiva the foe of Tripura, crusher of the pride of the enemies of the gods; awesome at the dissolution of creation, adorned like Arjuna and the rest, with rut flowing from his temples — I worship that ancient elephant-faced Lord.',
      },
      {
        sanskrit: 'नितान्तकान्तदन्तकान्तिमन्तकान्तकात्मजं अचिन्त्यरूपमन्तहीनमन्तरायकृन्तनम् । हृदन्तरे निरन्तरं वसन्तमेव योगिनां तमेकदन्तमेव तं विचिन्तयामि सन्ततम् ॥५॥',
        translit:
          'Nitānta-Kānta-Danta-Kāntim-Antaka-Antakātmajaṃ Acintya-Rūpam-Anta-Hīnam-Antarāya-Kṛntanam | Hṛd-Antare Nirantaraṃ Vasantam-Eva Yogināṃ Tam-Eka-Dantam-Eva Taṃ Vicintayāmi Santatam ||5||',
        english:
          'Son of Shiva (the ender of Death), with the ever-lovely radiance of his single tusk, of inconceivable form and without end, the cutter of all obstacles, who dwells unceasingly in the hearts of yogis — on that one-tusked Lord I meditate continually.',
      },
      {
        sanskrit: 'महागणेशपञ्चरत्नमादरेण योऽन्वहं प्रजल्पति प्रभातके हृदि स्मरन् गणेश्वरम् । अरोगतामदोषतां सुसाहितीं सुपुत्रतां समाहितायुरष्टभूतिमभ्युपैति सोऽचिरात् ॥६॥',
        translit:
          'Mahā-Gaṇeśa-Pañca-Ratnam-Ādareṇa Yo-nvahaṃ Prajalpati Prabhātake Hṛdi Smaran Gaṇeśvaram | Arogatām-Adoṣatāṃ Su-Sāhitīṃ Su-Putratāṃ Samāhitāyur-Aṣṭa-Bhūtim-Abhy-Upaiti So-cirāt ||6||',
        english:
          'Whoever, with devotion, recites these five gems on the great Ganesha each dawn, remembering the Lord of the ganas in the heart, soon attains health, freedom from faults, good company, worthy children, a full life and the eight-fold prosperity.',
      },
    ],
  },

  // 2. HANUMAN CHALISA -----------------------------------------------------
  {
    slug: 'hanuman-chalisa',
    titleSanskrit: 'हनुमान चालीसा',
    titleEnglish: 'Hanuman Chalisa',
    categorySlug: 'hanuman',
    deityKey: 'hanuman',
    type: 'stotra',
    verses: [
      { sanskrit: 'श्रीगुरु चरण सरोज रज, निज मन मुकुर सुधार । बरनउँ रघुबर बिमल जसु, जो दायकु फल चारि ॥', translit: 'Śrī Guru Caraṇa Saroja Raja, Nija Mana Mukura Sudhāra | Baranau Raghubara Bimala Jasu, Jo Dāyaku Phala Cāri ||', english: 'Cleansing the mirror of my mind with the dust of my Guru’s lotus feet, I sing the pure glory of Rama, which bestows the four fruits of life.' },
      { sanskrit: 'बुद्धिहीन तनु जानिके, सुमिरौं पवन कुमार । बल बुधि बिद्या देहु मोहिं, हरहु कलेस बिकार ॥', translit: 'Buddhihīna Tanu Jānike, Sumirau Pavana Kumāra | Bala Budhi Bidyā Dehu Mohi, Harahu Kalesa Bikāra ||', english: 'Knowing my body devoid of wisdom, I remember the Son of the Wind. Grant me strength, intellect and knowledge, and remove my afflictions and impurities.' },
      { sanskrit: 'जय हनुमान ज्ञान गुन सागर । जय कपीस तिहुँ लोक उजागर ॥', translit: 'Jaya Hanumāna Jñāna Guna Sāgara | Jaya Kapīsa Tihu Loka Ujāgara ||', english: 'Victory to Hanuman, ocean of wisdom and virtue! Victory to the Lord of monkeys, who illumines the three worlds.' },
      { sanskrit: 'रामदूत अतुलित बल धामा । अंजनि पुत्र पवनसुत नामा ॥', translit: 'Rāmadūta Atulita Bala Dhāmā | Añjani Putra Pavanasuta Nāmā ||', english: 'Messenger of Rama, abode of immeasurable strength, known as the son of Anjani and the son of the Wind.' },
      { sanskrit: 'महाबीर बिक्रम बजरंगी । कुमति निवार सुमति के संगी ॥', translit: 'Mahābīra Bikrama Bajaraṅgī | Kumati Nivāra Sumati Ke Saṅgī ||', english: 'Great hero, mighty as a thunderbolt, remover of ill thoughts and companion of good sense.' },
      { sanskrit: 'कंचन बरन बिराज सुबेसा । कानन कुंडल कुंचित केसा ॥', translit: 'Kañcana Barana Birāja Subesā | Kānana Kuṇḍala Kuñcita Kesā ||', english: 'Golden-hued and splendidly dressed, with rings in your ears and curly hair.' },
      { sanskrit: 'हाथ बज्र औ ध्वजा बिराजै । काँधे मूँज जनेऊ साजै ॥', translit: 'Hātha Bajra Au Dhvajā Birājai | Kā̐dhe Mūñja Janeū Sājai ||', english: 'In your hands shine the mace and the banner; across your shoulder the sacred thread of munja grass.' },
      { sanskrit: 'शंकर सुवन केसरी नंदन । तेज प्रताप महा जग बंदन ॥', translit: 'Śaṅkara Suvana Kesarī Nandana | Teja Pratāpa Mahā Jaga Bandana ||', english: 'Emanation of Shiva and joy of Kesari, your splendour and might are honoured by all the world.' },
      { sanskrit: 'बिद्यावान गुनी अति चातुर । राम काज करिबे को आतुर ॥', translit: 'Bidyāvāna Gunī Ati Cātura | Rāma Kāja Karibe Ko Ātura ||', english: 'Learned, virtuous and exceedingly clever, ever eager to do the work of Rama.' },
      { sanskrit: 'प्रभु चरित्र सुनिबे को रसिया । राम लखन सीता मन बसिया ॥', translit: 'Prabhu Caritra Sunibe Ko Rasiyā | Rāma Lakhana Sītā Mana Basiyā ||', english: 'You delight in listening to the Lord’s deeds; Rama, Lakshmana and Sita dwell in your heart.' },
      { sanskrit: 'सूक्ष्म रूप धरि सियहिं दिखावा । बिकट रूप धरि लंक जरावा ॥', translit: 'Sūkṣma Rūpa Dhari Siyahi Dikhāvā | Bikaṭa Rūpa Dhari Laṅka Jarāvā ||', english: 'Assuming a tiny form you appeared to Sita; taking a fearsome form you burned Lanka.' },
      { sanskrit: 'भीम रूप धरि असुर सँहारे । रामचंद्र के काज सँवारे ॥', translit: 'Bhīma Rūpa Dhari Asura Sa̐hāre | Rāmacandra Ke Kāja Sa̐vāre ||', english: 'In a mighty form you destroyed the demons and accomplished the tasks of Ramachandra.' },
      { sanskrit: 'लाय सजीवन लखन जियाये । श्रीरघुबीर हरषि उर लाये ॥', translit: 'Lāya Sajīvana Lakhana Jiyāye | Śrī Raghubīra Haraṣi Ura Lāye ||', english: 'You brought the life-giving herb and revived Lakshmana; joyfully Rama embraced you to his heart.' },
      { sanskrit: 'रघुपति कीन्ही बहुत बड़ाई । तुम मम प्रिय भरतहि सम भाई ॥', translit: 'Raghupati Kīnhī Bahuta Baṛāī | Tuma Mama Priya Bharatahi Sama Bhāī ||', english: 'Rama praised you greatly: “You are as dear to me as my brother Bharata.”' },
      { sanskrit: 'सहस बदन तुम्हरो जस गावैं । अस कहि श्रीपति कंठ लगावैं ॥', translit: 'Sahasa Badana Tumharo Jasa Gāvai | Asa Kahi Śrīpati Kaṇṭha Lagāvai ||', english: '“The thousand-mouthed Sesha sings your praise” — saying this, the Lord embraced you.' },
      { sanskrit: 'सनकादिक ब्रह्मादि मुनीसा । नारद सारद सहित अहीसा ॥', translit: 'Sanakādika Brahmādi Munīsā | Nārada Sārada Sahita Ahīsā ||', english: 'The sages Sanaka and the rest, Brahma and the great seers, Narada, Saraswati and the King of serpents —' },
      { sanskrit: 'जम कुबेर दिगपाल जहाँ ते । कबि कोबिद कहि सके कहाँ ते ॥', translit: 'Jama Kubera Digapāla Jahā̐ Te | Kabi Kobida Kahi Sake Kahā̐ Te ||', english: 'Yama, Kubera and the guardians of the quarters — how then can poets and scholars fully tell your glory?' },
      { sanskrit: 'तुम उपकार सुग्रीवहिं कीन्हा । राम मिलाय राज पद दीन्हा ॥', translit: 'Tuma Upakāra Sugrīvahi Kīnhā | Rāma Milāya Rāja Pada Dīnhā ||', english: 'You did great service to Sugriva, uniting him with Rama and restoring him to his throne.' },
      { sanskrit: 'तुम्हरो मंत्र बिभीषन माना । लंकेस्वर भए सब जग जाना ॥', translit: 'Tumharo Mantra Bibhīṣana Mānā | Laṅkeśvara Bhae Saba Jaga Jānā ||', english: 'Vibhishana heeded your counsel and became lord of Lanka, as all the world knows.' },
      { sanskrit: 'जुग सहस्र जोजन पर भानू । लील्यो ताहि मधुर फल जानू ॥', translit: 'Juga Sahasra Jojana Para Bhānū | Līlyo Tāhi Madhura Phala Jānū ||', english: 'The sun, thousands of yojanas away, you swallowed thinking it a sweet fruit.' },
      { sanskrit: 'प्रभु मुद्रिका मेलि मुख माहीं । जलधि लाँघि गये अचरज नाहीं ॥', translit: 'Prabhu Mudrikā Meli Mukha Māhī | Jaladhi Lā̐ghi Gaye Acaraja Nāhī ||', english: 'Holding the Lord’s ring in your mouth, you leapt across the ocean — no wonder at all.' },
      { sanskrit: 'दुर्गम काज जगत के जेते । सुगम अनुग्रह तुम्हरे तेते ॥', translit: 'Durgama Kāja Jagata Ke Jete | Sugama Anugraha Tumhare Tete ||', english: 'Every difficult task in the world becomes easy by your grace.' },
      { sanskrit: 'राम दुआरे तुम रखवारे । होत न आज्ञा बिनु पैसारे ॥', translit: 'Rāma Duāre Tuma Rakhavāre | Hota Na Ājñā Binu Paisāre ||', english: 'You are the guardian at Rama’s door; none may enter without your leave.' },
      { sanskrit: 'सब सुख लहै तुम्हारी सरना । तुम रच्छक काहू को डर ना ॥', translit: 'Saba Sukha Lahai Tumhārī Saranā | Tuma Racchaka Kāhū Ko Ḍara Nā ||', english: 'All comforts are found in your refuge; with you as protector there is nothing to fear.' },
      { sanskrit: 'आपन तेज सम्हारो आपै । तीनों लोक हाँक तें काँपै ॥', translit: 'Āpana Teja Samhāro Āpai | Tīno Loka Hā̐ka Te Kā̐pai ||', english: 'You alone contain your own splendour; at your roar the three worlds tremble.' },
      { sanskrit: 'भूत पिसाच निकट नहिं आवै । महाबीर जब नाम सुनावै ॥', translit: 'Bhūta Pisāca Nikaṭa Nahi Āvai | Mahābīra Jaba Nāma Sunāvai ||', english: 'Ghosts and evil spirits dare not come near when your name, O Mighty Hero, is uttered.' },
      { sanskrit: 'नासै रोग हरै सब पीरा । जपत निरंतर हनुमत बीरा ॥', translit: 'Nāsai Roga Harai Saba Pīrā | Japata Nirantara Hanumata Bīrā ||', english: 'Disease is destroyed and all pain removed by the constant chanting of the name of brave Hanuman.' },
      { sanskrit: 'संकट तें हनुमान छुड़ावै । मन क्रम बचन ध्यान जो लावै ॥', translit: 'Saṅkaṭa Te Hanumāna Chuṛāvai | Mana Krama Bacana Dhyāna Jo Lāvai ||', english: 'Hanuman frees from every calamity all who meditate on him in thought, deed and word.' },
      { sanskrit: 'सब पर राम तपस्वी राजा । तिन के काज सकल तुम साजा ॥', translit: 'Saba Para Rāma Tapasvī Rājā | Tina Ke Kāja Sakala Tuma Sājā ||', english: 'Rama the ascetic king reigns over all; and all his tasks you accomplished.' },
      { sanskrit: 'और मनोरथ जो कोई लावै । सोइ अमित जीवन फल पावै ॥', translit: 'Aura Manoratha Jo Koī Lāvai | Soi Amita Jīvana Phala Pāvai ||', english: 'Whoever brings any heartfelt wish to you receives its boundless fruit in life.' },
      { sanskrit: 'चारों जुग परताप तुम्हारा । है परसिद्ध जगत उजियारा ॥', translit: 'Cāro Juga Paratāpa Tumhārā | Hai Parasiddha Jagata Ujiyārā ||', english: 'Your glory shines across all four ages; your renown lights up the world.' },
      { sanskrit: 'साधु संत के तुम रखवारे । असुर निकंदन राम दुलारे ॥', translit: 'Sādhu Santa Ke Tuma Rakhavāre | Asura Nikandana Rāma Dulāre ||', english: 'Protector of the holy and the saints, destroyer of demons, beloved of Rama.' },
      { sanskrit: 'अष्ट सिद्धि नौ निधि के दाता । अस बर दीन जानकी माता ॥', translit: 'Aṣṭa Siddhi Nau Nidhi Ke Dātā | Asa Bara Dīna Jānakī Mātā ||', english: 'Giver of the eight powers and nine treasures — such a boon Mother Janaki (Sita) granted you.' },
      { sanskrit: 'राम रसायन तुम्हरे पासा । सदा रहो रघुपति के दासा ॥', translit: 'Rāma Rasāyana Tumhare Pāsā | Sadā Raho Raghupati Ke Dāsā ||', english: 'The elixir of Rama’s name is ever with you; may you remain forever the servant of Rama.' },
      { sanskrit: 'तुम्हरे भजन राम को पावै । जनम जनम के दुख बिसरावै ॥', translit: 'Tumhare Bhajana Rāma Ko Pāvai | Janama Janama Ke Dukha Bisarāvai ||', english: 'Through devotion to you one attains Rama and is freed from the sorrows of countless births.' },
      { sanskrit: 'अंत काल रघुबर पुर जाई । जहाँ जन्म हरिभक्त कहाई ॥', translit: 'Anta Kāla Raghubara Pura Jāī | Jahā̐ Janma Haribhakta Kahāī ||', english: 'At life’s end one goes to Rama’s abode, and is thereafter known as a devotee of Hari.' },
      { sanskrit: 'और देवता चित्त न धरई । हनुमत सेइ सर्ब सुख करई ॥', translit: 'Aura Devatā Citta Na Dharaī | Hanumata Sei Sarba Sukha Karaī ||', english: 'Even one who holds no other god in mind finds every happiness by serving Hanuman.' },
      { sanskrit: 'संकट कटै मिटै सब पीरा । जो सुमिरै हनुमत बलबीरा ॥', translit: 'Saṅkaṭa Kaṭai Miṭai Saba Pīrā | Jo Sumirai Hanumata Balabīrā ||', english: 'All troubles are cut away and every pain erased for whoever remembers the mighty, brave Hanuman.' },
      { sanskrit: 'जय जय जय हनुमान गोसाईं । कृपा करहु गुरुदेव की नाईं ॥', translit: 'Jaya Jaya Jaya Hanumāna Gosāī | Kṛpā Karahu Gurudeva Kī Nāī ||', english: 'Victory, victory, victory to Lord Hanuman! Bestow your grace upon me as my divine Guru.' },
      { sanskrit: 'जो सत बार पाठ कर कोई । छूटहि बंदि महा सुख होई ॥', translit: 'Jo Sata Bāra Pāṭha Kara Koī | Chūṭahi Bandi Mahā Sukha Hoī ||', english: 'Whoever recites this a hundred times is freed from bondage and attains great bliss.' },
      { sanskrit: 'जो यह पढ़ै हनुमान चालीसा । होय सिद्धि साखी गौरीसा ॥', translit: 'Jo Yaha Paṛhai Hanumāna Cālīsā | Hoya Siddhi Sākhī Gaurīsā ||', english: 'Whoever reads this Hanuman Chalisa attains perfection — Shiva himself is witness.' },
      { sanskrit: 'तुलसीदास सदा हरि चेरा । कीजै नाथ हृदय महँ डेरा ॥', translit: 'Tulasīdāsa Sadā Hari Cerā | Kījai Nātha Hṛdaya Maha̐ Ḍerā ||', english: 'Tulsidas is ever the servant of Hari; O Lord, make your dwelling within my heart.' },
      { sanskrit: 'पवनतनय संकट हरन, मंगल मूरति रूप । राम लखन सीता सहित, हृदय बसहु सुर भूप ॥', translit: 'Pavanatanaya Saṅkaṭa Harana, Maṅgala Mūrati Rūpa | Rāma Lakhana Sītā Sahita, Hṛdaya Basahu Sura Bhūpa ||', english: 'O Son of the Wind, remover of afflictions, embodiment of auspiciousness — dwell in my heart, O King of gods, together with Rama, Lakshmana and Sita.' },
    ],
  },

  // 3. SHIVA TANDAVA STOTRAM (first 10) ------------------------------------
  {
    slug: 'shiva-tandava-stotram',
    titleSanskrit: 'शिवताण्डवस्तोत्रम्',
    titleEnglish: 'Shiva Tandava Stotram',
    categorySlug: 'shiva',
    deityKey: 'shiva',
    type: 'stotra',
    verses: [
      { sanskrit: 'जटाटवीगलज्जलप्रवाहपावितस्थले गलेऽवलम्ब्य लम्बितां भुजङ्गतुङ्गमालिकाम् । डमड्डमड्डमड्डमन्निनादवड्डमर्वयं चकार चण्डताण्डवं तनोतु नः शिवः शिवम् ॥१॥', translit: 'Jaṭāṭavī-Galaj-Jala-Pravāha-Pāvita-Sthale Gale-valambya Lambitāṃ Bhujaṅga-Tuṅga-Mālikām | Ḍamaḍ-Ḍamaḍ-Ḍamaḍ-Ḍaman-Ninādavaḍ-Ḍamarvayaṃ Cakāra Caṇḍa-Tāṇḍavaṃ Tanotu Naḥ Śivaḥ Śivam ||1||', english: 'From the forest of his matted locks the sacred river Ganga flows and hallows the ground; a lofty garland of serpents hangs upon his neck; his drum sounds ḍamaḍ-ḍamaḍ as he dances the fierce Tandava — may Shiva grant us auspiciousness.' },
      { sanskrit: 'जटाकटाहसम्भ्रमभ्रमन्निलिम्पनिर्झरी विलोलवीचिवल्लरीविराजमानमूर्धनि । धगद्धगद्धगज्जलल्ललाटपट्टपावके किशोरचन्द्रशेखरे रतिः प्रतिक्षणं मम ॥२॥', translit: 'Jaṭā-Kaṭāha-Sambhrama-Bhraman-Nilimpa-Nirjharī Vilola-Vīci-Vallarī-Virājamāna-Mūrdhani | Dhagad-Dhagad-Dhagaj-Jvalal-Lalāṭa-Paṭṭa-Pāvake Kiśora-Candra-Śekhare Ratiḥ Pratikṣaṇaṃ Mama ||2||', english: 'In whose matted hair the celestial river whirls and tosses its restless waves, on whose brow the fire blazes dhagad-dhagad, who wears the young crescent moon on his crest — in him let my delight grow every moment.' },
      { sanskrit: 'धराधरेन्द्रनन्दिनीविलासबन्धुबन्धुर स्फुरद्दिगन्तसन्ततिप्रमोदमानमानसे । कृपाकटाक्षधोरणीनिरुद्धदुर्धरापदि क्वचिद्दिगम्बरे मनो विनोदमेतु वस्तुनि ॥३॥', translit: 'Dharā-Dharendra-Nandinī-Vilāsa-Bandhu-Bandhura Sphurad-Diganta-Santati-Pramodamāna-Mānase | Kṛpā-Kaṭākṣa-Dhoraṇī-Niruddha-Durdharāpadi Kvacid-Digambare Mano Vinodam-Etu Vastuni ||3||', english: 'May my mind find its delight in the sky-clad Lord — the loving companion of the mountain-king’s daughter, whose mind rejoices in all creation, whose stream of compassionate glances holds back the most unbearable calamities.' },
      { sanskrit: 'जटाभुजङ्गपिङ्गलस्फुरत्फणामणिप्रभा कदम्बकुङ्कुमद्रवप्रलिप्तदिग्वधूमुखे । मदान्धसिन्धुरस्फुरत्त्वगुत्तरीयमेदुरे मनो विनोदमद्भुतं बिभर्तु भूतभर्तरि ॥४॥', translit: 'Jaṭā-Bhujaṅga-Piṅgala-Sphurat-Phaṇā-Maṇi-Prabhā Kadamba-Kuṅkuma-Drava-Pralipta-Digvadhū-Mukhe | Madāndha-Sindhura-Sphurat-Tvag-Uttarīya-Medure Mano Vinodam-Adbhutaṃ Bibhartu Bhūta-Bhartari ||4||', english: 'The gem on the hood of the tawny serpent in his hair casts light that reddens the faces of the maidens of the quarters; he wears the hide of the rutting elephant — may my mind hold wondrous joy in that Lord of beings.' },
      { sanskrit: 'सहस्रलोचनप्रभृत्यशेषलेखशेखर प्रसूनधूलिधोरणी विधूसराङ्घ्रिपीठभूः । भुजङ्गराजमालया निबद्धजाटजूटकः श्रियै चिराय जायतां चकोरबन्धुशेखरः ॥५॥', translit: 'Sahasra-Locana-Prabhṛty-Aśeṣa-Lekha-Śekhara Prasūna-Dhūli-Dhoraṇī Vidhūsarāṅghri-Pīṭha-Bhūḥ | Bhujaṅga-Rāja-Mālayā Nibaddha-Jāṭa-Jūṭakaḥ Śriyai Cirāya Jāyatāṃ Cakora-Bandhu-Śekharaḥ ||5||', english: 'The footstool of the Lord is greyed by the pollen from the flowers on the crowns of Indra and all the gods who bow; his matted locks are bound by the king of serpents; may that moon-crested one bring us lasting blessing.' },
      { sanskrit: 'ललाटचत्वरज्वलद्धनञ्जयस्फुलिङ्गभा निपीतपञ्चसायकं नमन्निलिम्पनायकम् । सुधामयूखलेखया विराजमानशेखरं महाकपालिसम्पदेशिरोजटालमस्तु नः ॥६॥', translit: 'Lalāṭa-Catvara-Jvalad-Dhanañjaya-Sphuliṅga-Bhā Nipīta-Pañca-Sāyakaṃ Naman-Nilimpa-Nāyakam | Sudhā-Mayūkha-Lekhayā Virājamāna-Śekharaṃ Mahā-Kapāli-Sampade Śiro-Jaṭālam-Astu Naḥ ||6||', english: 'The fire blazing on his broad forehead consumed the five-arrowed god of love; the lord of the gods bows to him; his crest is graced by the streak of the nectar-rayed moon — may his matted head grant us great riches.' },
      { sanskrit: 'करालभालपट्टिकाधगद्धगद्धगज्ज्वलद् धनञ्जयाहुतीकृतप्रचण्डपञ्चसायके । धराधरेन्द्रनन्दिनीकुचाग्रचित्रपत्रक प्रकल्पनैकशिल्पिनि त्रिलोचने रतिर्मम ॥७॥', translit: 'Karāla-Bhāla-Paṭṭikā-Dhagad-Dhagad-Dhagaj-Jvalad Dhanañjayāhutī-Kṛta-Pracaṇḍa-Pañca-Sāyake | Dharā-Dharendra-Nandinī-Kucāgra-Citra-Patraka Prakalpanaika-Śilpini Tri-Locane Ratir-Mama ||7||', english: 'On whose terrible brow the fire blazes dhagad-dhagad and offered up the mighty five-arrowed one; who is the sole artist painting delicate designs on the breast of the mountain-daughter — in that three-eyed Lord is my delight.' },
      { sanskrit: 'नवीनमेघमण्डली निरुद्धदुर्धरस्फुरत् कुहूनिशीथिनीतमः प्रबन्धबद्धकन्धरः । निलिम्पनिर्झरीधरस्तनोतु कृत्तिसिन्धुरः कलानिधानबन्धुरः श्रियं जगद्धुरन्धरः ॥८॥', translit: 'Navīna-Megha-Maṇḍalī Niruddha-Durdhara-Sphurat Kuhū-Niśīthinī-Tamaḥ Prabandha-Baddha-Kandharaḥ | Nilimpa-Nirjharī-Dharas-Tanotu Kṛtti-Sindhuraḥ Kalā-Nidhāna-Bandhuraḥ Śriyaṃ Jagad-Dhurandharaḥ ||8||', english: 'His neck is dark as the deep gloom of a new-moon midnight massed with fresh rain-clouds; he bears the Ganga and the elephant-hide, is graced by the crescent, and upholds the world — may he bestow prosperity.' },
      { sanskrit: 'प्रफुल्लनीलपङ्कजप्रपञ्चकालिमप्रभा वलम्बिकण्ठकन्दलीरुचिप्रबद्धकन्धरम् । स्मरच्छिदं पुरच्छिदं भवच्छिदं मखच्छिदं गजच्छिदान्धकच्छिदं तमन्तकच्छिदं भजे ॥९॥', translit: 'Praphulla-Nīla-Paṅkaja-Prapañca-Kālima-Prabhā Valambi-Kaṇṭha-Kandalī-Ruci-Prabaddha-Kandharam | Smarac-Chidaṃ Purac-Chidaṃ Bhavac-Chidaṃ Makhac-Chidaṃ Gajac-Chid-Andhakac-Chidaṃ Tam-Antakac-Chidaṃ Bhaje ||9||', english: 'His throat glows dark as a cluster of full-blown blue lotuses — I worship him who cut down Kama, destroyed Tripura, ends worldly existence, halted Daksha’s sacrifice, slew the elephant-demon and Andhaka, and conquered Death himself.' },
      { sanskrit: 'अखर्वसर्वमङ्गलाकलाकदम्बमञ्जरी रसप्रवाहमाधुरीविजृम्भणामधुव्रतम् । स्मरान्तकं पुरान्तकं भवान्तकं मखान्तकं गजान्तकान्धकान्तकं तमन्तकान्तकं भजे ॥१०॥', translit: 'Akharva-Sarva-Maṅgalā-Kalā-Kadamba-Mañjarī Rasa-Pravāha-Mādhurī-Vijṛmbhaṇā-Madhu-Vratam | Smarāntakaṃ Purāntakaṃ Bhavāntakaṃ Makhāntakaṃ Gajāntak-Andhakāntakaṃ Tam-Antakāntakaṃ Bhaje ||10||', english: 'Like a bee drinking the sweet flowing nectar of the blossoming cluster of all abundant auspiciousness — I worship him, ender of Kama, of Tripura, of worldly bondage, of Daksha’s sacrifice, of the elephant-demon and Andhaka, the very ender of Death.' },
    ],
  },

  // 4. LINGASHTAKAM --------------------------------------------------------
  {
    slug: 'lingashtakam',
    titleSanskrit: 'लिङ्गाष्टकम्',
    titleEnglish: 'Lingashtakam',
    categorySlug: 'shiva',
    deityKey: 'shiva',
    type: 'stotra',
    verses: [
      { sanskrit: 'ब्रह्ममुरारिसुरार्चितलिङ्गं निर्मलभासितशोभितलिङ्गम् । जन्मजदुःखविनाशकलिङ्गं तत् प्रणमामि सदाशिवलिङ्गम् ॥१॥', translit: 'Brahma-Murāri-Surārcita-Liṅgaṃ Nirmala-Bhāsita-Śobhita-Liṅgam | Janmaja-Duḥkha-Vināśaka-Liṅgaṃ Tat Praṇamāmi Sadāśiva-Liṅgam ||1||', english: 'The Linga worshipped by Brahma, Vishnu and the gods, the Linga radiant with spotless light, the Linga that destroys the sorrows of birth — to that Sadashiva Linga I bow.' },
      { sanskrit: 'देवमुनिप्रवरार्चितलिङ्गं कामदहं करुणाकरलिङ्गम् । रावणदर्पविनाशनलिङ्गं तत् प्रणमामि सदाशिवलिङ्गम् ॥२॥', translit: 'Deva-Muni-Pravarārcita-Liṅgaṃ Kāma-Dahaṃ Karuṇākara-Liṅgam | Rāvaṇa-Darpa-Vināśana-Liṅgaṃ Tat Praṇamāmi Sadāśiva-Liṅgam ||2||', english: 'The Linga worshipped by gods and the greatest sages, that burned desire to ash, the merciful Linga that shattered Ravana’s pride — to that Sadashiva Linga I bow.' },
      { sanskrit: 'सर्वसुगन्धिसुलेपितलिङ्गं बुद्धिविवर्धनकारणलिङ्गम् । सिद्धसुरासुरवन्दितलिङ्गं तत् प्रणमामि सदाशिवलिङ्गम् ॥३॥', translit: 'Sarva-Sugandhi-Sulepita-Liṅgaṃ Buddhi-Vivardhana-Kāraṇa-Liṅgam | Siddha-Surāsura-Vandita-Liṅgaṃ Tat Praṇamāmi Sadāśiva-Liṅgam ||3||', english: 'The Linga anointed with every fragrance, the Linga that is the cause of increasing wisdom, the Linga adored by siddhas, gods and demons — to that Sadashiva Linga I bow.' },
      { sanskrit: 'कनकमहामणिभूषितलिङ्गं फणिपतिवेष्टितशोभितलिङ्गम् । दक्षसुयज्ञविनाशनलिङ्गं तत् प्रणमामि सदाशिवलिङ्गम् ॥४॥', translit: 'Kanaka-Mahā-Maṇi-Bhūṣita-Liṅgaṃ Phaṇi-Pati-Veṣṭita-Śobhita-Liṅgam | Dakṣa-Su-Yajña-Vināśana-Liṅgaṃ Tat Praṇamāmi Sadāśiva-Liṅgam ||4||', english: 'The Linga adorned with gold and great gems, resplendent encircled by the king of serpents, the Linga that destroyed Daksha’s sacrifice — to that Sadashiva Linga I bow.' },
      { sanskrit: 'कुङ्कुमचन्दनलेपितलिङ्गं पङ्कजहारसुशोभितलिङ्गम् । सञ्चितपापविनाशनलिङ्गं तत् प्रणमामि सदाशिवलिङ्गम् ॥५॥', translit: 'Kuṅkuma-Candana-Lepita-Liṅgaṃ Paṅkaja-Hāra-Su-Śobhita-Liṅgam | Sañcita-Pāpa-Vināśana-Liṅgaṃ Tat Praṇamāmi Sadāśiva-Liṅgam ||5||', english: 'The Linga anointed with saffron and sandal, beautified with garlands of lotuses, the Linga that destroys accumulated sins — to that Sadashiva Linga I bow.' },
      { sanskrit: 'देवगणार्चितसेवितलिङ्गं भावैर्भक्तिभिरेव च लिङ्गम् । दिनकरकोटिप्रभाकरलिङ्गं तत् प्रणमामि सदाशिवलिङ्गम् ॥६॥', translit: 'Deva-Gaṇārcita-Sevita-Liṅgaṃ Bhāvair-Bhaktibhir-Eva Ca Liṅgam | Dinakara-Koṭi-Prabhākara-Liṅgaṃ Tat Praṇamāmi Sadāśiva-Liṅgam ||6||', english: 'The Linga served and worshipped by the hosts of gods, the Linga approached with true feeling and devotion, radiant as a million suns — to that Sadashiva Linga I bow.' },
      { sanskrit: 'अष्टदलोपरिवेष्टितलिङ्गं सर्वसमुद्भवकारणलिङ्गम् । अष्टदरिद्रविनाशितलिङ्गं तत् प्रणमामि सदाशिवलिङ्गम् ॥७॥', translit: 'Aṣṭa-Dalopari-Veṣṭita-Liṅgaṃ Sarva-Samudbhava-Kāraṇa-Liṅgam | Aṣṭa-Daridra-Vināśita-Liṅgaṃ Tat Praṇamāmi Sadāśiva-Liṅgam ||7||', english: 'The Linga encircled upon the eight-petalled lotus, the Linga that is the cause of all creation, that destroys the eight forms of poverty — to that Sadashiva Linga I bow.' },
      { sanskrit: 'सुरगुरुसुरवरपूजितलिङ्गं सुरवनपुष्पसदार्चितलिङ्गम् । परात्परं परमात्मकलिङ्गं तत् प्रणमामि सदाशिवलिङ्गम् ॥८॥', translit: 'Sura-Guru-Sura-Vara-Pūjita-Liṅgaṃ Sura-Vana-Puṣpa-Sadārcita-Liṅgam | Parātparaṃ Paramātmaka-Liṅgaṃ Tat Praṇamāmi Sadāśiva-Liṅgam ||8||', english: 'The Linga worshipped by the guru of the gods and the greatest of gods, ever adored with flowers of the celestial groves, higher than the highest, the very Supreme Self — to that Sadashiva Linga I bow.' },
    ],
  },

  // 5. MADHURASHTAKAM ------------------------------------------------------
  {
    slug: 'madhurashtakam',
    titleSanskrit: 'मधुराष्टकम्',
    titleEnglish: 'Madhurashtakam',
    categorySlug: 'vishnu-krishna',
    deityKey: 'krishna',
    type: 'stotra',
    verses: [
      { sanskrit: 'अधरं मधुरं वदनं मधुरं नयनं मधुरं हसितं मधुरम् । हृदयं मधुरं गमनं मधुरं मधुराधिपतेरखिलं मधुरम् ॥१॥', translit: 'Adharaṃ Madhuraṃ Vadanaṃ Madhuraṃ Nayanaṃ Madhuraṃ Hasitaṃ Madhuram | Hṛdayaṃ Madhuraṃ Gamanaṃ Madhuraṃ Madhurādhipater-Akhilaṃ Madhuram ||1||', english: 'Sweet are his lips, sweet his face, sweet his eyes, sweet his smile; sweet his heart, sweet his gait — everything about the Lord of sweetness is sweet.' },
      { sanskrit: 'वचनं मधुरं चरितं मधुरं वसनं मधुरं वलितं मधुरम् । चलितं मधुरं भ्रमितं मधुरं मधुराधिपतेरखिलं मधुरम् ॥२॥', translit: 'Vacanaṃ Madhuraṃ Caritaṃ Madhuraṃ Vasanaṃ Madhuraṃ Valitaṃ Madhuram | Calitaṃ Madhuraṃ Bhramitaṃ Madhuraṃ Madhurādhipater-Akhilaṃ Madhuram ||2||', english: 'Sweet is his speech, sweet his deeds, sweet his garments, sweet his poise; sweet his movement, sweet his wandering — everything about the Lord of sweetness is sweet.' },
      { sanskrit: 'वेणुर्मधुरो रेणुर्मधुरः पाणिर्मधुरः पादौ मधुरौ । नृत्यं मधुरं सख्यं मधुरं मधुराधिपतेरखिलं मधुरम् ॥३॥', translit: 'Veṇur-Madhuro Reṇur-Madhuraḥ Pāṇir-Madhuraḥ Pādau Madhurau | Nṛtyaṃ Madhuraṃ Sakhyaṃ Madhuraṃ Madhurādhipater-Akhilaṃ Madhuram ||3||', english: 'Sweet is his flute, sweet the dust of his feet, sweet his hands, sweet his feet; sweet his dance, sweet his friendship — everything about the Lord of sweetness is sweet.' },
      { sanskrit: 'गीतं मधुरं पीतं मधुरं भुक्तं मधुरं सुप्तं मधुरम् । रूपं मधुरं तिलकं मधुरं मधुराधिपतेरखिलं मधुरम् ॥४॥', translit: 'Gītaṃ Madhuraṃ Pītaṃ Madhuraṃ Bhuktaṃ Madhuraṃ Suptaṃ Madhuram | Rūpaṃ Madhuraṃ Tilakaṃ Madhuraṃ Madhurādhipater-Akhilaṃ Madhuram ||4||', english: 'Sweet is his song, sweet his drinking, sweet his eating, sweet his sleeping; sweet his form, sweet the mark on his brow — everything about the Lord of sweetness is sweet.' },
      { sanskrit: 'करणं मधुरं तरणं मधुरं हरणं मधुरं रमणं मधुरम् । वमितं मधुरं शमितं मधुरं मधुराधिपतेरखिलं मधुरम् ॥५॥', translit: 'Karaṇaṃ Madhuraṃ Taraṇaṃ Madhuraṃ Haraṇaṃ Madhuraṃ Ramaṇaṃ Madhuram | Vamitaṃ Madhuraṃ Śamitaṃ Madhuraṃ Madhurādhipater-Akhilaṃ Madhuram ||5||', english: 'Sweet are his deeds, sweet his deliverance, sweet his stealing, sweet his play; sweet his subduing, sweet his calming — everything about the Lord of sweetness is sweet.' },
      { sanskrit: 'गुञ्जा मधुरा माला मधुरा यमुना मधुरा वीची मधुरा । सलिलं मधुरं कमलं मधुरं मधुराधिपतेरखिलं मधुरम् ॥६॥', translit: 'Guñjā Madhurā Mālā Madhurā Yamunā Madhurā Vīcī Madhurā | Salilaṃ Madhuraṃ Kamalaṃ Madhuraṃ Madhurādhipater-Akhilaṃ Madhuram ||6||', english: 'Sweet are his berry-bead garland, sweet his flower-garland, sweet the Yamuna, sweet her waves; sweet the water, sweet the lotus — everything about the Lord of sweetness is sweet.' },
      { sanskrit: 'गोपी मधुरा लीला मधुरा युक्तं मधुरं मुक्तं मधुरम् । दृष्टं मधुरं शिष्टं मधुरं मधुराधिपतेरखिलं मधुरम् ॥७॥', translit: 'Gopī Madhurā Līlā Madhurā Yuktaṃ Madhuraṃ Muktaṃ Madhuram | Dṛṣṭaṃ Madhuraṃ Śiṣṭaṃ Madhuraṃ Madhurādhipater-Akhilaṃ Madhuram ||7||', english: 'Sweet are the gopis, sweet his play, sweet his union, sweet his release; sweet his glance, sweet his courtesy — everything about the Lord of sweetness is sweet.' },
      { sanskrit: 'गोपा मधुरा गावो मधुरा यष्टिर्मधुरा सृष्टिर्मधुरा । दलितं मधुरं फलितं मधुरं मधुराधिपतेरखिलं मधुरम् ॥८॥', translit: 'Gopā Madhurā Gāvo Madhurā Yaṣṭir-Madhurā Sṛṣṭir-Madhurā | Dalitaṃ Madhuraṃ Phalitaṃ Madhuraṃ Madhurādhipater-Akhilaṃ Madhuram ||8||', english: 'Sweet are the cowherds, sweet the cows, sweet his staff, sweet his creation; sweet his trampling, sweet his bestowing of fruit — everything about the Lord of sweetness is sweet.' },
    ],
  },

  // 6. BHAJA GOVINDAM (first 12) -------------------------------------------
  {
    slug: 'bhaja-govindam',
    titleSanskrit: 'भजगोविन्दम्',
    titleEnglish: 'Bhaja Govindam',
    categorySlug: 'vishnu-krishna',
    deityKey: 'vishnu',
    type: 'stotra',
    verses: [
      { sanskrit: 'भज गोविन्दं भज गोविन्दं गोविन्दं भज मूढमते । सम्प्राप्ते सन्निहिते काले नहि नहि रक्षति डुकृञ्करणे ॥१॥', translit: 'Bhaja Govindaṃ Bhaja Govindaṃ Govindaṃ Bhaja Mūḍhamate | Samprāpte Sannihite Kāle Nahi Nahi Rakṣati Ḍukṛñ-Karaṇe ||1||', english: 'Worship Govinda, worship Govinda, worship Govinda, O deluded mind! When the appointed hour draws near, dry rules of grammar will not save you.' },
      { sanskrit: 'मूढ जहीहि धनागमतृष्णां कुरु सद्बुद्धिं मनसि वितृष्णाम् । यल्लभसे निजकर्मोपात्तं वित्तं तेन विनोदय चित्तम् ॥२॥', translit: 'Mūḍha Jahīhi Dhanāgama-Tṛṣṇāṃ Kuru Sad-Buddhiṃ Manasi Vitṛṣṇām | Yal-Labhase Nija-Karmopāttaṃ Vittaṃ Tena Vinodaya Cittam ||2||', english: 'O fool, give up the thirst to amass wealth; cultivate desirelessness and good sense in the mind. Be content in heart with whatever comes to you through your own honest effort.' },
      { sanskrit: 'नारीस्तनभरनाभीदेशं दृष्ट्वा मा गा मोहावेशम् । एतन्मांसवसादिविकारं मनसि विचिन्तय वारं वारम् ॥३॥', translit: 'Nārī-Stana-Bhara-Nābhī-Deśaṃ Dṛṣṭvā Mā Gā Mohāveśam | Etan-Māṃsa-Vasādi-Vikāraṃ Manasi Vicintaya Vāraṃ Vāram ||3||', english: 'Seeing the body’s beauty, do not fall into the whirl of infatuation. Reflect again and again in the mind that this is but a modification of flesh and fat.' },
      { sanskrit: 'नलिनीदलगतजलमतितरलं तद्वज्जीवितमतिशयचपलम् । विद्धि व्याध्यभिमानग्रस्तं लोकं शोकहतं च समस्तम् ॥४॥', translit: 'Nalinī-Dala-Gata-Jalam-Atitaralaṃ Tad-Vaj-Jīvitam-Atiśaya-Capalam | Viddhi Vyādhy-Abhimāna-Grastaṃ Lokaṃ Śoka-Hataṃ Ca Samastam ||4||', english: 'Life is as unsteady as a drop of water trembling on a lotus leaf. Know that the whole world is seized by disease and conceit and struck with sorrow.' },
      { sanskrit: 'यावद्वित्तोपार्जनसक्तस्तावन्निजपरिवारो रक्तः । पश्चाज्जीवति जर्जरदेहे वार्तां कोऽपि न पृच्छति गेहे ॥५॥', translit: 'Yāvad-Vittopārjana-Saktas-Tāvan-Nija-Parivāro Raktaḥ | Paścāj-Jīvati Jarjara-Dehe Vārtāṃ Ko-pi Na Pṛcchati Gehe ||5||', english: 'As long as you can earn and provide, your family clings to you with affection. When the body grows frail and old, no one at home even asks after you.' },
      { sanskrit: 'यावत्पवनो निवसति देहे तावत्पृच्छति कुशलं गेहे । गतवति वायौ देहापाये भार्या बिभ्यति तस्मिन्काये ॥६॥', translit: 'Yāvat-Pavano Nivasati Dehe Tāvat-Pṛcchati Kuśalaṃ Gehe | Gatavati Vāyau Dehāpāye Bhāryā Bibhyati Tasmin-Kāye ||6||', english: 'While the breath yet dwells in the body, the household asks after your welfare. Once the breath departs and the body falls, even the wife shrinks in fear from that corpse.' },
      { sanskrit: 'बालस्तावत्क्रीडासक्तः तरुणस्तावत्तरुणीसक्तः । वृद्धस्तावच्चिन्तासक्तः परमे ब्रह्मणि कोऽपि न सक्तः ॥७॥', translit: 'Bālas-Tāvat-Krīḍāsaktaḥ Taruṇas-Tāvat-Taruṇī-Saktaḥ | Vṛddhas-Tāvac-Cintāsaktaḥ Parame Brahmaṇi Ko-pi Na Saktaḥ ||7||', english: 'The child is absorbed in play, the youth in passion, the old man in anxieties — but alas, no one is absorbed in the Supreme.' },
      { sanskrit: 'का ते कान्ता कस्ते पुत्रः संसारोऽयमतीव विचित्रः । कस्य त्वं कः कुत आयातस्तत्त्वं चिन्तय तदिह भ्रातः ॥८॥', translit: 'Kā Te Kāntā Kas-Te Putraḥ Saṃsāro-yam-Atīva Vicitraḥ | Kasya Tvaṃ Kaḥ Kuta Āyātas-Tattvaṃ Cintaya Tad-Iha Bhrātaḥ ||8||', english: 'Who is your wife, who your son? This worldly existence is utterly strange. Whose are you, who are you, from where have you come? Reflect on that truth, O brother.' },
      { sanskrit: 'सत्सङ्गत्वे निस्सङ्गत्वं निस्सङ्गत्वे निर्मोहत्वम् । निर्मोहत्वे निश्चलतत्त्वं निश्चलतत्त्वे जीवन्मुक्तिः ॥९॥', translit: 'Sat-Saṅgatve Nis-Saṅgatvaṃ Nis-Saṅgatve Nirmohatvam | Nirmohatve Niścala-Tattvaṃ Niścala-Tattve Jīvan-Muktiḥ ||9||', english: 'Good company leads to non-attachment; non-attachment to freedom from delusion; freedom from delusion to steady truth; and steady truth to liberation in this very life.' },
      { sanskrit: 'वयसि गते कः कामविकारः शुष्के नीरे कः कासारः । क्षीणे वित्ते कः परिवारः ज्ञाते तत्त्वे कः संसारः ॥१०॥', translit: 'Vayasi Gate Kaḥ Kāma-Vikāraḥ Śuṣke Nīre Kaḥ Kāsāraḥ | Kṣīṇe Vitte Kaḥ Parivāraḥ Jñāte Tattve Kaḥ Saṃsāraḥ ||10||', english: 'When youth is gone, where is lust? When the water dries, where is the lake? When wealth is gone, where is the family? When the truth is known, where is worldly bondage?' },
      { sanskrit: 'मा कुरु धनजनयौवनगर्वं हरति निमेषात्कालः सर्वम् । मायामयमिदमखिलं हित्वा ब्रह्मपदं त्वं प्रविश विदित्वा ॥११॥', translit: 'Mā Kuru Dhana-Jana-Yauvana-Garvaṃ Harati Nimeṣāt-Kālaḥ Sarvam | Māyāmayam-Idam-Akhilaṃ Hitvā Brahma-Padaṃ Tvaṃ Praviśa Viditvā ||11||', english: 'Take no pride in wealth, followers or youth — time snatches them all away in a moment. Renouncing this whole illusory world, know and enter the state of Brahman.' },
      { sanskrit: 'दिनयामिन्यौ सायं प्रातः शिशिरवसन्तौ पुनरायातः । कालः क्रीडति गच्छत्यायुस्तदपि न मुञ्चत्याशावायुः ॥१२॥', translit: 'Dina-Yāminyau Sāyaṃ Prātaḥ Śiśira-Vasantau Punar-Āyātaḥ | Kālaḥ Krīḍati Gacchaty-Āyus-Tad-Api Na Muñcaty-Āśā-Vāyuḥ ||12||', english: 'Day and night, dusk and dawn, winter and spring come again and again; time sports on and life ebbs away — yet the gust of craving does not loosen its hold.' },
    ],
  },

  // 7. MAHISHASURA MARDINI STOTRAM (first 5) -------------------------------
  {
    slug: 'mahishasura-mardini-stotram',
    titleSanskrit: 'महिषासुरमर्दिनिस्तोत्रम्',
    titleEnglish: 'Mahishasura Mardini Stotram',
    categorySlug: 'devi',
    deityKey: 'durga',
    type: 'stotra',
    verses: [
      { sanskrit: 'अयि गिरिनन्दिनि नन्दितमेदिनि विश्वविनोदिनि नन्दिनुते गिरिवरविन्ध्यशिरोऽधिनिवासिनि विष्णुविलासिनि जिष्णुनुते । भगवति हे शितिकण्ठकुटुम्बिनि भूरिकुटुम्बिनि भूरिकृते जय जय हे महिषासुरमर्दिनि रम्यकपर्दिनि शैलसुते ॥१॥', translit: 'Ayi Giri-Nandini Nandita-Medini Viśva-Vinodini Nandi-Nute Giri-Vara-Vindhya-Śiro-dhinivāsini Viṣṇu-Vilāsini Jiṣṇu-Nute | Bhagavati He Śiti-Kaṇṭha-Kuṭumbini Bhūri-Kuṭumbini Bhūri-Kṛte Jaya Jaya He Mahiṣāsura-Mardini Ramya-Kapardini Śaila-Sute ||1||', english: 'O daughter of the mountain who gladdens the earth, delight of the universe, praised by Nandi; who dwells on the peak of the great Vindhya, sister of Vishnu, praised by the victorious; O Goddess, consort of the blue-throated Shiva, of vast family and boundless deeds — victory, victory to you, slayer of the buffalo-demon, of lovely braided locks, daughter of the mountain!' },
      { sanskrit: 'सुरवरवर्षिणि दुर्धरधर्षिणि दुर्मुखमर्षिणि हर्षरते त्रिभुवनपोषिणि शङ्करतोषिणि किल्बिषमोषिणि घोषरते । दनुजनिरोषिणि दितिसुतरोषिणि दुर्मदशोषिणि सिन्धुसुते जय जय हे महिषासुरमर्दिनि रम्यकपर्दिनि शैलसुते ॥२॥', translit: 'Sura-Vara-Varṣiṇi Durdhara-Dharṣiṇi Durmukha-Marṣiṇi Harṣa-Rate Tri-Bhuvana-Poṣiṇi Śaṅkara-Toṣiṇi Kilbiṣa-Moṣiṇi Ghoṣa-Rate | Danuja-Niroṣiṇi Diti-Suta-Roṣiṇi Durmada-Śoṣiṇi Sindhu-Sute Jaya Jaya He Mahiṣāsura-Mardini Ramya-Kapardini Śaila-Sute ||2||', english: 'Showering blessings on the gods, assailing the unassailable foe, crushing the wicked, delighting in joy; nourisher of the three worlds, pleasing to Shiva, remover of sins, delighting in sacred sound; wrathful against the demons, drier-up of arrogance, daughter of the ocean — victory, victory to you, slayer of the buffalo-demon, of lovely locks, daughter of the mountain!' },
      { sanskrit: 'अयि जगदम्ब मदम्ब कदम्ब वनप्रियवासिनि हासरते शिखरि शिरोमणि तुङ्गहिमालय शृङ्गनिजालय मध्यगते । मधुमधुरे मधुकैटभगञ्जिनि कैटभभञ्जिनि रासरते जय जय हे महिषासुरमर्दिनि रम्यकपर्दिनि शैलसुते ॥३॥', translit: 'Ayi Jagad-Amba Mad-Amba Kadamba Vana-Priya-Vāsini Hāsa-Rate Śikhari Śiro-Maṇi Tuṅga-Himālaya Śṛṅga-Nijālaya Madhya-Gate | Madhu-Madhure Madhu-Kaiṭabha-Gañjini Kaiṭabha-Bhañjini Rāsa-Rate Jaya Jaya He Mahiṣāsura-Mardini Ramya-Kapardini Śaila-Sute ||3||', english: 'O Mother of the world, my Mother, who loves to dwell in the kadamba groves and delights in laughter; crest-jewel of mountains, who abides among the lofty Himalayan peaks; sweet as honey, vanquisher of Madhu and Kaitabha, delighting in the dance — victory, victory to you, slayer of the buffalo-demon, of lovely locks, daughter of the mountain!' },
      { sanskrit: 'अयि शतखण्ड विखण्डितरुण्ड वितुण्डितशुण्ड गजाधिपते रिपुगजगण्ड विदारणचण्ड पराक्रमशुण्ड मृगाधिपते । निजभुजदण्ड निपातितखण्ड विपातितमुण्ड भटाधिपते जय जय हे महिषासुरमर्दिनि रम्यकपर्दिनि शैलसुते ॥४॥', translit: 'Ayi Śata-Khaṇḍa Vikhaṇḍita-Ruṇḍa Vituṇḍita-Śuṇḍa Gajādhipate Ripu-Gaja-Gaṇḍa Vidāraṇa-Caṇḍa Parākrama-Śuṇḍa Mṛgādhipate | Nija-Bhuja-Daṇḍa Nipātita-Khaṇḍa Vipātita-Muṇḍa Bhaṭādhipate Jaya Jaya He Mahiṣāsura-Mardini Ramya-Kapardini Śaila-Sute ||4||', english: 'O Goddess who hews the enemy into a hundred pieces and severs the trunks of their war-elephants; who rides the lion, fierce in valour, rending the temples of the foe’s elephants; who with her own mighty arms strikes down and beheads the demon-chiefs — victory, victory to you, slayer of the buffalo-demon, of lovely locks, daughter of the mountain!' },
      { sanskrit: 'अयि रणदुर्मद शत्रुवधोदित दुर्धरनिर्जर शक्तिभृते चतुरविचार धुरीणमहाशिव दूतकृत प्रमथाधिपते । दुरितदुरीह दुराशयदुर्मति दानवदूत कृतान्तमते जय जय हे महिषासुरमर्दिनि रम्यकपर्दिनि शैलसुते ॥५॥', translit: 'Ayi Raṇa-Durmada Śatru-Vadhodita Durdhara-Nirjara Śakti-Bhṛte Catura-Vicāra Dhurīṇa-Mahāśiva Dūta-Kṛta Pramathādhipate | Durita-Durīha Durāśaya-Durmati Dānava-Dūta Kṛtānta-Mate Jaya Jaya He Mahiṣāsura-Mardini Ramya-Kapardini Śaila-Sute ||5||', english: 'O bearer of irresistible, undying power, risen to slay the foes maddened in battle; who made the wise and supreme Shiva your messenger, O leader of the hosts; who resolves like Death itself against the evil-minded messengers of the demons — victory, victory to you, slayer of the buffalo-demon, of lovely locks, daughter of the mountain!' },
    ],
  },

  // 8. OM JAI JAGDISH HARE (aarti) -----------------------------------------
  {
    slug: 'om-jai-jagdish-hare',
    titleSanskrit: 'ॐ जय जगदीश हरे',
    titleEnglish: 'Om Jai Jagdish Hare',
    categorySlug: 'aarti',
    deityKey: 'vishnu',
    type: 'aarti',
    verses: [
      { sanskrit: 'ॐ जय जगदीश हरे, स्वामी जय जगदीश हरे । भक्त जनों के संकट, दास जनों के संकट, क्षण में दूर करे ॥', translit: 'Oṃ Jaya Jagadīśa Hare, Svāmī Jaya Jagadīśa Hare | Bhakta Janoṃ Ke Saṅkaṭa, Dāsa Janoṃ Ke Saṅkaṭa, Kṣaṇa Meṃ Dūra Kare ||', english: 'Om, victory to you, Lord of the universe! O Master, victory to you. The troubles of your devotees, the troubles of your servants, you dispel in an instant.' },
      { sanskrit: 'जो ध्यावे फल पावे, दुःख बिनसे मन का । स्वामी दुःख बिनसे मन का । सुख सम्पति घर आवे, कष्ट मिटे तन का ॥', translit: 'Jo Dhyāve Phala Pāve, Duḥkha Binase Mana Kā | Svāmī Duḥkha Binase Mana Kā | Sukha Sampati Ghara Āve, Kaṣṭa Miṭe Tana Kā ||', english: 'Whoever meditates on you gains the fruit, and the sorrows of the mind are destroyed; joy and prosperity come to the home, and the body’s suffering is removed.' },
      { sanskrit: 'मात पिता तुम मेरे, शरण गहूँ मैं किसकी । स्वामी शरण गहूँ मैं किसकी । तुम बिन और न दूजा, आस करूँ मैं जिसकी ॥', translit: 'Māta Pitā Tuma Mere, Śaraṇa Gahū̐ Maiṃ Kisakī | Svāmī Śaraṇa Gahū̐ Maiṃ Kisakī | Tuma Bina Aura Na Dūjā, Āsa Karū̐ Maiṃ Jisakī ||', english: 'You are my mother and father; whose refuge else shall I seek? There is none other than you in whom I may place my hope.' },
      { sanskrit: 'तुम पूरण परमात्मा, तुम अन्तर्यामी । स्वामी तुम अन्तर्यामी । पारब्रह्म परमेश्वर, तुम सब के स्वामी ॥', translit: 'Tuma Pūraṇa Paramātmā, Tuma Antaryāmī | Svāmī Tuma Antaryāmī | Pārabrahma Parameśvara, Tuma Saba Ke Svāmī ||', english: 'You are the perfect Supreme Self, the indweller of all hearts; the Supreme Brahman, the highest Lord, you are the master of all.' },
      { sanskrit: 'तुम करुणा के सागर, तुम पालनकर्ता । स्वामी तुम पालनकर्ता । मैं मूरख खलकामी, कृपा करो भर्ता ॥', translit: 'Tuma Karuṇā Ke Sāgara, Tuma Pālana-Kartā | Svāmī Tuma Pālana-Kartā | Maiṃ Mūrakha Khala-Kāmī, Kṛpā Karo Bhartā ||', english: 'You are the ocean of compassion, the sustainer of all; I am foolish and driven by base desires — bestow your grace on me, O Protector.' },
      { sanskrit: 'तुम हो एक अगोचर, सबके प्राणपति । स्वामी सबके प्राणपति । किस विधि मिलूँ दयामय, तुमको मैं कुमति ॥', translit: 'Tuma Ho Eka Agocara, Sabake Prāṇapati | Svāmī Sabake Prāṇapati | Kisa Vidhi Milū̐ Dayāmaya, Tumako Maiṃ Kumati ||', english: 'You are the one imperceptible Lord, the life of all beings; how, O merciful one, shall I of poor understanding attain you?' },
      { sanskrit: 'दीनबन्धु दुखहर्ता, तुम ठाकुर मेरे । स्वामी तुम ठाकुर मेरे । अपने हाथ उठाओ, द्वार पड़ा मैं तेरे ॥', translit: 'Dīnabandhu Dukhahartā, Tuma Ṭhākura Mere | Svāmī Tuma Ṭhākura Mere | Apane Hātha Uṭhāo, Dvāra Paṛā Maiṃ Tere ||', english: 'Friend of the humble, remover of sorrow, you are my Lord; raise your hand in blessing — I have fallen at your door.' },
      { sanskrit: 'विषय विकार मिटाओ, पाप हरो देवा । स्वामी पाप हरो देवा । श्रद्धा भक्ति बढ़ाओ, सन्तन की सेवा ॥', translit: 'Viṣaya Vikāra Miṭāo, Pāpa Haro Devā | Svāmī Pāpa Haro Devā | Śraddhā Bhakti Baṛhāo, Santana Kī Sevā ||', english: 'Erase the cravings of the senses and take away my sins, O Lord; increase my faith and devotion, and the service of the holy.' },
      { sanskrit: 'तन मन धन सब कुछ है तेरा, स्वामी सब कुछ है तेरा । तेरा तुझको अर्पण, क्या लागे मेरा ॥', translit: 'Tana Mana Dhana Saba Kucha Hai Terā, Svāmī Saba Kucha Hai Terā | Terā Tujhako Arpaṇa, Kyā Lāge Merā ||', english: 'Body, mind, wealth — all that I have is yours, O Master; what is yours I offer back to you: nothing here is truly mine.' },
    ],
  },
];

async function main() {
  console.log('🕉️  Seeding Hindu stotras...');

  // Categories
  const catIdBySlug = new Map<string, string>();
  for (const c of CATEGORIES) {
    const cat = await prisma.stotraCategory.upsert({
      where: { slug: c.slug },
      update: { name: c.name, deityKey: c.deityKey },
      create: { slug: c.slug, name: c.name, deityKey: c.deityKey },
    });
    catIdBySlug.set(c.slug, cat.id);
  }
  console.log(`  📁 ${CATEGORIES.length} categories upserted`);

  let stotraCount = 0;
  let verseCount = 0;
  for (const s of STOTRAS) {
    const categoryId = catIdBySlug.get(s.categorySlug);
    if (!categoryId) throw new Error(`Missing category ${s.categorySlug} for stotra ${s.slug}`);

    const stotra = await prisma.stotra.upsert({
      where: { slug: s.slug },
      update: {
        categoryId,
        titleSanskrit: s.titleSanskrit,
        titleEnglish: s.titleEnglish,
        type: s.type,
        deityKey: s.deityKey,
        isPremium: false,
      },
      create: {
        categoryId,
        slug: s.slug,
        titleSanskrit: s.titleSanskrit,
        titleEnglish: s.titleEnglish,
        type: s.type,
        deityKey: s.deityKey,
        isPremium: false,
      },
    });

    for (let i = 0; i < s.verses.length; i++) {
      const v = s.verses[i];
      const verseNumber = i + 1;
      const verse = await prisma.stotraVerse.upsert({
        where: { stotraId_verseNumber: { stotraId: stotra.id, verseNumber } },
        update: { sanskritText: v.sanskrit, transliteration: v.translit },
        create: {
          stotraId: stotra.id,
          verseNumber,
          sanskritText: v.sanskrit,
          transliteration: v.translit,
        },
      });
      await prisma.stotraTranslation.upsert({
        where: { verseId_languageCode: { verseId: verse.id, languageCode: 'en' } },
        update: { text: v.english },
        create: { verseId: verse.id, languageCode: 'en', text: v.english },
      });
      verseCount++;
    }
    stotraCount++;
    console.log(`  ✅ ${s.titleEnglish} (${s.categorySlug}) — ${s.verses.length} verses`);
  }

  console.log(`🎉 Hindu stotras seed completed: ${CATEGORIES.length} categories, ${stotraCount} stotras, ${verseCount} verses.`);
}

main()
  .catch((e) => {
    console.error('❌ Stotras seed failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
