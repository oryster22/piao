# Vercel Veo3 4-Endpoint

Endpoint dipisah agar tidak menunggu OTP dalam satu request:
- `POST /api/veo3/start_auth` → buat email temp, kirim OTP → kembalikan `auth_handle`
- `POST /api/veo3/verify_otp` → kirim `auth_handle` + `otp` → kembalikan `veo_session`
- `POST /api/veo3/txt2vid` → kirim `veo_session` + `prompt` → kembalikan `task_id`
- `GET  /api/veo3/status?task_id=...` → polling status

## ENV yang diperlukan
- `DOMAIN_URL` → domain untuk temp-mail API kamu
- `VEO_SESSION_SECRET` → random string >= 32 chars (untuk sign token)
- `SUPABASE_ANON_KEY` (opsional) → jika ingin override default key hardcoded

## Contoh pemakaian

1) Start Auth
```bash
curl -X POST https://<app>/api/veo3/start_auth
```

2) Verify OTP
```bash
curl -X POST https://<app>/api/veo3/verify_otp -H "Content-Type: application/json" -d '{
  "auth_handle": "<from start_auth>",
  "otp": "123456"
}'
```

3) Generate Video
```bash
curl -X POST https://<app>/api/veo3/txt2vid -H "Content-Type: application/json" -d '{
  "veo_session": "<from verify_otp>",
  "prompt": "Cinematic aerial shot of rice terraces at golden hour",
  "aspect_ratio": "16:9",
  "model": "fast"
}'
```

4) Cek Status
```bash
curl "https://<app>/api/veo3/status?task_id=<from txt2vid>"
```
