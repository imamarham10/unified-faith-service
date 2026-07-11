import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Use the same adapter pattern as PrismaService
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
// Hindu Feelings seed (spec §B4)
//
// 10 emotions, each mapped to 3–5 Bhagavad Gita verses with a one-sentence
// supportive note. Verse ids are resolved at runtime by chapter + verse number
// against the HinduText with slug "bhagavad-gita" — run seed-hindu-gita.ts
// FIRST. If a referenced verse is missing this script throws (fail loudly).
//
// Idempotency: emotions upserted on `slug`; remedies are delete-then-recreate
// per emotion so re-runs always converge to exactly this content.
// ---------------------------------------------------------------------------

const GITA_SLUG = 'bhagavad-gita';

interface RemedyDef {
  chapter: number;
  verse: number;
  note: string;
}

interface EmotionDef {
  slug: string;
  nameEnglish: string;
  nameHindi: string;
  icon: string;
  remedies: RemedyDef[];
}

const EMOTIONS: EmotionDef[] = [
  {
    slug: 'anxious',
    nameEnglish: 'Anxious',
    nameHindi: 'चिंतित',
    icon: '😰',
    remedies: [
      {
        chapter: 2,
        verse: 47,
        note: 'Your part is the effort itself — this verse gently lifts the weight of outcomes you were never meant to carry.',
      },
      {
        chapter: 2,
        verse: 48,
        note: 'Steadiness, Krishna says, is doing your best and staying even whether things go well or badly — a calm you can practice, not force.',
      },
      {
        chapter: 18,
        verse: 66,
        note: 'When the worrying mind has run out of plans, this verse offers a resting place: hand the whole tangle over and let yourself be held.',
      },
      {
        chapter: 9,
        verse: 22,
        note: 'For hearts that keep watch through the night, Krishna promises to keep watch too — carrying what you lack and guarding what you have.',
      },
    ],
  },
  {
    slug: 'angry',
    nameEnglish: 'Angry',
    nameHindi: 'क्रोधित',
    icon: '😠',
    remedies: [
      {
        chapter: 2,
        verse: 62,
        note: 'Anger rarely arrives alone; this verse traces it back to the quiet brooding where it began, so you can meet it earlier next time.',
      },
      {
        chapter: 2,
        verse: 63,
        note: 'Krishna maps how anger clouds judgment step by step — and naming the storm is often the first move in walking out of it.',
      },
      {
        chapter: 2,
        verse: 14,
        note: 'Heat and cold, insult and praise — they come and go like seasons, and this verse invites you to let them pass without taking root.',
      },
      {
        chapter: 16,
        verse: 21,
        note: 'By calling anger a gate rather than a wall, this verse reminds you that you can simply decline to walk through it.',
      },
    ],
  },
  {
    slug: 'grieving',
    nameEnglish: 'Grieving',
    nameHindi: 'शोकाकुल',
    icon: '😢',
    remedies: [
      {
        chapter: 2,
        verse: 20,
        note: 'To a grieving heart Krishna speaks the oldest comfort: what you truly loved in them was never the kind of thing that can die.',
      },
      {
        chapter: 2,
        verse: 22,
        note: "Like clothes set aside at day's end, the body is laid down while the one who wore it continues — a gentle image to hold when loss feels final.",
      },
      {
        chapter: 2,
        verse: 13,
        note: "The same self that moved through childhood and youth moves onward at death; the journey doesn't end, it only turns a corner we cannot see past.",
      },
      {
        chapter: 2,
        verse: 27,
        note: "Grief is love meeting the certainty of change; this verse doesn't scold the tears, it simply reminds you that arriving and departing belong to one circle.",
      },
    ],
  },
  {
    slug: 'fearful',
    nameEnglish: 'Fearful',
    nameHindi: 'भयभीत',
    icon: '😨',
    remedies: [
      {
        chapter: 18,
        verse: 66,
        note: "'Do not grieve, do not fear' — of all the Gita's promises this is the plainest, spoken to anyone willing to loosen their grip and trust.",
      },
      {
        chapter: 9,
        verse: 22,
        note: 'Whatever the danger looks like tonight, this verse says you are not facing it unaccompanied.',
      },
      {
        chapter: 4,
        verse: 7,
        note: "When wrong seems to be winning, Krishna's promise to return age after age is a reminder that the story is never abandoned midway.",
      },
      {
        chapter: 11,
        verse: 32,
        note: 'Seeing that vast events rest in hands far larger than his own is what steadied Arjuna — your task is only your next step, not the whole battlefield.',
      },
    ],
  },
  {
    slug: 'unmotivated',
    nameEnglish: 'Unmotivated',
    nameHindi: 'निरुत्साहित',
    icon: '😞',
    remedies: [
      {
        chapter: 3,
        verse: 19,
        note: 'Start small and without keeping score; this verse says the doing itself, freed from pressure, is what carries you upward.',
      },
      {
        chapter: 3,
        verse: 35,
        note: 'Your own path walked imperfectly still beats a borrowed one walked well — permission to stop comparing and simply begin.',
      },
      {
        chapter: 6,
        verse: 5,
        note: 'Krishna puts the lifting rope in your own hands: be the friend who helps you up, not the critic who keeps you down.',
      },
      {
        chapter: 18,
        verse: 46,
        note: 'The work already in front of you, offered wholeheartedly, is itself a form of worship — no grander stage required.',
      },
    ],
  },
  {
    slug: 'guilty',
    nameEnglish: 'Guilty',
    nameHindi: 'अपराध-बोध',
    icon: '😔',
    remedies: [
      {
        chapter: 4,
        verse: 38,
        note: 'Nothing scrubs the heart like understanding; this verse promises that honestly facing what happened is itself the beginning of becoming clean.',
      },
      {
        chapter: 18,
        verse: 66,
        note: "Krishna's widest door is left open precisely for those who feel they have fallen short: bring it all, and be released from it.",
      },
      {
        chapter: 9,
        verse: 26,
        note: 'A single leaf offered sincerely is enough for him — whatever you have left after your mistakes is still a worthy gift.',
      },
    ],
  },
  {
    slug: 'lonely',
    nameEnglish: 'Lonely',
    nameHindi: 'अकेला',
    icon: '🥀',
    remedies: [
      {
        chapter: 9,
        verse: 22,
        note: 'To those who keep turning toward him, Krishna makes an intimate pledge: you are thought of, provided for, and never out of his keeping.',
      },
      {
        chapter: 6,
        verse: 19,
        note: 'The image of a lamp burning steady in a windless room is a quiet reminder that stillness with yourself can become company rather than absence.',
      },
      {
        chapter: 12,
        verse: 13,
        note: 'Practicing friendship toward every being, this verse suggests, slowly dissolves the wall that makes the world feel far away.',
      },
      {
        chapter: 12,
        verse: 14,
        note: 'The contented, steady-hearted devotee described here is dear to Krishna — even when no one else is in the room, that bond remains.',
      },
    ],
  },
  {
    slug: 'restless',
    nameEnglish: 'Restless',
    nameHindi: 'बेचैन',
    icon: '😵‍💫',
    remedies: [
      {
        chapter: 6,
        verse: 35,
        note: 'Krishna does not deny the mind is hard to hold — he agrees, then offers the two patient tools that actually work: practice and letting go.',
      },
      {
        chapter: 6,
        verse: 6,
        note: 'A restless mind can be either your saboteur or your ally; this verse says the difference is made by gentle, repeated befriending.',
      },
      {
        chapter: 2,
        verse: 14,
        note: 'Sensations and moods blow through like weather; you do not have to chase each one — just watch it arrive and let it leave.',
      },
    ],
  },
  {
    slug: 'envious',
    nameEnglish: 'Envious',
    nameHindi: 'ईर्ष्यालु',
    icon: '😒',
    remedies: [
      {
        chapter: 12,
        verse: 13,
        note: 'Envy loosens its grip the moment you begin wishing others well on purpose — which is exactly the practice this verse describes.',
      },
      {
        chapter: 12,
        verse: 14,
        note: 'Contentment, Krishna says, is what makes a person dear to him — a quiet wealth no comparison can take away.',
      },
      {
        chapter: 13,
        verse: 28,
        note: 'Seeing the same divine presence in the person you envy makes rivalry feel a little absurd — their light and yours share one source.',
      },
      {
        chapter: 16,
        verse: 21,
        note: 'Craving what others have is named here as a door best left unopened — a plain warning that comparison costs more than it gives.',
      },
    ],
  },
  {
    slug: 'grateful',
    nameEnglish: 'Grateful',
    nameHindi: 'कृतज्ञ',
    icon: '🙏',
    remedies: [
      {
        chapter: 9,
        verse: 26,
        note: 'A leaf, a flower, a sip of water — Krishna delights in the smallest offering, so even a whispered thank-you lands.',
      },
      {
        chapter: 9,
        verse: 27,
        note: 'This verse turns gratitude into a way of living: whatever you already do today can be handed over as an offering.',
      },
      {
        chapter: 15,
        verse: 7,
        note: 'You are described here as a living spark of the divine — gratitude, in the end, is simply remembering where you come from.',
      },
      {
        chapter: 5,
        verse: 10,
        note: 'Acting with a thankful, unattached heart, this verse says, keeps life from sticking to you — like water rolling off a lotus leaf.',
      },
    ],
  },
];

