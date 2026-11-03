/* Blue Psych: NUKE 'EM. The 4-question fuelling challenge, the LAUNCH button,
   the air-raid siren and the bank-vault cutscene. Loaded only when needed. */
(function(){
"use strict";
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const BASE = (document.currentScript && document.currentScript.src) ? document.currentScript.src.replace(/nuke\.js.*$/, "") : "../blue/";

/* ---------- sound ---------- */
let AC = null;
function ac(){ if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (AC && AC.state !== "running") { try { AC.resume(); } catch (e) {} } return AC; }
function tone(f, start, dur, type = "sine", vol = .2, f2){
  const a = ac(); if (!a) return;
  const t = a.currentTime + start, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + .05);
}
function noise(start, dur, vol = .3, filt = 1200){
  const a = ac(); if (!a) return;
  const t = a.currentTime + start, n = Math.floor(a.sampleRate * dur), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  s.buffer = b; f.type = "lowpass"; f.frequency.value = filt; g.gain.value = vol; s.connect(f).connect(g).connect(a.destination); s.start(t);
}
/* the real siren recording (your mp3), with a generated wail as a backup */
function siren(seconds, vol = .9){
  let au = null, fade = null, stopped = false;
  try { au = new Audio(BASE + "siren.mp3"); au.volume = vol; } catch (e) {}
  let backup = null;
  const p = au ? au.play() : Promise.reject();
  Promise.resolve(p).catch(() => { if (!stopped) backup = synthSiren(seconds); });
  const stop = () => {
    if (stopped) return; stopped = true; if (backup) backup();
    if (au) { clearInterval(fade); fade = setInterval(() => { try { au.volume = Math.max(0, au.volume - .08); } catch (e) {} if (au.volume <= 0.01) { clearInterval(fade); au.pause(); } }, 60); setTimeout(() => { clearInterval(fade); try { au.pause(); } catch (e) {} }, 700); }
  };
  setTimeout(stop, seconds * 1000);
  return stop;
}
/* generated air-raid wail (only used if the recording can't play) */
function synthSiren(seconds, vol = .16){
  const a = ac(); if (!a) return () => {};
  const t0 = a.currentTime, g = a.createGain(), lp = a.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = 2200; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + .6);
  const oscs = [0, 4].map(det => { const o = a.createOscillator(); o.type = "sawtooth"; o.detune.value = det; o.connect(lp); return o; });
  lp.connect(g).connect(a.destination);
  const cyc = 3.6;
  oscs.forEach(o => {
    o.frequency.setValueAtTime(330, t0);
    for (let t = 0; t < seconds; t += cyc) { o.frequency.linearRampToValueAtTime(880, t0 + t + cyc * .55); o.frequency.linearRampToValueAtTime(330, t0 + t + cyc); }
    o.start(t0); o.stop(t0 + seconds + .1);
  });
  g.gain.setValueAtTime(vol, t0 + seconds - .8); g.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
  let stopped = false;
  return () => { if (stopped) return; stopped = true; try { const n = a.currentTime; g.gain.cancelScheduledValues(n); g.gain.setValueAtTime(g.gain.value || vol, n); g.gain.exponentialRampToValueAtTime(0.0001, n + .5); oscs.forEach(o => o.stop(n + .6)); } catch (e) {} };
}
const boom = () => { noise(0, 2.2, .9, 380); noise(0, .5, .6, 4000); tone(70, 0, 1.6, "sine", .5, 28); tone(140, 0, .8, "sawtooth", .2, 40); };
const zap = () => { noise(0, .06, .12, 6000); tone(60, 0, .08, "square", .05); };

/* ---------- styles ---------- */
const css = `
#nk{position:fixed; inset:0; z-index:90; background:#03081A; color:#FFF; overflow:hidden; font-family:"Nunito",system-ui,sans-serif; font-weight:800}
#nk .nk-c{position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:16px; text-align:center}
#nk h1{font-family:"Bungee","Arial Black",sans-serif; font-weight:400; margin:6px 0; line-height:1.05}
#nk .splash{max-width:min(96vw,900px); max-height:62vh; border-radius:16px; box-shadow:0 0 0 4px #FFD400, 0 20px 60px rgba(0,0,0,.6); animation:nkpop .5s cubic-bezier(.2,1.4,.4,1) both}
@keyframes nkpop{from{transform:scale(.5); opacity:0}}
#nk .go{margin-top:18px; border:0; border-radius:18px; padding:16px 26px; font:900 1.25rem "Nunito",sans-serif; background:#FFD400; color:#1A0A00; box-shadow:0 6px 0 #8A6A00; animation:nkpulse 1s infinite}
@keyframes nkpulse{50%{transform:scale(1.05)}}
#nk .rules{color:#FFD9A8; margin-top:8px}
#nk .grid{display:grid; grid-template-columns:90px 1fr 90px; gap:12px; width:min(100%,900px); align-items:center}
@media (max-width:620px){ #nk .grid{grid-template-columns:70px 1fr 70px; gap:6px} }
#nk .q{background:#10204A; border-radius:18px; padding:14px; text-align:left}
#nk .q .t{font-weight:900; font-size:1.1rem; margin:0 0 10px}
#nk .q button{display:block; width:100%; margin:8px 0; text-align:left; border:3px solid #2A4B9A; background:#173070; color:#FFF; border-radius:14px; padding:12px; font:800 1rem "Nunito",sans-serif}
#nk .q button.right{border-color:#4BE39A; background:#14583E} #nk .q button.wrong{border-color:#FF5A5A; background:#6A1A2A}
#nk .cnt{font-family:"Bungee","Arial Black",sans-serif; font-size:1.6rem; color:#FFD400}
#nk .fail{color:#FF4D4D; font-size:clamp(2rem,9vw,4.5rem); animation:nkshake .5s}
@keyframes nkshake{20%,60%{transform:translateX(-12px)} 40%,80%{transform:translateX(12px)}}
#nk .steam{position:absolute; border-radius:50%; background:rgba(235,240,255,.85); animation:nksteam 1.4s ease-out infinite; pointer-events:none}
@keyframes nksteam{from{transform:translate(0,0) scale(.4); opacity:.9} to{transform:translate(var(--dx),-10px) scale(1.8); opacity:0}}
#nk .lbtn{width:min(62vw,260px); aspect-ratio:1; border-radius:50%; border:0; background:radial-gradient(circle at 35% 30%, #FF8A8A, #E00000 45%, #7A0000); color:#FFF;
  font-family:"Bungee","Arial Black",sans-serif; font-size:clamp(1.8rem,7vw,2.8rem); letter-spacing:.04em; text-shadow:0 3px 0 #500;
  box-shadow:0 18px 0 #4A0000, 0 22px 40px rgba(0,0,0,.6), inset 0 -10px 20px rgba(0,0,0,.35); transition:transform .12s, box-shadow .12s; animation:nkpulse 1.2s infinite}
#nk .lbtn.down{transform:translateY(16px) scale(.97); box-shadow:0 2px 0 #4A0000, 0 6px 14px rgba(0,0,0,.6), inset 0 6px 20px rgba(0,0,0,.5); background:radial-gradient(circle at 35% 30%, #D86060, #A00000 45%, #500000); animation:none}
#nk .lring{padding:18px; border-radius:50%; background:repeating-linear-gradient(45deg,#FFD400 0 14px,#1A1A1A 14px 28px); box-shadow:0 10px 30px rgba(0,0,0,.6)}
#nk canvas{position:absolute; inset:0}
#nk .msg{position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:16px; background:rgba(0,0,0,.45); animation:nkfade .6s both}
#nk .msg h1{font-size:clamp(2rem,8vw,5rem); color:#FFD400; text-shadow:4px 4px 0 #B00000, 8px 8px 0 #000}
#nk .msg p{font-size:clamp(1.1rem,4vw,1.8rem); margin:10px 0}
@keyframes nkfade{from{opacity:0}}
`;
function mount(){
  if (!document.getElementById("nk-css")) { const s = document.createElement("style"); s.id = "nk-css"; s.textContent = css; document.head.appendChild(s); }
  let el = document.getElementById("nk"); if (el) el.remove();
  el = document.createElement("div"); el.id = "nk"; document.body.appendChild(el); return el;
}

/* ---------- drawings ---------- */
function rocketSVG(fuel, big){
  // fuel: 0..4 quarters, filled from the bottom
  const seg = [0, 1, 2, 3].map(i => {
    const y = 150 - i * 25;
    return `<rect x="38" y="${y}" width="44" height="23" rx="3" fill="${i < fuel ? "#E01818" : "#DDE3EE"}" stroke="#7A8496" stroke-width="2">${i === fuel - 1 ? `<animate attributeName="fill" values="#FFD400;#E01818" dur=".5s" fill="freeze"/>` : ""}</rect>`;
  }).join("");
  return `<svg viewBox="0 0 120 230" width="${big ? 200 : 86}" style="overflow:visible; display:block; margin:auto">
    <path d="M60 6 C40 30 36 56 36 76 L84 76 C84 56 80 30 60 6Z" fill="#E01818" stroke="#7A1010" stroke-width="2"/>
    <rect x="36" y="74" width="48" height="104" fill="#F4F6FA" stroke="#7A8496" stroke-width="2"/>${seg}
    <circle cx="60" cy="56" r="9" fill="#FFD400" stroke="#333" stroke-width="2"/><path d="M60 50 l3 6 h-6z M54 60 h12" stroke="#333" stroke-width="2" fill="none"/>
    <path d="M36 140 L16 182 L36 176Z M84 140 L104 182 L84 176Z" fill="#B01010" stroke="#5A0808" stroke-width="2"/>
    <rect x="44" y="178" width="32" height="10" fill="#555"/>
    <rect x="6" y="196" width="108" height="14" rx="3" fill="#5C6475"/><rect x="18" y="186" width="10" height="12" fill="#3E4452"/><rect x="92" y="186" width="10" height="12" fill="#3E4452"/>
    <path d="M6 210 L-8 228 M114 210 L128 228" stroke="#3E4452" stroke-width="6"/>
  </svg>`;
}
function steamHTML(n){ return Array.from({length: n}, (_, i) => `<span class="steam" style="left:${42 + (i % 2 ? 8 : -8) + (Math.random() * 14 - 7)}%; bottom:${8 + Math.random() * 6}%; width:${18 + Math.random() * 16}px; height:${18 + Math.random() * 16}px; --dx:${(i % 2 ? 1 : -1) * (20 + Math.random() * 40)}px; animation-delay:${(i * .17).toFixed(2)}s"></span>`).join(""); }
function hourglassSVG(frac){
  // frac = time left 0..1
  const top = 10 + (1 - frac) * 50, bot = 120 - frac * 50 + 10;
  return `<svg viewBox="0 0 80 140" width="70" style="display:block; margin:auto">
    <rect x="6" y="2" width="68" height="8" rx="3" fill="#8A5A2B"/><rect x="6" y="130" width="68" height="8" rx="3" fill="#8A5A2B"/>
    <path d="M14 10 Q14 52 40 70 Q66 52 66 10Z M14 130 Q14 88 40 70 Q66 88 66 130Z" fill="rgba(200,230,255,.25)" stroke="#BFD8FF" stroke-width="2.5"/>
    <clipPath id="hgT"><path d="M14 10 Q14 52 40 70 Q66 52 66 10Z"/></clipPath><clipPath id="hgB"><path d="M14 130 Q14 88 40 70 Q66 88 66 130Z"/></clipPath>
    <rect x="0" y="${top}" width="80" height="${70 - top}" fill="#F2C14E" clip-path="url(#hgT)"/>
    <rect x="0" y="${Math.min(130, bot)}" width="80" height="130" fill="#F2C14E" clip-path="url(#hgB)"/>
    ${frac > 0 ? `<rect x="39" y="68" width="2" height="${Math.max(0, Math.min(130, bot) - 68)}" fill="#F2C14E"/>` : ""}
  </svg>`;
}

