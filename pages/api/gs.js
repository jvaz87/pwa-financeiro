export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ ok:false, error:"Method not allowed" });

    const url = process.env.GS_API_URL;      // URL do Apps Script /exec
    const token = process.env.GS_API_TOKEN; // token secreto
    if (!url || !token) return res.status(500).json({ ok:false, error:"Missing env vars" });

    const { action, data } = req.body || {};
    const payload = { token, action, data };

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const json = await r.json().catch(() => ({}));
    return res.status(r.status).json(json);

  } catch (e) {
    return res.status(500).json({ ok:false, error: String(e?.message || e) });
  }
}
