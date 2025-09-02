import { Veo3Service } from "@/lib/veo3Service.js";
import { sign } from "@/lib/secureToken.js";

export default async function handler(req, res) {
  try {
    const service = new Veo3Service();
    const email = await service.createTempMail();
    const { cookies, codeVerifier } = await service.requestOTP(email);

    const auth_handle = sign({ email, cookies, codeVerifier, ts: Date.now() }, process.env.VEO_SESSION_SECRET);

    return res.status(200).json({
      ok: true,
      email,
      auth_handle,
      note: "OTP dikirim ke email sementara. Lanjutkan ke /verify_otp."
    });
  } catch (error) {
    return res.status(error.response?.status || 500).json({
      ok: false,
      error: error.message,
      details: error.response?.data || null
    });
  }
}
