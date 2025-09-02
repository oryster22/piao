/**
 * Simple encoder/decoder to mimic the expected interface.
 * You should replace this with your real implementation if needed.
 */
class Encoder {
  static async enc(payload) {
    const text = JSON.stringify(payload);
    const uuid = Buffer.from(text, "utf8").toString("base64url");
    return { uuid };
  }
  static async dec({ uuid }) {
    const text = Buffer.from(uuid, "base64url").toString("utf8");
    return { text: JSON.parse(text) };
  }
}
export default Encoder;
