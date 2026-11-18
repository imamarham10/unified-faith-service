#!/usr/bin/env python3
"""
Narrates a katha episode from its script.

Source text:  prisma/data/katha-<id>.json  (Siraat-owned retelling)
Voice:        bodhan-ai/indic-speak, Hindi voice `Amit` — the same contracted
              artist's voice as the Gita narration, so the app has one
              narrator rather than a different voice per feature.
Licence:      Indic Open Model License v1.0; see the header of
              generate-gita-hindi-audio.py for why shipping the output owes
              nothing but the credit line.
Output:       scripts/out/katha/<id>.mp3, plus <id>.markers.json

The markers file is the point of this script existing separately from the
Gita one. A katha's chapter markers have to land on the beat they name, and
the only way to know when a beat starts is to measure the audio that comes
before it. The episode's seeded marker times were guesses typed next to
guessed durations; these are read off the rendered file.

Setup and runtime: identical to generate-gita-hindi-audio.py. One episode is
a few minutes of speech, so expect well under an hour rather than the Gita's
overnight run.

Usage:
    ~/.venvs/indic-speak/bin/python scripts/generate-katha-audio.py puran-1
    ... --speaker Kavya
    ... --force
"""

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = REPO_ROOT / "scripts" / ".tts-cache" / "katha"
DEST_DIR = REPO_ROOT / "scripts" / "out" / "katha"

MODEL_REPO = "bodhan-ai/indic-speak"
SPEAKER = "Amit"
SR = 24_000

# Same ladder as the Gita run, for the same measured reason: failures are
# deterministic per (text, seed), so only a different seed helps.
ATTEMPTS = (
    (1234, 0.6), (7, 0.6), (991, 0.6), (4242, 0.6), (20260712, 0.6),
    (1234, 0.4), (1234, 0.8),
)

CHARS_PER_SEC = 8.9
RATE_FLOOR = 6.0
TOKENS_PER_SEC = 84

# A katha is told, not recited. The pauses are longer than the Gita's: a
# beat break is a breath the listener needs to follow a story turn.
GAP_LINE = 0.55
GAP_BEAT = 1.40
GAP_END = 1.60


# ---------------------------------------------------------------- audio

def _frames_db(wav, frame: int = int(0.02 * SR)):
    import numpy as np

    n = len(wav) // frame
    if n == 0:
        return np.array([-120.0])
    rms = np.sqrt(np.maximum((wav[: n * frame].reshape(n, frame) ** 2).mean(1), 1e-12))
    return 20 * np.log10(rms)


def inspect(wav, text: str) -> tuple[bool, str]:
    """Whether a clip is usable, and why not when it isn't."""
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
        return False, f"{rate:.1f} chars/sec (expected ~{CHARS_PER_SEC})"

    peak = float(np.abs(wav).max())
    if peak < 0.05:
        return False, "near-silent"
    if peak >= 0.999:
        return False, "clipped"

    return True, ""


def trim(wav):
    """Clip the model's own leading and trailing silence to 80 ms."""
    import numpy as np

    loud = np.flatnonzero(_frames_db(wav) >= -45)
    if len(loud) == 0:
        return wav
    pad = int(0.08 * SR)
    frame = int(0.02 * SR)
    return wav[max(0, loud[0] * frame - pad): min(len(wav), (loud[-1] + 1) * frame + pad)]


# ---------------------------------------------------------------- model

class Voice:
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

    def say(self, text: str):
        """Synthesise until a clip passes [inspect], or give up and say why.

        Reaching the token budget is itself a rejection — the model has to
        stop on its own `<|end_of_speech|>` to be believed, so a runaway that
        happens to be the right length cannot slip past [inspect].
        """
        import warnings

        why = "no attempt"
        budget = max(500, min(3400, int(len(text) / RATE_FLOOR * TOKENS_PER_SEC)))
        for seed, temperature in ATTEMPTS:
            with warnings.catch_warnings(record=True) as caught:
                warnings.simplefilter("always")
                wav = self._tts(text, speaker=self.speaker, seed=seed,
                                temperature=temperature, max_new_tokens=budget)
            if hasattr(self._torch, "mps"):
                self._torch.mps.empty_cache()
            if any("max_new_tokens" in str(w.message) for w in caught):
                print(f"      re-rolling (seed {seed} @ {temperature} ran out "
                      f"the {budget}-token budget)", flush=True)
                why = f"never stopped within {budget} tokens"
                continue
            ok, why = inspect(wav, text)
            if ok:
                return trim(wav), ""
            print(f"      re-rolling (seed {seed} @ {temperature} gave {why})",
                  flush=True)
        return None, why