/* ---------- 1. the fuelling challenge (only on the player who landed NUKE) ---------- */
async function challenge(opts){
  let launched = false;
  const wrapped = Object.assign({}, opts, {onLaunch: async () => { launched = true; return opts.onLaunch(); }});
  try { return await challengeInner(wrapped); }
  catch (e) { const el = document.getElementById("nk"); if (el) el.remove(); return launched; }
}
async function challengeInner({questions, onLaunch}){
  const el = mount();
  ac(); tone(196, 0, .5, "sawtooth", .15); tone(147, .4, .9, "sawtooth", .15);
  // splash
  await new Promise(res => {
    el.innerHTML = `<div class="nk-c"><img class="splash" src="${BASE}nuke-splash.jpg" alt="You have the chance to nuke everyone's coins!">
      <p class="rules">Answer <b>4 questions in 20 seconds</b> to fuel the missile. <b>One mistake</b> and it's over.</p>
      <button class="go" id="nkgo">☢️ I'M READY</button></div>`;
    el.querySelector("#nkgo").onclick = res;
  });
  // questions
  const qs = questions.slice(0, 4), LIMIT = 20000, t0 = performance.now();
  let fuel = 0, over = false;
  el.innerHTML = `<div class="nk-c"><h1 style="font-size:clamp(1.3rem,5vw,2.2rem); color:#FFD400">FUEL THE MISSILE!</h1>
    <div class="grid"><div><div id="hg">${hourglassSVG(1)}</div><div class="cnt" id="cnt">20</div></div>
      <div class="q" id="q"></div>
      <div style="position:relative"><div id="rk">${rocketSVG(0)}</div><div id="st">${steamHTML(6)}</div><div class="cnt" id="fu">0/4</div></div></div></div>`;
  const timer = setInterval(() => {
    const left = Math.max(0, LIMIT - (performance.now() - t0));
    const hg = el.querySelector("#hg"), cn = el.querySelector("#cnt");
    if (hg) hg.innerHTML = hourglassSVG(left / LIMIT);
    if (cn) { const s = Math.ceil(left / 1000); if (cn.textContent !== String(s)) { cn.textContent = s; if (s <= 5) tone(1500, 0, .05, "square", .08); } }
    if (left <= 0 && !over) { over = true; failRes("TIME'S UP!"); }
  }, 100);
  let failRes;
  const result = await new Promise(res => {
    failRes = async why => { clearInterval(timer); tone(400, 0, .8, "sawtooth", .15, 80); noise(0, .6, .3, 900);
      const st = el.querySelector("#st"); if (st) st.innerHTML = "";
      await sleep(900);
      el.innerHTML = `<div class="nk-c"><div style="font-size:5rem">💨</div><h1 class="fail">MISSION FAILED</h1><p style="font-size:1.2rem">${esc(why)} The missile fizzled out.</p></div>`;
      await sleep(2300); res(false); };
    const ask = i => {
      const [topic, text, opts, ans] = qs[i], order = shuffle([0, 1, 2, 3]);
      const box = el.querySelector("#q");
      box.innerHTML = `<p class="t">${i + 1}/4 · ${esc(text)}</p>${order.map((o, j) => `<button data-j="${j}">${"ABCD"[j]}. ${esc(opts[o])}</button>`).join("")}`;
      box.querySelectorAll("[data-j]").forEach(b => b.onclick = () => {
        if (over) return;
        const j = +b.dataset.j, ok = order[j] === ans;
        box.querySelectorAll("button").forEach((x, k) => { x.disabled = true; if (order[k] === ans) x.classList.add("right"); else if (k === j) x.classList.add("wrong"); });
        if (!ok) { over = true; return failRes("Wrong answer!"); }
        fuel++; el.querySelector("#rk").innerHTML = rocketSVG(fuel); el.querySelector("#fu").textContent = fuel + "/4";
        [523, 659, 784].forEach((f, k) => tone(f + fuel * 60, k * .06, .15, "square", .08));
        if (fuel >= 4) { over = true; clearInterval(timer); return setTimeout(() => res(true), 500); }
        setTimeout(() => ask(i + 1), 350);
      });
    };
    ask(0);
  });
  if (!result) { el.remove(); return false; }
  // launch pad
  await new Promise(res => {
    el.innerHTML = `<div class="nk-c"><h1 style="color:#FFD400; font-size:clamp(1.6rem,6vw,3rem)">FULLY FUELLED!</h1>
      <div style="display:flex; align-items:flex-end; justify-content:center; gap:clamp(12px,6vw,60px); flex-wrap:wrap; margin-top:10px">
        <div style="position:relative" id="bigrk">${rocketSVG(4, true)}${steamHTML(10)}</div>
        <div class="lring"><button class="lbtn" id="launch">LAUNCH</button></div></div></div>`;
    tone(880, 0, .2, "square", .08); tone(1320, .2, .3, "square", .08);
    el.querySelector("#launch").onclick = async e => {
      const b = e.currentTarget; if (b.classList.contains("down")) return;
      b.classList.add("down"); tone(180, 0, .08, "square", .2); noise(0, .05, .3, 3000);
      const stop = siren(7);
      const rk = el.querySelector("#bigrk");
      await sleep(500);
      noise(0, 2, .45, 900); tone(90, 0, 2, "sawtooth", .15, 45);
      rk.insertAdjacentHTML("beforeend", `<div style="position:absolute; left:50%; bottom:2px; transform:translateX(-50%); width:60px; height:90px; background:radial-gradient(ellipse at top, #FFF6A0, #FF8A00 50%, transparent 72%); filter:blur(2px)"></div>`);
      rk.animate([{transform: "translate(0,0)"}, {transform: "translate(-3px,2px)"}, {transform: "translate(3px,-2px)"}, {transform: "translate(0,0)"}], {duration: 120, iterations: 5});
      await sleep(600);
      rk.animate([{transform: "translateY(0)"}, {transform: "translateY(-130vh)"}], {duration: 1500, easing: "cubic-bezier(.5,0,.9,.6)", fill: "forwards"});
      try { await Promise.race([Promise.resolve().then(onLaunch), sleep(3000)]); } catch (err) {}
      await sleep(1600);
      el.innerHTML = `<div class="nk-c"><div style="font-size:5rem">🚀</div><h1 style="font-size:clamp(2rem,8vw,4rem); color:#FFD400">MISSILE AWAY!</h1><p style="font-size:1.2rem">Everyone else is getting nuked right now… 😈</p></div>`;
      await sleep(3200); stop(); res();
    };
  });
  el.remove();
  return true;
}

/* ---------- 2. the cutscene everyone else sees ---------- */
function buildScene(W, H){
  const off = document.createElement("canvas"); off.width = W; off.height = H;
  const c = off.getContext("2d");
  const bw = Math.min(W * .56, 460), bh = Math.min(H * .66, 620), bx = (W - bw) / 2, by = H * .9 - bh;
  // building body
  const g = c.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, "#9C927C"); g.addColorStop(.5, "#E6DCC3"); g.addColorStop(1, "#9C927C");
  c.fillStyle = g; c.fillRect(bx, by + bh * .12, bw, bh * .88);
  // pediment + sign
  c.fillStyle = "#D8CCAE"; c.beginPath(); c.moveTo(bx - 10, by + bh * .13); c.lineTo(bx + bw / 2, by); c.lineTo(bx + bw + 10, by + bh * .13); c.closePath(); c.fill();
  c.fillStyle = "#3A2E18"; c.font = `900 ${Math.round(bw * .08)}px "Bungee","Arial Black",sans-serif`; c.textAlign = "center"; c.textBaseline = "middle";
  c.fillText("BANK", bx + bw / 2, by + bh * .085);
  // windows (lit) in upper floors
  const cols = 5, rows = 4, ww = bw / (cols * 1.7), wh = bh * .07;
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
    const x = bx + bw * .08 + k * (bw * .84 / cols) + (bw * .84 / cols - ww) / 2, y = by + bh * .18 + r * bh * .1;
    const lit = (r * 7 + k * 3) % 5 !== 0;
    c.fillStyle = lit ? "#FFE08A" : "#3A3A50"; c.fillRect(x, y, ww, wh);
    if (lit) { c.fillStyle = "rgba(255,224,138,.25)"; c.fillRect(x - 4, y - 4, ww + 8, wh + 8); }
    c.strokeStyle = "#6E6450"; c.lineWidth = 2; c.strokeRect(x, y, ww, wh);
  }
  // columns on the ground floor
  for (let k = 0; k < 6; k++) { const x = bx + bw * .06 + k * bw * .17; c.fillStyle = "#F2EBDA"; c.fillRect(x, by + bh * .6, bw * .05, bh * .38); c.fillStyle = "#BDB29A"; c.fillRect(x - 3, by + bh * .6, bw * .05 + 6, 6); }
  // vault cutaway
  const vx = bx + bw * .2, vy = by + bh * .64, vw = bw * .6, vh = bh * .32;
  c.fillStyle = "#1E2233"; c.fillRect(vx, vy, vw, vh);
  c.strokeStyle = "#8A93A8"; c.lineWidth = 6; c.strokeRect(vx, vy, vw, vh);
  // open round vault door
  c.fillStyle = "#6F7890"; c.beginPath(); c.arc(vx + vw * .05, vy + vh * .5, vh * .38, 0, 7); c.fill();
  c.fillStyle = "#AEB6C8"; c.beginPath(); c.arc(vx + vw * .05, vy + vh * .5, vh * .26, 0, 7); c.fill();
  // heap of gold
  const coins = [];
  for (let i = 0; i < 90; i++) {
    const u = Math.random(), x = vx + vw * (.25 + u * .65), peak = 1 - Math.abs(u - .5) * 2;
    const y = vy + vh - 6 - Math.random() * vh * .6 * peak;
    coins.push([x, y]);
  }
  coins.sort((a, b) => a[1] - b[1]).forEach(([x, y]) => {
    const r = Math.max(5, vh * .07);
    const cg = c.createRadialGradient(x - r * .3, y - r * .3, 1, x, y, r); cg.addColorStop(0, "#FFF6B0"); cg.addColorStop(.5, "#FFC93C"); cg.addColorStop(1, "#B07A00");
    c.fillStyle = cg; c.beginPath(); c.ellipse(x, y, r, r * .62, 0, 0, 7); c.fill();
  });
  return {off, bx, by, bw, bh, vx, vy, vw, vh};
}
function sky(c, W, H, T, dark){
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, dark ? "#020309" : "#050B26"); g.addColorStop(1, dark ? "#0A0B12" : "#1B2556");
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 70; i++) { const x = (i * 131) % W, y = (i * 67) % (H * .6); c.globalAlpha = (dark ? .25 : .5) + .4 * Math.abs(Math.sin(T * 1.5 + i)); c.fillStyle = "#FFF"; c.fillRect(x, y, 2, 2); }
  c.globalAlpha = 1;
  c.fillStyle = dark ? "#9A9A9A" : "#FFF3C4"; c.beginPath(); c.arc(W * .84, H * .14, Math.min(W, H) * .05, 0, 7); c.fill();
  c.fillStyle = dark ? "#16171E" : "#0E1530"; c.fillRect(0, H * .9, W, H * .1);
}
function cutscene({name, sound = true, getMessage, autoCloseMs = 0, button = "Carry on"}){
  return new Promise(resolve => {
    const el = mount(), dpr = Math.min(2, window.devicePixelRatio || 1);
    const cv = document.createElement("canvas"); el.appendChild(cv);
    const W = innerWidth, H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + "px"; cv.style.height = H + "px";
    const c = cv.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const S = buildScene(W, H);
    const stopSiren = sound ? siren(7) : () => {};
    // tiles for the explosion
    const TC = 16, TR = 22, tw = S.bw / TC, th = S.bh / TR, ix = W / 2, iy = S.by + S.bh * .3;
    let tiles = null, gold = null, smoke = [];
    const t0 = performance.now(); let boomed = false, done = false, lastFlick = 0, flickOn = true;
    const glint = T => { for (let i = 0; i < 6; i++) { const x = S.vx + S.vw * (.3 + ((i * 37) % 60) / 100), y = S.vy + S.vh * (.55 + ((i * 23) % 35) / 100), a = Math.max(0, Math.sin(T * 3 + i * 1.7)); c.globalAlpha = a; c.fillStyle = "#FFF"; c.beginPath(); c.moveTo(x, y - 7); c.lineTo(x + 2, y); c.lineTo(x, y + 7); c.lineTo(x - 2, y); c.closePath(); c.fill(); c.beginPath(); c.moveTo(x - 7, y); c.lineTo(x, y + 2); c.lineTo(x + 7, y); c.lineTo(x, y - 2); c.closePath(); c.fill(); } c.globalAlpha = 1; };
    const spot = () => { [[S.bx - S.bw * .25, 1], [S.bx + S.bw * 1.25, -1]].forEach(([x, d]) => { const g = c.createLinearGradient(x, H, S.bx + S.bw / 2, S.by); g.addColorStop(0, "rgba(255,240,180,.28)"); g.addColorStop(1, "rgba(255,240,180,0)"); c.fillStyle = g; c.beginPath(); c.moveTo(x, H * .9); c.lineTo(S.bx + S.bw / 2 - d * S.bw * .45, S.by); c.lineTo(S.bx + S.bw / 2 + d * S.bw * .05, S.by); c.closePath(); c.fill(); }); };
    function missile(y){
      c.save(); c.translate(ix, y);
      c.fillStyle = "rgba(255,170,40,.9)"; c.beginPath(); c.ellipse(0, -46, 9, 26 + Math.random() * 8, 0, 0, 7); c.fill();
      c.fillStyle = "#F0F2F6"; c.fillRect(-9, -40, 18, 46); c.fillStyle = "#D01010"; c.beginPath(); c.moveTo(-9, 6); c.lineTo(9, 6); c.lineTo(0, 26); c.closePath(); c.fill();
      c.fillStyle = "#7A8496"; c.beginPath(); c.moveTo(-9, -40); c.lineTo(-18, -50); c.lineTo(-9, -28); c.fill(); c.beginPath(); c.moveTo(9, -40); c.lineTo(18, -50); c.lineTo(9, -28); c.fill();
      c.fillStyle = "#FFD400"; c.beginPath(); c.arc(0, -16, 5, 0, 7); c.fill();
      c.restore();
    }
    // pre-drawn ruins: a broken, dark stump of the bank, a toppled vault door and only a few dull coins
    const R = document.createElement("canvas"); R.width = W; R.height = H;
    (function(){
      const c2 = R.getContext("2d"), base = H * .9, steps = 16, pts = [];
      for (let i = 0; i <= steps; i++) pts.push([S.bx + S.bw * i / steps, base - S.bh * (.08 + .26 * Math.abs(Math.sin(i * 1.7 + 1)) * (i % 4 === 1 ? 1.3 : 1))]);
      const g = c2.createLinearGradient(0, base - S.bh * .4, 0, base); g.addColorStop(0, "#2E2B27"); g.addColorStop(1, "#4A443C");
      c2.fillStyle = g; c2.beginPath(); c2.moveTo(S.bx, base); pts.forEach(p => c2.lineTo(p[0], p[1])); c2.lineTo(S.bx + S.bw, base); c2.closePath(); c2.fill();
      c2.strokeStyle = "#1A1815"; c2.lineWidth = 2;
      for (let i = 0; i < 9; i++) { const x = S.bx + S.bw * (.08 + i * .1), y = base - S.bh * .05; c2.beginPath(); c2.moveTo(x, y); c2.lineTo(x + 8, y - 18); c2.lineTo(x - 2, y - 34); c2.stroke(); }
      for (let i = 0; i < 4; i++) { const x = S.bx + S.bw * (.15 + i * .2); c2.fillStyle = "#1C1A17"; c2.fillRect(x, base - S.bh * .17, S.bw * .07, S.bh * .1); }
      // broken column stumps
      for (let k = 0; k < 6; k++) { const x = S.bx + S.bw * .06 + k * S.bw * .17, h = S.bh * (.04 + ((k * 37) % 9) / 100); c2.fillStyle = "#6A645A"; c2.beginPath(); c2.moveTo(x, base); c2.lineTo(x, base - h); c2.lineTo(x + S.bw * .025, base - h - 8); c2.lineTo(x + S.bw * .05, base - h + 3); c2.lineTo(x + S.bw * .05, base); c2.fill(); }
      // toppled vault door
      c2.save(); c2.translate(S.bx + S.bw * .3, base - 10); c2.rotate(-.35); c2.fillStyle = "#4D5466"; c2.beginPath(); c2.ellipse(0, 0, S.vh * .38, S.vh * .14, 0, 0, 7); c2.fill(); c2.restore();
      // rubble
      for (let i = 0; i < 60; i++) { const x = S.bx - 60 + ((i * 53) % (S.bw + 120)), y = base - ((i * 17) % 22); c2.fillStyle = ["#3E3A33", "#57524A", "#2A2723"][i % 3]; c2.beginPath(); c2.moveTo(x, y); c2.lineTo(x + 10 + (i % 5) * 4, y - 3); c2.lineTo(x + 6 + (i % 4) * 3, y - 10 - (i % 3) * 3); c2.closePath(); c2.fill(); }
      // just a few dull coins left in the dust
      for (let i = 0; i < 7; i++) { const x = S.vx + S.vw * ((i * 29) % 100) / 100, y = base - 3 - (i % 3) * 3; c2.fillStyle = "#7A6420"; c2.beginPath(); c2.ellipse(x, y, 5, 2.6, 0, 0, 7); c2.fill(); }
    })();
    function ruins(T){
      c.drawImage(R, 0, 0, W, H);
      // one hanging, flickering light
      const lx = S.bx + S.bw * .55, ly = H * .9 - S.bh * .2;
      if (T - lastFlick > (flickOn ? 120 + Math.random() * 700 : 60 + Math.random() * 160)) { flickOn = !flickOn; lastFlick = T; if (sound && flickOn && Math.random() < .6) zap(); }
      c.strokeStyle = "#111"; c.lineWidth = 2; c.beginPath(); c.moveTo(lx - 34, ly - 56); c.quadraticCurveTo(lx - 10, ly - 30, lx, ly - 8); c.stroke();
      c.fillStyle = flickOn ? "#FFE9A0" : "#3A3428"; c.beginPath(); c.arc(lx, ly, 6, 0, 7); c.fill();
      if (flickOn) { const g = c.createRadialGradient(lx, ly, 2, lx, ly, 140); g.addColorStop(0, "rgba(255,230,150,.42)"); g.addColorStop(1, "rgba(255,230,150,0)"); c.fillStyle = g; c.beginPath(); c.arc(lx, ly, 140, 0, 7); c.fill(); }
    }
    function frame(now){
      if (done) return;
      const t = Math.max(0, now - t0), T = now / 1000;
      if (t < 2700) {
        sky(c, W, H, T, false); spot(); c.drawImage(S.off, 0, 0, W, H); glint(T);
        if (t > 1500) missile(-60 + (iy + 60) * Math.min(1, (t - 1500) / 1100));
      } else {
        if (!boomed) {
          boomed = true; if (sound) boom();
          tiles = []; for (let r = 0; r < TR; r++) for (let k = 0; k < TC; k++) { const x = S.bx + k * tw, y = S.by + r * th, dx = x + tw / 2 - ix, dy = y + th / 2 - iy, d = Math.max(30, Math.hypot(dx, dy)), sp = 140 + Math.random() * 320;
            tiles.push({sx: x, sy: y, x, y, vx: dx / d * sp + (Math.random() - .5) * 200, vy: dy / d * sp - 260 - Math.random() * 260, r: 0, vr: (Math.random() - .5) * 9}); }
          gold = Array.from({length: 120}, () => ({x: S.vx + Math.random() * S.vw, y: S.vy + S.vh * (.4 + Math.random() * .6), vx: (Math.random() - .5) * 520, vy: -260 - Math.random() * 520, r: 3 + Math.random() * 4}));
          smoke = Array.from({length: 14}, (_, i) => ({x: ix + (Math.random() - .5) * S.bw, y: iy + S.bh * .3 + (Math.random() - .5) * S.bh * .5, r: 30 + Math.random() * 50, vx: (Math.random() - .5) * 60, vy: -20 - Math.random() * 40}));
        }
        const k = (t - 2700) / 1000, dt = 1 / 60;
        sky(c, W, H, T, t > 3500);
        if (t > 2800) ruins(t);
        tiles.forEach(p => { p.vy += 520 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; if (p.y > H + 50) return;
          c.save(); c.translate(p.x + tw / 2, p.y + th / 2); c.rotate(p.r); c.globalAlpha = Math.max(0, 1 - k / 2.6); c.drawImage(S.off, p.sx, p.sy, tw, th, -tw / 2, -th / 2, tw, th); c.restore(); });
        c.globalAlpha = 1;
        gold.forEach(g => { g.vy += 600 * dt; g.x += g.vx * dt; g.y += g.vy * dt; if (g.y > H) return; c.fillStyle = "#FFC93C"; c.beginPath(); c.ellipse(g.x, g.y, g.r, g.r * .6, k * 3, 0, 7); c.fill(); });
        smoke.forEach(s => { s.x += s.vx * dt; s.y += s.vy * dt; s.r += 18 * dt; c.globalAlpha = Math.max(0, (t > 3500 ? .28 : .4) - k * .05); c.fillStyle = t > 3500 ? "#2A2B33" : "#7A6A5A"; c.beginPath(); c.arc(s.x, s.y, s.r, 0, 7); c.fill(); });
        c.globalAlpha = 1;
        // fireball core, then the blinding white flash fading out
        if (k < .6) { const g = c.createRadialGradient(ix, iy, 5, ix, iy, 80 + k * 900); g.addColorStop(0, "rgba(255,255,230,1)"); g.addColorStop(.3, "rgba(255,200,80,.9)"); g.addColorStop(1, "rgba(255,120,0,0)"); c.fillStyle = g; c.fillRect(0, 0, W, H); }
        const fl = k < .18 ? 1 : Math.max(0, 1 - (k - .18) / .55); if (fl > 0) { c.fillStyle = `rgba(255,255,255,${fl})`; c.fillRect(0, 0, W, H); }
      }
      if (t > 5000 && !el.querySelector(".msg")) showMsg();
      requestAnimationFrame(frame);
    }
    async function showMsg(){
      const m = document.createElement("div"); m.className = "msg";
      m.innerHTML = `<h1>${esc(String(name).toUpperCase())}<br>HAS NUKED<br>THE CLASS!</h1><p id="nkm">☢️</p>`;
      el.appendChild(m); if (sound) { tone(196, 0, .6, "sawtooth", .15); tone(147, .5, 1, "sawtooth", .15); }
      const p = m.querySelector("#nkm");
      const gm = (getMessage ? Promise.resolve().then(getMessage) : Promise.resolve(null)).then(info => { if (p) p.innerHTML = info && info.sub ? info.sub : ""; }).catch(() => {});
      await Promise.race([gm, sleep(4000)]);
      const finish = () => { if (done) return; done = true; stopSiren(); el.remove(); resolve(); };
      if (autoCloseMs) setTimeout(finish, autoCloseMs);
      if (button) { const b = document.createElement("button"); b.className = "go"; b.style.animation = "none"; b.textContent = button; b.onclick = finish; m.appendChild(b); }
    }
    requestAnimationFrame(frame);
  });
}



