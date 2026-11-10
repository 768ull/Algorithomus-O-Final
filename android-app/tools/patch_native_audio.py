#!/usr/bin/env python3
"""Expose sound.js lifecycle controls so the native Activity can pause and resume it."""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
SOUND = ROOT / "android-app/app/src/main/assets/site/js/sound.js"
NEEDLE = "    global.sound = {"
METHODS = """    function suspendNative() {
        if (!suspended) suspend();
        if (audioCtx && audioCtx.state !== "suspended" && audioCtx.suspend) {
            try {
                var stopped = audioCtx.suspend();
                if (stopped && stopped.catch) stopped.catch(function() {});
            } catch (err) {}
        }
    }
    function resumeNative() {
        if (!isForeground()) return;
        if (audioCtx && audioCtx.state === "suspended" && audioCtx.resume) {
            try {
                var started = audioCtx.resume();
                if (started && started.catch) started.catch(function() {});
            } catch (err) {}
        }
        if (suspended) resume();
    }
"""

def main():
    if not SOUND.is_file():
        print("[audio-patch] missing site/js/sound.js", file=sys.stderr)
        return 1
    text = SOUND.read_text(encoding="utf-8")
    if "suspendNative" in text and "resumeNative" in text:
        print("[audio-patch] lifecycle hooks already present")
        return 0
    if NEEDLE not in text or "var audioCtx = null;" not in text:
        print("[audio-patch] upstream sound.js layout changed; inspect before patching", file=sys.stderr)
        return 2
    text = text.replace(NEEDLE, METHODS + NEEDLE, 1)
    text = text.replace(NEEDLE + "\n", NEEDLE + "\n        suspendNative,\n        resumeNative,\n", 1)
    SOUND.write_text(text, encoding="utf-8")
    print("[audio-patch] added suspendNative/resumeNative, preserving original audio formats")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
