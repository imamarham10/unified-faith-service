#!/usr/bin/env python3
"""
Regenerates the Bhagavad Gita Hindi narration MP3s from Siraat's own anuvad.

Source text:  prisma/data/gita-hindi-siraat.json  (Siraat-owned translation)
Voice:        bodhan-ai/indic-speak, Hindi voice `Amit` — one of 95 voices
              recorded by contracted artists who consented to the use. The
              model does no voice cloning, so no reference clip of anybody's
              voice is involved.
Licence:      Indic Open Model License v1.0. Free for commercial use at any
              scale below 500M MAU / $250M revenue, and its share-alike and
              attribution duties attach to Making Available the *model or a
              derivative* — not to its output. We ship MP3s and never the
              weights, so what we owe is the credit line in the app's
              licences screen:
                  "Built with Indic-Speak from Bodhan AI / AI4Bharat."
              Upstream component (§16.2 makes this our diligence, not
              Bodhan's): the LM is fine-tuned from meta-llama/Llama-3.2-3B,
              whose community licence likewise binds distribution of the
              model, not of generated audio.
Output:       scripts/out/gita/hi/chNN.mp3 (18 files)

              Written to a NEW directory on purpose. The files in
              ../faith-web-remix/public/audio/gita/hi/ are serving in
              production; replace them in one deliberate move once these have
              been listened to, not as a side effect of a 12-hour batch.

Do NOT go back to edge-tts. The MP3s shipped in July 2026 were generated with
`edge-tts hi-IN-MadhurNeural` — Microsoft Edge's read-aloud output, which is
not licensed for redistribution, and was sitting behind a paid tier. That is
the whole reason this script is slow and local instead of one network call.

Setup (once; ~7 GB of weights, and the repo is gated — accept its terms on
Hugging Face and `huggingface-cli login` first):

    python3.11 -m venv ~/.venvs/indic-speak
    ~/.venvs/indic-speak/bin/pip install torch "transformers>=5" snac soundfile huggingface_hub

Usage:

    ~/.venvs/indic-speak/bin/python scripts/generate-gita-hindi-audio.py
    ... --only 12            # one chapter
    ... --verse 6.22         # one verse, for a pronunciation probe
    ... --speaker Kavya      # the other Hindi voice
    ... --force              # re-synthesise even if the clip is cached

Expect roughly 12 hours for all 701 verses on an M1 Pro (~4.4x realtime for
~2.8 hours of speech). It is resumable: every verse is cached as its own WAV
under scripts/.tts-cache/, so a re-run only pays for what is missing. Run it
overnight.
"""

import argparse
import json
import math
import subprocess
import sys
import time
import warnings
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
ANUVAD_JSON = REPO_ROOT / "prisma" / "data" / "gita-hindi-siraat.json"
CACHE_DIR = REPO_ROOT / "scripts" / ".tts-cache" / "gita-hi"
DEST_DIR = REPO_ROOT / "scripts" / "out" / "gita" / "hi"
LIVE_DIR = REPO_ROOT.parent / "faith-web-remix" / "public" / "audio" / "gita" / "hi"

MODEL_REPO = "bodhan-ai/indic-speak"
SPEAKER = "Amit"
SR = 24_000

# A verse that fails validation is re-rolled down this ladder. Measured on
# chapter 12: 6 of its 20 verses needed at least one re-roll, and failures are
# deterministic per (text, seed) — the same seed reproduces the same 30 seconds
# of silence exactly — so a different seed is the only thing that helps.
#
# The last two entries drop and raise the temperature. Lowering it does NOT
# reduce the failure rate on its own (tested: 0.3 rejected 4 of the same 5
# cases that 0.6 rejected), but it does change which verses fail, and the only
# outcome worth avoiding is a verse that exhausts the whole ladder and goes
# missing from its chapter.
ATTEMPTS = (
    (1234, 0.6), (7, 0.6), (991, 0.6), (4242, 0.6), (20260712, 0.6),
    (1234, 0.4), (1234, 0.8),
)

