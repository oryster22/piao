// Minimal drop-in replacement so project runs without external encoder
export default {
  async enc({ data }) {
    const payload = { text: data };
    const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return { uuid: b64 };
  },
  async dec({ uuid }) {
    const json = JSON.parse(Buffer.from(uuid, "base64url").toString("utf8"));
    return json; // { text: ... }
  }
};