/* =====================================================================
   EXTINCTION EVENT (Mayan temple + asteroid) and ZEUS'S WRATH visuals
   ===================================================================== */
const css2 = `
#nk .tw{position:absolute; inset:0; overflow:hidden; background:#000}
#nk .tw svg{position:absolute; inset:0; width:100%; height:100%}
#nk .room{position:absolute; inset:0; overflow:hidden; background:
  radial-gradient(ellipse at 50% 120%, rgba(0,0,0,.0), rgba(0,0,0,.75) 70%),
  repeating-linear-gradient(0deg, transparent 0 46px, rgba(0,0,0,.35) 46px 49px),
  repeating-linear-gradient(90deg, transparent 0 92px, rgba(0,0,0,.25) 92px 95px),
  linear-gradient(#5A4630, #2E2316)}
#nk .glowL,#nk .glowR{position:absolute; top:10%; width:70vw; height:80vh; pointer-events:none; mix-blend-mode:screen; animation:nkflick 1.6s infinite alternate}
#nk .glowL{left:-30vw; background:radial-gradient(circle, rgba(255,170,60,.45), transparent 60%)}
#nk .glowR{right:-30vw; background:radial-gradient(circle, rgba(255,170,60,.45), transparent 60%); animation-delay:.4s}
@keyframes nkflick{0%{opacity:.75} 30%{opacity:1} 55%{opacity:.82} 100%{opacity:.95}}
#nk .torch{position:absolute; top:22%; width:16px; height:110px; background:linear-gradient(90deg,#4A2A10,#8A5A2B,#4A2A10); border-radius:4px}
#nk .torch.l{left:4%} #nk .torch.r{right:4%}
#nk .torch::before{content:""; position:absolute; left:-10px; top:-46px; width:36px; height:56px; border-radius:50% 50% 45% 45%;
  background:radial-gradient(ellipse at 50% 70%, #FFF6B0, #FFB000 40%, #FF4A00 70%, transparent 72%); animation:flame .18s infinite alternate}
@keyframes flame{from{transform:scale(1,1) translateY(0)} to{transform:scale(.88,1.12) translateY(-3px)}}
#nk .room.dark .torch::before{animation:none; transform:scale(.2); opacity:.2; transition:all .8s}
#nk .room.dark .glowL,#nk .room.dark .glowR{opacity:0 !important; animation:none; transition:opacity .8s}
#nk .ttl{position:absolute; top:4%; left:0; right:0; text-align:center; font-family:"Bungee","Arial Black",sans-serif; color:#FFD27A; text-shadow:0 3px 0 #3A1A00; font-size:clamp(1.2rem,5vw,2.2rem); padding:0 12px; z-index:3}
#nk .cdn{position:absolute; top:calc(4% + 2.6em); left:0; right:0; text-align:center; font-family:"Bungee","Arial Black",sans-serif; color:#FFF; font-size:clamp(1.6rem,7vw,2.8rem); z-index:3}
#nk .blocks{position:absolute; left:50%; top:52%; transform:translate(-50%,-50%); z-index:2}
#nk .blk{position:absolute; border-radius:10px; background:linear-gradient(145deg,#D9B878,#A8844A 55%,#7A5C2E); box-shadow:inset 0 0 0 3px rgba(60,35,10,.45), 0 6px 0 #4A3416, 0 10px 16px rgba(0,0,0,.5);
  color:#3B2A12; transition:transform .25s ease; display:grid; place-items:center; cursor:pointer}
#nk .blk svg{width:70%; height:70%}
#nk .blk.sel{box-shadow:inset 0 0 0 4px #FFE066, 0 0 18px #FFE066, 0 6px 0 #4A3416}
#nk .blk.lit{color:#FFF6C8; background:linear-gradient(145deg,#FFE9A0,#E0A830 55%,#9A6A1A); box-shadow:0 0 30px #FFE066, 0 0 60px #FFB000}
#nk .beam{position:absolute; width:70px; bottom:50%; height:0; background:linear-gradient(to top, rgba(255,250,200,.95), rgba(255,240,160,0)); filter:blur(3px); transition:height 1.2s ease-in; z-index:1; pointer-events:none}
#nk .offer{position:absolute; bottom:5%; left:50%; transform:translateX(-50%); z-index:4; border:0; border-radius:16px; padding:14px 20px; font:900 clamp(.95rem,4vw,1.25rem) "Nunito",sans-serif;
  background:linear-gradient(#FFD27A,#C98A1A); color:#2A1600; box-shadow:0 6px 0 #6A4300; white-space:nowrap}
#nk .priest{position:absolute; bottom:0; width:min(46vw,250px); left:-60vw; transition:left .7s ease; z-index:3; filter:drop-shadow(0 10px 20px rgba(0,0,0,.6))}
#nk .priest.in{left:4vw}
#nk .priest .arms{transform-origin:50% 45%; transition:transform .4s}
#nk .priest.up .arms{transform:translateY(-14px)}
#nk .say{position:absolute; z-index:4; background:#F4E2B8; color:#3B2A12; border-radius:14px; padding:8px 12px; font-weight:900; max-width:52vw; left:calc(4vw + min(42vw,230px)); bottom:min(48vw,270px)}
#nk .box{background:rgba(10,10,20,.85); border:4px solid #FFD400; border-radius:20px; padding:18px 22px; max-width:min(92vw,900px)}
#nk .stone{position:absolute; left:50%; top:54%; transform:translate(-50%,-50%); width:min(88vw,520px); height:min(52vh,400px); border-radius:14px; z-index:2; touch-action:none; cursor:crosshair;
  background:radial-gradient(ellipse at 50% 40%, #C9A86A, #8E6E3A 70%, #5A4220); box-shadow:inset 0 0 0 8px rgba(60,35,10,.5), inset 0 0 40px rgba(0,0,0,.5), 0 14px 30px rgba(0,0,0,.6); overflow:hidden}
#nk .stone .rune{position:absolute; inset:12%; color:rgba(45,28,10,.75); filter:drop-shadow(0 2px 0 rgba(255,230,170,.25)); pointer-events:none}
#nk .stone .rune svg{width:100%; height:100%}
#nk .stone canvas{position:absolute; inset:0; width:100%; height:100%; pointer-events:none}
#nk .leak{position:absolute; inset:0; opacity:0; pointer-events:none; mix-blend-mode:screen; background:radial-gradient(ellipse at 50% 50%, rgba(255,250,210,.95), rgba(255,200,80,.55) 45%, transparent 75%); transition:opacity .2s}
#nk .spot{position:absolute; border-radius:50%; pointer-events:none; background:radial-gradient(circle, #FFFFFF 0%, #FFF3A0 30%, rgba(255,190,40,.85) 55%, rgba(255,140,0,0) 72%); box-shadow:0 0 18px #FFD24A; animation:spotin .12s ease-out both, spotpulse .35s ease-in-out infinite alternate .12s}
@keyframes spotin{from{transform:scale(.2)}}
@keyframes spotpulse{to{transform:scale(1.12)}}
#nk .frag{position:absolute; width:10px; height:8px; background:#A8844A; border-radius:2px; pointer-events:none; z-index:3}
#nk .frag.big{position:fixed; width:22px; height:16px; background:linear-gradient(145deg,#C9A86A,#7A5C2E)}
#nk .xm{position:absolute; color:#FF4D4D; font:900 28px "Nunito",sans-serif; transform:translate(-50%,-50%); pointer-events:none; animation:nkfade .6s reverse both}
#nk .hud2{position:absolute; bottom:4%; left:0; right:0; text-align:center; font-family:"Bungee","Arial Black",sans-serif; color:#FFE9A0; font-size:clamp(1rem,4.5vw,1.6rem); text-shadow:0 2px 0 #000; z-index:3}
#nk .weapon{position:absolute; left:50%; top:52%; width:min(30vw,130px); transform:translate(-50%,-50%); z-index:3; animation:nkpop .6s both; filter:drop-shadow(0 0 30px #FFF6B0) drop-shadow(0 0 60px #9FE8FF)}
#nk .weapon .rays{position:absolute; left:50%; top:50%; width:340%; height:340%; transform:translate(-50%,-50%); background:repeating-conic-gradient(rgba(255,250,200,.35) 0 8deg, transparent 8deg 22deg); border-radius:50%; animation:spin 6s linear infinite; z-index:-1}
@keyframes spin{to{transform:translate(-50%,-50%) rotate(360deg)}}
#zapov{position:fixed; inset:0; z-index:93; display:grid; place-items:center; text-align:center; font-family:"Nunito",system-ui,sans-serif; font-weight:800; color:#FFF}
#zapov canvas{position:absolute; inset:0}
#zapov .card{position:relative; background:rgba(8,14,40,.88); border:4px solid #9FE8FF; border-radius:22px; padding:18px 20px; width:min(440px,92vw); box-shadow:0 0 40px #6FD0FF; animation:nkpop .4s both}
#zapov .go{margin-top:12px; border:0; border-radius:16px; padding:12px 30px; font:900 1.2rem "Nunito",sans-serif; background:#9FE8FF; color:#06203A; box-shadow:0 5px 0 #2A6A8A}
#zapov h1{font-family:"Bungee","Arial Black",sans-serif; font-weight:400; color:#BFF2FF; font-size:clamp(2rem,9vw,3.2rem); margin:4px 0}
`;
function mount2(){ const el = mount(); if (!document.getElementById("nk-css2")) { const s = document.createElement("style"); s.id = "nk-css2"; s.textContent = css2; document.head.appendChild(s); } return el; }

