// Vercel Proxy for LINE Webhook → forwards raw POST body to GAS /exec
// Returns 200 to LINE immediately (so Verify 一定過)

import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";

export const config = { api: { bodyParser: false } };

// -- 可選：驗簽（更安全）。沒設 LINE_CHANNEL_SECRET 就略過驗簽。
function verifySignature(raw: string, signature: string | null): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret || !signature) return true; // 未設定就放行（原型用）
  const hmac = crypto.createHmac("sha256", secret).update(raw).digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
  } catch {
    return false;
  }
}

function readRawBody(req: NextApiRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(200).send("OK");

  const raw = await readRawBody(req);
  const okSig = verifySignature(raw, (req.headers["x-line-signature"] as string) || null);
  // 原型：就算驗簽失敗也回 200，避免 LINE 停用，但不轉發
  if (!okSig) return res.status(200).send("OK");

  const gasExecUrl = process.env.GAS_EXEC_URL;
  if (!gasExecUrl) return res.status(500).send("Missing GAS_EXEC_URL");

  // 轉送到 GAS /exec；讓 fetch 跟隨 302 → googleusercontent
  try {
    await fetch(gasExecUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: raw,
      redirect: "follow",
    });
  } catch {
    // 不中斷回覆給 LINE；錯誤你可在 Vercel Logs 查看
  }

  return res.status(200).send("OK");
}