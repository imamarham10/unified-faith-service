#!/usr/bin/env python3
"""
Build prisma/data/ramayana.json from the Itihasa dataset (rahular/itihasa,
gh-pages branch, res/ramayana.json).

Provenance (all public domain):
  - Sanskrit: Valmiki Ramayana (ancient text)
  - English:  M.N. Dutt's translation (1891-94), verse-aligned as extracted
              by the Itihasa project (Aralikatte et al., 2021)
  - IAST transliteration: generated mechanically with indic-transliteration

Dutt's four volumes map onto the seven kandas; boundaries are detected by
chapter-number resets (validated 2026-07-13: 642 sargas, 19,371 shlokas,
zero sn/en misalignment). Known gaps in the source: Aranya sargas 13 & 58,
Sundara sarga 24. Yuddha has one mis-numbered sarga (a second "123"), fixed
here by sequential renumbering.

Usage: /tmp/tts-venv/bin/python scripts/build-ramayana-dataset.py <itihasa-ramayana.json> <out.json>
"""
import json
import sys

from indic_transliteration import sanscript

KANDAS = [
    # (volume, segment index within volume, slug, EN name, SA name)
    ("vol-i", 0, "ramayana-bala-kanda", "Bala Kanda", "बालकाण्डः"),
    ("vol-i", 1, "ramayana-ayodhya-kanda", "Ayodhya Kanda", "अयोध्याकाण्डः"),
    ("vol-ii", 0, "ramayana-aranya-kanda", "Aranya Kanda", "अरण्यकाण्डः"),
    ("vol-ii", 1, "ramayana-kishkindha-kanda", "Kishkindha Kanda", "किष्किन्धाकाण्डः"),
    ("vol-ii", 2, "ramayana-sundara-kanda", "Sundara Kanda", "सुन्दरकाण्डः"),
    ("vol-iii", 0, "ramayana-yuddha-kanda", "Yuddha Kanda", "युद्धकाण्डः"),
    ("vol-iv", 0, "ramayana-uttara-kanda", "Uttara Kanda", "उत्तरकाण्डः"),
]


def segments(chapters):
    """Split a volume's chapter list at chapter-number resets."""
    segs, cur = [], [chapters[0]]
    prev = int(chapters[0]["chapter"])
    for c in chapters[1:]:
        n = int(c["chapter"])
        if n <= prev:
            segs.append(cur)
            cur = []
        cur.append(c)
        prev = n
    segs.append(cur)
    return segs


def main():
    src_path, out_path = sys.argv[1], sys.argv[2]
    d = json.load(open(src_path))

    vol_segments = {vol: segments(chapters) for vol, chapters in d.items()}
    # vol-iii is a single kanda (Yuddha); its spurious reset is a numbering
    # error, so re-join and renumber sequentially.
    yuddha = [c for seg in vol_segments["vol-iii"] for c in seg]
    for i, c in enumerate(yuddha):
        c["chapter"] = str(i + 1)
    vol_segments["vol-iii"] = [yuddha]

    kandas, total = [], 0
    for vol, seg_idx, slug, name_en, name_sa in KANDAS:
        seg = vol_segments[vol][seg_idx]
        sargas = []
        for c in seg:
            verses = []
            for i, (sa, en) in enumerate(zip(c["sn"], c["en"])):
                sa = sa.strip()
                verses.append({
                    "n": i + 1,
                    "sa": sa,
                    "iast": sanscript.transliterate(sa, sanscript.DEVANAGARI, sanscript.IAST),
                    "en": en.strip(),
                })
            sargas.append({"number": int(c["chapter"]), "verses": verses})
        count = sum(len(s["verses"]) for s in sargas)
        total += count
        kandas.append({
            "slug": slug,
            "nameEnglish": name_en,
            "nameSanskrit": name_sa,
            "order": len(kandas) + 1,
            "sargaCount": len(sargas),
            "verseCount": count,
            "sargas": sargas,
        })
        print(f"{slug}: {len(sargas)} sargas, {count} shlokas")

    out = {
        "source": "Itihasa dataset (rahular/itihasa). Sanskrit: Valmiki Ramayana (ancient, public domain). English: M.N. Dutt (1891-94, public domain). IAST generated mechanically.",
        "kandas": kandas,
    }
    with open(out_path, "w") as f:
        json.dump(out, f, ensure_ascii=False)
    print(f"total: {total} shlokas -> {out_path}")


if __name__ == "__main__":
    main()