/* ---------- extra sounds ---------- */
function sweep(start, dur, f0, f1, vol = .4, type = "bandpass"){
  const a = ac(); if (!a) return;
  const t = a.currentTime + start, n = Math.floor(a.sampleRate * dur), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  s.buffer = b; f.type = type; f.Q.value = type === "bandpass" ? 1.2 : .7;
  f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * .6); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(a.destination); s.start(t); s.stop(t + dur + .05);
}
function drone(start, dur, freqs, vol = .3){
  const a = ac(); if (!a) return;
  freqs.forEach(fr => { const t = a.currentTime + start, o = a.createOscillator(), g = a.createGain(); o.type = "sine"; o.frequency.value = fr;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .7); g.gain.setValueAtTime(vol, t + dur - .6); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + .05); });
}
function spaceSound(){   // huge, heavy, eerie: deep drone, groaning rock creaks, a whoosh past the camera
  drone(0, 3.3, [41, 55.4, 61.7], .28); noise(0, 3.2, .3, 150); sweep(0, 1.7, 3000, 180, .55);
  for (let i = 0; i < 7; i++) { const t = .25 + i * .42 + Math.random() * .2, f = 60 + Math.random() * 70; tone(f, t, .35 + Math.random() * .35, "sawtooth", .1, f * (.55 + Math.random() * .2)); noise(t, .07, .18, 700 + Math.random() * 500); }
}
const roar = () => { sweep(0, 3.3, 220, 1800, .7, "lowpass"); drone(0, 3.3, [36, 48], .22); };
const impact = () => { noise(0, 3.4, 1, 260); noise(0, .7, .7, 3500); tone(55, 0, 2.5, "sine", .7, 22); tone(110, 0, 1, "sawtooth", .3, 30); };
function crackle(dur){ for (let i = 0; i < dur * 9; i++) noise(Math.random() * dur, .03 + Math.random() * .05, .12 + Math.random() * .1, 2500 + Math.random() * 3000); sweep(0, dur, 380, 520, .14); }
function scrape(){ noise(0, .18, .22, 600); }
function thunder(){ noise(0, .12, .6, 6000); noise(.05, 2.2, .8, 300); tone(70, 0, 1.5, "sine", .5, 35); }
function bzzt(dur){ for (let i = 0; i < dur * 14; i++) { const t = Math.random() * dur; noise(t, .04, .2, 7000); tone(120 + Math.random() * 80, t, .05, "square", .06); } }

/* ---------- Mayan glyphs ---------- */
const sw = 'stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"';
const GLYPHS = [
  `<circle cx="32" cy="32" r="11" ${sw} stroke-width="4"/><circle cx="32" cy="32" r="3" fill="currentColor"/>${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<line x1="32" y1="14" x2="32" y2="5" ${sw} stroke-width="4" transform="rotate(${a} 32 32)"/>`).join("")}`,
  `<path d="M14 26 L18 10 L27 20 Q32 18 37 20 L46 10 L50 26 Q52 46 32 54 Q12 46 14 26Z" ${sw} stroke-width="3.5"/><circle cx="25" cy="32" r="3.5" fill="currentColor"/><circle cx="39" cy="32" r="3.5" fill="currentColor"/><path d="M28 42 L32 46 L36 42" ${sw} stroke-width="3"/><circle cx="20" cy="40" r="2" fill="currentColor"/><circle cx="44" cy="40" r="2" fill="currentColor"/>`,
  `<path d="M12 52 C12 36 30 40 30 28 C30 18 16 20 18 12 C20 6 34 6 40 12" ${sw} stroke-width="5"/><path d="M40 12 L54 8 L48 20Z" fill="currentColor"/>`,
  `<path d="M6 32 Q32 8 58 32 Q32 56 6 32Z" ${sw} stroke-width="4"/><circle cx="32" cy="32" r="8" fill="currentColor"/>`,
  `<path d="M16 30 Q16 10 32 10 Q48 10 48 30 L46 40 L42 40 L42 52 L22 52 L22 40 L18 40Z" ${sw} stroke-width="3.5"/><circle cx="25" cy="29" r="5" fill="currentColor"/><circle cx="39" cy="29" r="5" fill="currentColor"/><path d="M28 52 v-7 M32 52 v-7 M36 52 v-7" ${sw} stroke-width="2.5"/>`,
  `<path d="M32 32 a3 3 0 1 1 3 3 a7 7 0 1 1 -10 -6 a11 11 0 1 1 15 13 a16 16 0 1 1 -21 -20" ${sw} stroke-width="4"/>`,
  `<path d="M16 56 L46 8 Q58 30 40 42 Q34 46 24 46Z" ${sw} stroke-width="3.5"/><path d="M16 56 L42 18 M28 38 L40 36 M24 44 L34 42 M33 30 L45 27" ${sw} stroke-width="2.5"/>`,
  `<path d="M40 6 A26 26 0 1 0 40 58 A16 26 0 1 1 40 6Z" fill="currentColor"/><circle cx="48" cy="18" r="2.5" fill="currentColor"/><circle cx="54" cy="30" r="1.8" fill="currentColor"/>`,
  `<ellipse cx="32" cy="28" rx="9" ry="18" ${sw} stroke-width="3.5"/><path d="M25 18 h14 M23 26 h18 M23 34 h18 M25 42 h14 M32 10 v36" ${sw} stroke-width="2"/><path d="M22 56 Q12 44 17 30 M42 56 Q52 44 47 30" ${sw} stroke-width="3"/>`,
  `${[18, 32, 46].map(y => `<path d="M6 ${y} q8 -9 16 0 t16 0 t16 0" ${sw} stroke-width="4"/>`).join("")}`
];
const glyph = i => `<svg viewBox="0 0 64 64">${GLYPHS[i]}</svg>`;
const PRIEST = `<svg viewBox="0 0 200 300" aria-label="Ancient priest">
  <g>${[-70, -50, -30, -12, 6, 24, 42, 60, 78].map((a, i) => `<path d="M100 90 Q${100 + Math.sin(a * Math.PI / 180) * 30} ${90 - 40} ${100 + Math.sin(a * Math.PI / 180) * 95} ${90 - Math.cos(a * Math.PI / 180) * 95}" stroke="${["#1E8C6E", "#E0402A", "#F2C14E", "#1E8C6E", "#2A6FD6", "#1E8C6E", "#F2C14E", "#E0402A", "#1E8C6E"][i]}" stroke-width="14" stroke-linecap="round" fill="none"/>`).join("")}</g>
  <rect x="70" y="78" width="60" height="18" rx="6" fill="#C9A24A"/><circle cx="100" cy="87" r="6" fill="#1E8C6E"/>
  <path d="M60 170 Q100 150 140 170 L156 300 L44 300Z" fill="#F4EAD2"/>
  <path d="M52 250 L148 250 L152 270 L48 270Z" fill="#B0362A"/><path d="M58 254 h12 l6 6 l6 -6 h12 l6 6 l6 -6 h12 l6 6 l6 -6 h12" stroke="#F2C14E" stroke-width="3" fill="none"/>
  <g class="arms"><path d="M64 172 Q30 150 28 110" stroke="#9A5B34" stroke-width="16" stroke-linecap="round" fill="none"/><path d="M136 172 Q170 150 172 110" stroke="#9A5B34" stroke-width="16" stroke-linecap="round" fill="none"/>
    <circle cx="28" cy="106" r="10" fill="#9A5B34"/><circle cx="172" cy="106" r="10" fill="#9A5B34"/></g>
  <path d="M72 172 Q100 196 128 172" stroke="#1E8C6E" stroke-width="10" fill="none"/><circle cx="100" cy="190" r="9" fill="#2FB86A" stroke="#C9A24A" stroke-width="3"/>
  <rect x="88" y="140" width="24" height="26" fill="#9A5B34"/>
  <ellipse cx="100" cy="122" rx="28" ry="32" fill="#9A5B34"/>
  <path d="M80 116 l12 3 M120 116 l-12 3" stroke="#2A1408" stroke-width="4" stroke-linecap="round"/>
  <circle cx="88" cy="124" r="3.5" fill="#1A0A04"/><circle cx="112" cy="124" r="3.5" fill="#1A0A04"/>
  <path d="M100 126 l-4 12 h8z" fill="#7A4424"/><path d="M90 144 q10 5 20 0" stroke="#2A1408" stroke-width="3" fill="none"/>
  <circle cx="72" cy="128" r="5" fill="#C9A24A"/><circle cx="128" cy="128" r="5" fill="#C9A24A"/></svg>`;
const PYRAMID = `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
  <defs><linearGradient id="dusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1E1236"/><stop offset=".6" stop-color="#8A3A4A"/><stop offset="1" stop-color="#E07A3A"/></linearGradient></defs>
  <rect width="400" height="300" fill="url(#dusk)"/><circle cx="320" cy="70" r="18" fill="#FFE3B0" opacity=".8"/>
  ${[0, 1, 2, 3, 4].map(i => { const w = 300 - i * 50, y = 260 - i * 34; return `<rect x="${200 - w / 2}" y="${y}" width="${w}" height="34" fill="${i % 2 ? "#A8844A" : "#94733C"}" stroke="#5A4220" stroke-width="2"/>`; }).join("")}
  <rect x="180" y="124" width="40" height="136" fill="#7A5C2E"/>${Array.from({length: 17}, (_, i) => `<line x1="180" y1="${128 + i * 8}" x2="220" y2="${128 + i * 8}" stroke="#5A4220" stroke-width="1.5"/>`).join("")}
  <rect x="160" y="84" width="80" height="44" fill="#B8945A" stroke="#5A4220" stroke-width="2"/><rect x="190" y="98" width="20" height="30" fill="#0A0604"/>
  <path d="M0 300 Q30 250 60 280 Q90 240 130 285 L130 300Z M400 300 Q370 245 335 280 Q300 250 270 288 L270 300Z" fill="#0E2414"/>
