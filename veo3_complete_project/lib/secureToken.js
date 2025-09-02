import crypto from "crypto";
const ALG="sha256";
export function sign(obj, secret){
  if(!secret) throw new Error("ENV VEO_SESSION_SECRET belum di-set");
  const payload=Buffer.from(JSON.stringify(obj)).toString("base64url");
  const sig=crypto.createHmac(ALG, secret).update(payload).digest("base64url");
  return payload+"."+sig;
}
export function verify(token, secret){
  if(!secret) throw new Error("ENV VEO_SESSION_SECRET belum di-set");
  const [payload,sig]=token.split(".");
  if(!payload||!sig) throw new Error("Invalid token format");
  const expect=crypto.createHmac(ALG, secret).update(payload).digest("base64url");
  if(!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expect))) throw new Error("Invalid token signature");
  return JSON.parse(Buffer.from(payload,"base64url").toString("utf8"));
}
