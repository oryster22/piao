# Vercel-ready Next.js API (Veo3 Service)

This is a minimal Next.js project exposing `/api/v12` that interacts with Veo3.
It includes CORS headers and OPTIONS preflight handling.

## Quickstart

1. **Clone** or download this folder.
2. Copy `.env.example` to `.env.local` and fill values:
   ```bash
   cp .env.example .env.local
   # edit .env.local to set SUPABASE_ANON_KEY and TEMPMAIL_DOMAIN
   ```
3. Install deps:
   ```bash
   npm i
   npm run dev
   ```
4. Deploy to **Vercel**. Make sure to set the same env vars in the Vercel project:
   - `SUPABASE_ANON_KEY`
   - `TEMPMAIL_DOMAIN`

## Endpoint

- `POST/GET /api/v12?action=txt2vid&prompt=...`
- `POST/GET /api/v12?action=status&task_id=...`

## CORS

CORS is enforced in the handler with a whitelist. Edit `ALLOWED_ORIGINS` in `pages/api/v12.js` as needed.

> If you need cookies/credentials, don't use "*" for `Access-Control-Allow-Origin`.