</svg>`;

/* ---------- the Mayan temple challenge ---------- */
async function temple(opts){
  let launched = false;
  const wrapped = Object.assign({}, opts, {onLaunch: async () => { launched = true; return opts.onLaunch(); }});
  try { return await templeInner(wrapped); }
  catch (e) { const el = document.getElementById("nk"); if (el) el.remove(); return launched; }
}
async function templeInner({onLaunch}){
  const el = mount2(); ac();
  // fly into the temple
  el.innerHTML = `<div class="tw"><div id="pyr" style="position:absolute; inset:0; transform-origin:50% 37.6%">${PYRAMID}</div>
    <div class="ttl" style="top:auto; bottom:8%">☄️ EXTINCTION EVENT ☄️<br><span style="font-size:.6em; color:#FFF">Only the worthy may summon it…</span></div></div>`;
  [0, .7, 1.4].forEach(t => tone(58, t, .5, "sine", .5, 40)); sweep(0, 3, 300, 600, .12);
  await sleep(1300);
  const pyr = el.querySelector("#pyr");
  { const s = Math.max(innerWidth / 400, innerHeight / 300), dx = (innerWidth - 400 * s) / 2 + 200 * s, dy = (innerHeight - 300 * s) / 2 + 113 * s; pyr.style.transformOrigin = `${dx}px ${dy}px`; }
  pyr.animate([{transform: "scale(1)"}, {transform: "scale(22)"}], {duration: 2000, easing: "cubic-bezier(.6,0,.9,.4)", fill: "forwards"});
  await sleep(1900);
  // the room and the priest, then the temple run (one chance)
  el.innerHTML = `<div class="room" id="room"><div class="glowL"></div><div class="glowR"></div><div class="torch l"></div><div class="torch r"></div>
    <div class="ttl" id="ttl">THE TEMPLE OF THE SACRED LIGHT</div><div class="cdn" id="cdn"></div></div>`;
  noise(0, 1.2, .2, 500);
  const room = el.querySelector("#room");
  room.insertAdjacentHTML("beforeend", `<div class="priest" id="pr">${PRIEST}</div>`);
  const pr = room.querySelector("#pr");
  await sleep(30); pr.classList.add("in"); drone(0, 1.2, [73, 110], .15); await sleep(800);
  room.insertAdjacentHTML("beforeend", `<div class="say" id="say">Only the worthy reach the sacred light. Run through my temple… you get <b>ONE</b> chance.</div>`);
  pr.classList.add("up"); await sleep(3000);
  el.querySelector("#say").remove(); pr.classList.remove("up"); pr.classList.remove("in"); await sleep(700);
  const won = await templeRun(el);
  if (!won.ok) {
    el.innerHTML = `<div class="room dark" id="room"><div class="torch l"></div><div class="torch r"></div>
      <div class="ttl" style="top:30%">THE TEMPLE CLAIMS ANOTHER…<br><span style="font-size:.6em; color:#FFF">You survived ${won.t.toFixed(1)} of ${won.len} seconds</span></div></div>`;
    tone(110, 0, 1.4, "sawtooth", .15, 50); noise(0, 1.5, .25, 300);
    await sleep(3000); el.remove(); return false;
  }
  // success: the sacred weapon is revealed and beams shoot into the sky
  el.innerHTML = `<div class="room" id="room"><div class="glowL"></div><div class="glowR"></div><div class="torch l"></div><div class="torch r"></div>
    <div class="ttl" id="ttl">YOU REACHED THE SACRED LIGHT!</div></div>`;
  const room2 = el.querySelector("#room");
  room2.insertAdjacentHTML("beforeend", `<div class="weapon" id="wpn"><div class="rays"></div><svg viewBox="0 0 60 160"><path d="M30 0 L48 40 L38 140 L30 160 L22 140 L12 40Z" fill="url(#wg)" stroke="#FFF6C8" stroke-width="2"/><defs><linearGradient id="wg" x1="0" x2="1"><stop offset="0" stop-color="#9FE8FF"/><stop offset=".5" stop-color="#FFFFFF"/><stop offset="1" stop-color="#FFE066"/></linearGradient></defs></svg></div>`);
  sweep(0, 2.4, 200, 3000, .5); drone(0, 2.6, [55, 82.5], .3);
  await sleep(1000);
  for (let k = 0; k < 7; k++) { const beam = document.createElement("div"); beam.className = "beam"; beam.style.left = (innerWidth / 2 - 35 + (k - 3) * 46) + "px"; beam.style.bottom = (innerHeight / 2) + "px"; room2.appendChild(beam); requestAnimationFrame(() => beam.style.height = (innerHeight / 2) + "px"); }
  try { await Promise.race([Promise.resolve().then(onLaunch), sleep(3000)]); } catch (e) {}
  await sleep(1500);
  el.innerHTML = `<div class="nk-c" style="background:#000"><div style="font-size:5rem">☄️</div><h1 style="font-size:clamp(1.8rem,7vw,3.6rem); color:#FFD400">THE ASTEROID IS COMING…</h1><p style="font-size:1.2rem">Everyone else is about to be wiped out. 😈</p></div>`;
  await sleep(3000); el.remove(); return true;
}

/* ---------- the Mayan temple run: survive 20 seconds, one life ---------- */
function templeRun(el){
  return new Promise(resolve => {
    const LEN = 20;
    el.innerHTML = `<canvas id="tr" style="position:absolute; inset:0; touch-action:none"></canvas>
      <div style="position:absolute; left:0; right:0; bottom:calc(14px + env(safe-area-inset-bottom,0px)); display:flex; justify-content:space-between; padding:0 14px; pointer-events:none">
        <button id="trd" style="pointer-events:auto; width:min(40vw,190px); height:76px; border:0; border-radius:18px; font:900 1.3rem 'Nunito',sans-serif; background:rgba(255,210,120,.88); color:#2A1600; box-shadow:0 5px 0 #6A4300">DUCK ▼</button>
        <button id="trj" style="pointer-events:auto; width:min(40vw,190px); height:76px; border:0; border-radius:18px; font:900 1.3rem 'Nunito',sans-serif; background:rgba(255,210,120,.88); color:#2A1600; box-shadow:0 5px 0 #6A4300">JUMP ▲</button></div>
      <div style="position:absolute; top:10px; left:0; right:0; text-align:center; font:900 .95rem 'Nunito',sans-serif; color:#FFE9A0; text-shadow:0 2px 0 #000; pointer-events:none">Tap the screen or JUMP ▲ (Space / ↑) · DUCK ▼ (↓) · ONE CHANCE</div>`;
    const cv = el.querySelector("#tr"), ctx = cv.getContext("2d"), H = 400;
    let W = 800, scale = 1;
    const fit = () => { const dpr = Math.min(2, window.devicePixelRatio || 1), w = innerWidth, h = innerHeight; cv.width = w * dpr; cv.height = h * dpr; cv.style.width = w + "px"; cv.style.height = h + "px"; scale = h / H; W = w / scale; ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0); };
    fit(); window.addEventListener("resize", fit);
    const GROUND = 300, G = 2700, JUMP_V = -930, SPD = 1.4;
    const P = {x: 120, y: GROUND, vy: 0, w: 32, h: 46, onGround: true};
    let obs = [], gaps = [], nextSpawn = 1.4, dist = 0, time = -3, prev = performance.now(), over = false, down = false, lastBeep = 4;
    const speedAt = t => SPD * (t < 10 ? 470 + 14 * t : 610 + 28 * (t - 10));
    const rnd = (a, b) => a + Math.random() * (b - a);
    const TYPES = [
      {k: "spikes", kind: "jump", w: 46, h: 28}, {k: "idol", kind: "jump", w: 34, h: 58}, {k: "boulder", kind: "jump", w: 42, h: 42, roll: true}, {k: "pit", kind: "gap"},
      {k: "darts", kind: "duck", w: 70, h: 16, fast: true}, {k: "beam", kind: "duck", w: 84, h: 26}, {k: "bat", kind: "high", w: 46, h: 26}
    ];
    const cat = t => t.kind === "gap" ? "jump" : t.kind;
    const CATW = {jump: 45, duck: 34, high: 21};
    const pick = () => { let r = Math.random() * 100, c = "jump"; for (const k of ["jump", "duck", "high"]) { r -= CATW[k]; if (r <= 0) { c = k; break; } } const pool = TYPES.filter(t => cat(t) === c); return pool[Math.floor(Math.random() * pool.length)]; };
    const MIN = {jump: {jump: .74, duck: .56, high: .72}, duck: {jump: .45, duck: .35, high: .3}, high: {jump: .45, duck: .35, high: .3}};
    let pending = pick();
    function spawn(x, t){
      if (t.kind === "gap") { const gw = rnd(95, 140); gaps.push({x, w: gw}); return gw; }
      const o = Object.assign({}, t, {x, ph: Math.random() * 6});
      o.y = t.kind === "duck" ? GROUND - 32 - t.h : t.kind === "high" ? GROUND - 150 : GROUND - t.h;
      obs.push(o); return t.w;
    }
    const jump = () => { if (over || time < 0) return; if (P.onGround) { P.vy = JUMP_V; P.onGround = false; tone(520, 0, .1, "square", .08, 900); } };
    const kd = e => { if (["Space", "ArrowUp", "KeyW"].includes(e.code)) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) jump(); } if (["ArrowDown", "KeyS"].includes(e.code)) { e.preventDefault(); e.stopPropagation(); down = true; } };
    const ku = e => { if (["ArrowDown", "KeyS"].includes(e.code)) down = false; };
    document.addEventListener("keydown", kd, true); document.addEventListener("keyup", ku, true);
    cv.addEventListener("pointerdown", e => { e.preventDefault(); jump(); });
    el.querySelector("#trj").addEventListener("pointerdown", e => { e.preventDefault(); jump(); });
    const db = el.querySelector("#trd");
    db.addEventListener("pointerdown", e => { e.preventDefault(); down = true; });
    ["pointerup", "pointerleave", "pointercancel"].forEach(t => db.addEventListener(t, () => down = false));
    window.__trState = () => ({P, obs, gaps, time, over});
    function end(ok){
      if (over) return; over = true;
      document.removeEventListener("keydown", kd, true); document.removeEventListener("keyup", ku, true); window.removeEventListener("resize", fit);
      if (ok) { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * .12, .25, "square", .1)); } else { noise(0, .5, .5, 700); tone(200, 0, .6, "sawtooth", .15, 60); }
      setTimeout(() => resolve({ok, t: Math.max(0, Math.min(LEN, time)), len: LEN}), ok ? 1200 : 1100);
    }
    function step(now){
      if (!document.body.contains(cv)) return;
      const dt = Math.min(.033, (now - prev) / 1000); prev = now;
      if (!over) time += dt;
      if (time < 0) { const n = Math.ceil(-time); if (n < lastBeep) { lastBeep = n; tone(660, 0, .12, "square", .12); } }
      else if (lastBeep > 0) { lastBeep = 0; tone(990, 0, .25, "square", .14); }
      const sp = time < 0 ? 0 : speedAt(time);
      if (!over && time >= 0) {
        const dx = sp * dt; dist += dx;
        obs.forEach(o => o.x -= dx + (o.fast ? 160 * dt : 0) + (o.roll ? 90 * dt : 0)); gaps.forEach(g => g.x -= dx);
        obs = obs.filter(o => o.x + o.w > -60 && !(o.dead && performance.now() - o.dead > 450)); gaps = gaps.filter(g => g.x + g.w > -60);
        nextSpawn -= dt;
        if (nextSpawn <= 0 && time < LEN - 1.4) {
          const cur = pending, w = spawn(W + 20, cur); pending = pick();
          const late = time < 10 ? 0 : (time - 10) / 10;
          let gap = time < 10 ? rnd(.7, 1.0) : rnd(.6, .84 - .14 * late);
          gap = Math.max(gap, MIN[cat(cur)][cat(pending)]);
          nextSpawn = gap + w / sp;
        }
        const overGap = gaps.some(g => P.x + 8 > g.x && P.x + P.w - 8 < g.x + g.w);
        const duck = down && P.onGround, grav = (!P.onGround && down) ? G * 2.6 : G, prevY = P.y;
        if (!P.onGround || overGap) { P.vy += grav * dt; P.y += P.vy * dt; P.onGround = false; }
        if (P.y >= GROUND && prevY <= GROUND + .5 && !overGap && P.vy >= 0) { P.y = GROUND; P.vy = 0; P.onGround = true; }
        if (P.y > H + 60) end(false);
        P.duck = duck;
        const ph = duck ? 26 : P.h, px1 = P.x + 5, px2 = P.x + P.w - 5, py1 = P.y - ph + 4, py2 = P.y - 2;
        for (const o of obs) {
          let oy = o.y; if (o.roll) oy = o.y - Math.abs(Math.sin(time * 6 + o.ph)) * 16; if (o.k === "bat") oy = o.y + Math.sin(time * 7 + o.ph) * 8;
          o.cy = oy; if (o.dead) continue;
          if (px2 > o.x + 5 && px1 < o.x + o.w - 5 && py2 > oy + 4 && py1 < oy + o.h - 3) {
            if (P.vy > 0 && prevY <= oy + 12 && o.kind === "jump") { o.dead = performance.now(); P.y = oy; P.vy = -700; P.onGround = false; tone(880, 0, .15, "square", .1, 1320); continue; }
            end(false); break;
          }
        }
        if (time >= LEN) end(true);
      }
      draw(sp, now);
      requestAnimationFrame(step);
    }
    function draw(sp, now){
      const T = now / 1000;
      // temple wall
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#1E140C"); g.addColorStop(1, "#4A3420"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 2;
      const off1 = dist * .3 % 80;
      for (let y = 20; y < GROUND; y += 36) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); for (let x = -off1 + ((y / 36) % 2) * 40; x < W; x += 80) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 36); ctx.stroke(); } }
      // carved glyph panels and torches (parallax)
      for (let i = 0; i < 12; i++) { const x = ((i * 260 - dist * .3) % (W + 260) + W + 260) % (W + 260) - 130;
        if (i % 2) { ctx.fillStyle = "rgba(200,160,90,.18)"; ctx.fillRect(x - 30, 70, 60, 70); ctx.strokeStyle = "rgba(255,220,150,.25)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, 105, 18, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(x, 105, 5, 0, 7); ctx.stroke(); }
        else { const fl = .8 + .2 * Math.sin(T * 18 + i); const rg = ctx.createRadialGradient(x, 120, 4, x, 120, 110); rg.addColorStop(0, `rgba(255,190,80,${.4 * fl})`); rg.addColorStop(1, "rgba(255,150,40,0)"); ctx.fillStyle = rg; ctx.fillRect(x - 110, 10, 220, 220);
          ctx.fillStyle = "#5A3418"; ctx.fillRect(x - 4, 120, 8, 40); ctx.fillStyle = "#FFB000"; ctx.beginPath(); ctx.ellipse(x, 110, 9 * fl, 16, 0, 0, 7); ctx.fill(); ctx.fillStyle = "#FFF3A0"; ctx.beginPath(); ctx.ellipse(x, 114, 4, 8, 0, 0, 7); ctx.fill(); } }
      // floor
      ctx.fillStyle = "#8E6E3A"; ctx.fillRect(0, GROUND, W, H - GROUND); ctx.fillStyle = "#C9A86A"; ctx.fillRect(0, GROUND, W, 6);
      ctx.strokeStyle = "rgba(60,35,10,.5)"; for (let x = -(dist % 60); x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, GROUND + 6); ctx.lineTo(x, H); ctx.stroke(); }
      gaps.forEach(gp => { ctx.fillStyle = "#0A0604"; ctx.fillRect(gp.x, GROUND, gp.w, H - GROUND); ctx.fillStyle = "#5A5A5A"; for (let k = 0; k < gp.w; k += 14) { ctx.beginPath(); ctx.moveTo(gp.x + k, H); ctx.lineTo(gp.x + k + 7, H - 22); ctx.lineTo(gp.x + k + 14, H); ctx.fill(); } });
      obs.forEach(o => {
        if (o.dead) ctx.globalAlpha = Math.max(0, 1 - (performance.now() - o.dead) / 450);
        const y = o.cy != null ? o.cy : o.y;
        if (o.k === "spikes") { ctx.fillStyle = "#6A5A48"; ctx.fillRect(o.x, y + o.h - 8, o.w, 8); ctx.fillStyle = "#CFCFD6"; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(o.x + k * 11.5, y + o.h - 8); ctx.lineTo(o.x + k * 11.5 + 5.75, y); ctx.lineTo(o.x + k * 11.5 + 11.5, y + o.h - 8); ctx.fill(); } }
        else if (o.k === "idol") { ctx.fillStyle = "#7A7A6A"; ctx.fillRect(o.x, y, o.w, o.h); ctx.fillStyle = "#4A4A3E"; ctx.fillRect(o.x + 6, y + 14, 8, 6); ctx.fillRect(o.x + 20, y + 14, 8, 6); ctx.fillRect(o.x + 9, y + 30, 16, 5); ctx.fillStyle = "#1E8C6E"; ctx.fillRect(o.x - 3, y - 6, o.w + 6, 8); }
        else if (o.k === "boulder") { ctx.save(); ctx.translate(o.x + o.w / 2, y + o.h / 2); ctx.rotate(-dist / 30); const bg = ctx.createRadialGradient(-6, -6, 3, 0, 0, 22); bg.addColorStop(0, "#A89A88"); bg.addColorStop(1, "#4A4038"); ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(0, 0, 21, 0, 7); ctx.fill(); ctx.strokeStyle = "#3A322B"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, -4); ctx.lineTo(4, 2); ctx.lineTo(10, -8); ctx.stroke(); ctx.restore(); }
        else if (o.k === "darts") { for (let k = 0; k < 3; k++) { const dx = o.x + k * 24; ctx.strokeStyle = "#5A3418"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(dx, y + 8); ctx.lineTo(dx + 18, y + 8); ctx.stroke(); ctx.fillStyle = "#CFCFD6"; ctx.beginPath(); ctx.moveTo(dx - 6, y + 8); ctx.lineTo(dx, y + 4); ctx.lineTo(dx, y + 12); ctx.fill(); ctx.fillStyle = "#E0402A"; ctx.fillRect(dx + 16, y + 4, 4, 8); } }
        else if (o.k === "beam") { ctx.fillStyle = "#9A7A48"; ctx.fillRect(o.x, y, o.w, o.h); ctx.strokeStyle = "#5A4220"; ctx.lineWidth = 2; ctx.strokeRect(o.x, y, o.w, o.h); ctx.fillStyle = "#5A4220"; ctx.fillRect(o.x + 6, 0, 8, y); ctx.fillRect(o.x + o.w - 14, 0, 8, y); }
        else if (o.k === "bat") { const fl = Math.sin(performance.now() / 60) * 8; ctx.fillStyle = "#2A1A2A"; ctx.beginPath(); ctx.moveTo(o.x + 23, y + 13); ctx.lineTo(o.x, y + 4 + fl); ctx.lineTo(o.x + 10, y + 18); ctx.lineTo(o.x + 23, y + 13); ctx.lineTo(o.x + 36, y + 18); ctx.lineTo(o.x + 46, y + 4 + fl); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.arc(o.x + 23, y + 13, 7, 0, 7); ctx.fill(); ctx.fillStyle = "#FF4040"; ctx.fillRect(o.x + 19, y + 11, 3, 3); ctx.fillRect(o.x + 25, y + 11, 3, 3); }
        ctx.globalAlpha = 1;
      });
      // the explorer
      const ph = P.duck ? 26 : P.h, x = P.x, yb = P.y, run = Math.sin(dist / 14);
      ctx.fillStyle = "#3A2A1A"; if (P.onGround && !P.duck) { ctx.fillRect(x + 8 + run * 5, yb - 14, 6, 14); ctx.fillRect(x + 18 - run * 5, yb - 14, 6, 14); } else ctx.fillRect(x + 8, yb - 12, 16, 12);
      ctx.fillStyle = "#C9A86A"; ctx.fillRect(x + 4, yb - ph + 16, P.w - 8, ph - 30 > 0 ? ph - 30 : 10);
      ctx.fillStyle = "#E2A97E"; ctx.beginPath(); ctx.arc(x + P.w / 2, yb - ph + 10, 9, 0, 7); ctx.fill();
      ctx.fillStyle = "#6A4423"; ctx.fillRect(x + 2, yb - ph + 1, P.w - 4, 5); ctx.fillRect(x + 8, yb - ph - 5, P.w - 16, 8);
      // the sacred light at the end
      if (time > LEN - 2.5) { const k = Math.min(1, (time - (LEN - 2.5)) / 2.5); const lg = ctx.createRadialGradient(W, GROUND - 80, 10, W, GROUND - 80, 400 * k + 50); lg.addColorStop(0, `rgba(255,255,230,${.95 * k})`); lg.addColorStop(1, "rgba(255,240,180,0)"); ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H); }
      // HUD: progress to the light
      const prog = Math.max(0, Math.min(1, time / LEN));
      ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillRect(W * .2, 34, W * .6, 12); ctx.fillStyle = "#FFE066"; ctx.fillRect(W * .2, 34, W * .6 * prog, 12);
      ctx.fillStyle = "#FFF"; ctx.font = "900 14px Nunito, sans-serif"; ctx.textAlign = "center"; ctx.fillText(time < 0 ? "Get ready…" : `☀️ The sacred light: ${Math.max(0, LEN - time).toFixed(1)}s`, W / 2, 62);
      if (time < 0) { ctx.font = "900 90px 'Bungee', 'Arial Black', sans-serif"; ctx.fillStyle = "#FFE066"; ctx.fillText(String(Math.ceil(-time)), W / 2, H / 2); }
    }
    requestAnimationFrame(step);
  });
}

/* ---------- the asteroid cutscene everyone else sees ---------- */
function asteroid({name, names = [], sound = true, getMessage, autoCloseMs = 0, button = "Carry on"}){
  return new Promise(resolve => {
    const el = mount2(), dpr = Math.min(2, window.devicePixelRatio || 1);
    const cv = document.createElement("canvas"); el.appendChild(cv);
    const W = innerWidth, H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + "px"; cv.style.height = H + "px";
    const c = cv.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    // pre-made shapes
    const stars = Array.from({length: 220}, () => [Math.random() * W, Math.random() * H, Math.random() * 1.8 + .3]);
    const rock = Array.from({length: 24}, (_, i) => { const a = i / 24 * Math.PI * 2; return [Math.cos(a), Math.sin(a), 1 + (Math.random() - .5) * .34]; });
    const craters = Array.from({length: 8}, () => { const a = Math.random() * 7, r = Math.random() * .6; return [Math.cos(a) * r, Math.sin(a) * r, .07 + Math.random() * .12]; });
    const land = Array.from({length: 9}, () => [Math.random() * 1.6 - .8, Math.random() * 1.6 - .8, .15 + Math.random() * .3]);
    const N = Math.max(6, names.length), rowN = Math.ceil(N / 2), tw = (W * .94) / rowN;
    const towers = Array.from({length: N}, (_, i) => { const back = i % 2 === 1, k = Math.floor(i / 2);
      return {name: names[i] || "", back, x: W * .03 + k * tw + (back ? tw * .35 : 0), w: tw * (back ? .62 : .72), h: H * (back ? .34 + Math.random() * .2 : .2 + Math.random() * .16), lit: Array.from({length: 40}, () => Math.random() < .7)}; });
    const embers = Array.from({length: 70}, () => ({x: W * (.15 + Math.random() * .7), y: H * .82, vy: -40 - Math.random() * 120, vx: (Math.random() - .5) * 40, r: 1 + Math.random() * 2.5, l: Math.random()}));
    const t0 = performance.now(); let done = false, phase = 0;
    if (sound) spaceSound();
    function drawRock(x, y, R, rot, hot){
      c.save(); c.translate(x, y); c.rotate(rot);
      if (hot) { const g = c.createRadialGradient(0, 0, R * .8, 0, 0, R * 2.2); g.addColorStop(0, "rgba(255,160,40,.7)"); g.addColorStop(1, "rgba(255,80,0,0)"); c.fillStyle = g; c.beginPath(); c.arc(0, 0, R * 2.2, 0, 7); c.fill(); }
      const g = c.createRadialGradient(-R * .35, -R * .35, R * .1, 0, 0, R * 1.1); g.addColorStop(0, hot ? "#C98A4A" : "#9A8A78"); g.addColorStop(1, hot ? "#4A2010" : "#2E2620");
      c.fillStyle = g; c.beginPath(); rock.forEach(([a, b, m], i) => { const px = a * R * m, py = b * R * m; i ? c.lineTo(px, py) : c.moveTo(px, py); }); c.closePath(); c.fill();
      craters.forEach(([a, b, r]) => { c.fillStyle = "rgba(20,15,12,.45)"; c.beginPath(); c.ellipse(a * R, b * R, r * R, r * R * .8, 0, 0, 7); c.fill(); c.strokeStyle = "rgba(200,180,150,.18)"; c.lineWidth = Math.max(1, R * .015); c.stroke(); });
      c.restore();
    }
    function space(t){
      c.fillStyle = "#01030C"; c.fillRect(0, 0, W, H);
      stars.forEach(([x, y, r]) => { c.fillStyle = "#FFF"; c.globalAlpha = .4 + .6 * Math.abs(Math.sin(t / 700 + x)); c.fillRect(x, y, r, r); }); c.globalAlpha = 1;
      const ex = W * .62, ey = H * .45, er = Math.min(W, H) * .22;
      const ag = c.createRadialGradient(ex, ey, er * .9, ex, ey, er * 1.35); ag.addColorStop(0, "rgba(90,180,255,.55)"); ag.addColorStop(1, "rgba(90,180,255,0)"); c.fillStyle = ag; c.beginPath(); c.arc(ex, ey, er * 1.35, 0, 7); c.fill();
      c.save(); c.beginPath(); c.arc(ex, ey, er, 0, 7); c.clip();
      const og = c.createRadialGradient(ex - er * .4, ey - er * .4, er * .1, ex, ey, er); og.addColorStop(0, "#5AB0FF"); og.addColorStop(1, "#0A2A6B"); c.fillStyle = og; c.fillRect(ex - er, ey - er, er * 2, er * 2);
      land.forEach(([a, b, r]) => { c.fillStyle = "rgba(60,160,80,.85)"; c.beginPath(); c.ellipse(ex + a * er + (t / 60) % 30, ey + b * er, r * er, r * er * .7, a, 0, 7); c.fill(); });
      c.fillStyle = "rgba(0,0,10,.45)"; c.beginPath(); c.arc(ex + er * .5, ey + er * .3, er * 1.1, 0, 7); c.fill(); c.restore();
      // the asteroid: starts behind the camera, filling the view, then tumbles away towards Earth
      const p = Math.max(0, Math.min(1, t / 3000)), e = Math.pow(p, 1.25);
      const ax = W * .25 + (ex - er * .9 - W * .25) * e, ay = H * .95 + (ey - er * .2 - H * .95) * e, R = Math.max(W, H) * 1.1 * Math.pow(1 - e, 2.1) + 6;
      drawRock(ax, ay, R, t / 2600, false);
    }
    function city(t){
      const k = Math.max(0, Math.min(1, t / 3400));
      const sky = c.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, "#120A26"); sky.addColorStop(.7, "#5A2A4A"); sky.addColorStop(1, "#C25A3A"); c.fillStyle = sky; c.fillRect(0, 0, W, H);
      stars.slice(0, 80).forEach(([x, y, r]) => { c.fillStyle = "rgba(255,255,255,.5)"; c.fillRect(x, y * .6, r, r); });
      // asteroid with a burning streak, getting closer
      const ax = W * .9 + (W * .5 - W * .9) * k, ay = -H * .05 + (H * .74 + H * .05) * Math.pow(k, 1.4), R = 8 + Math.min(W, H) * .17 * Math.pow(k, 2.2);
      const tl = c.createLinearGradient(ax, ay, ax + W * .35, ay - H * .5); tl.addColorStop(0, "rgba(255,230,160,.9)"); tl.addColorStop(.3, "rgba(255,140,40,.5)"); tl.addColorStop(1, "rgba(255,80,0,0)");
      c.strokeStyle = tl; c.lineCap = "round"; c.lineWidth = R * 1.4; c.beginPath(); c.moveTo(ax, ay); c.lineTo(ax + W * .35, ay - H * .5); c.stroke();
      // towers (back row first)
      [true, false].forEach(back => towers.filter(tw2 => tw2.back === back).forEach(T => {
        const base = H * .9, top = base - T.h;
        c.fillStyle = back ? "#1F2238" : "#2C3150"; c.fillRect(T.x, top, T.w, T.h);
        c.fillStyle = back ? "#272B45" : "#3A4068"; c.beginPath(); c.moveTo(T.x - 3, top); c.lineTo(T.x + T.w / 2, top - T.w * .3); c.lineTo(T.x + T.w + 3, top); c.closePath(); c.fill();
        const cols2 = 2, rows2 = Math.floor(T.h / 18);
        for (let r = 0; r < rows2; r++) for (let q = 0; q < cols2; q++) { if (!T.lit[(r * cols2 + q) % 40]) continue; c.fillStyle = back ? "rgba(255,210,120,.55)" : "rgba(255,220,140,.85)"; c.fillRect(T.x + T.w * (.12 + q * .5), top + 8 + r * 18, T.w * .26, 8); }
        if (T.name) { c.save(); c.translate(T.x + T.w / 2, top + T.h * .5); c.rotate(-Math.PI / 2); const fs = Math.max(9, Math.min(T.w * .5, 22)); c.font = `900 ${fs}px Nunito, sans-serif`; c.textAlign = "center"; c.textBaseline = "middle";
          const tw3 = c.measureText(T.name).width; c.fillStyle = "rgba(0,0,0,.6)"; c.fillRect(-tw3 / 2 - 5, -fs * .65, tw3 + 10, fs * 1.3); c.fillStyle = "#FFE9A0"; c.fillText(T.name, 0, 1); c.restore(); }
      }));
      c.fillStyle = "#0B0C14"; c.fillRect(0, H * .9, W, H * .1);
      drawRock(ax, ay, R, t / 900, true);
      // the sky glows as it gets closer
      c.fillStyle = `rgba(255,120,40,${.25 * k * k})`; c.fillRect(0, 0, W, H);
    }
    function crater(t){
      const sky = c.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, "#1A0E0E"); sky.addColorStop(1, "#4A1E12"); c.fillStyle = sky; c.fillRect(0, 0, W, H);
      const gr = c.createLinearGradient(0, H * .78, 0, H); gr.addColorStop(0, "#5A2E1A"); gr.addColorStop(1, "#2A140C"); c.fillStyle = gr; c.fillRect(0, H * .8, W, H * .2);
      // ruins at the edges
      [[.02, .16], [.9, .12], [.12, .08], [.82, .1]].forEach(([x, h]) => { c.fillStyle = "#1E1A1C"; c.beginPath(); c.moveTo(W * x, H * .84); c.lineTo(W * x, H * (.84 - h)); c.lineTo(W * x + 18, H * (.84 - h * .6)); c.lineTo(W * x + 34, H * (.84 - h * .9)); c.lineTo(W * x + 40, H * .84); c.fill(); });
      // the giant crater with a glowing rim
      const cx = W * .5, cy = H * .84, rx = W * .4, ry = H * .1;
      const glow = c.createRadialGradient(cx, cy, rx * .2, cx, cy, rx * 1.3); glow.addColorStop(0, "rgba(255,120,30,.55)"); glow.addColorStop(1, "rgba(255,80,0,0)");
      c.fillStyle = glow; c.fillRect(0, cy - rx, W, rx * 1.4);
      const rim = c.createRadialGradient(cx, cy, ry * .2, cx, cy, rx); rim.addColorStop(0, "#FF5A10"); rim.addColorStop(.25, "#5A1A08"); rim.addColorStop(.75, "#140806"); rim.addColorStop(.93, "#FF8A2A"); rim.addColorStop(1, "rgba(255,138,42,0)");
      c.save(); c.translate(cx, cy); c.scale(1, ry / rx); c.fillStyle = rim; c.beginPath(); c.arc(0, 0, rx, 0, 7); c.fill();
      c.strokeStyle = "rgba(255,170,80,.9)"; c.lineWidth = 6; c.shadowColor = "#FF7A1A"; c.shadowBlur = 25; c.beginPath(); c.arc(0, 0, rx * .93, Math.PI * 1.02, Math.PI * 1.98); c.stroke(); c.restore(); c.shadowBlur = 0;
      embers.forEach(e2 => { e2.y += e2.vy / 60; e2.x += e2.vx / 60; e2.l -= .006; if (e2.l <= 0 || e2.y < 0) { e2.y = H * .84; e2.x = W * (.15 + Math.random() * .7); e2.l = 1; } c.globalAlpha = Math.max(0, e2.l); c.fillStyle = "#FF9A3A"; c.beginPath(); c.arc(e2.x, e2.y, e2.r, 0, 7); c.fill(); });
      c.globalAlpha = 1;
      for (let i = 0; i < 6; i++) { const x = W * (.3 + i * .08) + Math.sin(t / 900 + i) * 20, y = H * .7 - ((t / 20 + i * 60) % (H * .6)); c.fillStyle = "rgba(40,30,30,.35)"; c.beginPath(); c.arc(x, y, 40 + i * 6, 0, 7); c.fill(); }
    }
    function frame(now){
      if (done) return;
      const t = Math.max(0, now - t0);
      if (t < 3200) space(t);
      else if (t < 6600) { if (phase === 0) { phase = 1; if (sound) roar(); } city(t - 3200); }
      else {
        if (phase === 1) { phase = 2; if (sound) { impact(); setTimeout(() => crackle(3), 1200); } }
        const k = (t - 6600) / 1000;
        c.save(); if (k < .9) c.translate((Math.random() - .5) * 26 * (1 - k), (Math.random() - .5) * 26 * (1 - k));
        crater(t); c.restore();
        const fl = k < .3 ? 1 : Math.max(0, 1 - (k - .3) / 1.1); if (fl > 0) { c.fillStyle = `rgba(255,255,255,${fl})`; c.fillRect(0, 0, W, H); }
      }
      if (t > 8700 && !el.querySelector(".msg")) showMsg();
      requestAnimationFrame(frame);
    }
    async function showMsg(){
      const m = document.createElement("div"); m.className = "msg";
      m.innerHTML = `<div class="box"><h1 style="font-size:clamp(1.6rem,6vw,3.6rem)">${esc(String(name).toUpperCase())}<br>HAS LAUNCHED AN<br>EXTINCTION EVENT</h1><p>☄️ Everybody has lost <b>ALL</b> their coins.</p><p id="nkm"></p></div>`;
      el.appendChild(m); if (sound) { tone(130, 0, 1, "sawtooth", .14); tone(98, .6, 1.4, "sawtooth", .14); }
      const p = m.querySelector("#nkm");
      const gm = (getMessage ? Promise.resolve().then(getMessage) : Promise.resolve(null)).then(info => { if (p) p.innerHTML = info && info.sub ? info.sub : ""; }).catch(() => {});
      await Promise.race([gm, sleep(4000)]);
      const finish = () => { if (done) return; done = true; el.remove(); resolve(); };
      if (autoCloseMs) setTimeout(finish, autoCloseMs);
      if (button) { const b = document.createElement("button"); b.className = "go"; b.style.animation = "none"; b.textContent = button; b.onclick = finish; m.querySelector(".box").appendChild(b); }
    }
    requestAnimationFrame(frame);
  });
}

/* ---------- ZEUS'S WRATH ---------- */
const ZEUS = `<svg viewBox="0 0 160 200" aria-label="Zeus">
  <path d="M10 190 Q20 160 50 168 Q60 145 90 158 Q115 140 135 165 Q160 160 155 190Z" fill="#F4F7FF"/>
  <path d="M50 110 Q80 96 110 110 L118 172 L42 172Z" fill="#FFFFFF" stroke="#C9D6F2" stroke-width="2"/><path d="M50 110 L110 160" stroke="#E0B030" stroke-width="7"/>
  <path d="M110 112 Q132 92 136 60" stroke="#E2A97E" stroke-width="13" stroke-linecap="round" fill="none"/>
  <path d="M50 114 Q36 132 44 150" stroke="#E2A97E" stroke-width="12" stroke-linecap="round" fill="none"/>
  <path d="M128 64 L150 20 L138 22 L148 -6 L120 34 L132 32 L116 66Z" fill="#FFD400" stroke="#B08600" stroke-width="2"/>
  <ellipse cx="80" cy="66" rx="22" ry="25" fill="#E2A97E"/>
  <path d="M56 60 Q54 34 80 32 Q106 34 104 60 Q100 44 80 42 Q60 44 56 60Z" fill="#F4F4F4"/>
  <path d="M58 70 Q56 108 80 116 Q104 108 102 70 Q96 86 80 86 Q64 86 58 70Z" fill="#F4F4F4" stroke="#DADADA"/>
  <path d="M68 60 l9 2 M92 60 l-9 2" stroke="#555" stroke-width="3.5" stroke-linecap="round"/><circle cx="72" cy="66" r="2.6" fill="#222"/><circle cx="88" cy="66" r="2.6" fill="#222"/>
  ${[-50, -30, -10, 10, 30, 50].map(a => `<ellipse cx="${80 + Math.sin(a * Math.PI / 180) * 24}" cy="${40 - Math.cos(a * Math.PI / 180) * 6}" rx="6" ry="3" fill="#3A9A4A" transform="rotate(${a} ${80 + Math.sin(a * Math.PI / 180) * 24} ${40 - Math.cos(a * Math.PI / 180) * 6})"/>`).join("")}
