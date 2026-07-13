# RedEMusic.ai

Mission control for your AI music pipeline. This app itself is the front end —
it doesn't run HeartMuLa or train your voice model. Those are heavy enough
that they need a GPU, so they run on free Colab notebooks and this app just
orchestrates them and handles the parts that genuinely can be instant:
lyrics (Groq), session memory, and true 432Hz playback.

## What's real here vs. what routes elsewhere

| Piece | Runs where | Why |
|---|---|---|
| Lyrics generation | This app, via `/api/lyrics` → Groq | Fast, cheap, works as a normal web request |
| Voice cloning (Applio/RVC) | Separate Colab notebook | Needs a GPU for training, no free host runs this 24/7 |
| Song generation (HeartMuLa) / instrumentals (MusicGen) | Separate Colab notebook | Same — GPU + multi-GB model weights |
| Stems (UVR5) | Separate Colab or desktop app | Same |
| 432Hz retune | This app, Web Audio API | Just a playback-rate change, genuinely instant in-browser |
| Session save (lyrics, DNA model name, settings) | This app, Supabase (or local browser storage until you wire Supabase up) | Lightweight, no GPU involved |

## Local setup

```bash
npm install
npm run dev
```

Open the local URL it prints. The Brain panel won't return anything yet
because `/api/lyrics` needs a Groq key — see below.

## Environment variables

Copy `.env.example` to `.env` and fill in:

- `GROQ_API_KEY` — free at console.groq.com/keys. This one is **server-side only**,
  used by `api/lyrics.js`. Never prefix it with `VITE_` or it'll end up in the
  public browser bundle.
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — from your Supabase project
  settings, once you've created one. Optional at first: without these, the app
  just saves your session to the browser's local storage instead.

`npm run dev` reads `.env` automatically. On Vercel, set these in
Project Settings → Environment Variables instead of committing `.env`.

## Supabase setup (optional, for cross-device session sync)

1. Create a free project at supabase.com.
2. Project → SQL Editor → paste the contents of `supabase-schema.sql` → Run.
3. Project Settings → API → copy the Project URL and anon public key into
   `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.

This uses a random per-device ID rather than full user accounts, since it's
built for personal use. See the comment at the bottom of `supabase-schema.sql`
if you want to lock it down further later with real Supabase Auth.

## Deploying to Netlify (so it's on your Android home screen as a PWA)

Vercel requires phone number verification to sign up, with no alternative
for accounts that can't provide one — so this project deploys to **Netlify**
instead, which signs up with just a GitHub account or email, no phone.
The `netlify/functions/lyrics.mjs` file and `netlify.toml` redirect already
handle this — the frontend still calls `/api/lyrics` exactly as before.

1. Push this folder to a new GitHub repo (github.com only needs an email
   to sign up — no phone required for a normal account).
2. Go to app.netlify.com → sign up with your GitHub account.
3. "Add new site" → "Import an existing project" → pick that repo.
   Netlify auto-detects the build command and publish folder from
   `netlify.toml`.
4. Before the first deploy, add `GROQ_API_KEY` under Site configuration →
   Environment variables (and the two Supabase vars too, if you're using
   them).
5. Deploy. Open the `.netlify.app` URL on your phone, then use your
   browser's "Add to Home Screen" — it'll behave like an app icon.

`vercel.json` and `api/lyrics.js` are left in the repo in case you ever
do get a Vercel-compatible account later, but they're not needed for this
path — Netlify doesn't touch them.

Note: this repo doesn't include a PWA manifest/service worker yet. Add to
home screen works fine as-is on Android Chrome without one, but if you want
proper install prompts and offline caching, `vite-plugin-pwa` is the standard
way to add that on top of this setup later.

## What "everything Suno/Flow can do" honestly means here

This is a real, working pipeline built entirely from free tiers, not a
single unified model like Suno's. Expect to bounce between this app and two
Colab tabs rather than one seamless interface — that's the actual trade-off
of doing this for free.