async function main() {
  console.log('🌱 Seeding Hindu feelings (emotions + Gita verse remedies)...');

  // The Gita seed must have run first — remedies reference its verses.
  const gita = await prisma.hinduText.findUnique({
    where: { slug: GITA_SLUG },
  });
  if (!gita) {
    throw new Error(
      `HinduText with slug "${GITA_SLUG}" not found. Run "npm run prisma:seed:hindu-gita" before seeding feelings.`,
    );
  }

  const chapters = await prisma.hinduTextChapter.findMany({
    where: { textId: gita.id },
  });
  const chapterByNumber = new Map(chapters.map((c) => [c.chapterNumber, c]));

  const resolveVerseId = async (
    chapterNumber: number,
    verseNumber: number,
  ): Promise<string> => {
    const chapter = chapterByNumber.get(chapterNumber);
    if (!chapter) {
      throw new Error(
        `Bhagavad Gita chapter ${chapterNumber} is not seeded (needed for verse ${chapterNumber}.${verseNumber}). Run the Gita seed first.`,
      );
    }
    const verse = await prisma.hinduTextVerse.findFirst({
      where: {
        textId: gita.id,
        chapterId: chapter.id,
        verseNumber,
      },
    });
    if (!verse) {
      throw new Error(
        `Bhagavad Gita verse ${chapterNumber}.${verseNumber} is not seeded — the feelings seed references it. Seed it in seed-hindu-gita.ts before re-running.`,
      );
    }
    return verse.id;
  };

  let remedyCount = 0;

  for (const def of EMOTIONS) {
    const emotion = await prisma.hinduEmotion.upsert({
      where: { slug: def.slug },
      update: {
        nameEnglish: def.nameEnglish,
        nameHindi: def.nameHindi,
        icon: def.icon,
      },
      create: {
        slug: def.slug,
        nameEnglish: def.nameEnglish,
        nameHindi: def.nameHindi,
        icon: def.icon,
      },
    });

    // Resolve every verse BEFORE deleting existing remedies, so a missing
    // verse fails loudly without leaving the emotion stripped of content.
    const resolved: { verseId: string; note: string; sequence: number }[] = [];
    for (let i = 0; i < def.remedies.length; i++) {
      const remedy = def.remedies[i];
      const verseId = await resolveVerseId(remedy.chapter, remedy.verse);
      resolved.push({ verseId, note: remedy.note, sequence: i });
    }

    // Delete-then-recreate per emotion (simplest idempotency).
    await prisma.hinduEmotionRemedy.deleteMany({
      where: { emotionId: emotion.id },
    });
    await prisma.hinduEmotionRemedy.createMany({
      data: resolved.map((r) => ({
        emotionId: emotion.id,
        verseId: r.verseId,
        note: r.note,
        sequence: r.sequence,
      })),
    });

    remedyCount += resolved.length;
    console.log(
      `  ✅ ${def.nameEnglish} (${def.slug}) — ${resolved.length} remedies`,
    );
  }

  console.log(
    `🎉 Hindu feelings seed completed: ${EMOTIONS.length} emotions, ${remedyCount} remedies.`,
  );
}

main()
  .catch((e) => {
    console.error('❌ Hindu feelings seed failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
