// app.js
import { upload as blobUpload } from "https://cdn.jsdelivr.net/npm/@vercel/blob@2.0.0/dist/client.js";

const elName = document.getElementById("name");
const elPicker = document.getElementById("picker");
const elPickDir = document.getElementById("pickDir");
const elPicked = document.getElementById("picked");
const elDeploy = document.getElementById("deploy");
const elOut = document.getElementById("out");
const elFileList = document.getElementById("filelist");
const elUrl = document.getElementById("url");

const MEDIA_EXT = new Set([".mp4", ".jpeg", ".jpg", ".png"]);
const TEXT_EXT  = new Set([".html", ".css", ".js"]);

let selected = []; // { rel, file: File }

function log(line){
  elOut.textContent += line + "\n";
  elOut.scrollTop = elOut.scrollHeight;
}
function clearLog(){ elOut.textContent = ""; }
function setResult(url){
  if (!url){ elUrl.textContent=""; elUrl.href="#"; return; }
  const full = url.startsWith("http") ? url : `https://${url}`;
  elUrl.textContent = full;
  elUrl.href = full;
}
function extLower(path){
  const i = path.lastIndexOf(".");
  return i >= 0 ? path.slice(i).toLowerCase() : "";
}
function escapeRegExp(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

function validate(){
  const nameOk = (elName.value || "").trim().length > 0;
  elDeploy.disabled = !(nameOk && selected.length > 0);
}
elName.addEventListener("input", validate);

function renderPicked(){
  if (selected.length === 0){
    elPicked.textContent = "Tidak ada file terbaca.";
    elFileList.textContent = "";
    validate();
    return;
  }
  const total = selected.reduce((a,x)=>a+(x.file.size||0),0);
  elPicked.textContent = `${selected.length} file, total ${(total/(1024*1024)).toFixed(2)} MB`;

  const lines = selected
    .slice(0, 120)
    .map(x => x.rel);
  if (selected.length > 120) lines.push(`... (${selected.length - 120} file lagi)`);

  elFileList.textContent = lines.join("\n");
  validate();
}

async function sha1Hex(arrayBuffer){
  const hash = await crypto.subtle.digest("SHA-1", arrayBuffer);
  const bytes = new Uint8Array(hash);
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

async function vercelUploadRaw(buf, sha){
  const r = await fetch("/api/upload-file", {
    method:"POST",
    headers:{ "x-vercel-digest": sha },
    body: buf
  });
  if (!r.ok){
    const t = await r.text().catch(()=> "");
    throw new Error(`vercel upload gagal: HTTP ${r.status} ${t}`.trim());
  }
}

async function rewriteText(content, map){
  let out = content;

  for (const [rel, url] of map.entries()){
    const base = rel.split("/").pop();
    if (!base) continue;
    out = out.replace(new RegExp(escapeRegExp(base), "g"), url);
  }
  for (const [rel, url] of map.entries()){
    out = out.replace(new RegExp(escapeRegExp(rel), "g"), url);
  }

  return out;
}

async function listDirHandles(dirHandle, prefix=""){
  const items = [];
  for await (const [name, handle] of dirHandle.entries()){
    if (handle.kind === "file"){
      const file = await handle.getFile();
      items.push({ rel: `${prefix}${name}`, file });
    } else if (handle.kind === "directory"){
      const sub = await listDirHandles(handle, `${prefix}${name}/`);
      items.push(...sub);
    }
  }
  return items;
}

elPickDir.addEventListener("click", async () => {
  selected = [];
  renderPicked();

  try{
    if (!window.showDirectoryPicker) throw new Error("Directory Picker tidak tersedia");
    const dir = await window.showDirectoryPicker({ mode:"read" });
    const files = await listDirHandles(dir, "");
    selected = files.filter(x => x.rel && x.file && x.file.size >= 0);
    renderPicked();
  } catch(e){
    elPicked.textContent = `Directory Picker gagal: ${String(e && e.message ? e.message : e)}`;
    validate();
  }
});

elPicker.addEventListener("change", () => {
  const files = Array.from(elPicker.files || []);
  selected = files.map(f => {
    const p = f.webkitRelativePath || f.name;
    const parts = p.split("/").filter(Boolean);
    const rel = (parts.length >= 2) ? parts.slice(1).join("/") : (parts[0] || f.name);
    return { rel, file: f };
  });
  renderPicked();
});

elDeploy.addEventListener("click", async () => {
  clearLog();
  setResult("");

  const name = (elName.value || "").trim();
  if (!name || selected.length === 0) return;

  const hasIndex = selected.some(x => x.rel.toLowerCase() === "index.html");
  if (!hasIndex) log("warning: index.html tidak ditemukan");

  // 1) Upload media ke Blob (client upload) → URL publik
  const blobUrlByRel = new Map();
  const media = selected.filter(x => MEDIA_EXT.has(extLower(x.rel)));

  log(`media: ${media.length}`);
  for (const item of media){
    const rel = item.rel;
    const file = item.file;

    const multipart = file.size >= 50 * 1024 * 1024;
    log(`blob upload: ${rel}`);

    const res = await blobUpload(rel.split("/").pop() || rel, file, {
      access: "public",
      handleUploadUrl: "/api/blob-upload",
      multipart
    });

    blobUrlByRel.set(rel, res.url);
    log(`blob ok: ${rel}`);
  }

  // 2) Rewrite text files (html/css/js) agar referensi media -> Blob URL
  const texts = selected.filter(x => TEXT_EXT.has(extLower(x.rel)));
  log(`text: ${texts.length}`);

  const deployTextFiles = [];
  for (const item of texts){
    const rel = item.rel;
    const raw = await item.file.text();
    const rewritten = await rewriteText(raw, blobUrlByRel);
    deployTextFiles.push({ rel, text: rewritten });
    log(`rewrite ok: ${rel}`);
  }

  // 3) Upload text files ke Vercel /v2/files (pakai SHA1 digest)
  const manifest = [];
  const enc = new TextEncoder();

  for (const item of deployTextFiles){
    const buf = enc.encode(item.text);
    const sha = await sha1Hex(buf.buffer);

    log(`vercel upload: ${item.rel}`);
    await vercelUploadRaw(buf, sha);

    manifest.push({ file: item.rel, sha, size: buf.byteLength });
    log(`vercel ok: ${item.rel}`);
  }

  // 4) Create deployment
  log("create deployment");
  const resp = await fetch("/api/create-deployment", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ name, files: manifest })
  });

  const dataText = await resp.text();
  if (!resp.ok) throw new Error(`create gagal: HTTP ${resp.status} ${dataText}`.trim());

  const data = JSON.parse(dataText || "{}");
  if (!data.url) throw new Error("create gagal: response tanpa url");

  log(`url: ${data.url}`);
  setResult(data.url);
});
