# Veo3 Vercel API (Complete)

This project includes:
- `/public/index.html` landing page
- `/api` endpoints (Node.js 18 runtime)
- All libs (encoder, spoof-head, secureToken, apiConfig)
- `package.json` so Vercel installs dependencies

## Required ENV
- `DOMAIN_URL` (temp-mail service domain, no scheme)
- `VEO_SESSION_SECRET` (random >= 32 chars)
- Optional: `SUPABASE_ANON_KEY`

## Test
- `GET /api/health`
- `POST /api/veo3/start_auth`
- `POST /api/veo3/verify_otp`
- `POST /api/veo3/txt2vid`
- `GET /api/veo3/status?task_id=...`
