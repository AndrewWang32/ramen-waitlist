import type { NextApiRequest, NextApiResponse } from "next";
export const config = { api: { bodyParser: false } };
function readRawBody(req: NextApiRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ""; req.on("data", c => data += c);
    req.on("end", () => resolve(data)); req.on("error", reject);
  });
}
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(200).send("OK");
  const raw = await readRawBody(req);
  const url = process.env.GAS_EXEC_URL;
  if (url) {
    try {
      await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: raw, redirect: "follow" });
    } catch { /* 忽略轉送錯誤，仍回 200 給 LINE */ }
  }
  return res.status(200).send("OK");
}
