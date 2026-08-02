# yoloro

Flip through YouTube like it's cable. Arrow keys (or swipe on mobile) change
the "channel" — a random mix, a topic (gaming, music, sports...), or a
specific creator — and land you mid-video on something new. Auto-advance can
flip channels on a timer, like doomscrolling but for long-form video.

## Controls

- **↑ / →** — next channel · **↓ / ←** — previous channel
- **Space** — pause (also pauses the auto-advance countdown)
- **Swipe up/down** on touch devices
- Gear icon — settings: auto-advance interval, mute, visual style (retro CRT
  or modern), a min/max view-count filter, whether to include YouTube Shorts,
  a max video length cap, and your channel lineup (add presets or a custom
  topic/creator)

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000 (or whatever port the terminal prints — Next.js
picks the next free one if 3000 is busy).

### Live YouTube data (optional)

Without an API key, yoloro runs in **demo mode**: a small curated set of real
videos so the whole app is testable out of the box (you'll see a "Demo mode"
banner).

To pull live videos:

1. Create a project at the [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   and enable the **YouTube Data API v3**.
2. Create an API key.
3. Copy `.env.local.example` to `.env.local` and paste the key in as
   `YOUTUBE_API_KEY`.
4. Restart the dev server.

The API key is only ever used server-side (in `src/app/api/videos/route.ts`)
— it's never exposed to the browser.

## Deploying to Vercel

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. Import it at [vercel.com/new](https://vercel.com/new).
3. Add an environment variable `YOUTUBE_API_KEY` in the Vercel project
   settings (Production + Preview) if you want live videos there too. Without
   it, the deployed app runs in demo mode.

## How it's built

- Next.js (App Router) + TypeScript + Tailwind CSS
- `src/app/api/videos/route.ts` — server route that calls the YouTube Data
  API and applies the optional view-count/Shorts/max-length filters
  (cascading back to looser results rather than ever returning nothing),
  falling back to a curated demo set in `src/lib/mockVideos.ts` when there's
  no API key
- `src/lib/youtube.ts` — Random and the Gaming/Music/Sports presets pull
  YouTube's real Trending chart (`chart=mostPopular`) — the closest thing to
  "the algorithm" exposed without OAuth into a user's own watch history.
  Everything else (Minecraft, Basketball, custom topics) uses keyword search
  ranked by views-per-day-since-upload, so a fresh, currently-hot video beats
  a big-number relic from a decade ago; creator channels search sorted by
  view count instead of the channel's chronological upload order
- `src/hooks/useChannelSurfing.ts` — per-channel video queues, arrow-key/swipe
  navigation, and the auto-advance countdown
- `src/context/SettingsContext.tsx` — settings persisted to `localStorage`
  (channel lineup, auto-advance interval, mute, visual style)
- `src/components/Player.tsx` — wraps the YouTube IFrame Player API; the
  video surface is intentionally click-through (no native controls) so
  keyboard shortcuts never lose focus to the embedded player
