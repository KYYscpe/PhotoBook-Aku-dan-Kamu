// api/create-deployment.js
function readJson(req){
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try { resolve(JSON.parse(data || "{}")); }
      catch (e) { reject(e); }
    });
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

  let body;
  try { body = await readJson(req); }
  catch {
    res.statusCode = 400;
    res.setHeader("content-type","application/json");
    res.end(JSON.stringify({ error:"invalid_json" }));
    return;
  }

  const name = (body.name || "").trim();
  const files = Array.isArray(body.files) ? body.files : [];
  if (!name || files.length === 0){
    res.statusCode = 400;
    res.setHeader("content-type","application/json");
    res.end(JSON.stringify({ error:"missing_name_or_files" }));
    return;
  }

  const qs = new URLSearchParams();
  qs.set("skipAutoDetectionConfirmation", "1");
  if (process.env.VERCEL_TEAM_ID) qs.set("teamId", process.env.VERCEL_TEAM_ID);
  if (process.env.VERCEL_TEAM_SLUG) qs.set("slug", process.env.VERCEL_TEAM_SLUG);

  const url = `https://api.vercel.com/v13/deployments?${qs.toString()}`;

  const payload = {
    name,
    files: files.map((f) => ({
      file: String(f.file || "").replace(/^\/+/, ""),
      sha: String(f.sha || ""),
      size: Number(f.size || 0)
    })),
    projectSettings: { framework: null },
    target: "production"
  };

  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type":"application/json"
    },
    body: JSON.stringify(payload)
  });

  const text = await r.text().catch(()=> "");
  res.statusCode = r.status;
  res.setHeader("content-type","application/json");
  res.end(text || "{}");
};
