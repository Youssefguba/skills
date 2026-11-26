---
name: scrapbook-split-reel
description: Edit a ready talking-head video into a vertical reel where the speaker fills the whole screen, and the screen splits half and half (attachment on scrapbook paper on top, speaker below) whenever a screen recording, screenshot or report is being talked about. It adds scrapbook-style quote cards and captions on paper strips, and never cuts the footage. Use this whenever the user wants to montage, edit or "make a reel" from a video that is already recorded and cut, especially when they hand over screen recordings, screenshots or a report to attach, say "me full screen", "split the screen", "attach X when I say X", "sync the steps with the video", "add captions", or ask for "the same edit as the QA tester video" — even if they don't name this skill. Prefer it over scrapbook-reel when the speaker should stay full screen or nothing should be cut.
---

# Scrapbook split reel

A 1080×1920 reel made from a finished take. The speaker fills the screen. When they talk about something on screen (an app, a recording, a report), the footage slides down to the bottom half and the top half becomes cream scrapbook paper with that attachment taped on it. When they finish, the footage slides back to full screen. Captions run the whole way on small note-paper strips.

This is the user's own variant of the `scrapbook-reel` look. It borrows that skill's paper, ink, tape, pills, notes, motion and fonts, and drops three things the user did not want here: the framed talking-head card at the bottom, the mini-card closing layout, and the closing quotation.

## What the user asked for, and why

These rules came from the user directly. Keep to them, because each one undoes something the default scrapbook template does:

- **Nothing is cut.** The video arrives ready to montage. Use the whole take, re-encoded to 1080×1920 at 30fps, with `loudnorm` as the only audio change. Pauses and false starts stay.
- **The speaker is full screen, not in a card.** The footage is never zoomed, shaken or filtered. Only its window moves.
- **Attachments split the screen half and half:** attachment on top, speaker on the bottom. Each one appears on the word that names it. For example, the report pops when the speaker says "report".
- **Screen-recording steps are synced to the speech.** When the user says a recording has steps, find where each step happens in the recording and where it is described in the speech. Retime each step so it fills its sentence.
- **Captions are on throughout.** Show 2–4 words at a time with one highlighted word.
- **Overlays never repeat the captions.** The user rejected quote cards that restate the same sentence the caption is already showing. Anything else on screen has to add information: a name that isn't spoken ("QA Tester"), a step label named by its step ("خطوة ٢ · اختيار البيئة والـsimulator"), the recording itself, marks on a report, status pills, a doodle. If nothing new can be said, leave the paper empty, or leave the speaker alone full screen.
- **No closing quote** and no mini layout at the end.

## Workflow

### 1. Look at what you were given

Probe every file with `ffprobe` (size, fps, duration, audio). Make contact sheets so you can see the recordings without watching them:

```bash
ffmpeg -v error -i rec.mp4 -vf "fps=1,scale=640:-1,tile=4x5" -frames:v 1 sheet.png
```

From the sheets, write down each recording's steps with their start and end seconds, and the region of the frame where the content sits. Screen recordings made with zoom effects often place the content off-centre or crop it at the edge.

If the main video is horizontal, crop it to 9:16 around the speaker first (`crop=ih*9/16:ih:X:0`). The template assumes the source fills 1080 width at 1920 height.

### 2. Transcribe with word timestamps

Use `scripts/transcribe.py` (faster-whisper `large-v3-turbo`, which is cached locally as `mobiuslabsgmbh/faster-whisper-large-v3-turbo`). Make a Python 3.11 venv in a temp or scratch folder (not in the project) with `faster-whisper` and `librosa`, then run:

```bash
<venv>/bin/python -I scripts/transcribe.py video.mp4 tx.json "topic, product names, technical terms"
```

The prompt argument matters for Egyptian Arabic mixed with English terms. Re-run unclear stretches on their own (slice the audio, use `beam_size=5`). Fix the obvious errors by hand, such as "edge cases" heard as "age cases". Keep a list of the words you were unsure of, because the user needs to proofread them.

### 3. Map speech to attachments

Write a short table: speech span → what shows on top. Typical shape:

