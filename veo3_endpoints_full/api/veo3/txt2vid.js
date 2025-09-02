import { Veo3Service } from "@/lib/veo3Service.js";
import { verify } from "@/lib/secureToken.js";

export default async function handler(req, res) {
  try {
    const body = req.method === "GET" ? req.query : req.body;
    const { prompt, model = "fast", aspect_ratio = "9:16", is_private = false, veo_session } = body;
    if (!prompt) return res.status(400).json({ ok: false, error: "prompt wajib" });
    if (!veo_session) return res.status(401).json({ ok: false, error: "veo_session wajib (hasil dari verify_otp)" });

    const session = verify(veo_session, process.env.VEO_SESSION_SECRET);

    const service = new Veo3Service(session.cookies);
    const { task_id } = await service.txt2vid({ prompt, model, aspect_ratio, is_private, session });

    return res.status(200).json({ ok: true, task_id });
  } catch (error) {
    return res.status(error.response?.status || 500).json({
      ok: false,
      error: error.message,
      details: error.response?.data || null
    });
  }
}