# ---------------------------------------------------------------- pipeline

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("episode", help="episode id, e.g. puran-1")
    ap.add_argument("--speaker", default=SPEAKER, help="Amit or Kavya")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    script_path = next(
        (p for p in (REPO_ROOT / "prisma" / "data").glob(f"katha-{args.episode}*.json")),
        None,
    )
    if script_path is None:
        sys.exit(f"no script at prisma/data/katha-{args.episode}*.json")

    import numpy as np
    import soundfile as sf

    script = json.loads(script_path.read_text())
    print(f"{script['title']} — {script['series']} ep {script['number']}")

    voice_box: list = []
    pieces: list = []
    markers: list[dict] = []
    failures: list[str] = []
    started = time.time()

    for b, beat in enumerate(script["beats"]):
        # The marker time is where this beat begins in the finished file —
        # measured, not typed.
        at = sum(len(p) for p in pieces) / SR
        markers.append({"at": round(at, 2), "title": beat["marker"]})
        print(f"  beat {b + 1}: {beat['marker']}  (at {at:.1f}s)", flush=True)

        for i, line in enumerate(beat["lines"]):
            dest = CACHE_DIR / args.speaker / args.episode / f"b{b}l{i:02d}.wav"
            if dest.exists() and not args.force:
                wav, sr = sf.read(dest, dtype="float32")
                if sr != SR:
                    sys.exit(f"{dest} is {sr} Hz, expected {SR}")
            else:
                if not voice_box:
                    voice_box.append(Voice(args.speaker))
                t0 = time.time()
                wav, why = voice_box[0].say(line)
                if wav is None:
                    print(f"    line {i}: FAILED — {why}", flush=True)
                    failures.append(f"beat {b + 1} line {i}: {why}")
                    continue
                dest.parent.mkdir(parents=True, exist_ok=True)
                sf.write(dest, wav, SR)
                secs = len(wav) / SR
                took = time.time() - t0
                print(f"    line {i}: {secs:5.1f}s in {took:5.1f}s "
                      f"(x{took / secs:.1f})", flush=True)

            pieces.append(wav)
            last = i == len(beat["lines"]) - 1
            final = last and b == len(script["beats"]) - 1
            gap = GAP_END if final else (GAP_BEAT if last else GAP_LINE)
            pieces.append(np.zeros(int(gap * SR), dtype="float32"))

    audio = np.concatenate(pieces)
    DEST_DIR.mkdir(parents=True, exist_ok=True)
    mp3 = DEST_DIR / f"{args.episode}.mp3"
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
         "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "pipe:0",
         "-codec:a", "libmp3lame", "-b:a", "64k", str(mp3)],
        input=audio.tobytes(), check=True,
    )

    total = len(audio) / SR
    (DEST_DIR / f"{args.episode}.markers.json").write_text(
        json.dumps({"durationSeconds": round(total, 2), "markers": markers},
                   ensure_ascii=False, indent=2) + "\n"
    )

    elapsed = time.time() - started
    print(f"\n  -> {mp3.name}  {total / 60:.1f} min, "
          f"{mp3.stat().st_size // 1024} KB")
    print(f"  -> {args.episode}.markers.json")
    print(f"done in {int(elapsed // 60)}m {int(elapsed % 60)}s")
    if failures:
        print(f"\n{len(failures)} line(s) no seed could render — these are "
              f"MISSING from the episode:")
        for f in failures:
            print(f"  {f}")
        sys.exit(1)


if __name__ == "__main__":
    main()
