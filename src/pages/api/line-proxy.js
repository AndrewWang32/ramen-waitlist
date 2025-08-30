export const config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", c => data += c);
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("OK");

  const raw = await readRawBody(req);
  const url = process.env.GAS_EXEC_URL;
  if (url) {
    try {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: raw,
        redirect: "follow",
      });
    } catch (e) {
      // 不中斷回覆給 LINE；錯誤可看 Vercel Logs
    }
  }
  return res.status(200).send("OK");
}
