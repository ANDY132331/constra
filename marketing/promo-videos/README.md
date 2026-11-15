# Constra promo videos

Two sets. Every video has a vertical file (1080x1920, for Reels, TikTok, Shorts, Stories) and a wide file (1920x1080, for the website, YouTube, LinkedIn). Files ending `-share` are compressed for sending and posting.

## Comedy sketches with animated characters (this folder)

The music in `story-newguy` is an original synthwave track composed for it. It is not GTA music or any Rockstar song.

Each one has real jokes, cartoon people who walk, talk (lips follow the voice), gesture and react, its own art style and its own cast of voices. The real app appears on screen at the moment the story needs it.

| File | Art style | Cast and voices | Idea |
|---|---|---|---|
| `story-notebook-*` | Thick-outline cartoon, a sunny job site | Mac (Andrew), Jess (Ava), Dev (Brian) | Payroll day. Dev's notebook has been rained on, spilled on and bitten. Jess has a phone. |
| `story-monster-*` | Cut-paper stop-motion at 12 fps, a night office | Dev (Brian), Jess (Ava), the Timesheet Monster (Christopher, pitched down), a trailer narrator (Guy) | A movie-trailer parody. A man, a pen, and a stack of timesheets that eats overtime. |
| `story-newguy-*` | Illustrated loading-screen style: a sunset neighbourhood painted in parallax layers, hand-inked characters, neon, a moving camera | Kai (Christopher), Mac (Andrew), Jess (Ava), Dev (Brian) | Kai, an electrician with braids, walks down the block at golden hour into a construction site, gets his hard hat, and clocks in on Constra. Original synthwave soundtrack. |
| `story-cooking-*` | Clean flat shapes, a TV cooking set | Chef Mac (Andrew), sceptical Jess (Ava) | "Cooking with Constra": a recipe for a stress-free Friday. |
| `story-interview-*` | Pop-art comic with halftone dots | Jess in HR (Ava), the Notebook (William, Australian), Constra the phone (Eric) | A job interview for site timekeeper. Two candidates. One gets hired. |

## Explainers (`explainers/`)

Motion graphics and screen walkthroughs with no characters: `watch-it-work` (the real app on a phone), `group-chat` (a text thread), `field-guide` (a blueprint documentary) and `paperwork-stop` (kinetic type).

## Honest notes

- The app screens are real captures of Constra on its demo data. The crew, jobs and hours shown are made-up examples. There are no testimonials, customer logos, user counts or prices anywhere.
- The voices are Microsoft Edge's free neural read-aloud voices. Nobody has listened to the final mixes yet, so play each one before posting.

## Re-making them

The source is in `marketing/vids/`: `engine.js` (timeline, sound, encoding), `puppet.js` (the character rig and four art styles), `stage.js` (shared staging and sound effects), and one folder per video with `lines.json` (the script) and `scene.js` (the picture).

```bash
# 1. voices (run from .tmp-ad, where msedge-tts is installed; copy marketing/vids/voice.mjs there as vids-voice.mjs)
cd .tmp-ad && node vids-voice.mjs story-notebook
#    lines already recorded are kept; FORCE=1 re-records everything; ONLY=7 redoes one line

# 2. check the look
node marketing/vids/render.mjs story-notebook stills v 5,20,40

# 3. render (LIGHT=1 makes the smaller -share file)
LIGHT=1 node marketing/vids/render.mjs story-notebook video v      # vertical
LIGHT=1 node marketing/vids/render.mjs story-notebook video h      # wide
```

To change what a character says, edit `lines.json`, delete that line's files in `.tmp-ad/vids/<name>/vo`, and run step 1 again. "Constra" is spoken as "Konstra" so it reads CON-stra.
