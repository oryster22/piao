import axios from "axios";
import { CookieJar } from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
import Encoder from "@/lib/encoder";
import SpoofHead from "@/lib/spoof-head";

class Veo3Service {
  constructor() {
    this.baseTempMailUrl = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
    this.baseVeoUrl = "https://veo3.studio/api";
    this.supabaseUrl = "https://cmqnphdipomuuwsplfgv.supabase.co/auth/v1/otp";
    this.supabaseRestUrl = "https://cmqnphdipomuuwsplfgv.supabase.co/rest/v1";
    this.apiKey = process.env.SUPABASE_ANON_KEY;
    if (!this.apiKey) {
      throw new Error("Missing SUPABASE_ANON_KEY env");
    }

    this.email = null;
    this.accessToken = null;
    this.refreshToken = null;
    this.userId = null;
    this.codeVerifier = null;
    this.isAuthenticated = false;

    this.cookieJar = new CookieJar();
    this.axiosInstance = wrapper(axios.create({
      jar: this.cookieJar,
      withCredentials: true,
      timeout: 30000,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        ...SpoofHead(),
      },
    }));
  }

  async enc(data) {
    const { uuid } = await Encoder.enc({ data, method: "combined" });
    return uuid;
  }
  async dec(uuid) {
    const decryptedJson = await Encoder.dec({ uuid, method: "combined" });
    return decryptedJson.text;
  }

  async createTempMail() {
    const resp = await this.axiosInstance.get(`${this.baseTempMailUrl}?action=create`);
    this.email = resp.data.email;
    return this.email;
  }
  async checkOTP() {
    if (!this.email) throw new Error("Email belum dibuat");
    const resp = await this.axiosInstance.get(`${this.baseTempMailUrl}?action=message&email=${this.email}`);
    if (resp.data?.data?.length) {
      const txt = resp.data.data[0].text_content || "";
      const m = txt.match(/\b\d{6}\b/);
      if (m) return m[0];
    }
    return null;
  }
  async waitForOTP(maxAttempts = 60, interval = 3000) {
    for (let i = 0; i < maxAttempts; i++) {
      const otp = await this.checkOTP();
      if (otp) return otp;
      await new Promise(r => setTimeout(r, interval));
    }
    throw new Error("OTP tidak ditemukan dalam waktu yang ditentukan");
  }
  async requestOTP() {
    if (!this.email) throw new Error("Email belum dibuat");
    this.codeVerifier = crypto.randomBytes(32).toString("base64url");
    const codeChallenge = crypto.createHash("sha256").update(this.codeVerifier).digest("base64url");
    await this.axiosInstance.post(this.supabaseUrl, {
      email: this.email,
      create_user: true,
      gotrue_meta_security: {},
      code_challenge: codeChallenge,
      code_challenge_method: "s256",
    }, {
      headers: {
        apikey: this.apiKey,
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json;charset=UTF-8",
        origin: "https://veo3.studio",
        "x-client-info": "supabase-ssr/0.6.1 createBrowserClient",
        "x-supabase-api-version": "2024-01-01",
        ...SpoofHead(),
      }
    });
  }
  async verifyOTP(otp) {
    await this.axiosInstance.post(`${this.baseVeoUrl}/auth/verificationCode`, {
      email: this.email,
      verificationCode: otp,
    }, {
      headers: {
        "content-type": "application/json",
        origin: "https://veo3.studio",
        ...SpoofHead(),
      }
    });
    // In real flow, you would extract tokens from cookies set by veo3.studio.
    // For safety here we assume tokens handled server-side.
    this.isAuthenticated = true;
    this.accessToken = "placeholder"; // replace with real token extraction
    this.userId = "placeholder-user"; // replace with real user id
  }
  async claimCredits() {
    if (!this.isAuthenticated) throw new Error("Belum terautentikasi");
    // No-op placeholder to keep interface; implement if needed.
    return { ok: true };
  }
  async ensureAuth() {
    if (this.isAuthenticated) return;
    await this.createTempMail();
    await this.requestOTP();
    const otp = await this.waitForOTP();
    await this.verifyOTP(otp);
    await this.claimCredits();
  }
  async txt2vid({ prompt, model = "fast", aspect_ratio = "9:16", is_private = false, ...rest }) {
    await this.ensureAuth();
    const encryptData = Buffer.from(JSON.stringify({
      token: this.accessToken,
      verifier: this.codeVerifier,
      userid: this.userId,
      cookies: await this.cookieJar.getCookieString("https://veo3.studio"),
    })).toString("base64");

    const requestData = JSON.stringify({
      model, generation_type: "text-to-video", image_urls: [], watermark: "",
      prompt, aspect_ratio, user_id: this.userId, is_private, ...rest
    });

    await this.axiosInstance.post(`${this.baseVeoUrl}/create/damo`, requestData, {
      headers: {
        accept: "*/*",
        "content-type": "application/json",
        origin: "https://veo3.studio",
        ...SpoofHead(),
      }
    });

    const task_id = await this.enc({ base64: encryptData });
    return { task_id };
  }
  async status({ task_id }) {
    if (!task_id) throw new Error("task_id is required to check status.");
    const decryptedData = await this.dec(task_id);
    const { base64 } = decryptedData;
    if (!base64) throw new Error("Invalid task_id");
    const enc = JSON.parse(Buffer.from(base64, "base64").toString());
    const { userid } = enc;
    const response = await this.axiosInstance.get(`${this.baseVeoUrl}/create/damo/recent-video?user_id=${userid}`, {
      headers: { origin: "https://veo3.studio", ...SpoofHead() }
    });
    return response.data;
  }
}

// CORS helpers
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://localhost:3000,https://your-frontend.com")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

function setCors(res, origin, { credentials = false } = {}) {
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    // fallback: lock down; change to "*" if you want to allow all (no credentials)
    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGINS[0] || "*");
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (credentials) res.setHeader("Access-Control-Allow-Credentials", "true");
}

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  setCors(res, origin, { credentials: false }); // set to true if you need cookies

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { action, ...params } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({ error: "Action is required." });
  }

  const veo3Service = new Veo3Service();
  try {
    switch (action) {
      case "txt2vid":
        if (!params.prompt) {
          return res.status(400).json({ error: "Prompt is required for txt2vid." });
        }
        return res.status(200).json(await veo3Service.txt2vid(params));
      case "status":
        if (!params.task_id) {
          return res.status(400).json({ error: "task_id is required for status." });
        }
        return res.status(200).json(await veo3Service.status(params));
      default:
        return res.status(400).json({ error: `Invalid action: ${action}. Supported: 'txt2vid', 'status'.` });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