# Characters of Devanagari per second of speech. Clips that pass run at
# 8.8–13.4; the floor is set well below the slowest observed so that a
# merely unhurried reading is not thrown away, and the token budget below is
# derived from the same number so the two cannot disagree.
CHARS_PER_SEC = 8.9
RATE_FLOOR = 6.0
TOKENS_PER_SEC = 84  # 2520 tokens is ~30 s of audio

# Silence between verses, and the breath after the chapter's framing line.
GAP_VERSE = 0.45
GAP_INTRO = 0.80

# A chapter should not stop dead on its last syllable. Every clip is trimmed to
# 80 ms of its own silence, which is right between verses and too abrupt at the
# end of 17 minutes of narration.
GAP_END = 1.20

CH_NAMES = {
    1: "अर्जुनविषादयोग", 2: "सांख्ययोग", 3: "कर्मयोग", 4: "ज्ञानकर्मसंन्यासयोग",
    5: "कर्मसंन्यासयोग", 6: "ध्यानयोग", 7: "ज्ञानविज्ञानयोग", 8: "अक्षरब्रह्मयोग",
    9: "राजविद्याराजगुह्ययोग", 10: "विभूतियोग", 11: "विश्वरूपदर्शनयोग", 12: "भक्तियोग",
    13: "क्षेत्रक्षेत्रज्ञविभागयोग", 14: "गुणत्रयविभागयोग", 15: "पुरुषोत्तमयोग",
    16: "दैवासुरसम्पद्विभागयोग", 17: "श्रद्धात्रयविभागयोग", 18: "मोक्षसंन्यासयोग",
}


# ---------------------------------------------------------------- text

def intro_text(ch: int) -> str:
    return f"श्रीमद्भगवद्गीता — सरल हिन्दी अनुवाद। अध्याय {ch} — {CH_NAMES[ch]}।"


def verse_text(verse: int, hindi: str) -> str:
    """One verse as it is spoken, with its number announced.

    A clause-final semicolon is closed as a danda. Several verses in the
    anuvad end mid-breath on `;` because the thought runs into the next one,
    and on those the model sometimes never emits <|end_of_speech|> — it runs
    to max_new_tokens and pads with half a minute of silence.
    """
    line = hindi.strip()
    if line.endswith((";", ",", "—")):
        line = line[:-1].rstrip() + "।"
    return f"श्लोक {verse}। {line}"


# ---------------------------------------------------------------- audio

def _frames_db(wav, frame: int = int(0.02 * SR)):
    import numpy as np

    n = len(wav) // frame
    if n == 0:
        return np.array([-120.0])
    rms = np.sqrt(np.maximum((wav[: n * frame].reshape(n, frame) ** 2).mean(1), 1e-12))
    return 20 * np.log10(rms)


def inspect(wav, text: str) -> tuple[bool, str]:
    """Whether a clip is usable, and why not when it isn't.

    All three checks come from measuring the probe: a good verse runs at
    roughly 8.9 characters of Devanagari per second of speech, ends within a
    fifth of a second of its last word, and never goes quiet for longer than
    a natural pause. A clip that fails any of them is the model drifting, and
    the fix is another seed rather than another model.
    """
    import numpy as np

    secs = len(wav) / SR
    if secs < 0.5:
        return False, f"{secs:.2f}s of audio"

    quiet = _frames_db(wav) < -45

    tail = 0
    for q in quiet[::-1]:
        if not q:
            break
        tail += 1
    if tail * 0.02 > 0.6:
        return False, f"{tail * 0.02:.1f}s of trailing silence"

    gap = run = 0
    for q in quiet:
        run = run + 1 if q else 0
        gap = max(gap, run)
    if gap * 0.02 > 1.5:
        return False, f"a {gap * 0.02:.1f}s gap mid-clip"

    rate = len(text) / secs
    if not RATE_FLOOR <= rate <= 16.0:
        return False, f"{rate:.1f} chars/sec (expected ~8.9)"

    peak = float(np.abs(wav).max())
    if peak < 0.05:
        return False, "near-silent"
    if peak >= 0.999:
        return False, "clipped"

    return True, ""