</svg>`;
async function zeusThrow({victimName}){
  const el = mount2(); ac();
  try {
    el.innerHTML = `<div class="nk-c" style="background:linear-gradient(#2A3150,#5A6688 60%,#8A94B0); justify-content:flex-start">
      <div style="position:absolute; left:0; right:0; top:3%; display:flex; justify-content:center; gap:4%; opacity:.9">${Array.from({length: 6}, () => `<div style="width:5%; height:26vh; background:linear-gradient(90deg,#CFCFD6,#FFF,#BFBFC8); border-radius:3px"></div>`).join("")}</div>
      <div style="position:absolute; left:0; right:0; top:2%; height:5vh; background:#E6E6EC; clip-path:polygon(8% 100%,50% 0,92% 100%)"></div>
      <div id="zs" style="position:absolute; top:12vh; left:50%; transform:translateX(-50%); width:min(56vw,260px)">${ZEUS}</div>
      <h1 style="position:absolute; top:58vh; left:0; right:0; font-size:clamp(1.8rem,8vw,3.4rem); color:#FFE066; text-shadow:3px 3px 0 #2A3150">⚡ ZEUS'S WRATH ⚡</h1>
      <p id="zt" style="position:absolute; top:68vh; left:0; right:0; font-size:1.3rem">Zeus takes aim at <b>${esc(victimName)}</b>…</p>
      <svg id="bolt" viewBox="0 0 100 400" preserveAspectRatio="none" style="position:absolute; left:52%; top:30vh; width:80px; height:70vh; opacity:0">
        <polyline points="50,0 30,90 60,110 25,210 70,230 35,330 55,400" fill="none" stroke="#FFF7B0" stroke-width="10" stroke-linejoin="bevel" style="filter:drop-shadow(0 0 12px #FFE066) drop-shadow(0 0 30px #9FE8FF)"/></svg>
      <div id="zf" style="position:absolute; inset:0; background:#E8F6FF; opacity:0; transition:opacity .9s"></div></div>`;
    thunder(); await sleep(1300);
    const bolt = el.querySelector("#bolt"); bolt.style.opacity = 1; bolt.animate([{clipPath: "inset(0 0 100% 0)"}, {clipPath: "inset(0 0 0 0)"}], {duration: 260, fill: "forwards"});
    thunder(); const zf = el.querySelector("#zf"); zf.style.transition = "none"; zf.style.opacity = 1; await sleep(80); zf.style.transition = "opacity .9s"; zf.style.opacity = 0;
    el.querySelector("#zt").innerHTML = `⚡ <b>${esc(victimName)}</b> has been struck!`;
    await sleep(1600);
  } catch (e) {}
  el.remove();
}
function zapped({from, lost}){
  return new Promise(resolve => {
    const old = document.getElementById("zapov"); if (old) old.remove();
    if (!document.getElementById("nk-css2")) { const s = document.createElement("style"); s.id = "nk-css2"; s.textContent = css + css2; document.head.appendChild(s); }
    const ov = document.createElement("div"); ov.id = "zapov"; document.body.appendChild(ov);
    const cv = document.createElement("canvas"), dpr = Math.min(2, window.devicePixelRatio || 1), W = innerWidth, H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + "px"; cv.style.height = H + "px"; ov.appendChild(cv);
    const c = cv.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const t0 = performance.now(); let shown = false, closed = false; ac(); thunder(); bzzt(2.2);
    const bolt = (x0, y0, x1, y1, w) => { c.beginPath(); c.moveTo(x0, y0); const n = 9; for (let i = 1; i < n; i++) { const k = i / n; c.lineTo(x0 + (x1 - x0) * k + (Math.random() - .5) * 70, y0 + (y1 - y0) * k + (Math.random() - .5) * 40); } c.lineTo(x1, y1); c.lineWidth = w; c.stroke(); };
    (function f(now){
      if (closed) return;
      const t = now - t0, k = Math.max(0, 1 - Math.max(0, t - 1800) / 900);
      c.fillStyle = Math.random() < .35 ? `rgba(220,240,255,${.75 * k})` : `rgba(8,16,48,${.92})`; c.fillRect(0, 0, W, H);
      c.strokeStyle = `rgba(200,245,255,${k})`; c.shadowColor = "#7FE0FF"; c.shadowBlur = 24; c.lineCap = "round";
      for (let i = 0; i < 6; i++) { const e1 = Math.random() * 4 | 0, e2 = (e1 + 2) % 4, pt = e => [[Math.random() * W, 0], [W, Math.random() * H], [Math.random() * W, H], [0, Math.random() * H]][e]; const [a, b] = pt(e1), [x, y] = pt(e2); bolt(a, b, x, y, 2 + Math.random() * 4); }
      c.shadowBlur = 0;
      cv.style.transform = t < 1600 ? `translate(${(Math.random() - .5) * 12}px,${(Math.random() - .5) * 12}px)` : "";
      if (t > 1500 && !shown) { shown = true;
        const card = document.createElement("div"); card.className = "card";
        card.innerHTML = `<div style="font-size:4rem">⚡</div><h1>ZAPPED!</h1><p style="font-size:1.15rem"><b>${esc(from)}</b> called down <b>ZEUS'S WRATH</b> on you!</p><p style="font-size:1.4rem; color:#FFE066">${lost ? `You lost ${lost} coin${lost > 1 ? "s" : ""}` : "Luckily you had no coins to lose 😅"}</p><button class="go" id="zok" style="animation:none">OK</button>`;
        ov.appendChild(card);
        const close = () => { if (closed) return; closed = true; ov.remove(); resolve(); };
        card.querySelector("#zok").onclick = close; setTimeout(close, 7000);
      }
      requestAnimationFrame(f);
    })(t0);
  });
}

