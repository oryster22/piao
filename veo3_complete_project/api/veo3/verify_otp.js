import { Veo3Service } from "@/lib/veo3Service.js";
import { verify, sign } from "@/lib/secureToken.js";

export default async function handler(req,res){
  try{
    const body = req.method==="GET" ? req.query : req.body;
    const token = body.auth_handle || body.auth_id;
    const { otp } = body;
    if(!token || !otp) return res.status(400).json({ ok:false, error:"auth_handle/auth_id & otp wajib" });
    const parsed = verify(token, process.env.VEO_SESSION_SECRET);
    const service = new Veo3Service(parsed.cookies);
    const { accessToken, refreshToken, userId, cookies } = await service.verifyOTP({ email: parsed.email, otp });
    const veo_session = sign({ accessToken, refreshToken, userId, cookies, ts: Date.now() }, process.env.VEO_SESSION_SECRET);
    res.status(200).json({ ok:true, veo_session });
  }catch(error){
    res.status(error.response?.status||500).json({ ok:false, error:error.message, details:error.response?.data||null });
  }
}
