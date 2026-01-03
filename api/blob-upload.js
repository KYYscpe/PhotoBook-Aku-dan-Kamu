// api/blob-upload.js
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

  let body;
  try { body = await readJson(req); }
  catch {
    res.statusCode = 400;
    res.setHeader("content-type","application/json");
    res.end(JSON.stringify({ error:"invalid_json" }));
    return;
  }

  let handleUpload;
  try{
    ({ handleUpload } = await import("@vercel/blob/client"));
  } catch (e){
    res.statusCode = 500;
    res.setHeader("content-type","application/json");
    res.end(JSON.stringify({ error:"blob_import_failed", detail:String(e && e.message ? e.message : e) }));
    return;
  }

  try{
    const result = await handleUpload({
      request: req,
      body,
      onBeforeGenerateToken: async (_pathname, clientPayload, _multipart) => {
        return {
          allowedContentTypes: ["*/*"],
          maximumSizeInBytes: 5 * 1024 * 1024 * 1024 * 1024,
          tokenPayload: clientPayload ?? null
        };
      },
      onUploadCompleted: async () => {}
    });

    res.statusCode = 200;
    res.setHeader("content-type","application/json");
    res.end(JSON.stringify(result));
  } catch (e){
    res.statusCode = 500;
    res.setHeader("content-type","application/json");
    res.end(JSON.stringify({ error:"blob_handle_upload_failed", detail:String(e && e.message ? e.message : e) }));
  }
};