/* =====================================================================
   SLIME CURSE (three witches) and the BLUE SHELL duel
   ===================================================================== */
const css3 = `
#nk .coven{position:absolute; inset:0; overflow:hidden; background:radial-gradient(ellipse at 50% 85%, rgba(80,255,120,.35), transparent 45%), linear-gradient(#120826, #2A0F3A 60%, #0E1A12)}
#nk .moon{position:absolute; right:10%; top:8%; width:70px; height:70px; border-radius:50%; background:#F4F0C8; box-shadow:0 0 40px #F4F0C8}
#nk .caul{position:absolute; left:50%; bottom:6%; width:min(70vw,360px); transform:translateX(-50%)}
#nk .witch{position:absolute; bottom:12%; width:min(30vw,170px); animation:stir 1.1s ease-in-out infinite alternate; transform-origin:50% 90%}
#nk .witch.w1{left:4%} #nk .witch.w2{left:50%; bottom:30%; transform:translateX(-50%); width:min(26vw,150px); animation-name:stir2} #nk .witch.w3{right:4%; transform:scaleX(-1); animation-name:stir3}
@keyframes stir{from{transform:rotate(-6deg)} to{transform:rotate(6deg)}}
@keyframes stir2{from{transform:translateX(-50%) rotate(-5deg)} to{transform:translateX(-50%) rotate(5deg)}}
@keyframes stir3{from{transform:scaleX(-1) rotate(-6deg)} to{transform:scaleX(-1) rotate(6deg)}}
#nk .bub{position:absolute; border-radius:50%; background:radial-gradient(circle at 35% 30%, #CFFFD0, #4CD964 60%, #1E8C2E); animation:bub 1.4s ease-in infinite; opacity:.9}
@keyframes bub{from{transform:translateY(0) scale(.4); opacity:.95} to{transform:translateY(-120px) scale(1.2); opacity:0}}
#nk .chant{position:absolute; top:6%; left:0; right:0; text-align:center; font-family:"Bungee","Arial Black",sans-serif; color:#8DFF8A; text-shadow:0 0 18px #2ECC40, 3px 3px 0 #0A3A10; font-size:clamp(1.5rem,7vw,3.4rem); line-height:1.15; padding:0 10px}
#nk .chant span{display:inline-block; animation:nkpop .35s cubic-bezier(.2,1.6,.4,1) both}
#slimeov{position:fixed; inset:0; z-index:52; pointer-events:none; overflow:hidden}
#slimeov svg{position:absolute; left:-3%; width:106%; top:0; height:100%; animation:ooze 6s ease-out both, wob 2.4s ease-in-out infinite alternate}
@keyframes ooze{from{transform:translateY(-85%)} to{transform:translateY(0)}}
@keyframes wob{from{filter:drop-shadow(0 6px 6px rgba(0,60,0,.45))} to{filter:drop-shadow(0 10px 10px rgba(0,60,0,.55))}}
#slimeov.off svg{animation:slideoff 1.2s ease-in forwards}
@keyframes slideoff{to{transform:translateY(110%); opacity:0}}
#slimeov .tag{position:absolute; bottom:12px; left:50%; transform:translateX(-50%); background:rgba(10,50,10,.85); color:#B8FFB0; font:900 .95rem "Nunito",sans-serif; padding:6px 12px; border-radius:99px; white-space:nowrap}
#nk .arena{position:absolute; left:50%; top:54%; transform:translate(-50%,-50%); touch-action:none; border-radius:16px; box-shadow:0 0 0 6px #C9A24A, 0 20px 50px rgba(0,0,0,.6); cursor:none}
#nk .duelbar{position:absolute; left:50%; transform:translateX(-50%); top:calc(54% - var(--half) - 34px); height:12px; border-radius:99px; background:rgba(255,255,255,.2); overflow:hidden}
#nk .duelbar i{display:block; height:100%; background:linear-gradient(90deg,#3FD8FF,#FFD23F); width:100%}
`;
function mount3(){ const el = mount2(); if (!document.getElementById("nk-css3")) { const s = document.createElement("style"); s.id = "nk-css3"; s.textContent = css3; document.head.appendChild(s); } return el; }
const WITCH = (robe, hat) => `<svg viewBox="0 0 120 170">
  <path d="M60 4 L86 58 L34 58Z" fill="${hat}"/><ellipse cx="60" cy="58" rx="40" ry="8" fill="${hat}"/><rect x="44" y="46" width="32" height="6" fill="#B07AFF"/>
  <path d="M38 66 Q30 96 34 120 M82 66 Q90 96 86 120" stroke="#3A2A2A" stroke-width="7" fill="none" stroke-linecap="round"/>
  <ellipse cx="60" cy="78" rx="18" ry="20" fill="#8DD47A"/><path d="M60 78 L76 92 L62 90Z" fill="#7AC266"/>
  <circle cx="53" cy="74" r="3" fill="#200"/><circle cx="67" cy="74" r="3" fill="#200"/><path d="M52 90 q8 5 14 0" stroke="#200" stroke-width="2.5" fill="none"/>
  <path d="M36 100 L84 100 L98 170 L22 170Z" fill="${robe}"/>
  <path d="M84 110 Q100 120 104 140" stroke="#8DD47A" stroke-width="8" stroke-linecap="round" fill="none"/>
  <line x1="104" y1="110" x2="92" y2="170" stroke="#6A4423" stroke-width="6" stroke-linecap="round"/></svg>`;
const CAULDRON = `<svg viewBox="0 0 300 200">
  <ellipse cx="150" cy="190" rx="120" ry="10" fill="rgba(0,0,0,.5)"/>
  <path d="M60 182 L48 198 M240 182 L252 198 M150 186 L150 200" stroke="#111" stroke-width="10" stroke-linecap="round"/>
  <path d="M30 70 Q30 190 150 190 Q270 190 270 70Z" fill="#1A1A1A" stroke="#333" stroke-width="3"/>
  <ellipse cx="150" cy="70" rx="124" ry="22" fill="#222" stroke="#444" stroke-width="5"/>
  <ellipse cx="150" cy="72" rx="110" ry="15" fill="#3DDC64"/><ellipse cx="130" cy="70" rx="40" ry="5" fill="#B8FFB0" opacity=".6"/>
  <path d="M20 160 Q150 120 280 160" stroke="rgba(255,140,40,.6)" stroke-width="18" fill="none" filter="blur(6px)"/></svg>`;
