
/**
 * seed-feelings.ts  —  Islam "How are you feeling?" content
 * ---------------------------------------------------------------------------
 *     npm run prisma:seed:feelings
 *
 * ## THIS SEED CAN ADD BUT CANNOT EDIT  (architecture audit §A)
 *
 * Emotions `upsert` on slug, so renaming or re-iconing an emotion here works.
 * Remedies do NOT. They are guarded by `findFirst({ emotionId, source,
 * arabicText })` and then `create`d — so **changing a remedy's text in this
 * file creates a second row instead of updating the first**, and the user sees
 * the same du'a twice. **Deleting a remedy from this file deletes nothing.**
 *
 * Any correction to existing content therefore goes through the keyed update
 * path, not through this file:
 *     prisma/scripts/update-emotion-remedies.ts
 *
 * ## What happened to Qur'an 3:139
 *
 * Until 2026-10-11 the `hurt` emotion had exactly one remedy: Qur'an 3:139,
 * *"So do not weaken and do not grieve, and you will be superior if you are
 * [true] believers."* It is retired. The reasoning, which a reviewer should be
 * able to check (research §3.4, spec §3.1):
 *
 *   - **Bypass.** It instructs the reader not to feel the thing they just
 *     selected. "Do not grieve", served to someone who said they are hurting,
 *     is a command, not a comfort.
 *   - **Context.** It is addressed to a defeated fighting force in the
 *     aftermath of Uhud. The consolation only survives by amputating the
 *     setting.
 *   - **Punitive reappraisal.** The conditional tail — *if you are [true]
 *     believers* — is readable by a hurting person as *my pain means my faith
 *     is deficient*. Pargament's RCOPE associates exactly that reappraisal
 *     with worse depression outcomes over time (research §3.1). This is the
 *     criterion that makes it a measurable harm rather than a matter of taste.
 *
 * The alternative considered was keeping it late in a rotation. **That is not
 * implementable today:** `FeelingsService.getEmotionBySlug` applies no
 * `orderBy` to `remedies` and `EmotionRemedy` has no `sequence` column, so
 * "first" is whatever Postgres returns. Adding siblings would leave 3:139 free
 * to lead. Retirement is the only option that actually removes the exposure.
 *
 * Removing it from this file is necessary but not sufficient — see the keyed
 * script above for the live row.
 *
 * ## Provenance — this content is UNREVIEWED
 *
 * `grieving` (5 remedies) and the four new `hurt` remedies were curated on
 * 2026-10-11 by Claude (Anthropic) via Claude Code, against the seven criteria
 * in research §3.2. **No human reviewer has seen them.** Spec §6.2 requires a
 * qualified reviewer — an alim or Islamic chaplain with pastoral-care training
 * — before expanded content reaches production, and this script cannot and
 * does not assert that such a review happened. `REVIEW_STATUS` below is a
 * constant for exactly that reason: there is no `reviewStatus` column on
 * `emotion_remedies` to promote, so promotion is a human act recorded
 * elsewhere, never a flag passed to this script.
 *
 * Rows carrying `reviewerMustRuleOn` are the ones the curator flagged as
 * defensible-but-arguable. Read those first.
 *
 * ## Where the note lives
 *
 * `EmotionRemedy` has **no `note` column** (spec track (a) item 3 adds one).
 * Research criterion 6 makes the note the main instrument of editorial safety,
 * so every new remedy carries one — but as a **curator field in this file**,
 * stripped by `stripToColumns()` before any write. **The notes do not reach
 * users yet.** They are here so a reviewer can check the pairing, and so the
 * backfill has something to backfill from when the column lands.
 *
 * The same applies to `translationSource`, `hadithGrading`, `leadEligible`,
 * `curatedBy`, `curatedAt`, `reviewStatus`, `citationNote` and
 * `reviewerMustRuleOn`.
 *
 * ## Citations
 *
 * Every citation below resolves against content already seeded in this
 * database — the 6,236 Qur'an verses and the ten configured hadith books.
 *
 * **No new citation here is into Sahih Muslim, deliberately.** The seeded
 * Sahih Muslim rows are numbered SEQUENTIALLY, not by the canonical reference
 * numbering. Measured against this corpus: "Sahih Muslim 121" is the
 * Mu'adh-to-Yemen hadith (canonically Muslim 19); "Sahih Muslim 2577" is a
 * narration about kissing while fasting, where canonically 2577 is the
 * "I have forbidden oppression for Myself" hadith qudsi; "Sahih Muslim 918"
 * is about saying Amin, where canonically it is the Umm Salama calamity
 * du'a. The verifier resolves against the corpus, so a Sahih Muslim citation
 * can pass this gate and still send a human reader to the wrong hadith —
 * research criterion 7 is attribution intact and *checkable*, and that fails.
 * Bukhari, Nasa'i, Ibn Majah and the two 40-Hadith collections were
 * spot-checked against their chapter placement and do line up.
 * **Treat Sahih Muslim as not safely citable until its numbering is
 * reconciled.** The two rows that would naturally have been cited to Muslim
 * are cited to 40 Hadith Nawawi 24 and Sunan Ibn Majah 1598 instead.
 * Arabic for the new rows was copied byte-exact out of the corpus rather than
 * transcribed. Run the gate before trusting any of it:
 *     npm run prisma:verify:feelings
 */

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
  // Strip sslmode=require, as every other standalone script here does. RDS
  // presents a self-signed chain; leaving the mode in the URL makes pg enforce
  // it strictly and the adapter's `rejectUnauthorized: false` never gets a
  // say. It surfaces as P1011 "self-signed certificate in certificate chain",
  // which reads like a certificate problem and is not one.
  connectionString: databaseUrl.replace('sslmode=require', ''),
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool, prismaSchemaOptions(databaseUrl));
const prisma = new PrismaClient({ adapter });