def trim(wav):
    """Clip the model's own leading and trailing silence to 80 ms.

    Pacing between verses should come from GAP_VERSE, which is a decision,
    not from however much room the model happened to leave.
    """
    import numpy as np

    loud = np.flatnonzero(_frames_db(wav) >= -45)
    if len(loud) == 0:
        return wav
    pad = int(0.08 * SR)
    frame = int(0.02 * SR)
    start = max(0, loud[0] * frame - pad)
    end = min(len(wav), (loud[-1] + 1) * frame + pad)
    return wav[start:end]


# ---------------------------------------------------------------- model

class Voice:
    """The TTS model, loaded once and only if something actually needs it."""

    def __init__(self, speaker: str):
        from huggingface_hub import snapshot_download

        snapshot = snapshot_download(
            MODEL_REPO,
            allow_patterns=["*.json", "*.py", "*.safetensors", "vocos/*"],
            ignore_patterns=["**/__pycache__/*"],
        )
        sys.path.insert(0, snapshot)
        from inference import TTS

        import torch

        device = "mps" if torch.backends.mps.is_available() else (
            "cuda" if torch.cuda.is_available() else "cpu"
        )
        print(f"loading {MODEL_REPO} on {device} ...", flush=True)
        t0 = time.time()
        self._tts = TTS(snapshot, device=device)
        self._torch = torch
        self.speaker = speaker
        print(f"  ready in {time.time() - t0:.0f}s", flush=True)

    def say(self, text: str) -> tuple[object, str]:
        """Synthesise until a clip passes [inspect], or give up and say why.

        `max_new_tokens` is sized to the text rather than left at the model's
        default 2520. Most of a failed roll's cost is the ~30 seconds of
        silence it pads out before anything can reject it, and a verse that
        needs 15 seconds has no business generating 30.

        On its own that trade would be a bad one: a tighter cap truncates a
        runaway into something of plausible length, and babble that measures
        correctly is worse than babble that is obvious. So reaching the budget
        is itself a rejection — the model has to stop on its own
        `<|end_of_speech|>` to be believed, and [inspect] never gets the
        chance to be fooled. A roll that would have succeeded is unaffected:
        it stops before the budget, and the sampling up to that point is
        identical.
        """
        why = "no attempt"
        budget = max(500, min(3400, int(len(text) / RATE_FLOOR * TOKENS_PER_SEC)))
        for seed, temperature in ATTEMPTS:
            with warnings.catch_warnings(record=True) as caught:
                warnings.simplefilter("always")
                wav = self._tts(text, speaker=self.speaker, seed=seed,
                                temperature=temperature, max_new_tokens=budget)
            if any("max_new_tokens" in str(w.message) for w in caught):
                print(f"      re-rolling (seed {seed} @ {temperature} ran out "
                      f"the {budget}-token budget)", flush=True)
                why = f"never stopped within {budget} tokens"
                if hasattr(self._torch, "mps"):
                    self._torch.mps.empty_cache()
                continue
            # Hand the KV cache back after every roll. Without this the MPS
            # allocator grows across hundreds of generations until the process
            # is paged out to swap, and then each forward pass reads 7 GB off
            # the SSD — the run went from 35 clips an hour to one.
            if hasattr(self._torch, "mps"):
                self._torch.mps.empty_cache()
            ok, why = inspect(wav, text)
            if ok:
                return trim(wav), ""
            print(f"      re-rolling (seed {seed} @ {temperature} gave {why})",
                  flush=True)
        return None, why

    @property
    def sample_rate(self) -> int:
        return SR


# ---------------------------------------------------------------- pipeline

def clip_path(speaker: str, ch: int, verse: int | None) -> Path:
    name = "intro" if verse is None else f"v{verse:03d}"
    return CACHE_DIR / speaker / f"ch{ch:02d}" / f"{name}.wav"


