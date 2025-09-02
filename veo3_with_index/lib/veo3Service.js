// Full Veo3Service implementation (modularized for the 4-endpoint flow)
import axios from "axios";
import { CookieJar } from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";
import crypto from "crypto";
import Encoder from "@/lib/encoder";       // keep your existing encoder
import SpoofHead from "@/lib/spoof-head";  // keep your existing spoof headers
import apiConfig from "@/configs/apiConfig";

const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtcW5waGRpcG9tdXV3c3BsZmd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5ODIzMzIsImV4cCI6MjA2MzU1ODMzMn0._p6qwLmco7JY6bWBHfouBIHCIHBHfUMgLyMNd-IGrS0";

export class Veo3Service {
  constructor(cookiesString) {
    this.baseTempMailUrl = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
    this.baseVeoUrl = "https://veo3.studio/api";
    this.supabaseUrl = "https://cmqnphdipomuuwsplfgv.supabase.co/auth/v1/otp";
    this.supabaseRestUrl = "https://cmqnphdipomuuwsplfgv.supabase.co/rest/v1";
    this.apiKey = SUPABASE_ANON_KEY;

    this.email = null;
    this.accessToken = null;
    this.refreshToken = null;
    this.userId = null;
    this.codeVerifier = null;

    this.cookieJar = new CookieJar();
    if (cookiesString) {
      this.cookieJar.setCookieSync(cookiesString, "https://veo3.studio");
    }

    this.axiosInstance = wrapper(axios.create({
      jar: this.cookieJar,
      withCredentials: true,
      timeout: 30_000,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        ...SpoofHead()
      }
    }));

    this.axiosInstance.interceptors.response.use(
      (r) => r,
      (error) => {
        console.error("Request failed:", error.message);
        if (error.response) {
          console.error("Response status:", error.response.status);
          console.error("Response data:", error.response.data);
        }
        throw error;
      }
    );
  }

  generateCodeVerifier() {
    return crypto.randomBytes(32).toString("base64url");
  }
  generateCodeChallenge(verifier) {
    return crypto.createHash("sha256").update(verifier).digest("base64url");
  }

  async createTempMail() {
    const r = await this.axiosInstance.get(`${this.baseTempMailUrl}?action=create`);
    this.email = r.data.email;
    return this.email;
  }

  async requestOTP(email) {
    this.email = email || this.email;
    if (!this.email) throw new Error("Email belum dibuat");
    this.codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(this.codeVerifier);

    await this.axiosInstance.post(this.supabaseUrl, {
      email: this.email,
      data: {},
      create_user: true,
      gotrue_meta_security: {},
      code_challenge: codeChallenge,
      code_challenge_method: "s256"
    }, {
      headers: {
        apikey: this.apiKey,
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json;charset=UTF-8",
        origin: "https://veo3.studio",
        referer: "https://veo3.studio/",
        "x-client-info": "supabase-ssr/0.6.1 createBrowserClient",
        "x-supabase-api-version": "2024-01-01",
        ...SpoofHead()
      }
    });

    this.cookieJar.setCookieSync(
      `sb-cmqnphdipomuuwsplfgv-auth-token-code-verifier=base64-"${Buffer.from(this.codeVerifier).toString("base64")}"; Path=/; Domain=veo3.studio`,
      "https://veo3.studio"
    );

    const cookies = await this.cookieJar.getCookieString("https://veo3.studio");
    return { email: this.email, codeVerifier: this.codeVerifier, cookies };
  }

  async verifyOTP({ email, otp }) {
    if (!email) throw new Error("Email wajib");
    this.email = email;

    await this.axiosInstance.post(`${this.baseVeoUrl}/auth/verificationCode`, {
      email: this.email,
      verificationCode: otp
    }, {
      headers: {
        "content-type": "application/json",
        origin: "https://veo3.studio",
        referer: "https://veo3.studio/create",
        ...SpoofHead()
      }
    });

    const cookies = await this.cookieJar.getCookies("https://veo3.studio");
    const authCookie = cookies.find(c => c.key === "sb-cmqnphdipomuuwsplfgv-auth-token");
    if (!authCookie) throw new Error("Auth cookie tidak ditemukan setelah verifikasi OTP");

    const decoded = JSON.parse(Buffer.from(authCookie.value.replace("base64-", ""), "base64").toString("utf8"));
    this.accessToken = decoded.access_token;
    this.refreshToken = decoded.refresh_token;
    this.userId = decoded.user?.id;

    try {
      await this.axiosInstance.patch(`${this.supabaseRestUrl}/profiles?id=eq.${this.userId}`, { free_credits: 200 }, {
        headers: {
          apikey: this.apiKey,
          authorization: `Bearer ${this.accessToken}`,
          "content-profile": "public",
          "content-type": "application/json",
          origin: "https://veo3.studio",
          "x-client-info": "supabase-ssr/0.6.1 createBrowserClient",
          ...SpoofHead()
        }
      });
    } catch (_) {}

    const cookiesString = await this.cookieJar.getCookieString("https://veo3.studio");

    return {
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
      userId: this.userId,
      cookies: cookiesString
    };
  }

  async txt2vid({ prompt, aspect_ratio = "9:16", model = "fast", is_private = false, session }) {
    if (!session?.accessToken || !session?.userId || !session?.cookies) {
      throw new Error("veo_session tidak valid");
    }

    this.cookieJar.setCookieSync(session.cookies, "https://veo3.studio");
    this.accessToken = session.accessToken;
    this.userId = session.userId;

    const requestData = {
      model,
      generation_type: "text-to-video",
      image_urls: [],
      watermark: "",
      prompt,
      aspect_ratio,
      user_id: this.userId,
      is_private
    };

    await this.axiosInstance.post(`${this.baseVeoUrl}/create/damo`, JSON.stringify(requestData), {
      headers: {
        "content-type": "application/json",
        origin: "https://veo3.studio",
        referer: "https://veo3.studio/create",
        ...SpoofHead()
      }
    });

    const base64 = Buffer.from(JSON.stringify({
      userid: this.userId,
      cookies: await this.cookieJar.getCookieString("https://veo3.studio")
    })).toString("base64");

    const { uuid } = await Encoder.enc({ data: { base64 }, method: "combined" });
    return { task_id: uuid };
  }

  async status({ task_id }) {
    if (!task_id) throw new Error("task_id wajib");
    const decrypted = await Encoder.dec({ uuid: task_id, method: "combined" });
    const textObj = decrypted?.text ?? decrypted;
    const { base64 } = textObj;
    if (!base64) throw new Error("Invalid task_id: Missing base64 payload");

    const payload = JSON.parse(Buffer.from(base64, "base64").toString("utf8"));
    const { userid, cookies } = payload;

    const jar = new CookieJar();
    if (cookies) jar.setCookieSync(cookies, "https://veo3.studio");
    const ax = wrapper(axios.create({ jar, withCredentials: true, timeout: 30_000 }));

    const r = await ax.get(`${this.baseVeoUrl}/create/damo/recent-video?user_id=${userid}`, {
      headers: { referer: "https://veo3.studio/create", ...SpoofHead() }
    });
    return r.data;
  }
}
