# Constra promo videos

Four spots, each with its own look, voice and pace. Every one has a vertical file (1080x1920, for Reels, TikTok, Shorts, Stories) and a wide file (1920x1080, for the website, YouTube, LinkedIn). Files ending `-share` are compressed for sending and posting.

| File | Look | Voice | Length | Idea |
|---|---|---|---|---|
| `watch-it-work-*` | Dark and yellow, the real app on a phone, tap ripples, callout chips | Ava (calm, friendly) | about 75 s | A guided tour: dashboard, clock-in with photo + GPS, timesheets, crew plan, invoices, projects, reports, 23 Excel templates, the AI assistant, offline sync |
| `group-chat-*` | Bright, light, a crew text thread | Andrew, Ava, Brian, Guy (narrator) | about 95 s | Friday 4:58 PM: nobody knows who worked Tuesday. Monday 7:02 AM: everyone clocks in |
| `field-guide-*` | Blueprint paper, line-work that draws itself | Ryan (dry British narrator) | about 100 s | A nature documentary about the contractor in the wild |
| `paperwork-stop-*` | Loud poster type, hard colour blocks, hazard tape | Christopher (high energy) | about 50 s | "Stop doing paperwork": fast kinetic type, real app screens swing in |

The app screens in `watch-it-work` and `paperwork-stop` are real captures of Constra running on its demo data. The crew, jobs and hours shown are made-up examples, not real customers. The bar chart in `field-guide` is labelled as example hours. Nothing here is a testimonial, a customer logo or a user count.

Nothing shows prices or plans, so the clips are also safe to use in store listings.

## Re-making them

The source is in `marketing/vids/`, with one folder per video holding `lines.json` (the script) and `scene.js` (the picture). The voices are Microsoft Edge's free neural read-aloud voices, so there is no API key.

```bash
# 1. voices (run from .tmp-ad, where msedge-tts is installed; copy marketing/vids/voice.mjs there as vids-voice.mjs)
cd .tmp-ad && node vids-voice.mjs group-chat
#    a line that comes back as 0 bytes: ONLY=9 node vids-voice.mjs group-chat

# 2. check the look
node marketing/vids/render.mjs group-chat stills v 5,20,40

# 3. render (LIGHT=1 makes the smaller -share file)
LIGHT=1 node marketing/vids/render.mjs group-chat video v      # vertical
LIGHT=1 node marketing/vids/render.mjs group-chat video h      # wide
```

To change what a voice says, edit `lines.json` and redo step 1. "Constra" is spoken as "Konstra" so it reads CON-stra.
