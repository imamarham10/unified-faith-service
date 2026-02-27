"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const https = require("https");
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    console.error('DATABASE_URL not set');
    process.exit(1);
}
const connectionString = databaseUrl.replace('sslmode=require', '');
const pool = new pg_1.Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            res.setEncoding('utf-8');
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                }
                catch (e) {
                    reject(e);
                }
            });
        }).on('error', (err) => reject(err));
    });
}
async function main() {
    console.log('Fetching correct Quran text from CDN...');
    const arabicData = await fetchJson('https://cdn.jsdelivr.net/npm/quran-json@3.1.2/dist/quran.json');
    const correctText = new Map();
    for (const surah of arabicData) {
        for (const verse of surah.verses) {
            correctText.set(`${surah.id}:${verse.id}`, verse.text);
        }
    }
    const allVerses = await prisma.quranVerse.findMany({
        select: { id: true, surahId: true, verseNumber: true, textArabic: true },
    });
    const corrupted = allVerses.filter((v) => v.textArabic.includes('\uFFFD'));
    console.log(`Found ${corrupted.length} corrupted verses.`);
    let fixed = 0;
    for (const v of corrupted) {
        const key = `${v.surahId}:${v.verseNumber}`;
        const correct = correctText.get(key);
        if (!correct) {
            console.warn(`  No CDN match for ${key}, skipping`);
            continue;
        }
        await prisma.quranVerse.update({
            where: { id: v.id },
            data: { textArabic: correct, textSimple: correct },
        });
        fixed++;
        console.log(`  Fixed Surah ${v.surahId}:${v.verseNumber}`);
    }
    console.log(`\nDone. Repaired ${fixed}/${corrupted.length} verses.`);
    await prisma.$disconnect();
    await pool.end();
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=repair-quran-text.js.map