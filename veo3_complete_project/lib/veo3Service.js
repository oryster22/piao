import axios from "axios";
import { CookieJar } from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";
import crypto from "crypto";
import Encoder from "@/lib/encoder";
import SpoofHead from "@/lib/spoof-head";
import apiConfig from "@/configs/apiConfig";

const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "DUMMY_SUPABASE_KEY";

function requireDomain(){
  const d = (apiConfig.DOMAIN_URL||"").trim();
  if(!d) throw new Error("ENV DOMAIN_URL belum di-set di Vercel");
  return d;
}

export class Veo3Service{
  constructor(cookiesString){
    this.baseTempMailUrl = `https://${requireDomain()}/api/mails/v9`;
    this.baseVeoUrl="https://veo3.studio/api";
    this.supabaseUrl="https://cmqnphdipomuuwsplfgv.supabase.co/auth/v1/otp";
    this.supabaseRestUrl="https://cmqnphdipomuuwsplfgv.supabase.co/rest/v1";
    this.apiKey = SUPABASE_ANON_KEY;

    this.email=null; this.accessToken=null; this.refreshToken=null; this.userId=null; this.codeVerifier=null;
    this.cookieJar=new CookieJar();
    if(cookiesString){ this.cookieJar.setCookieSync(cookiesString,"https://veo3.studio"); }

    this.axiosInstance = wrapper(axios.create({
      jar:this.cookieJar, withCredentials:true, timeout:30000, headers:{ accept:"*/*", ...SpoofHead() }
    }));
  }
  generateCodeVerifier(){ return crypto.randomBytes(32).toString("base64url"); }
  generateCodeChallenge(v){ return crypto.createHash("sha256").update(v).digest("base64url"); }

  async createTempMail(){
    const r = await this.axiosInstance.get(`${this.baseTempMailUrl}?action=create`);
    this.email=r.data.email; return this.email;
  }
  async requestOTP(email){
    this.email=email||this.email; if(!this.email) throw new Error("Email belum dibuat");
    this.codeVerifier=this.generateCodeVerifier();
    const codeChallenge=this.generateCodeChallenge(this.codeVerifier);
    await this.axiosInstance.post(this.supabaseUrl,{email:this.email,data:{},create_user:true,gotrue_meta_security:{},code_challenge:codeChallenge,code_challenge_method:"s256"},{
      headers:{ apikey:this.apiKey, authorization:`Bearer ${this.apiKey}`, "content-type":"application/json;charset=UTF-8", origin:"https://veo3.studio", ...SpoofHead() }
    });
    this.cookieJar.setCookieSync(`sb-cmqnphdipomuuwsplfgv-auth-token-code-verifier=base64-"${Buffer.from(this.codeVerifier).toString("base64")}"; Path=/; Domain=veo3.studio`,"https://veo3.studio");
    const cookies = await this.cookieJar.getCookieString("https://veo3.studio");
    return { email:this.email, codeVerifier:this.codeVerifier, cookies };
  }
  async verifyOTP({email, otp}){
    if(!email) throw new Error("Email wajib");
    this.email=email;
    await this.axiosInstance.post(`${this.baseVeoUrl}/auth/verificationCode`,{ email:this.email, verificationCode:otp },{ headers:{ "content-type":"application/json", origin:"https://veo3.studio", ...SpoofHead() }});
    const cookies = await this.cookieJar.getCookies("https://veo3.studio");
    const authCookie = cookies.find(c=>c.key==="sb-cmqnphdipomuuwsplfgv-auth-token");
    if(!authCookie) throw new Error("Auth cookie tidak ditemukan setelah verifikasi OTP");
    const decoded = JSON.parse(Buffer.from(authCookie.value.replace("base64-",""),"base64").toString("utf8"));
    this.accessToken=decoded.access_token; this.refreshToken=decoded.refresh_token; this.userId=decoded.user?.id;
    try{
      await this.axiosInstance.patch(`${this.supabaseRestUrl}/profiles?id=eq.${this.userId}`,{ free_credits:200 },{ headers:{ apikey:this.apiKey, authorization:`Bearer ${this.accessToken}`} });
    }catch{}
    const cookiesString = await this.cookieJar.getCookieString("https://veo3.studio");
    return { accessToken:this.accessToken, refreshToken:this.refreshToken, userId:this.userId, cookies:cookiesString };
  }
  async txt2vid({ prompt, aspect_ratio="9:16", model="fast", is_private=false, session }){
    if(!session?.accessToken||!session?.userId||!session?.cookies) throw new Error("veo_session tidak valid");
    this.cookieJar.setCookieSync(session.cookies,"https://veo3.studio"); this.accessToken=session.accessToken; this.userId=session.userId;
    const req = { model, generation_type:"text-to-video", image_urls:[], watermark:"", prompt, aspect_ratio, user_id:this.userId, is_private };
    await this.axiosInstance.post(`${this.baseVeoUrl}/create/damo`, JSON.stringify(req), { headers:{ "content-type":"application/json", origin:"https://veo3.studio" }});
    const base64 = Buffer.from(JSON.stringify({ userid:this.userId, cookies: await this.cookieJar.getCookieString("https://veo3.studio") })).toString("base64");
    const { uuid } = await Encoder.enc({ data:{ base64 }, method:"combined" });
    return { task_id: uuid };
  }
  async status({ task_id }){
    if(!task_id) throw new Error("task_id wajib");
    const dec = await Encoder.dec({ uuid:task_id, method:"combined" });
    const obj = dec?.text ?? dec; const base64=obj.base64; if(!base64) throw new Error("Invalid task_id");
    const payload = JSON.parse(Buffer.from(base64,"base64").toString("utf8")); const { userid, cookies } = payload;
    const jar = new CookieJar(); if(cookies) jar.setCookieSync(cookies,"https://veo3.studio");
    const ax = wrapper(axios.create({ jar, withCredentials:true, timeout:30000 }));
    const r = await ax.get(`${this.baseVeoUrl}/create/damo/recent-video?user_id=${userid}`);
    return r.data;
  }
}
