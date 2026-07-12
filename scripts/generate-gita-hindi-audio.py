#!/usr/bin/env python3
"""
Regenerates the Bhagavad Gita Hindi narration MP3s from Siraat's own anuvad.

Source text:  prisma/data/gita-hindi-siraat.json  (Siraat-owned translation)
Voice:        edge-tts hi-IN-MadhurNeural, rate -8%
Output:       ../faith-web-remix/public/audio/gita/hi/chNN.mp3 (18 files)

Usage:
    python3 -m venv /tmp/tts-venv && /tmp/tts-venv/bin/pip install edge-tts
    python3 scripts/generate-gita-hindi-audio.py [--only 12] [--force]

Idempotent: skips chapters whose MP3 already exists unless --force.
Re-run after any edit to the anuvad JSON (then re-run
`npm run prisma:seed:hindu-gita-audio-hindi` if URLs changed — they won't
unless you rename files).
"""

import argparse
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
ANUVAD_JSON = REPO_ROOT / "prisma" / "data" / "gita-hindi-siraat.json"
DEST_DIR = REPO_ROOT.parent / "faith-web-remix" / "public" / "audio" / "gita" / "hi"
VOICE = "hi-IN-MadhurNeural"
RATE = "-8%"

CH_NAMES = {
    1: "अर्जुनविषादयोग", 2: "सांख्ययोग", 3: "कर्मयोग", 4: "ज्ञानकर्मसंन्यासयोग",
    5: "कर्मसंन्यासयोग", 6: "ध्यानयोग", 7: "ज्ञानविज्ञानयोग", 8: "अक्षरब्रह्मयोग",
    9: "राजविद्याराजगुह्ययोग", 10: "विभूतियोग", 11: "विश्वरूपदर्शनयोग", 12: "भक्तियोग",
    13: "क्षेत्रक्षेत्रज्ञविभागयोग", 14: "गुणत्रयविभागयोग", 15: "पुरुषोत्तमयोग",
    16: "दैवासुरसम्पद्विभागयोग", 17: "श्रद्धात्रयविभागयोग", 18: "मोक्षसंन्यासयोग",
}


def find_edge_tts() -> str:
    for candidate in ("/tmp/tts-venv/bin/edge-tts", shutil.which("edge-tts")):
        if candidate and Path(candidate).exists():
            return candidate
    sys.exit("edge-tts not found. Run: python3 -m venv /tmp/tts-venv && /tmp/tts-venv/bin/pip install edge-tts")


def chapter_text(ch: int, verses: dict[int, str]) -> str:
    lines = [f"श्रीमद्भगवद्गीता — सरल हिन्दी अनुवाद। अध्याय {ch} — {CH_NAMES[ch]}।"]
    for v in sorted(verses):
        lines.append(f"श्लोक {v}। {verses[v]}")
    return "\n".join(lines)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", type=int, help="generate a single chapter")
    ap.add_argument("--force", action="store_true", help="regenerate even if the MP3 exists")
    args = ap.parse_args()

    edge_tts = find_edge_tts()
    anuvad = json.loads(ANUVAD_JSON.read_text())["anuvad"]

    by_ch: dict[int, dict[int, str]] = {}
    for key, hi in anuvad.items():
        c, v = key.split(".")
        by_ch.setdefault(int(c), {})[int(v)] = hi

    DEST_DIR.mkdir(parents=True, exist_ok=True)
    chapters = [args.only] if args.only else sorted(by_ch)

    for ch in chapters:
        dest = DEST_DIR / f"ch{ch:02d}.mp3"
        if dest.exists() and not args.force:
            print(f"skip ch{ch:02d} (exists)")
            continue
        with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False) as f:
            f.write(chapter_text(ch, by_ch[ch]))
            txt_path = f.name
        print(f"generating ch{ch:02d} ({len(by_ch[ch])} verses)...")
        subprocess.run(
            [edge_tts, "--voice", VOICE, f"--rate={RATE}", "--file", txt_path, "--write-media", str(dest)],
            check=True,
        )
        Path(txt_path).unlink()
        print(f"  -> {dest} ({dest.stat().st_size // 1024} KB)")

    print("done.")


if __name__ == "__main__":
    main()