function bubbling(dur){ for (let i = 0; i < dur * 7; i++) { const t = Math.random() * dur; tone(90 + Math.random() * 160, t, .07, "sine", .14, 300 + Math.random() * 200); } }
function cackle(){ for (let i = 0; i < 6; i++) tone(900 - i * 40, i * .12, .1, "square", .07, 1300 - i * 50); }
async function witches({victimName}){
  const el = mount3(); ac();
  try {
    el.innerHTML = `<div class="coven"><div class="moon"></div>
      <div class="witch w2">${WITCH("#2A1A4A", "#140A24")}</div><div class="witch w1">${WITCH("#3A0F4A", "#1A0A20")}</div><div class="witch w3">${WITCH("#0F3A2A", "#0A1A14")}</div>
      <div class="caul">${CAULDRON}${Array.from({length: 10}, (_, i) => `<span class="bub" style="left:${20 + Math.random() * 60}%; top:22%; width:${10 + Math.random() * 18}px; height:${10 + Math.random() * 18}px; animation-delay:${(i * .15).toFixed(2)}s"></span>`).join("")}</div>
      <div class="chant" id="chant"></div></div>`;
    bubbling(4); cackle();
    try { if (window.speechSynthesis) { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance("Double, double, toil and trouble!"); u.rate = .8; u.pitch = .4; speechSynthesis.speak(u); } } catch (e) {}
    const words = ["DOUBLE,", "DOUBLE,", "TOIL", "AND", "TROUBLE!"], ch = el.querySelector("#chant");
    for (const w of words) { ch.insertAdjacentHTML("beforeend", `<span>${w}&nbsp;</span>`); tone(200, 0, .2, "sawtooth", .08, 140); await sleep(430); }
    await sleep(500); cackle();
    ch.innerHTML = `<span>🧪 ${esc(victimName).toUpperCase()}</span><br><span>HAS BEEN SLIMED!</span>`;
    const blob = document.createElement("div"); blob.style.cssText = "position:absolute; left:50%; bottom:30%; width:60px; height:60px; border-radius:50%; background:radial-gradient(circle at 35% 30%,#CFFFD0,#3DDC64 60%,#1E8C2E); z-index:5";
    el.querySelector(".coven").appendChild(blob);
    blob.animate([{transform: "translate(-50%,0) scale(1)"}, {transform: "translate(40vw,-90vh) scale(2.5)"}], {duration: 900, easing: "ease-in", fill: "forwards"});
    tone(300, 0, .5, "sine", .15, 1200);
    await sleep(1600);
  } catch (e) {}
  el.remove();
}
// green slime oozing down the victim's screen (taps still go through to the answers)
function slimed(){
  const old = document.getElementById("slimeov"); if (old) old.remove();
  if (!document.getElementById("nk-css3")) { const s = document.createElement("style"); s.id = "nk-css3"; s.textContent = css + css2 + css3; document.head.appendChild(s); }
  const ov = document.createElement("div"); ov.id = "slimeov";
  // drips of different lengths: most reach well over the question, a few hang over the answers
  const drips = Array.from({length: 13}, (_, i) => { const x = i * 8 + Math.random() * 4, w = 4 + Math.random() * 6, len = [38, 62, 45, 74, 52, 40, 68, 48, 58, 35, 70, 44, 55][i] + Math.random() * 8;
    return `<path d="M${x} 0 L${x} ${len - w} Q${x} ${len} ${x + w / 2} ${len} Q${x + w} ${len} ${x + w} ${len - w} L${x + w} 0Z"/><circle cx="${x + w / 2}" cy="${len + 3}" r="${w * .35}" opacity=".9"/>`; }).join("");
  ov.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none"><defs><linearGradient id="slg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2FB84A"/><stop offset=".6" stop-color="#4CD964"/><stop offset="1" stop-color="#7DFF8A"/></linearGradient></defs>
    <g fill="url(#slg)" opacity=".96"><path d="M0 0 H100 V28 Q90 34 80 27 Q70 36 58 28 Q46 35 36 27 Q24 34 14 27 Q6 33 0 28Z"/>${drips}</g>
    <g fill="#E8FFE8" opacity=".45">${Array.from({length: 14}, () => `<ellipse cx="${Math.random() * 100}" cy="${4 + Math.random() * 40}" rx="${.8 + Math.random() * 1.6}" ry="${.5 + Math.random()}"/>`).join("")}</g></svg>
    <div class="tag">🧪 You've been SLIMED!</div>`;
  document.body.appendChild(ov);
  for (let i = 0; i < 5; i++) tone(120 + Math.random() * 80, i * .25, .3, "sine", .1, 60);
  return () => { ov.classList.add("off"); setTimeout(() => ov.remove(), 1300); };
}

/* ---------- the BLUE SHELL duel ---------- */
// role: "shell" (the shooter, and the referee), "king" (1st place) or "view" (the board)
function duel({role, shooterName, kingName, send, listen, duration = 6000, intro = 3000}){
  return new Promise(resolve => {
    const el = mount3(), W = innerWidth, H = innerHeight, S = Math.min(W * .94, H * .66), dpr = Math.min(2, window.devicePixelRatio || 1);
    el.innerHTML = `<div class="nk-c" style="background:radial-gradient(ellipse at 50% 40%, #3A1A4A, #120A1E 70%)"></div>
      <h1 id="dt" style="position:absolute; top:3%; left:0; right:0; text-align:center; font-size:clamp(1.2rem,5vw,2.2rem); color:#FFD23F; padding:0 10px"></h1>
      <div class="duelbar" style="--half:${S / 2}px; width:${S}px"><i id="dbar"></i></div>
      <canvas class="arena" id="ar" style="width:${S}px; height:${S}px"></canvas>`;
    const cv = el.querySelector("#ar"); cv.width = S * dpr; cv.height = S * dpr; const c = cv.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const title = el.querySelector("#dt"), bar = el.querySelector("#dbar");
    const shell = {x: .5, y: .9, a: -Math.PI / 2}, king = {x: .5, y: .22};
    const remote = {s: {x: .5, y: .9, a: -Math.PI / 2}, k: {x: .5, y: .22}};
    let target = role === "shell" ? {x: .5, y: .5} : {x: .5, y: .22}, started = false, finished = false, startAt = 0, res = null, lastSend = 0, trail = [];
    const SP_SHELL = .66, SP_KING = .54, TURN = 3.4, HIT = .068;
    const toArena = e => { const r = cv.getBoundingClientRect(); return {x: Math.max(.04, Math.min(.96, (e.clientX - r.left) / r.width)), y: Math.max(.04, Math.min(.96, (e.clientY - r.top) / r.height))}; };
    if (role !== "view") { ["pointermove", "pointerdown"].forEach(t => cv.addEventListener(t, e => { e.preventDefault(); target = toArena(e); })); el.addEventListener("pointermove", e => { if (e.target !== cv) { const p = toArena(e); target = p; } }); }
    title.innerHTML = role === "shell" ? `🐢 BLUE SHELL! Steer it into <b>${esc(kingName)}</b>!` : role === "king" ? `👑 <b>${esc(shooterName)}</b> fired a BLUE SHELL at you! Dodge it for 6 seconds!` : `🐢 ${esc(shooterName)}'s BLUE SHELL vs 👑 ${esc(kingName)}!`;
    const off = listen(v => { if (!v) return; if (v.s) remote.s = v.s; if (v.k) remote.k = v.k; if (v.go && !started && role !== "shell") { started = true; startAt = performance.now(); } if (v.res && !res) { res = v.res; } });
    function drawRoom(){
      for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { c.fillStyle = (i + j) % 2 ? "#4A4458" : "#3A3448"; c.fillRect(i * S / 8, j * S / 8, S / 8 + 1, S / 8 + 1); }
      c.fillStyle = "#A0102A"; c.fillRect(S * .4, 0, S * .2, S); c.fillStyle = "#E0B030"; c.fillRect(S * .4, 0, 3, S); c.fillRect(S * .6 - 3, 0, 3, S);
      [[.1, .1], [.9, .1], [.1, .9], [.9, .9]].forEach(([x, y]) => { c.fillStyle = "#6E6680"; c.beginPath(); c.arc(x * S, y * S, S * .045, 0, 7); c.fill(); c.fillStyle = "#8A8299"; c.beginPath(); c.arc(x * S - 3, y * S - 3, S * .03, 0, 7); c.fill(); });
      c.fillStyle = "#C9A24A"; c.fillRect(S * .44, S * .02, S * .12, S * .08); c.fillStyle = "#A0102A"; c.fillRect(S * .46, S * .035, S * .08, S * .05);
      [.2, .8].forEach(x => { c.fillStyle = "#2A3B8F"; c.beginPath(); c.moveTo(x * S - S * .04, 0); c.lineTo(x * S + S * .04, 0); c.lineTo(x * S + S * .04, S * .12); c.lineTo(x * S, S * .1); c.lineTo(x * S - S * .04, S * .12); c.fill(); c.fillStyle = "#FFD23F"; c.beginPath(); c.arc(x * S, S * .05, S * .012, 0, 7); c.fill(); });
    }
    function drawKing(p){
      const x = p.x * S, y = p.y * S, r = S * .045;
      c.fillStyle = "rgba(0,0,0,.35)"; c.beginPath(); c.ellipse(x, y + r * 1.1, r, r * .35, 0, 0, 7); c.fill();
      c.fillStyle = "#B0102A"; c.beginPath(); c.moveTo(x - r, y - r * .2); c.lineTo(x + r, y - r * .2); c.lineTo(x + r * 1.2, y + r * 1.1); c.lineTo(x - r * 1.2, y + r * 1.1); c.closePath(); c.fill();
      c.fillStyle = "#6A2A9A"; c.fillRect(x - r * .6, y - r * .1, r * 1.2, r * 1.1);
      c.fillStyle = "#F2C9A0"; c.beginPath(); c.arc(x, y - r * .55, r * .55, 0, 7); c.fill();
      c.fillStyle = "#EEE"; c.beginPath(); c.arc(x, y - r * .25, r * .42, 0, Math.PI); c.fill();
      c.fillStyle = "#FFD23F"; c.beginPath(); c.moveTo(x - r * .55, y - r * .9); for (let i = 0; i < 5; i++) { c.lineTo(x - r * .55 + i * r * .275, y - r * (i % 2 ? 1.05 : 1.45)); } c.lineTo(x + r * .55, y - r * .9); c.closePath(); c.fill();
    }
    function drawShell(p){
      const x = p.x * S, y = p.y * S, r = S * .042;
      trail.forEach((t, i) => { c.fillStyle = `rgba(63,216,255,${i / trail.length * .35})`; c.beginPath(); c.arc(t[0] * S, t[1] * S, r * (i / trail.length) * .9, 0, 7); c.fill(); });
      c.save(); c.translate(x, y); c.rotate((p.a || 0) + Math.PI / 2);
      c.fillStyle = "#EAF6FF"; c.beginPath(); c.ellipse(0, 0, r * 1.12, r * 1.02, 0, 0, 7); c.fill();
      const g = c.createRadialGradient(-r * .3, -r * .3, 2, 0, 0, r); g.addColorStop(0, "#7FD4FF"); g.addColorStop(1, "#1A4FD6"); c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, r, r * .9, 0, 0, 7); c.fill();
      c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = 2; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; c.beginPath(); c.moveTo(Math.cos(a) * r * .35, Math.sin(a) * r * .32); c.lineTo(Math.cos(a) * r * .85, Math.sin(a) * r * .76); c.stroke(); }
      c.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; c[i ? "lineTo" : "moveTo"](Math.cos(a) * r * .35, Math.sin(a) * r * .32); } c.closePath(); c.stroke();
      c.restore();
    }
    const t0 = performance.now(); let last = t0, hum = 0;
    (function frame(now){
      if (finished) return;
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      const sinceStart = now - t0;
      if (!started && role === "shell" && sinceStart >= intro) { started = true; startAt = now; send({go: true}); }
      if (!started && role !== "shell" && sinceStart >= intro + 1500) { started = true; startAt = now; }   // never wait forever for the go signal
      // move what I control
      if (started && !res) {
        if (role === "shell") {
          const want = Math.atan2(target.y - shell.y, target.x - shell.x); let d = want - shell.a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
          shell.a += Math.max(-TURN * dt, Math.min(TURN * dt, d)); shell.x = Math.max(.04, Math.min(.96, shell.x + Math.cos(shell.a) * SP_SHELL * dt)); shell.y = Math.max(.04, Math.min(.96, shell.y + Math.sin(shell.a) * SP_SHELL * dt));
        } else if (role === "king") {
          const dx = target.x - king.x, dy = target.y - king.y, d = Math.hypot(dx, dy);
          if (d > .01) { const st = Math.min(d, SP_KING * dt); king.x += dx / d * st; king.y += dy / d * st; }
        }
        if (now - lastSend > 80) { lastSend = now; if (role === "shell") send({s: {x: +shell.x.toFixed(4), y: +shell.y.toFixed(4), a: +shell.a.toFixed(3)}}); if (role === "king") send({k: {x: +king.x.toFixed(4), y: +king.y.toFixed(4)}}); }
      }
      // smooth the other side's position
      const ease = (a, b) => { a.x += (b.x - a.x) * Math.min(1, dt * 14); a.y += (b.y - a.y) * Math.min(1, dt * 14); if (b.a != null) a.a = b.a; };
      if (role !== "shell") ease(shell, remote.s); if (role !== "king") ease(king, remote.k);
      trail.push([shell.x, shell.y]); if (trail.length > 14) trail.shift();
      // the shooter's device is the referee
      if (role === "shell" && started && !res) {
        if (Math.hypot(shell.x - king.x, shell.y - king.y) < HIT) { res = {hit: true}; send({res}); }
        else if (now - startAt >= duration) { res = {hit: false}; send({res}); }
      }
      if (started && !res && role !== "shell" && now - startAt > duration + 4000) res = {hit: false, timeout: true};
      if (started && !res && (hum += dt) > .18) { hum = 0; tone(role === "king" ? 330 : 220, 0, .08, "triangle", .04); }
      bar.style.width = started ? Math.max(0, 100 - (now - startAt) / duration * 100) + "%" : "100%";
      drawRoom(); drawKing(king); drawShell(shell);
      if (!started) { c.fillStyle = "rgba(0,0,0,.45)"; c.fillRect(0, 0, S, S); c.fillStyle = "#FFF"; c.font = `900 ${S * .18}px "Bungee","Arial Black",sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(String(Math.max(1, Math.ceil((intro - sinceStart) / 1000))), S / 2, S / 2); }
      if (res && !finished) {
        finished = true; try { off(); } catch (e) {}
        if (res.hit) { noise(0, .6, .7, 900); tone(80, 0, .6, "sine", .4, 40); title.innerHTML = `💥 HIT! <b>${esc(kingName)}</b> loses 5 coins!`; c.fillStyle = "rgba(255,255,255,.7)"; c.fillRect(0, 0, S, S); }
        else { [523, 659, 784].forEach((f, i) => tone(f, i * .1, .2, "square", .08)); title.innerHTML = `👑 The king escaped! <b>${esc(kingName)}</b> is safe.`; }
        setTimeout(() => { el.remove(); resolve(res); }, 2400);
        return;
      }
      requestAnimationFrame(frame);
    })(t0);
  });
}

window.BPNUKE = {challenge, cutscene, siren, temple, asteroid, zeusThrow, zapped, thunder, witches, slimed, duel};


})();
