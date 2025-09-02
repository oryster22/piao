export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    message: "Veo3 API is running",
    endpoints: {
      start_auth: "/api/veo3/start_auth",
      verify_otp: "/api/veo3/verify_otp",
      txt2vid: "/api/veo3/txt2vid",
      status: "/api/veo3/status"
    }
  });
}
