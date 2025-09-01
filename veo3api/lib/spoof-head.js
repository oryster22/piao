export default function SpoofHead() {
  return { "x-forwarded-for": "127.0.0.1" };
}