def render(voice_box: list, speaker: str, ch: int, verse: int | None,
           text: str, force: bool) -> tuple[Path | None, str]:
    """Produce one cached WAV, synthesising only if it isn't there already."""
    import soundfile as sf

    dest = clip_path(speaker, ch, verse)
    if dest.exists() and not force:
        return dest, ""

    if not voice_box:
        voice_box.append(Voice(speaker))
    voice = voice_box[0]

    label = "intro" if verse is None else f"{ch}.{verse}"
    t0 = time.time()
    wav, why = voice.say(text)
    if wav is None:
        print(f"    {label}: FAILED — {why}", flush=True)
        return None, why

    dest.parent.mkdir(parents=True, exist_ok=True)
    sf.write(dest, wav, SR)
    secs = len(wav) / SR
    took = time.time() - t0
    print(f"    {label}: {secs:5.1f}s in {took:5.1f}s (x{took / secs:.1f})", flush=True)
    return dest, ""


def encode(chapter_clips: list[tuple[Path, float]], dest: Path) -> None:
    """Concatenate the cached clips, with the gaps, straight into an MP3."""
    import numpy as np
    import soundfile as sf

    pieces = []
    for i, (path, gap_after) in enumerate(chapter_clips):
        wav, sr = sf.read(path, dtype="float32")
        if sr != SR:
            raise SystemExit(f"{path} is {sr} Hz, expected {SR}")
        pieces.append(wav)
        gap = gap_after if i < len(chapter_clips) - 1 else GAP_END
        pieces.append(np.zeros(int(gap * SR), dtype="float32"))

    audio = np.concatenate(pieces)
    dest.parent.mkdir(parents=True, exist_ok=True)

    raw = subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
         "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "pipe:0",
         "-codec:a", "libmp3lame", "-b:a", "64k", str(dest)],
        input=audio.tobytes(), check=True,
    )
    del raw
    mins = len(audio) / SR / 60
    print(f"  -> {dest.name}  {mins:.1f} min, {dest.stat().st_size // 1024} KB", flush=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", type=int, help="generate a single chapter")
    ap.add_argument("--verse", help="synthesise one verse only, e.g. 6.22")
    ap.add_argument("--speaker", default=SPEAKER, help="Amit or Kavya")
    ap.add_argument("--force", action="store_true",
                    help="re-synthesise even if the clip is cached")
    args = ap.parse_args()

    anuvad = json.loads(ANUVAD_JSON.read_text())["anuvad"]
    by_ch: dict[int, dict[int, str]] = {}
    for key, hindi in anuvad.items():
        c, v = key.split(".")
        by_ch.setdefault(int(c), {})[int(v)] = hindi

    voice_box: list = []

    if args.verse:
        c, v = (int(x) for x in args.verse.split("."))
        path, why = render(voice_box, args.speaker, c, v,
                           verse_text(v, by_ch[c][v]), force=True)
        if path is None:
            sys.exit(f"{args.verse} could not be synthesised: {why}")
        print(f"wrote {path}")
        return

    chapters = [args.only] if args.only else sorted(by_ch)
    failures: list[str] = []
    started = time.time()

    for ch in chapters:
        verses = by_ch[ch]
        print(f"ch{ch:02d} — {CH_NAMES[ch]} ({len(verses)} verses)", flush=True)

        clips: list[tuple[Path, float]] = []
        path, why = render(voice_box, args.speaker, ch, None, intro_text(ch), args.force)
        if path is None:
            failures.append(f"ch{ch:02d} intro ({why})")
        else:
            clips.append((path, GAP_INTRO))

        for v in sorted(verses):
            path, why = render(voice_box, args.speaker, ch, v,
                               verse_text(v, verses[v]), args.force)
            if path is None:
                failures.append(f"{ch}.{v} ({why})")
                continue
            clips.append((path, GAP_VERSE))

        if clips:
            encode(clips, DEST_DIR / f"ch{ch:02d}.mp3")

    elapsed = time.time() - started
    print(f"\ndone in {math.floor(elapsed / 3600)}h {int(elapsed % 3600 // 60)}m")
    print(f"MP3s in {DEST_DIR}")
    print(f"Listen, then replace {LIVE_DIR} by hand.")
    if failures:
        print(f"\n{len(failures)} clip(s) no seed could render — these verses are "
              f"MISSING from their chapter:")
        for f in failures:
            print(f"  {f}")
        sys.exit(1)


if __name__ == "__main__":
    main()
