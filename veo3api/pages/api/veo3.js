import axios from "axios";
import tough from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";
import crypto from "crypto";

import apiConfig from "@/configs/apiConfig";
import encoder from "@/lib/encoder";
import SpoofHead from "@/lib/spoof-head";

// SAFE VERSION (tanpa OTP/claimCredits)
class Veo3Service {
  constructor() {
    this.cookieJar = new tough.CookieJar();
    this.axiosInstance = wrapper(axios.create({
      jar: this.cookieJar,
      withCredentials: true,
      headers: { ...SpoofHead() }
    }));
    this.baseVeoUrl = "https://veo3.studio/api";
  }

  async enc({ base64 }) {
    return crypto.createHash("sha256").update(base64).digest("hex");
  }

  async txt2vid({ prompt, model="fast", aspect_ratio="9:16", is_private=false, accessToken, userId }) {
    if (!accessToken || !userId) throw new Error("Missing token/userId");
    const encryptData = Buffer.from(JSON.stringify({ token: accessToken, userid: userId })).toString("base64");
    const requestData = JSON.stringify({ model, generation_type:"text-to-video", prompt, aspect_ratio, user_id:userId, is_private });
    await this.axiosInstance.post(`${this.baseVeoUrl}/create/damo`, requestData, { headers:{"content-type":"application/json"} });
    const task_id = await this.enc({ base64: encryptData });
    return { task_id };
  }

  async getStatus(task_id) {
    return { task_id, status:"processing" };
  }
}

export default async function handler(req, res) {
  const { action, prompt, accessToken, userId, task_id } = req.body || req.query;
  const veo3 = new Veo3Service();
  try {
    if (action === "txt2vid") {
      res.json(await veo3.txt2vid({ prompt, accessToken, userId }));
    } else if (action === "status") {
      res.json(await veo3.getStatus(task_id));
    } else {
      res.status(400).json({ error: "Invalid action" });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
