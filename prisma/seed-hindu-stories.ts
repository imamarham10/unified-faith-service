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
// Hindu Sacred Stories seed (spec §B5)
//
// 2 collections, 10 stories. English content lives on the base HinduStory row
// (title / summary / body); no HinduStoryTranslation rows are seeded in v1.
// Bodies are plain paragraphs joined with \n\n, 300–600 words each.
//
// Idempotency: collections upserted on `slug`; stories matched by
// (collectionId, storyNumber) via findFirst (no composite unique in the
// schema) then created or updated.
// ---------------------------------------------------------------------------

interface StoryDef {
  storyNumber: number;
  title: string;
  deityKey: string;
  characters: string[];
  summary: string;
  paragraphs: string[];
}

interface CollectionDef {
  slug: string;
  name: string;
  sourceText: string;
  stories: StoryDef[];
}

const COLLECTIONS: CollectionDef[] = [
  {
    slug: 'tales-of-devotion',
    name: 'Tales of Devotion from the Puranas',
    sourceText: 'bhagavata_purana',
    stories: [
      {
        storyNumber: 1,
        title: 'Dhruva, the Steadfast Star',
        deityKey: 'vishnu',
        characters: [
          'Dhruva',
          'Suniti',
          'Suruchi',
          'King Uttanapada',
          'Narada',
          'Vishnu',
        ],
        summary:
          'Hurt by a stepmother’s harsh words, five-year-old Dhruva walks into the forest to seek the Lord himself — and his unshakable devotion wins him a place in the sky as the Pole Star.',
        paragraphs: [
          'Long ago there ruled a king named Uttanapada, who had two queens. Suniti, the elder, was gentle and wise, and her son was a bright-eyed boy named Dhruva. Suruchi, the younger queen, was the king’s favourite, and she guarded that favour jealously for her own son.',
          'One day little Dhruva, just five years old, saw his father playing with his half-brother and ran forward to climb onto the king’s lap as well. Suruchi caught him by the arm. "That seat is not for you," she said coldly. "If you wish to sit on the king’s lap, go and pray to be born as my son." The king, weak with attachment, said nothing.',
          'Dhruva ran to his mother with burning eyes. Suniti held him and wiped his tears. "My child," she said softly, "do not wish harm on anyone. If you long for a seat that can never be taken from you, seek the lotus feet of Lord Vishnu. He alone turns no one away." The little boy stood up, made up his mind, and walked out of the palace toward the forest.',
          'On the way the great sage Narada appeared before him. He tried to turn the child back — the forest was full of dangers, and austerity was hard even for sages. But Dhruva’s resolve did not waver, and Narada, delighted, taught him the sacred mantra Om Namo Bhagavate Vasudevaya and showed him how to fix his heart on the Lord.',
          'In the grove of Madhuvana on the banks of the Yamuna, Dhruva began his practice. The first month he ate fruit only every third day. Then he lived on withered leaves, then on water, then on air alone. He stood on one leg, still as a post, his whole small being gathered into a single remembrance of Vishnu. His concentration grew so complete that when he held his breath, the worlds themselves seemed to hold theirs.',
          'Then the Lord appeared before him, radiant on Garuda’s wings. Dhruva longed to sing his praise but could not find words — so Vishnu touched the boy’s cheek with his divine conch, and hymns flowed from the child like a river released. The Lord granted him what no effort had ever earned: an eternal, unmoving seat in the heavens. To this day the stars wheel around Dhruva Nakshatra, the Pole Star, while it stands firm — like the little boy’s heart.',
          'Dhruva returned home, was embraced by his father and both mothers, and in time ruled the kingdom long and justly. Sailors and travellers still find their way by his light — a reminder that even the smallest person, with a steadfast heart, can reach the Highest.',
        ],
      },
      {
        storyNumber: 2,
        title: 'Prahlada and Narasimha',
        deityKey: 'vishnu',
        characters: ['Prahlada', 'Hiranyakashipu', 'Narasimha', 'Vishnu'],
        summary:
          'A tyrant king who believes himself immortal demands to be worshipped as God — but his own small son’s fearless devotion to Vishnu brings the Lord bursting out of a stone pillar in his wondrous man-lion form.',
        paragraphs: [
          'The demon king Hiranyakashipu had performed terrible austerities and won an extraordinary boon from Brahma: he could not be killed by man or beast, by day or by night, inside a dwelling or outside it, on the earth or in the sky, by any weapon ever made. Certain now that death could never find him, he declared himself lord of all the worlds and commanded that no name be worshipped but his own.',
          'Yet in his own palace lived his undoing — not an army, not a rival, but his little son Prahlada, whose heart had belonged to Lord Vishnu from before his birth. When his teachers taught him statecraft and conquest, Prahlada would listen politely and then tell his classmates about the joy of remembering Hari. Asked by his father what was the best of all things he had learned, the boy answered simply: to hear of the Lord, to sing of him, to remember him, to serve him, and to offer him one’s whole heart.',
          'The king’s fury knew no bounds. He had the boy thrown from a cliff, trampled by elephants, cast among serpents, given poison, and set in fire — and each time Prahlada sat calm and unharmed, the Name on his lips like a shield of light. Nothing in the tyrant’s arsenal could touch a child who did not fear.',
          'At last, trembling with rage, Hiranyakashipu roared: "Where is this Vishnu of yours? Is he in this pillar?" "He is in the pillar," said Prahlada quietly, "and in the smallest speck of dust. He is everywhere." The king struck the pillar with his mace — and with a sound like the splitting of worlds, the stone burst open.',
          'Out stepped Narasimha — neither man nor beast, but a blazing form with a lion’s head and a man’s body. It was twilight, neither day nor night. The Lord seized the king, carried him to the threshold of the hall, neither inside nor outside, laid him across his own lap, neither earth nor sky, and ended his reign of terror with his bare claws, no weapon at all. Every word of the boon was honoured; every loophole of pride was closed.',
          'The Lord’s wrath burned so fiercely that even the gods dared not approach. Then little Prahlada walked up without fear and bowed, and Narasimha grew gentle, lifting the boy and blessing him. Offered any boon, Prahlada asked only that no desire ever take root in his heart — and that his father be forgiven. The child became a great and beloved king, and his story is told wherever devotion is remembered: no fortress of power stands against a single fearless, loving heart.',
        ],
      },
      {
        storyNumber: 3,
        title: 'Gajendra Moksha',
        deityKey: 'vishnu',
        characters: ['Gajendra', 'The Crocodile', 'Vishnu', 'Garuda'],
        summary:
          'The mighty elephant king, seized by a crocodile and failing after a long struggle, lifts a single lotus toward heaven and calls on the Lord — who comes at once to free him.',
        paragraphs: [
          'On the slopes of Mount Trikuta, ringed by the ocean of milk, lived Gajendra, the king of elephants. He was vast and strong, and he moved through the forests like a monsoon cloud, his herd behind him, fearing nothing that walked or grew.',
          'One hot day he led his herd down to a great lake brimming with lotuses. The elephants plunged in joyfully, spraying water, pulling up sweet stems, trumpeting to the sky. Gajendra, delighted with his own strength, played the longest, wading far from the shore.',
          'Then jaws like a sprung trap closed on his leg. A crocodile, old and immensely powerful in its own element, had seized him and would not let go. Gajendra heaved and pulled; the water churned white; the herd trumpeted from the bank. But an elephant’s strength wanes in the water, and a crocodile’s only grows. The struggle went on and on — the old tellings say it lasted a thousand years — until the great king’s legs trembled and his breath came shallow.',
          'His herd could not save him. His queens could not save him. His famous strength, the pride of the forests, could not save him. As his head began to sink, Gajendra understood, with the last clarity of the exhausted, that no created thing could help him now — only the Uncreated. With his trunk he plucked a single lotus, raised it toward heaven as an offering, and called out from his heart to the Supreme Lord, the refuge of the refuge-less.',
          'That cry did not have to travel far, for the Lord is nearer than breath. Vishnu came at once, swifter than thought, on the wings of Garuda. His discus flashed, the crocodile’s grip was broken, and Gajendra was lifted gently from the water, weak, trembling, and free.',
          'Grace touched both creatures that day. The crocodile had been a gandharva, a heavenly musician bound by a curse into that fierce body; the touch of the Lord released him, and he rose shining to his old form. And Gajendra, who in a former life had been a king whose meditation was interrupted while it was still ripening, completed his long journey home to the Lord’s side.',
          'This story is sung by those in distress to this day. Its promise is simple and immense: strength fails, wealth fails, even the mightiest friends fail — but a single sincere cry, with everything let go and one lotus of love held up, brings the Lord himself running.',
        ],
      },
      {
        storyNumber: 4,
        title: 'Krishna Lifts Govardhan',
        deityKey: 'krishna',
        characters: ['Krishna', 'Indra', 'Nanda', 'The people of Vraja'],
        summary:
          'When proud Indra floods the pastures of Vraja in fury, young Krishna lifts the whole of Govardhan hill on his little finger and shelters every villager, calf and sparrow beneath it for seven days.',
        paragraphs: [
          'Every year the cowherds of Vraja prepared a grand sacrifice to Indra, king of the heavens, to thank him for the rains. One year, as the offerings were being gathered, young Krishna asked his father Nanda a question that made the elders fall silent: "Father, why do we worship a king we have never seen? Our cows graze on Govardhan hill. Its streams water our fields, its forests feed our herds, its grasses become our milk and butter. Should we not honour what actually sustains us?"',
          'The cowherds talked it over and found the boy’s words full of sense. That year they circled Govardhan with their cattle, decked the hill with garlands, and offered it mountains of rice, dal and sweets prepared with love. The children laughed, the cows were fed first, and the festival was the happiest anyone could remember.',
          'But in the heavens, Indra burned with wounded pride. Ignored by mere cowherds at the word of a child! He summoned the samvartaka clouds, the ones kept for the end of ages, and commanded them to drown Vraja. The sky turned black as iron. Rain fell not in drops but in ropes, day and night, until the Yamuna swelled and the pastures became a sea, and the people of Vraja gathered shivering around Nanda’s house with their calves and children, crying out to Krishna.',
          '"Do not be afraid," said the boy, and he smiled. He walked to Govardhan hill, set his palm beneath a ledge of rock — and lifted the entire mountain as easily as a child lifts a mushroom, resting it on the little finger of his left hand. "Come!" he called. "All of you, under the hill — bring the cows, bring the sparrows’ nests if you can carry them!"',
          'For seven days and seven nights the whole of Vraja lived beneath that impossible roof. The storm raged; not one drop touched them. Children slept, elders told stories, the cows chewed peacefully, and Krishna stood at the centre, the mountain on his smallest finger, never tiring, teasing his friends as if nothing at all were happening.',
          'On the eighth day the clouds were spent. Indra, his pride washed away with his storm, came down quietly, bowed to the boy, and begged forgiveness — which Krishna gave with a smile, as easily as he had lifted the hill. The people of Vraja walked out into washed sunlight, and to this day pilgrims circle Govardhan and heap food into small mountains at festival time, remembering the God who asked them to be grateful for the earth beneath their feet — and who became their shelter when the sky itself turned against them.',
        ],
      },
      {
        storyNumber: 5,
        title: 'The Churning of the Ocean',
        deityKey: 'vishnu',
        characters: [
          'Vishnu',
          'The Devas',
          'The Asuras',
          'Shiva',
          'Lakshmi',
          'Dhanvantari',
          'Vasuki',
        ],
        summary:
          'Gods and demons together churn the cosmic ocean of milk for the nectar of immortality — and before the treasures come, the deadliest poison, which Shiva drinks to save all the worlds.',
        paragraphs: [
          'There came a time when the devas, the gods of heaven, lost their strength and lustre through a sage’s curse, and the asuras pressed them hard in battle. Desperate, they went to Lord Vishnu, who gave them counsel no one expected: "Make peace with your rivals, for this task needs every arm. Churn the great Ocean of Milk, and from it will rise amrita, the nectar of immortality."',
          'So gods and demons, enemies from the beginning of time, worked side by side. For a churning rod they took Mount Mandara itself; for a rope, Vasuki, the king of serpents, who wound his enormous coils around the mountain. The asuras took the head, the devas took the tail, and the churning began — the mountain spinning, the sea groaning, spray flying to the stars.',
          'Almost at once the mountain began to sink into the sea floor, for it had no foundation. Then Vishnu took the form of Kurma, a tortoise vast as a continent, and slid beneath the waters, bearing the whole grinding weight of Mandara on his back. Steadied on that patient shell, the churning went on.',
          'But the first thing the ocean yielded was not treasure. Out of the depths boiled halahala, a poison so terrible that its fumes began to wither all the worlds. Gods and demons alike fled in terror — and it was Shiva, the ever-compassionate, who came forward, gathered the poison in his palms, and drank it. His consort Parvati pressed his throat so the poison would go no further, and it lodged there, staining his neck a deep blue. Ever since, he has been called Neelakantha, the Blue-Throated, and the worlds have lived because he was willing to hold their pain.',
          'Then, slowly, the sea began to give its gifts: Kamadhenu the wish-granting cow; Ucchaihshravas the white horse; Airavata the four-tusked elephant; the Kaustubha gem; the Parijata tree whose flowers never fade; and then, seated on an open lotus, Lakshmi herself, goddess of fortune, dazzling as lightning — who looked over all the assembled beings and garlanded Vishnu, choosing him forever.',
          'Last of all rose Dhanvantari, the divine physician, holding the golden pot of amrita. The asuras snatched it and fell to quarrelling; then Vishnu appeared among them as Mohini, a form of such bewildering beauty that they handed her the pot to divide, and she served the nectar to the devas until it was gone.',
          'The elders who tell this story always end it the same way: when you churn for what is most precious — in the world, or in your own heart — the poison rises first. Do not stop churning. And be grateful there are those who will drink the bitterness so that others may live.',
        ],
      },
      {
        storyNumber: 6,
        title: 'Ganesha and the Race Around the World',
        deityKey: 'ganesha',
        characters: ['Ganesha', 'Kartikeya', 'Shiva', 'Parvati', 'Narada'],
        summary:
          'Offered a divine fruit that cannot be divided, Ganesha and his brother Kartikeya race around the world to win it — and Ganesha wins without leaving home, by circling his parents.',
        paragraphs: [
          'One day the wandering sage Narada arrived at Mount Kailash, the home of Shiva and Parvati, carrying a golden mango unlike any fruit ever seen. "It is a fruit of wisdom and immortality," he said, with the small smile of one about to cause interesting trouble. "But it has one condition: it must be eaten whole. It cannot be shared."',
          'Now Shiva and Parvati had two sons — Kartikeya, the swift and radiant commander of the heavenly armies, and Ganesha, the elephant-headed, round-bellied lover of sweets and books. Both boys wanted the fruit, and neither parent could bear to choose between them. So Shiva proposed a contest: "Whoever circles the whole world three times and returns first shall have the mango."',
          'Kartikeya was gone before the sentence ended. He leapt onto his peacock, and in a streak of shimmering blue and green he was over the oceans, across the mountains, around the rim of the sky — flying as only he could fly, past sunrise after sunrise.',
          'Ganesha looked down at his own round belly. He looked at his mount — a small mouse, whiskers twitching. Anyone could see how this race would end. But Ganesha was not anyone; where others saw a hopeless distance, he saw a question worth thinking about. What, truly, is the world?',
          'He walked slowly to where Shiva and Parvati sat together. He folded his hands, bowed — and then, with unhurried, loving steps, walked in a circle around his mother and father. Once. Twice. Three times. Then he stood before them and said, "I have circled the world three times. For you are my world — the whole of it. Whatever exists is contained in you, and every blessing I could travel for begins at your feet."',
          'Shiva laughed with delight, and Parvati’s eyes shone. What answer could there be to such an answer? The mango was placed in Ganesha’s hand.',
          'When Kartikeya returned — wind-blown, triumphant, having crossed every land and sea — and found the fruit already eaten, he was deeply hurt, and for a time he withdrew to the southern hills, where devotees console and adore him to this day. But in time the brothers were reconciled, for love in that family ran deeper than any contest.',
          'And this is why, before every new venture, journey, or examination, it is Ganesha whom devotees greet first. Not because he was the fastest — but because he understood something the swift can miss: the greatest distances are crossed by wisdom, and the whole world is found at the feet of those who love us.',
        ],
      },
    ],
  },
  {
    slug: 'stories-of-the-ramayana',
    name: 'Stories of the Ramayana',
    sourceText: 'ramayana',
    stories: [
      {
        storyNumber: 1,
        title: "Hanuman's Leap to Lanka",
        deityKey: 'hanuman',
        characters: ['Hanuman', 'Jambavan', 'Surasa', 'Mainaka', 'Sita'],
        summary:
          'Reminded of powers he had forgotten he possessed, Hanuman crosses a hundred leagues of ocean in a single leap to find Sita in Lanka.',
        paragraphs: [
          'The search party of vanaras had reached the southernmost tip of the land, and there their hearts sank. Before them stretched the ocean — a hundred yojanas of restless grey water — and somewhere beyond it lay Lanka, where Ravana held Sita captive. One by one the monkeys measured their strength aloud: this one could leap thirty yojanas, that one sixty, another ninety but never back again. Despair settled over them like dusk.',
          'Then old Jambavan, the wise king of bears, turned to a figure sitting quietly apart, and spoke words that changed everything. "Hanuman, why do you sit silent? You are the son of the wind god. As a child you leapt at the rising sun thinking it a ripe fruit. There is no one in this company — no one in this world — whose strength equals yours. You have merely forgotten it, as a curse long ago ordained you would, until someone reminded you. I am reminding you now."',
          'And as Jambavan spoke, Hanuman began to remember. He stood, and grew, and kept growing, until the vanaras craned their necks to see him against the sky. He roared with the joy of his own returning strength, climbed Mount Mahendra — which trembled under his feet — fixed his heart on Rama, and leapt.',
          'The sky itself became his road. The wind, his father, streamed with him. Below, the golden mountain Mainaka rose from the waves and offered him a resting place; Hanuman touched its peak with his hand in thanks and flew on, saying a servant on his master’s errand does not rest. Then Surasa, mother of serpents, reared out of the sea, her mouth widening to swallow him — for the gods had sent her to test him. Hanuman swelled larger; her jaws stretched wider; and then, quicker than thought, he shrank to the size of a thumb, darted in through her mouth and out again, and bowed. "Your test is honoured, mother." Delighted, she blessed his journey. A shadow-grasping demoness, Simhika, seized him from below; her he dispatched swiftly, for some obstacles yield only to strength.',
          'As the far shore rose before him, Hanuman made himself small and modest as a cat, and slipped into the glittering city of Lanka by night. Through palace after palace he searched, and at last, in a grove of ashoka trees, he found her — Sita, thin with sorrow, guarded by demonesses, her whole being fixed on Rama’s name. From the branches above, Hanuman softly sang Rama’s story, then dropped the Lord’s own ring into her hands. Hope returned to her eyes like dawn.',
          'The leap of Hanuman is sung wherever his name is spoken, and its meaning is whispered to every child who hears it: the strength to cross your ocean is already within you. Sometimes all that is missing is a friend who reminds you who you are.',
        ],
      },
      {
        storyNumber: 2,
        title: "Shabari's Berries",
        deityKey: 'rama',
        characters: ['Shabari', 'Rama', 'Lakshmana', 'Sage Matanga'],
        summary:
          'An elderly forest ascetic offers Rama berries she has tasted herself to make sure each one is sweet — and he accepts them as the finest feast, for they are seasoned with pure love.',
        paragraphs: [
          'Deep in the forest by Pampa lake lived Shabari, an old woman of a humble forest tribe who had left her people long ago to serve the sage Matanga and his disciples. She swept their paths, gathered their firewood, and asked nothing for herself. When the sage was about to leave his body, she wept: "What will become of me?" And he gave her a promise to live on: "One day Rama himself will come to this ashram. Wait for him, and serve him when he comes."',
          'So Shabari waited. Not for a season — for years upon years, until her back bent and her hair whitened. But her waiting was not idle. Every single morning she swept the path Rama might walk that day. Every day she gathered fresh flowers, and picked the wild berries of the forest, choosing only the best. And because a berry cannot be judged from outside, she tasted each one — setting aside the sweet ones for her Lord and throwing away the sour — never doubting, even once, that today might be the day.',
          'And one day, it was. Two princes came walking through the trees — Rama, grieving for his stolen Sita, and his brother Lakshmana. Shabari saw the face she had imagined through decades of mornings, and her age fell away from her; she ran like a girl, washed their feet, seated them, and with trembling hands offered what she had: a bowl of half-eaten berries.',
          'Lakshmana hesitated — fruit already bitten was no offering for a prince. But Rama ate, and ate gladly, saying he had tasted nothing sweeter in all his wanderings. For what Shabari had offered was not fruit; it was a lifetime of faithful, patient, self-forgetting love — and of such an offering, God cannot get enough.',
          'Then Rama spoke to her gently of the ways a soul may love the Divine — the ninefold devotion: keeping the company of the good, delighting in the Lord’s story, serving without pride, singing his name, and the rest — and told her that one of these, held sincerely, was worth more than every ritual and every pedigree. "You, mother," he said, "possess them all."',
          'Before she left the world in peace, Shabari gave Rama the guidance he needed: to seek the vanara king Sugriva by Pampa lake, who would help him find Sita. So the humble old woman of the forest became a turning point in the story of God himself.',
          'Her berries are remembered wherever the Ramayana is told, and they carry the story’s tenderest lesson: the Lord does not weigh what we offer. He weighs the love it is wrapped in.',
        ],
      },
      {
        storyNumber: 3,
        title: "The Squirrel's Service",
        deityKey: 'rama',
        characters: ['Rama', 'The Squirrel', 'Nala', 'The Vanaras'],
        summary:
          'While mighty vanaras hurl boulders to build the bridge to Lanka, a tiny squirrel helps with grains of sand — and receives from Rama a caress that squirrels carry on their backs to this day.',
        paragraphs: [
          'When Rama’s army reached the shore of the southern sea, an impossible labour began: a bridge to Lanka, a hundred yojanas across the water. The vanaras threw themselves into the work with the joy of those who labour for someone they love. Mighty Nala, gifted in building, directed them; monkeys and bears uprooted whole hills, carried boulders on their shoulders, and flung trees and stones into the waves, where — marked with Rama’s name — they floated. The noise was tremendous; the sight was like mountains learning to swim.',
          'And in the middle of all this thunder, there was a squirrel. She was small even for a squirrel, and she had watched the great work from a rock, her heart aching to help. She could not lift a pebble the vanaras would even notice. But she could do this: she rolled in the wet sand at the water’s edge until her fur was covered with grains, ran out along the causeway, and shook herself — letting her little cargo of sand fall into the cracks between the great stones. Then she ran back and did it again. And again. All day.',
          'Some of the vanaras began to laugh. What was this mite doing underfoot while giants worked? One of them, impatient, scooped her aside — gently enough by his measure, roughly by hers. "Little one, stay clear! This is work for the strong. Your sand is nothing."',
          'The squirrel picked herself up, hurt but unwavering, and went back for more sand. And Rama, who misses nothing that is done in love, had seen it all.',
          'He stopped the work. Before the whole astonished army, the Lord of the worlds bent down and lifted the tiny creature onto his palm, holding her against his cheek. "Never call any service small," he said to his warriors. "You bring your strength; she brings her whole heart. Her grains of sand bind your boulders together — and devotion like hers binds this bridge more surely than stone. The worth of an offering is not in its size, but in its love."',
          'Then, with great tenderness, Rama stroked the squirrel’s back with his fingers. And where his fingers passed, three pale stripes appeared in her fur — marks of the Lord’s own hand.',
          'Squirrels in India carry those stripes to this day, and grandparents point them out to children as the story is told: look, there is the signature of Rama, left on the smallest of his servants. No act of love is ever too little. The bridge to every great thing is built of boulders and of sand.',
        ],
      },
      {
        storyNumber: 4,
        title: "Jatayu's Sacrifice",
        deityKey: 'rama',
        characters: ['Jatayu', 'Sita', 'Ravana', 'Rama', 'Lakshmana'],
        summary:
          'The aged eagle king Jatayu battles Ravana in the sky to save Sita, knowing he cannot win — and Rama honours the dying hero as his own father.',
        paragraphs: [
          'Jatayu was old. In his youth he had been a king among eagles, a friend of great Garuda’s line, and a dear companion of King Dasharatha, Rama’s father. Now his feathers were grey, his wings heavy, and he passed his days drowsing on a hilltop in the forest of Panchavati, near the little hermitage where Rama, Sita and Lakshmana lived their exile.',
          'It was from that hilltop, on the darkest day of the age, that he heard a cry no honest heart could ignore. Ravana, the ten-headed king of Lanka, was carrying Sita away through the sky in his chariot, and she was calling out — to Rama, to Lakshmana, to any tree, river or creature that could bear witness. And one creature could do more than witness.',
          'Jatayu rose into the sky on his old wings and set himself in the chariot’s path. First he spoke, as elders do, with words: "Ravana! You are a king; this deed is a thief’s. Return the princess, or turn back from the path that will burn your whole clan. While I live, you shall not pass." Ravana laughed at the grey old bird and drove on.',
          'Then Jatayu fought. And for a while — let it always be told — the old eagle was winning. He tore at the demon king with beak and talons, shattered his jewelled bow, killed the mules of his chariot and brought the chariot itself crashing down. Ravana, king of the three worlds’ terrors, was forced to stand and fight an aged bird who had risen from his rest with nothing but courage and a debt of love.',
          'But time wins the battles that strength cannot. Jatayu’s old body slowed at last, and Ravana drew his sword and cut away the great wings. Jatayu fell like a mountain falling. Yet even then he did not let go of his purpose: he held on to life itself by sheer will, refusing to die until he could deliver his message.',
          'When Rama and Lakshmana came searching, they found him broken on the earth. Rama took the old eagle’s head onto his lap and wept for him as a son weeps. Jatayu told them what he had seen — Ravana, flying south with Sita — and with that, the search that would shape the world had its direction. "Do not grieve," Rama told him. "You gave your life for mine and Sita’s honour; no warrior has ever done more." And the Lord of the worlds performed the funeral rites for the bird with his own hands, an honour emperors have longed for in vain.',
          'The place is still remembered, and so is the lesson the old eagle left: courage is not the certainty of winning. It is knowing you may fall, and rising anyway — and such a fall, the Ramayana promises, lands a soul directly in the arms of God.',
        ],
      },
    ],
  },
];

