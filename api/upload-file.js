// api/upload-file.js
function readRaw(req){
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

module.exports = async (req, res) => {
  if (req.method !== "POST"){
    res.statusCode = 405;
    res.setHeader("content-type","application/json");
    res.end(JSON.stringify({ error:"method_not_allowed" }));
    return;
  }

  const token = process.env.VERCEL_TOKEN;
  if (!token){
    res.statusCode = 500;
    res.setHeader("content-type","application/json");
    res.end(JSON.stringify({ error:"missing_VERCEL_TOKEN" }));
    return;
  }

  const sha = req.headers["x-vercel-digest"];
  if (!sha || typeof sha !== "string"){
    res.statusCode = 400;
    res.setHeader("content-type","application/json");
    res.end(JSON.stringify({ error:"missing_x-vercel-digest" }));
    return;
  }

  const body = await readRaw(req);

  const qs = new URLSearchParams();
  if (process.env.VERCEL_TEAM_ID) qs.set("teamId", process.env.VERCEL_TEAM_ID);
  if (process.env.VERCEL_TEAM_SLUG) qs.set("slug", process.env.VERCEL_TEAM_SLUG);

  const url = `https://api.vercel.com/v2/files${qs.toString() ? `?${qs}` : ""}`;

  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
      "Content-Length": String(body.length),
      "x-vercel-digest": sha
    },
    body
  });

  const text = await r.text().catch(() => "");
  res.statusCode = r.status;
  res.setHeader("content-type","application/json");
  res.end(text || "{}");
};