| Speech | Layout | Top half |
|---|---|---|
| Hook and problem | full | Nothing, or one title that isn't spoken |
| "I made a skill…" | full | Title card with the product name |
| Step 1 is described | split | Label pill "خطوة ١ · …" + taped recording of step 1 |
| Step 2… | split | Step 2 recording |
| Step 3… | split | Step 3 recording, plus a second recording (for example a phone simulator) if one exists |
| "it gives you a report" | split | The report, with marks drawn on as each result is named |
| Advice and call to action | full | Nothing, or something that adds information |

Keep one continuous split from the first attachment to the last. Sliding back to full screen between steps is jarring.

### 4. Prepare media into `public/`

Copy `assets/template` beside the footage (`reel/`), run `npm i`, then:

```bash
# Main take: whole video, no cuts
ffmpeg -i talk.mp4 -vf "scale=1080:1920:flags=lanczos,fps=30" -c:v libx264 -crf 16 -pix_fmt yuv420p \
  -af loudnorm=I=-14:TP=-1:LRA=9 -ar 48000 -c:a aac -b:a 192k public/clip.mp4

# A step from a recording: crop to the content, stretch it to its sentence, hold the last frame
ffmpeg -ss A -t LEN -i rec.mp4 -an -vf "crop=W:H:X:Y,setpts=K*PTS,fps=30,scale=1200:-2,tpad=stop_mode=clone:stop_duration=3" \
  -c:v libx264 -crf 17 -pix_fmt yuv420p public/step1.mp4
```

`K` is sentence length divided by step length. Slowing typing to about 0.5x still reads naturally. A long phone recording can play at 2x (`setpts=PTS/2`). Crop screenshots to the part that matters (`-vf crop=...` on the PNG), because full-window captures become unreadable at 1000px wide. Check every capture for private data before using it.

### 5. Write `src/plan.json`

`plan.example.json` is the finished QA-tester reel, and the best reference. Types are in `src/reel/types.ts`.

```json
{
  "duration": 71.0,
  "video": { "src": "clip.mp4", "width": 1080, "height": 1920 },
  "splitSrcTop": 240,
  "splits": [{ "in": 20.72, "out": 59.62 }],
  "captions": [{ "at": 0.0, "t": "لو المستخدمين بتوعك", "hl": "المستخدمين" }],
  "panels": [{ "in": 20.9, "out": 28.45, "items": [] }]
}
```

- **`splitSrcTop`**: the row of the 1080-wide clip that lands on the seam in split layout. Choose it so the top of the head sits about 80px below the seam, which leaves room for the caption strip that sits on the seam.
- **`splits`**: when the video slides down and back up, in seconds. The slide takes 16 frames.
- **`captions`**: chunk start times taken from word starts. Each chunk shows until the next one begins. `hl` must be an exact substring of `t`. Captions sit on the chest (y≈1430) in full screen and on the seam (y 960) in split. They hide for the half-second slide, because any fixed position would cross the face mid-move.
- **Top-half layout in split:** label pill at y≈48, taped photo or recording from y≈150 (about 1000×538 for a wide recording), and everything above y≈900 so it clears the seam caption.
- **Two attachments together:** wide recording at x 30, w 770, and a phone recording (w 280, h 480) taped at x 770, overlapping slightly.
- **Report marks:** `photo.marks` draws red pen loops on the photo, in photo pixels (15px mat included). Time each loop to the word that names that result, and add status pills ("Pass ✓", "Bugs", "Blocked") underneath, in reading order from right to left.
- **Full-screen overlays:** only the top ~300px is free above the head. Ink doodles disappear against dark clothes, so put them on the paper or skip them.

Every item still pops on twos and every line boils. Don't add fades.

### 6. Check, render, deliver

```bash
npx tsc --noEmit
npx remotion still Reel out/check.png --frame=N     # one per panel, plus both slides
npx remotion render Reel out/reel.mp4 --crf=18
ffmpeg -i out/reel.mp4 -af ebur128 -f null -        # about -14 LUFS
```

Stitch stills side by side (`hstack`) so you can review them in one image. Check that each attachment pops on its word, captions never cover the eyes, and no overlay repeats the caption shown at the same time. Confirm the duration equals the source.

The render is about 60MB, which is over the 30MB phone-transfer limit, so also make a 720p copy (`scale=720:-2, crf 28`) for sending to a phone (for example with `SendUserFile`, where that tool exists). In the reply, list the timeline briefly and list the words the user should proofread.
