import { Veo3Service } from "@/lib/veo3Service.js";
import { verify, sign } from "@/lib/secureToken.js";

export default async function handler(req, res) {
  try {
    const { auth_handle, otp } = req.method === "GET" ? req.query : req.body;
    if (!auth_handle || !otp) {
      return res.status(400).json({ ok: false, error: "auth_handle & otp wajib" });
    }
    const parsed = verify(auth_handle, process.env.VEO_SESSION_SECRET);
    const service = new Veo3Service(parsed.cookies);

    const { accessToken, refreshToken, userId, cookies } = await service.verifyOTP({
      email: parsed.email, otp
    });

    const veo_session = sign({ accessToken, refreshToken, userId, cookies, ts: Date.now() }, process.env.VEO_SESSION_SECRET);

    return res.status(200).json({ ok: true, veo_session });
  } catch (error) {
    return res.status(error.response?.status || 500).json({
      ok: false,
      error: error.message,
      details: error.response?.data || null
    });
  }
}