async function main() {
  console.log('🌱 Seeding Hindu sacred stories...');

  let storyCount = 0;

  for (const collectionDef of COLLECTIONS) {
    const collection = await prisma.hinduStoryCollection.upsert({
      where: { slug: collectionDef.slug },
      update: {
        name: collectionDef.name,
        sourceText: collectionDef.sourceText,
        isPremium: false,
      },
      create: {
        slug: collectionDef.slug,
        name: collectionDef.name,
        sourceText: collectionDef.sourceText,
        isPremium: false,
      },
    });
    console.log(`  📚 Collection: ${collectionDef.name}`);

    for (const storyDef of collectionDef.stories) {
      const body = storyDef.paragraphs.join('\n\n');
      const data = {
        collectionId: collection.id,
        storyNumber: storyDef.storyNumber,
        title: storyDef.title,
        summary: storyDef.summary,
        body,
        deityKey: storyDef.deityKey,
        characters: storyDef.characters,
      };

      // No composite unique on (collectionId, storyNumber) in the schema,
      // so match manually and create/update for idempotency.
      const existing = await prisma.hinduStory.findFirst({
        where: {
          collectionId: collection.id,
          storyNumber: storyDef.storyNumber,
        },
      });

      if (existing) {
        await prisma.hinduStory.update({
          where: { id: existing.id },
          data,
        });
      } else {
        await prisma.hinduStory.create({ data });
      }

      const wordCount = body.split(/\s+/).filter(Boolean).length;
      storyCount += 1;
      console.log(
        `    ✅ ${storyDef.storyNumber}. ${storyDef.title} (${wordCount} words)`,
      );
    }
  }

  console.log(
    `🎉 Hindu stories seed completed: ${COLLECTIONS.length} collections, ${storyCount} stories.`,
  );
}

main()
  .catch((e) => {
    console.error('❌ Hindu stories seed failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
