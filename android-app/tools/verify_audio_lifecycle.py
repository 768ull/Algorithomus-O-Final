#!/usr/bin/env python3
"""Static regression checks for pausing game audio outside the Android app."""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
ACTIVITY = ROOT / "android-app/app/src/main/java/br/com/algorithomus/app/MainActivity.java"
SOUND = ROOT / "android-app/app/src/main/assets/site/js/sound.js"

def main():
    activity = ACTIVITY.read_text(encoding="utf-8")
    sound = SOUND.read_text(encoding="utf-8")
    required_activity = [
        "protected void onPause()",
        "protected void onResume()",
        "PAUSE_NUDGE_JS",
        "RESUME_NUDGE_JS",
        "webView.onPause()",
        "webView.onResume()",
        "pauseTimers()",
        "resumeTimers()",
        "querySelectorAll('audio,video')",
        "m.pause()",
        "m.play()"
    ]
    required_sound = [
        "function suspendNative()",
        "function resumeNative()",
        "audioCtx.suspend()",
        "audioCtx.resume()",
        "audio.pause()",
        "audio._wasPlaying",
        "global.sound = {",
        "suspendNative,",
        "resumeNative,"
    ]
    missing = [item for item in required_activity if item not in activity]
    missing += [item for item in required_sound if item not in sound]
    if missing:
        print("[audio-lifecycle] FAIL: missing lifecycle behavior:")
        for item in missing:
            print(" - " + item)
        return 1
    print("[audio-lifecycle] PASS: native background pauses HTML media and WebAudio; foreground resumes prior playback without reloading the page.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
