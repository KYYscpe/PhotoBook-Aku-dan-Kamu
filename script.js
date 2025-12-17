// ====== Personalize (ubah yang ini biar makin "kita") ======
const CONFIG = {
  herName: "Sayang",
  fromName: "Aku",
  sinceDate: "2025-01-01", // GANTI: tanggal mulai dekat/jadian (YYYY-MM-DD)
  reasons: [
    "karena kamu selalu bikin aku tenang.",
    "karena kamu perhatian banget, meski kadang kamu nggak sadar.",
    "karena kamu cantik… tapi yang paling bikin aku jatuh: hatimu.",
    "karena kamu bikin aku pengin jadi lebih baik.",
    "karena kamu itu rumah, bukan sekadar tempat singgah."
  ]
};

// ====== Helpers ======
const $ = (q, el=document) => el.querySelector(q);
const $$ = (q, el=document) => [...el.querySelectorAll(q)];

function daysSince(dateStr){
  const start = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const ms = now.getTime() - start.getTime();
  const days = Math.floor(ms / (1000*60*60*24));
  return Math.max(0, days);
}

// ====== Fill names/dates ======
$("#herName").textContent = CONFIG.herName;
$("#toName").textContent = CONFIG.herName;
$("#fromName").textContent = CONFIG.fromName;
$("#signName").textContent = CONFIG.fromName;

const d = daysSince(CONFIG.sinceDate);
$("#sinceText").textContent = `${d} hari yang aku syukuri`;

// rotating reasons
let reasonIdx = 0;
setInterval(() => {
  reasonIdx = (reasonIdx + 1) % CONFIG.reasons.length;
  $("#reasonText").animate([{opacity:.5, transform:"translateY(2px)"}, {opacity:1, transform:"translateY(0)"}], {duration:420, easing:"ease-out"});
  $("#reasonText").textContent = CONFIG.reasons[reasonIdx];
}, 3200);

// ====== Reveal on scroll ======
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if(e.isIntersecting) e.target.classList.add("show");
  });
}, {threshold: 0.12});

$$(".reveal").forEach(el => io.observe(el));

// ====== Floating hearts ======
const hearts = $("#hearts");
function spawnHeart(x, y){
  const h = document.createElement("div");
  h.className = "heart";
  h.textContent = Math.random() > 0.5 ? "💗" : "💙";
  h.style.left = `${x}px`;
  h.style.top = `${y}px`;
  h.style.filter = `drop-shadow(0 14px 30px rgba(255,79,216,.18))`;
  hearts.appendChild(h);

  h.addEventListener("animationend", () => h.remove());
}

$("#btnHearts").addEventListener("click", () => {
  const rect = $("#btnHearts").getBoundingClientRect();
  const cx = rect.left + rect.width/2;
  const cy = rect.top + rect.height/2;

  for(let i=0;i<16;i++){
    setTimeout(() => {
      spawnHeart(cx + (Math.random()*120-60), cy + (Math.random()*30-15));
    }, i*35);
  }
});

// click anywhere for subtle hearts
window.addEventListener("pointerdown", (e) => {
  if(e.target.closest(".lightbox")) return;
  if(e.target.closest("button") || e.target.closest("a")) return;
  if(Math.random() < 0.5) spawnHeart(e.clientX, e.clientY);
});

// ====== Letter open/close ======
const body = $("#letterBody");
const openBtn = $("#openLetter");
const closeBtn = $("#closeLetter");

openBtn.addEventListener("click", () => {
  body.removeAttribute("aria-hidden");
  body.animate(
    [{opacity:0, transform:"translateY(8px)"},{opacity:1, transform:"translateY(0)"}],
    {duration:520, easing:"ease-out"}
  );
  openBtn.disabled = true;
  closeBtn.disabled = false;
});

closeBtn.addEventListener("click", () => {
  body.setAttribute("aria-hidden","true");
  openBtn.disabled = false;
  closeBtn.disabled = true;
});

// ====== Gallery lightbox ======
const lb = $("#lightbox");
const lbImg = $("#lbImg");
const lbClose = $("#lbClose");

$$(".gitem").forEach(btn => {
  btn.addEventListener("click", () => {
    const src = btn.getAttribute("data-full");
    lbImg.src = src;
    lb.classList.add("show");
    lb.setAttribute("aria-hidden","false");
  });
});

function closeLightbox(){
  lb.classList.remove("show");
  lb.setAttribute("aria-hidden","true");
  lbImg.src = "";
}
lbClose.addEventListener("click", closeLightbox);
lb.addEventListener("click", (e) => {
  if(e.target === lb) closeLightbox();
});
window.addEventListener("keydown", (e) => {
  if(e.key === "Escape") closeLightbox();
});

// ====== Glow mode toggle ======
$("#toggleMode").addEventListener("click", () => {
  document.body.classList.toggle("glow");
});

// ====== Canvas stars/particles (pink + sky) ======
const canvas = document.getElementById("sky");
const ctx = canvas.getContext("2d", { alpha: true });

function resize(){
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
window.addEventListener("resize", resize);
resize();

const dots = [];
const DOTS = Math.min(120, Math.floor((window.innerWidth * window.innerHeight) / 14000));

function rand(min,max){ return Math.random()*(max-min)+min; }

for(let i=0;i<DOTS;i++){
  dots.push({
    x: rand(0, window.innerWidth),
    y: rand(0, window.innerHeight),
    r: rand(0.6, 1.8),
    vx: rand(-0.18, 0.18),
    vy: rand(-0.14, 0.14),
    tw: rand(0, Math.PI*2),
    hue: Math.random() > .5 ? "pink" : "sky"
  });
}

function draw(){
  ctx.clearRect(0,0,window.innerWidth, window.innerHeight);

  // soft gradient fog
  const g = ctx.createRadialGradient(window.innerWidth*0.2, window.innerHeight*0.15, 20, window.innerWidth*0.2, window.innerHeight*0.15, Math.max(window.innerWidth, window.innerHeight));
  g.addColorStop(0, "rgba(255,79,216,0.10)");
  g.addColorStop(0.55, "rgba(79,215,255,0.08)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0,0,window.innerWidth, window.innerHeight);

  // dots
  for(const p of dots){
    p.x += p.vx; p.y += p.vy;
    if(p.x < -20) p.x = window.innerWidth+20;
    if(p.x > window.innerWidth+20) p.x = -20;
    if(p.y < -20) p.y = window.innerHeight+20;
    if(p.y > window.innerHeight+20) p.y = -20;

    p.tw += 0.02;
    const a = 0.25 + (Math.sin(p.tw)+1)*0.18;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
    ctx.fillStyle = p.hue === "pink" ? `rgba(255,79,216,${a})` : `rgba(79,215,255,${a})`;
    ctx.fill();
  }

  // connecting lines (nearby)
  for(let i=0;i<dots.length;i++){
    for(let j=i+1;j<dots.length;j++){
      const a = dots[i], b = dots[j];
      const dx = a.x - b.x, dy = a.y - b.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if(dist < 120){
        const alpha = (1 - dist/120) * 0.18;
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x,a.y);
        ctx.lineTo(b.x,b.y);
        ctx.stroke();
      }
    }
  }

  requestAnimationFrame(draw);
}
draw();