const ARGV = process.argv.slice(2);
const DRY_RUN = ARGV.includes('--dry-run');

/**
 * Provenance is written as **string literals inside `emotionsData`**, not as
 * references to constants declared here. That is not a style choice:
 * `prisma/verify-feelings-citations.ts` bracket-matches the `emotionsData`
 * literal out of this file and evaluates it in isolation, so any identifier
 * the literal references is undefined at gate time and the gate dies with
 * "CURATED_BY is not defined". Keep the literal self-contained.
 *
 * There is deliberately no `--review-status` flag. There is no `reviewStatus`
 * column to promote, and a script must never assert that a human review
 * happened (spec §6.4).
 */

/** The only four fields `emotion_remedies` actually has. */
function stripToColumns(remedy: Record<string, any>) {
  return {
    arabicText: remedy.arabicText,
    transliteration: remedy.transliteration ?? null,
    translation: remedy.translation,
    source: remedy.source,
  };
}

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
    name: "Grieving",
    slug: "grieving",
    icon: "🕊️",
    // NEW — spec §1.1 row 3 and §3.1 "the bereavement gap". Islam had no
    // bereavement state at all; a bereaved user had to self-classify as `sad`
    // (which lands well) or `hurt` (which served Qur'an 3:139, now retired).
    //
    // Posture: AFFLICTION / consolation (research §3.3). Nothing in this set
    // instructs the reader to stop feeling, to be patient, or to find a reason.
    // Qur'an 2:153 is deliberately absent — research §3.4 names sabr-as-first-
    // response as the specific trap for Muslim grief.
    remedies: [
      {
        arabicText: "ٱلَّذِينَ إِذَآ أَصَٰبَتۡهُم مُّصِيبَةٞ قَالُوٓاْ إِنَّا لِلَّهِ وَإِنَّآ إِلَيۡهِ رَٰجِعُونَ",
        transliteration: "Alladhīna idhā aṣābat-hum muṣībatun qālū innā li-llāhi wa innā ilayhi rājiʿūn.",
        translation: "Who, when disaster strikes them, say, \"Indeed we belong to Allah, and indeed to Him we will return.\"",
        source: "Quran 2:156",
        // --- curator fields: NOT database columns (see header, "Where the
        // note lives"). stripToColumns() drops these before any write. ---
        note: "When there is nothing to say, the tradition puts these words in your mouth — not an explanation for the loss, just somewhere to set it down.",
        translationSource: "Saheeh International",
        hadithGrading: null,
        leadEligible: true,
        curatedBy: "Claude (Anthropic) via Claude Code, working from team/feelings-expansion-spec.md §3.1 and team/feelings-expansion-research.md §3",
        curatedAt: "2026-10-11",
        reviewStatus: "unreviewed",
        reviewerMustRuleOn: "2:155, one ayah earlier, carries the testing frame and 2:157 names the sabirin. 2:156 is quoted alone on purpose. Confirm that reads as intended rather than as an amputation.",
      },
      {
        arabicText: "إِنَّ الْعَيْنَ تَدْمَعُ، وَالْقَلْبَ يَحْزَنُ، وَلاَ نَقُولُ إِلاَّ مَا يَرْضَى رَبُّنَا، وَإِنَّا بِفِرَاقِكَ يَا إِبْرَاهِيمُ لَمَحْزُونُونَ",
        transliteration: "Inna-l-ʿayna tadmaʿ, wa-l-qalba yaḥzan, wa lā naqūlu illā mā yarḍā Rabbunā, wa innā bi-firāqika yā Ibrāhīmu la-maḥzūnūn.",
        translation: "The eye sheds tears and the heart grieves, and we say nothing except what pleases our Lord. And indeed, O Ibrāhīm, we are grieved by your parting.",
        source: "Sahih al-Bukhari 1303",
        // --- curator fields: NOT database columns (see header, "Where the
        // note lives"). stripToColumns() drops these before any write. ---
        note: "The Prophet wept over his dying son and called those tears mercy — whatever you have been told about patience, it never meant dry eyes.",
        translationSource: "Curator rendering of the quoted portion; the full narration is Sahih al-Bukhari 1303 in the seeded corpus.",
        hadithGrading: "Sahih",
        leadEligible: true,
        curatedBy: "Claude (Anthropic) via Claude Code, working from team/feelings-expansion-spec.md §3.1 and team/feelings-expansion-research.md §3",
        curatedAt: "2026-10-11",
        reviewStatus: "unreviewed",
      },
      {
        arabicText: "قَالَ إِنَّمَآ أَشۡكُواْ بَثِّي وَحُزۡنِيٓ إِلَى ٱللَّهِ وَأَعۡلَمُ مِنَ ٱللَّهِ مَا لَا تَعۡلَمُونَ",
        transliteration: "Qāla innamā ashkū baththī wa ḥuznī ila-llāhi wa aʿlamu mina-llāhi mā lā taʿlamūn.",
        translation: "He said, \"I only complain of my suffering and my grief to Allah, and I know from Allah that which you do not know.\"",
        source: "Quran 12:86",
        // --- curator fields: NOT database columns (see header, "Where the
        // note lives"). stripToColumns() drops these before any write. ---
        note: "Yaʿqūb grieved for years and carried it to Allah instead of hiding it; saying 'I am not okay' is not a failure of faith.",
        translationSource: "Saheeh International",
        hadithGrading: null,
        leadEligible: true,
        curatedBy: "Claude (Anthropic) via Claude Code, working from team/feelings-expansion-spec.md §3.1 and team/feelings-expansion-research.md §3",
        curatedAt: "2026-10-11",
        reviewStatus: "unreviewed",
        reviewerMustRuleOn: "The `sad` emotion already serves a partial-clause excerpt of this same ayah. This row quotes it whole. Decide whether both should stand.",
      },
      {
        arabicText: "اللَّهُمَّ اغْفِرْ لَهُ وَارْحَمْهُ وَعَافِهِ وَاعْفُ عَنْهُ",
        transliteration: "Allāhumma-ghfir lahu wa-rḥamhu wa ʿāfihi waʿfu ʿanhu.",
        translation: "O Allah, forgive him, have mercy on him, keep him well, and pardon him.",
        source: "Sunan an-Nasa'i 1984",
        // --- curator fields: NOT database columns (see header, "Where the
        // note lives"). stripToColumns() drops these before any write. ---
        note: "There is still something you can do for them — this is the prayer the Prophet made over the dead.",
        translationSource: "Curator rendering of the quoted portion; the full narration is Sunan an-Nasa'i 1984 in the seeded corpus.",
        hadithGrading: "Sahih",
        leadEligible: true,
        curatedBy: "Claude (Anthropic) via Claude Code, working from team/feelings-expansion-spec.md §3.1 and team/feelings-expansion-research.md §3",
        curatedAt: "2026-10-11",
        reviewStatus: "unreviewed",
        reviewerMustRuleOn: "Deliberately truncated after the opening four petitions. The full du'a continues 'and give him a house better than his house, a family better than his family, and a wife better than his wife' — which, said by a bereaved spouse on this surface, could land very badly. Ratify the truncation or replace the row.",
      },
      {
        arabicText: "إِنَّا لِلَّهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ اللَّهُمَّ عِنْدَكَ احْتَسَبْتُ مُصِيبَتِي فَأْجُرْنِي فِيهَا وَعُضْنِي مِنْهَا",
        transliteration: "Innā li-llāhi wa innā ilayhi rājiʿūn. Allāhumma ʿindaka-ḥtasabtu muṣībatī fa'jurnī fīhā wa ʿuḍnī minhā.",
        translation: "Truly, to Allah we belong and truly, to Him we shall return. O Allah, with You I seek reward for my calamity, so reward me for it and compensate me.",
        source: "Sunan Ibn Majah 1598",
        // --- curator fields: NOT database columns (see header, "Where the
        // note lives"). stripToColumns() drops these before any write. ---
        note: "Umm Salama said these words over a husband she could not imagine anyone replacing, and stopped halfway through — then said them anyway. You are allowed to say them before you mean them.",
        translationSource: "Sunnah.com English of the quoted du'a as carried in the seeded corpus; the full narration is Sunan Ibn Majah 1598.",
        hadithGrading: "Sahih",
        leadEligible: false,
        curatedBy: "Claude (Anthropic) via Claude Code, working from team/feelings-expansion-spec.md §3.1 and team/feelings-expansion-research.md §3",
        curatedAt: "2026-10-11",
        reviewStatus: "unreviewed",
        reviewerMustRuleOn: "FLAGGED AS ARGUABLE — the reviewer's first call on this emotion. 'wa ʿuḍnī minhā' (and compensate me) can read to a bereaved person as being asked to want a replacement. Two things weigh the other way: the narration ITSELF records Umm Salama stopping at that exact clause — 'how can I be compensated with better than Abu Salama?' — before saying it, and the Ibn Majah wording is gentler than the better-known version ('give me something better than it in its place'). NOTE: leadEligible: false is INERT today. getEmotionBySlug applies no orderBy and there is no sequence column, so this row CAN lead the emotion. Decide to keep or cut it BEFORE seeding; without it grieving holds 4, which is still the spec floor.",
      },
    ],
  },
  {
    name: "Hurt",
    slug: "hurt",
    icon: "💗",
    // RE-SCOPED to interpersonal hurt — betrayed, wronged, let down (spec §1.1
    // row 17). Qur'an 3:139 was the ONLY remedy here and has been retired:
    // see the header, "What happened to Qur'an 3:139". Deleting it from this
    // file is necessary but NOT sufficient — this seed never deletes, so the
    // live row must be removed by prisma/scripts/update-emotion-remedies.ts.
    //
    // Posture: AFFLICTION / consolation. Four distinct moves, none of which
    // instructs the reader to forgive, to stop feeling, or to prove anything:
    // you may speak it · it is named as wrong · you are heard · you may set
    // it down. No remedy here is conditional on the reader's faith.
    remedies: [
      {
        arabicText: "۞لَّا يُحِبُّ ٱللَّهُ ٱلۡجَهۡرَ بِٱلسُّوٓءِ مِنَ ٱلۡقَوۡلِ إِلَّا مَن ظُلِمَۚ وَكَانَ ٱللَّهُ سَمِيعًا عَلِيمًا",
        transliteration: "Lā yuḥibbu-llāhu-l-jahra bis-sūʾi mina-l-qawli illā man ẓulim; wa kāna-llāhu Samīʿan ʿAlīmā.",
        translation: "Allah does not like the public mention of evil except by one who has been wronged. And ever is Allah Hearing and Knowing.",
        source: "Quran 4:148",
        // --- curator fields: NOT database columns (see header, "Where the
        // note lives"). stripToColumns() drops these before any write. ---
        note: "You are not required to stay quiet about what was done to you — this verse makes room for the one who was wronged to say so.",
        translationSource: "Saheeh International",
        hadithGrading: null,
        leadEligible: true,
        curatedBy: "Claude (Anthropic) via Claude Code, working from team/feelings-expansion-spec.md §3.1 and team/feelings-expansion-research.md §3",
        curatedAt: "2026-10-11",
        reviewStatus: "unreviewed",
      },
      {
        arabicText: "يَا عِبَادِي: إنِّي حَرَّمْت الظُّلْمَ عَلَى نَفْسِي، وَجَعَلْته بَيْنَكُمْ مُحَرَّمًا؛ فَلَا تَظَالَمُوا",
        transliteration: "Yā ʿibādī, innī ḥarramtu-ẓ-ẓulma ʿalā nafsī wa jaʿaltuhu baynakum muḥarraman, fa-lā taẓālamū.",
        translation: "O My servants, I have forbidden injustice for Myself and have made it forbidden among you, so do not wrong one another.",
        source: "40 Hadith Nawawi 24",
        // --- curator fields: NOT database columns (see header, "Where the
        // note lives"). stripToColumns() drops these before any write. ---
        note: "What happened to you is not a small thing or a misunderstanding — it is named zulm, and Allah forbids it to Himself before forbidding it to anyone else.",
        translationSource: "Curator rendering of the quoted portion; the full hadith qudsi is 40 Hadith Nawawi 24 in the seeded corpus (Nawawi collects it from Sahih Muslim).",
        hadithGrading: "Sahih",
        leadEligible: true,
        curatedBy: "Claude (Anthropic) via Claude Code, working from team/feelings-expansion-spec.md §3.1 and team/feelings-expansion-research.md §3",
        curatedAt: "2026-10-11",
        reviewStatus: "unreviewed",
        citationNote: "Cited to Nawawi, not to Sahih Muslim, on purpose — see the header. The seeded Sahih Muslim rows are numbered sequentially, not canonically, so a Muslim citation can pass the verifier and still send a reader to the wrong hadith.",
      },
      {
        arabicText: "اتَّقِ دَعْوَةَ الْمَظْلُومِ، فَإِنَّهَا لَيْسَ بَيْنَهَا وَبَيْنَ اللَّهِ حِجَابٌ",
        transliteration: "Ittaqi daʿwata-l-maẓlūm, fa-innahā laysa baynahā wa bayna-llāhi ḥijāb.",
        translation: "Beware the supplication of the one who has been wronged, for there is no veil between it and Allah.",
        source: "Sahih al-Bukhari 2448",
        // --- curator fields: NOT database columns (see header, "Where the
        // note lives"). stripToColumns() drops these before any write. ---
        note: "Whatever else feels closed right now, this is not: the cry of someone who has been wronged reaches Allah with nothing standing in between.",
        translationSource: "Curator rendering of the quoted portion; the full narration is Sahih al-Bukhari 2448 in the seeded corpus.",
        hadithGrading: "Sahih",
        leadEligible: true,
        curatedBy: "Claude (Anthropic) via Claude Code, working from team/feelings-expansion-spec.md §3.1 and team/feelings-expansion-research.md §3",
        curatedAt: "2026-10-11",
        reviewStatus: "unreviewed",
      },
      {
        arabicText: "فَسَتَذۡكُرُونَ مَآ أَقُولُ لَكُمۡۚ وَأُفَوِّضُ أَمۡرِيٓ إِلَى ٱللَّهِۚ إِنَّ ٱللَّهَ بَصِيرُۢ بِٱلۡعِبَادِ",
        transliteration: "Fa-satadhkurūna mā aqūlu lakum; wa ufawwiḍu amrī ila-llāh; inna-llāha Baṣīrun bi-l-ʿibād.",
        translation: "And you will remember what I [now] say to you, and I entrust my affair to Allah. Indeed, Allah is Seeing of [His] servants.",
        source: "Quran 40:44",
        // --- curator fields: NOT database columns (see header, "Where the
        // note lives"). stripToColumns() drops these before any write. ---
        note: "A man betrayed by his own people said this — a way to set the weight down for a while without pretending it was nothing.",
        translationSource: "Saheeh International",
        hadithGrading: null,
        leadEligible: true,
        curatedBy: "Claude (Anthropic) via Claude Code, working from team/feelings-expansion-spec.md §3.1 and team/feelings-expansion-research.md §3",
        curatedAt: "2026-10-11",
        reviewStatus: "unreviewed",
        reviewerMustRuleOn: "Spoken by the believer of Pharaoh's household, under threat from his own people. Confirm the move from that setting to ordinary interpersonal betrayal is sound.",
      },
    ],
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
  console.log(
    `🌱 Seeding Islam emotions and remedies${DRY_RUN ? ' (dry run — no writes)' : ''}…`,
  );

  let added = 0;

  for (const emotionData of emotionsData) {
    const { remedies, ...emotionInfo } = emotionData;

    // NOTE — the emotion upsert is itself a write. It must sit BEHIND the
    // dry-run guard, not in front of it. An earlier revision had the upsert
    // above this check, and `--dry-run` silently created the `grieving` row
    // (empty, and therefore a pill that opens onto nothing) and rewrote
    // `hurt`'s icon in the live database. A dry run must touch nothing.
    const existing = await prisma.emotion.findUnique({
      where: { slug: emotionInfo.slug },
      select: { id: true, name: true, icon: true },
    });

    if (DRY_RUN) {
      if (!existing) {
        console.log(
          `  • ${emotionInfo.slug} (${emotionInfo.name}) [dry-run] would CREATE emotion`,
        );
      } else {
        const changes: string[] = [];
        if (existing.name !== emotionInfo.name) {
          changes.push(`name "${existing.name}" -> "${emotionInfo.name}"`);
        }
        if (existing.icon !== emotionInfo.icon) {
          changes.push(`icon "${existing.icon}" -> "${emotionInfo.icon}"`);
        }
        console.log(
          `  • ${emotionInfo.slug} (${emotionInfo.name})` +
            (changes.length ? ` [dry-run] would UPDATE ${changes.join(', ')}` : ''),
        );
      }
      // No row to hang remedies off yet; report against the existing id when
      // there is one, and skip remedy comparison entirely when there is not.
      if (!existing) {
        for (const remedy of remedies) {
          console.log(
            `    [dry-run] would add ${emotionInfo.slug} <- ${remedy.source}`,
          );
          added++;
        }
        continue;
      }
      for (const remedy of remedies) {
        const dup = await prisma.emotionRemedy.findFirst({
          where: {
            emotionId: existing.id,
            source: remedy.source,
            arabicText: remedy.arabicText,
          },
          select: { id: true },
        });
        if (dup) continue;
        console.log(
          `    [dry-run] would add ${emotionInfo.slug} <- ${remedy.source}`,
        );
        added++;
      }
      continue;
    }

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

    console.log(`  • ${emotion.slug} (${emotion.name})`);

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

      if (existingRemedy) continue;

      await prisma.emotionRemedy.create({
        data: { ...stripToColumns(remedy), emotionId: emotion.id },
      });
      added++;
      console.log(`    + ${emotion.slug} <- ${remedy.source}`);
    }
  }

  console.log('');
  console.log(
    `${DRY_RUN ? 'Would add' : 'Added'} ${added} remedy row(s). Existing rows were left untouched.`,
  );
  console.log('');
  console.log('  ⚠️  UNREVIEWED CONTENT');
  console.log(
    '     `grieving` (5) and the 4 new `hurt` remedies were curated by a model,',
  );
  console.log(
    '     not a human. Spec §6.2 requires a qualified reviewer before expanded',
  );
  console.log(
    '     content is shown to users. This script has not asserted otherwise.',
  );
  console.log(
    '     Rows carrying `reviewerMustRuleOn` in this file are flagged as',
  );
  console.log('     defensible-but-arguable — read those first.');
  console.log('');
  console.log(
    '  ⚠️  Qur\'an 3:139 is gone from this file but this seed never deletes.',
  );
  console.log(
    '     The live `hurt` row must be removed separately — dry run first:',
  );
  console.log('       npm run prisma:update:emotion-remedies');
  console.log('');
  console.log('  Next: npm run prisma:verify:feelings');
}

main()
  .catch((e) => {
    console.error('❌ Feelings seed failed:', e?.message ?? e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end().catch(() => undefined);
  });
