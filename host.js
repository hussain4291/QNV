/* QNV Quest (based on Blue Psych): the teacher's board. Live leaderboard, event feed, timer and controls. */
(function(){
"use strict";
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const META = QBANK.meta, Q = QBANK.Q, YEAR = META.year;
document.body.insertAdjacentHTML("afterbegin", `<svg width="0" height="0" style="position:absolute"><defs><radialGradient id="bpcoin" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#FFF6B0"/><stop offset=".45" stop-color="#FFCB2E"/><stop offset="1" stop-color="#B07A00"/></radialGradient></defs></svg>`);
const COIN = `<svg class="coin" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="url(#bpcoin)" stroke="#8A5A00" stroke-width="1.2"/><circle cx="12" cy="12" r="7.4" fill="none" stroke="#B07A00" stroke-width="1.2" opacity=".7"/><path d="M12 7.2l1.4 2.9 3.2.4-2.3 2.2.6 3.1-2.9-1.5-2.9 1.5.6-3.1-2.3-2.2 3.2-.4z" fill="#FFF2A8" opacity=".9"/><ellipse cx="8.6" cy="7.4" rx="3" ry="1.6" fill="#FFF" opacity=".55" transform="rotate(-30 8.6 7.4)"/></svg>`;
const CLASS_LIST = Object.keys(window.CLASSES || {}).filter(c => c.startsWith(YEAR));
const load = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const app = $("#app");

let db = null, code = null, cls = load("bp-cls-" + YEAR, CLASS_LIST[0]), mins = +load("bp-mins", 5);
if (!CLASS_LIST.includes(cls)) cls = CLASS_LIST[0];
let players = {}, ph = "setup", left = 0, iv = null, subs = [], seenEv = new Set(), feed = [], lastScores = {};
const G = p => `games/blue-${code}` + (p ? "/" + p : "");
const fmt = s => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;
const clean = v => { const o = {}; Object.keys(v || {}).forEach(k => { if (v[k] && v[k].name) o[k] = v[k]; }); return o; };   // ignore half-written entries
const ranked = () => Object.keys(players).sort((a, b) => (players[b].score || 0) - (players[a].score || 0) || (players[b].correct || 0) - (players[a].correct || 0) || String(players[a].name).localeCompare(players[b].name));

/* ---------- sound: music on the board only ---------- */
let AC = null, musicOn = load("bp-music", "1") === "1", bgIdx = 0, bg = null;
const TRACKS = ["../blue/music3.mp3"];   // one track, looped forever
// sound clips: NANI! when someone is robbed, a paint splat when someone is slimed
const CLIPS = {};
function clip(name){ try { let a = CLIPS[name]; if (!a) { a = CLIPS[name] = new Audio("../blue/" + name + ".mp3"); a.preload = "auto"; } a.currentTime = 0; a.volume = 1; a.play().catch(() => {}); } catch (e) {} }

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
const SFX = {
  click(){ tone(700, 0, .05, "triangle", .12); },
  join(){ tone(880, 0, .08, "sine", .15); tone(1320, .08, .12, "sine", .15); },
  coins(){ [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, i * .07, .18, "triangle", .15)); },
  steal(){ tone(1568, 0, .08, "square", .1); tone(2093, .08, .35, "square", .1); noise(.05, .25, .15, 8000); },
  boom(){ noise(0, .9, .7, 500); tone(110, 0, .7, "sawtooth", .3, 35); },
  freeze(){ [2093, 1760, 1568, 1319, 1175, 1047].forEach((f, i) => tone(f, i * .07, .5, "sine", .12)); },
  angel(){ [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * .1, .6, "sine", .12)); },
  demon(){ tone(140, 0, .7, "sawtooth", .22, 60); tone(147, .05, .7, "sawtooth", .15, 62); },
  alarm(){ for (let i = 0; i < 3; i++) { tone(880, i * .25, .12, "square", .12); tone(660, i * .25 + .12, .12, "square", .12); } },
  tick(){ tone(1400, 0, .04, "square", .1); },
  horn(){ tone(392, 0, .5, "sawtooth", .2); tone(523, .45, .5, "sawtooth", .2); tone(659, .9, 1, "sawtooth", .2); },
  fanfare(){ [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * .14, .3, "square", .13)); }
};
function playMusic(){
  if (!musicOn) return;
  if (!bg) { bg = new Audio(); bg.preload = "auto"; bg.loop = true; bg.volume = .45; bg.addEventListener("ended", () => { bgIdx = (bgIdx + 1) % TRACKS.length; bg.src = TRACKS[bgIdx]; bg.play().catch(() => {}); }); }
  if (!bg.src) bg.src = TRACKS[bgIdx];
  bg.play().catch(() => {});
}
function stopMusic(){ if (bg) bg.pause(); }
function toggleMusic(){ musicOn = !musicOn; save("bp-music", musicOn ? "1" : "0"); if (musicOn && ph !== "end") playMusic(); else stopMusic(); const b = $("#bmus"); if (b) b.textContent = musicOn ? "🎵 Music on" : "🔇 Music off"; }

/* ---------- setup ---------- */
function showSetup(){
  ph = "setup"; stopTimer();
  app.innerHTML = `<section class="h-setup">
    <h1 class="logo">QNV<br>QUEST<small>${esc(META.logoHTML ? META.logoHTML.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "Year " + YEAR)} · SOLO MODE</small></h1>
    <p class="h-sub">Everyone plays alone at their own speed. Answer right to earn coins and spin your wheel: steals, freezes, angels, demons… and the occasional nuke. Most coins when the timer ends wins.</p>
    <div class="h-boxes">
      <div class="h-box"><h3>Class</h3><div class="seg">${CLASS_LIST.map(c => `<button data-cls="${esc(c)}" aria-pressed="${c === cls}">${esc(c)}</button>`).join("")}</div>
        <p class="hint" id="clsd" style="margin:10px 0 0"></p></div>
      <div class="h-box"><h3>Time limit</h3><div class="seg">${[3, 5, 7, 10].map(m => `<button data-min="${m}" aria-pressed="${m === mins}">${m} min</button>`).join("")}</div>
        <p class="hint" style="margin:10px 0 0">You can end the game early at any time.</p></div>
    </div>
    <button class="btn primary" id="open" style="font-size:1.4rem; padding:16px 34px">Open the lobby</button>
    <div style="margin-top:12px"><button class="btn" id="lockpin" style="font-size:.95rem; padding:8px 16px">🔒 Sign out of this laptop</button></div>
    <div class="h-rules"><b style="color:var(--gold)">How it works</b><ul>
      <li>Every right answer = <b>+1 ${COIN}</b> and a spin of your own wheel. Coins never go below 0.</li>
      <li>${COIN} +1/+2/+3 · ✖️ <b>Double</b> your next spin · 🎯 <b>50/50</b> on your next question · 🧰 <b>Treasure</b> chest · 🎮 <b>Mini game</b> (one go per game, win = +4)</li>
      <li>🏴‍☠️ <b>Steal</b>: pick a victim. They hide 💰 gold and a 💣 bomb in 3 chests. Gold = +3. Bomb = you lose 1 to them. · ❄️ <b>Freeze</b> someone for 15 seconds</li>
      <li>😈 <b>Demon</b> sleeps on your screen and turns your next good spin into a <b>TRAP (−2)</b> · 😇 <b>Angel</b> blocks 2 steals, freezes or Zeus bolts (you choose) and chases demons away</li>
      <li>⚡ <b>Zeus's Wrath</b>: pick someone and Zeus strikes them with lightning: −5 coins (an angel can block it)</li>
      <li>☢️ <b>NUKE 'EM</b> (rare): 4 questions in 20 seconds, then LAUNCH. Everyone else loses <b>half</b> their coins.</li>
      <li>🧪 <b>Slime</b>: the witches cover someone's screen in green slime for 30 seconds · 🎁 <b>Mystery Box</b>: the bottom 3 might find a 🐢 <b>Blue Shell</b> and duel 1st place live (hit = take 5 coins)</li>
      <li>☄️ <b>EXTINCTION EVENT</b> (very rare, first 2 minutes only): survive the Mayan temple run (one chance) and an asteroid wipes out <b>ALL</b> everyone else's coins.</li>
      <li>Nukes and extinctions destroy every angel and demon. The launcher keeps their coins.</li>
    </ul></div></section>`;
  const desc = () => { $("#clsd").textContent = ((window.CLASSES || {})[cls] || []).length + " students on the register"; };
  desc();
  app.querySelectorAll("[data-cls]").forEach(b => b.onclick = () => { cls = b.dataset.cls; save("bp-cls-" + YEAR, cls); app.querySelectorAll("[data-cls]").forEach(x => x.setAttribute("aria-pressed", x === b)); SFX.click(); desc(); });
  app.querySelectorAll("[data-min]").forEach(b => b.onclick = () => { mins = +b.dataset.min; save("bp-mins", mins); app.querySelectorAll("[data-min]").forEach(x => x.setAttribute("aria-pressed", x === b)); SFX.click(); });
  $("#open").onclick = () => { ac(); playMusic(); openLobby(); };
  $("#lockpin").onclick = () => { NET.logout().catch(() => {}).then(() => location.reload()); };
}

/* ---------- lobby ---------- */
function stopSubs(){ subs.forEach(u => { try { u(); } catch (e) {} }); subs = []; }
async function openLobby(){
  app.innerHTML = `<section class="h-lobby"><h2 class="logo" style="font-size:3rem">Connecting…</h2></section>`;
  try {
    db = db || await NET.init();
    if (code) { stopSubs(); await db.remove(G()); }
    let c; for (let i = 0; i < 20; i++) { c = String(10000 + Math.floor(Math.random() * 90000)); if (!(await db.get(`games/blue-${c}/info`))) break; }
    code = c; players = {}; feed = []; seenEv = new Set(); lastScores = {};
    const folder = (location.pathname.match(/\/([^\/]+)\/[^\/]*$/) || [])[1] || "";
    await db.set(G("info"), {cls, year: YEAR, folder, origin: location.href.split(/[?#]/)[0].replace(/\/[^\/]+\/[^\/]*$/, ""), mins, created: Date.now(), blue: true});
    await db.set(G("state"), {ph: "lobby"});
  } catch (e) {
    app.innerHTML = `<section class="h-lobby"><h2 class="logo" style="font-size:3rem">Couldn't connect</h2><p class="h-sub">Check the internet connection. If it still fails, the school network may be blocking Google Firebase.<br><small>${esc(e && e.message || e)}</small></p>
      <div class="actions"><button class="btn primary" id="retry">Try again</button><button class="btn" id="back">Back</button></div></section>`;
    $("#retry").onclick = openLobby; $("#back").onclick = showSetup; return;
  }
  ph = "lobby";
  subs.push(db.on(G("players"), v => { const before = Object.keys(players).length; players = clean(v); watchScores(); if (Object.keys(players).length > before && ph === "lobby") SFX.join(); refresh(); }));
  subs.push(db.on(G("ev"), v => { if (!v) return; Object.keys(v).sort().forEach(k => { if (seenEv.has(k)) return; seenEv.add(k); db.remove(G("ev/" + k)); onEvent(v[k]); }); }));
  const url = new URL("blue-play.html?c=" + code + (NET.LOCAL ? "&local=1" : ""), location.href).href;
  app.innerHTML = `<section class="h-lobby">
    <h2 class="logo" style="font-size:clamp(2.2rem,5vw,3.6rem)">QNV QUEST <span style="font-size:.4em; color:var(--gold); text-shadow:none">${esc(cls)} · ${mins} min</span></h2>
    <div class="h-lobby-top"><div id="qr">Loading QR…</div>
      <div class="join-info"><p>Scan the QR code, or go to</p><p class="join-url">${esc(url.replace(/^https?:\/\//, ""))}</p><p style="margin-top:14px">and enter the code</p><p class="join-code">${code}</p></div></div>
    <p class="hint" id="jcount"></p><div class="chips" id="chips"></div><p class="hint" id="missing" style="max-width:1000px; margin:10px auto"></p>
    <div class="actions"><button class="btn" id="lback">← Back</button><button class="btn" id="bmus">${musicOn ? "🎵 Music on" : "🔇 Music off"}</button><button class="btn primary" id="lstart" style="font-size:1.4rem; padding:16px 34px" disabled>▶ Start the game</button></div></section>`;
  const qr = $("#qr");
  if (window.QRCode) { qr.innerHTML = ""; new QRCode(qr, {text: url, width: 230, height: 230, colorDark: "#3B0816", colorLight: "#FFFFFF"}); } else qr.textContent = "QR code unavailable: students can type the address instead.";
  $("#lback").onclick = async () => { stopSubs(); try { await db.remove(G()); } catch (e) {} code = null; showSetup(); };
  $("#bmus").onclick = toggleMusic;
  $("#lstart").onclick = startGame;
  refresh();
}
function refresh(){
  if (ph === "lobby") renderLobby();
  else if (ph === "play" || ph === "pause") renderLB();
}
function renderLobby(){
  const box = $("#chips"); if (!box) return;
  const ks = Object.keys(players).sort((a, b) => String(players[a].name).localeCompare(players[b].name));
  box.innerHTML = ks.map(k => `<span class="chip ${players[k].online === false ? "off" : ""}">${esc(players[k].name)}<button data-kick="${esc(k)}" aria-label="Remove ${esc(players[k].name)}">×</button></span>`).join("") || `<span class="hint">Nobody yet…</span>`;
  box.querySelectorAll("[data-kick]").forEach(b => b.onclick = () => { const p = players[b.dataset.kick]; if (p && confirm(`Remove ${p.name}?`)) db.remove(G("players/" + b.dataset.kick)); });
  $("#jcount").textContent = `${ks.length} joined`;
  const joined = new Set(ks.map(k => players[k].name));
  const missing = ((window.CLASSES || {})[cls] || []).filter(n => !joined.has(n));
  $("#missing").textContent = missing.length ? "Still to join: " + missing.join(", ") : "✅ Everyone on the register has joined";
  $("#lstart").disabled = !ks.length;
}

/* ---------- game ---------- */
function startGame(){
  ph = "play"; left = mins * 60; SFX.horn(); playMusic();
  app.innerHTML = `<section class="h-game">
    <div class="h-lbwrap"><div class="h-lbhead"><h2 class="logo">QNV QUEST</h2><span class="hint">${esc(cls)} · <span id="pcount"></span></span></div><div id="lb"></div></div>
    <div class="h-side">
      <div class="h-timer"><div class="t" id="tmr">${fmt(left)}</div>
        <div class="h-ctrl" style="margin-top:10px"><button class="btn" id="bpause">⏸ Pause</button><button class="btn danger" id="bend">⏹ End game</button><button class="btn" id="bmus">${musicOn ? "🎵 Music on" : "🔇 Music off"}</button></div></div>
      <div class="h-feed"><h3>Live feed</h3><div id="feed"></div></div>
      <div class="h-join">Late? Join with code <b>${code}</b></div>
    </div></section><div class="h-pause" id="hpause" style="display:none"><div><h2>PAUSED</h2><button class="btn primary" id="bres" style="font-size:1.4rem; margin-top:20px">▶ Resume</button></div></div>`;
  $("#bpause").onclick = pause; $("#bres").onclick = resume; $("#bmus").onclick = toggleMusic;
  $("#bend").onclick = () => { if (confirm("End the game now? The current leader wins.")) endGame(); };
  pushState(); renderLB(); renderFeed();
  stopTimer(); iv = setInterval(tick, 1000);
}
function pushState(){ if (db && code) db.set(G("state"), {ph, left, total: mins * 60}); }
let cutPause = false;   // the clock stops while a nuke or extinction cutscene plays
function tick(){
  if (ph !== "play" || cutPause) return;
  left--;
  const t = $("#tmr"); if (t) { t.textContent = fmt(left); t.classList.toggle("low", left <= 30); }
  if (left <= 10 && left > 0) SFX.tick();
  if (left <= 0) return endGame();
  pushState();
}
function stopTimer(){ if (iv) { clearInterval(iv); iv = null; } }
function pause(){ if (ph !== "play") return; ph = "pause"; pushState(); $("#hpause").style.display = "grid"; if (bg) bg.volume = .15; }
function resume(){ if (ph !== "pause") return; ph = "play"; pushState(); $("#hpause").style.display = "none"; if (bg) bg.volume = .45; }

function renderLB(){
  const box = $("#lb"); if (!box) return;
  const r = ranked(), n = r.length, H = box.clientHeight || 600, W = box.clientWidth || 800;
  const cols = n > 14 ? 2 : 1, per = Math.ceil(n / cols), colW = cols > 1 ? (W - 12) / 2 : W;
  const rowH = Math.max(26, Math.min(60, Math.floor(H / Math.max(per, 1))));
  const pos = i => `translate(${Math.floor(i / per) * (colW + 12)}px, ${(i % per) * rowH}px)`;
  const pc = $("#pcount"); if (pc) pc.textContent = n + " playing";
  const fs = Math.max(.85, Math.min(1.5, rowH / 36));
  const have = new Set();
  r.forEach((k, i) => {
    const p = players[k]; have.add(k);
    let el = box.querySelector(`[data-k="${CSS.escape(k)}"]`);
    if (!el) { el = document.createElement("div"); el.className = "lbr"; el.dataset.k = k; el.style.transform = `translate(0px, ${H}px)`; box.appendChild(el); }
    el.style.height = (rowH - 6) + "px"; el.style.width = colW + "px"; el.style.right = "auto"; el.style.fontSize = fs + "rem";
    el.className = "lbr" + (i < 3 ? " r" + (i + 1) : "") + (p.online === false ? " off" : "");
    el.onclick = () => playerMenu(k); el.style.cursor = "pointer";
    el.innerHTML = `<span class="rk">${i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span><span class="nm">${flagged[k] ? "⚠️ " : ""}${esc(p.name)}</span><span class="ic">${p.angel > 0 ? "😇".repeat(1) + (p.angel > 1 ? "×" + p.angel : "") : ""}${p.demon ? " 😈💤" : ""}${p.duel ? " 🏴‍☠️" : ""}</span><span class="sc">${p.score || 0} ${COIN}</span>`;
    const prev = lastScores[k], now = p.score || 0;
    if (prev != null && now !== prev) { el.classList.remove("bump", "hurt"); void el.offsetWidth; el.classList.add(now > prev ? "bump" : "hurt"); }
    lastScores[k] = now;
    requestAnimationFrame(() => { el.style.transform = pos(i); });
  });
  box.querySelectorAll(".lbr").forEach(el => { if (!have.has(el.dataset.k)) el.remove(); });
}

/* ---------- cheat watch: flag anyone whose coins jump faster than the game allows ---------- */
const hist = {}, flagged = {}, FLAG_GAIN = 30, FLAG_WIN = 20000;
function watchScores(){
  const now = Date.now();
  Object.keys(players).forEach(k => {
    const h = hist[k] || (hist[k] = []), sc = players[k].score || 0;
    if (!h.length || h[h.length - 1][1] !== sc) h.push([now, sc]);
    while (h.length && now - h[0][0] > FLAG_WIN) h.shift();
    let gain = 0; for (let i = 1; i < h.length; i++) gain += Math.max(0, h[i][1] - h[i - 1][1]);
    if (gain > FLAG_GAIN && !flagged[k]) { flagged[k] = now; feed.unshift({t: `⚠️ ${esc(players[k].name)}'s coins jumped very fast. Click their name to check.`, c: "bad"}); feed = feed.slice(0, 9); renderFeed(); }
  });
}
function playerMenu(k){
  const p = players[k]; if (!p || $("#pmenu")) return;
  document.body.insertAdjacentHTML("beforeend", `<div class="h-pause" id="pmenu" style="display:grid; z-index:50"><div class="card" style="max-width:440px; text-align:center">
    <div style="font-size:1.8rem; font-weight:900; margin:0 0 6px">${esc(p.name)}</div><p class="hint">${p.score || 0} coins · ${p.correct || 0} of ${p.answered || 0} correct${flagged[k] ? "<br>⚠️ Coins jumped very fast" : ""}</p>
    <div class="actions" style="flex-direction:column; gap:10px; margin-top:14px"><button class="btn" id="pm0">Reset coins to 0</button><button class="btn danger" id="pmk">🚫 Kick out (can't rejoin this game)</button><button class="btn" id="pmx">Cancel</button></div></div></div>`);
  const close = () => { const m = $("#pmenu"); if (m) m.remove(); };
  $("#pmx").onclick = close;
  $("#pm0").onclick = async () => { close(); try { await db.set(G("players/" + k + "/score"), 0); delete flagged[k]; hist[k] = []; feed.unshift({t: `🧹 The teacher reset ${esc(p.name)}'s coins`, c: "bad"}); feed = feed.slice(0, 9); renderFeed(); } catch (e) {} };
  $("#pmk").onclick = async () => { close(); try { if (p.uid) await db.set(G("ban/" + p.uid), true); await db.remove(G("players/" + k)); feed.unshift({t: `🚫 The teacher removed ${esc(p.name)}`, c: "bad"}); feed = feed.slice(0, 9); renderFeed(); } catch (e) {} };
}

/* ---------- live feed ---------- */
function onEvent(e){
  if (!e || (ph !== "play" && ph !== "pause")) return;
  const a = `<b>${esc(e.a)}</b>`, b = `<b>${esc(e.b)}</b>`;
  let t = "", cls2 = "", snd = null;
  switch (e.k) {
    case "join": t = `👋 ${a} joined late`; snd = "join"; break;
    case "pts": t = `💎 ${a} got +${e.n} ${COIN}${e.dbl ? " (doubled!)" : ""}`; cls2 = "good"; snd = "coins"; break;
    case "dbl": t = `✖️2 ${a} has DOUBLE on their next spin`; snd = "coins"; break;
    case "angel": t = `😇 ${a} has a guardian angel`; cls2 = "good"; snd = "angel"; break;
    case "angelup": t = `⚡ ${a}'s angel is FULLY CHARGED`; cls2 = "good"; snd = "angel"; break;
    case "demon": t = `😈 A demon is sleeping on ${a}'s screen… 💤`; snd = "demon"; break;
    case "trap": t = `💀 ${a}'s demon woke up: TRAP! −${e.n || 0} ${COIN}`; cls2 = "big"; snd = "demon"; break;
    case "chase": t = `🩴 ${a}'s angel chased the demon away with sandals!`; cls2 = "good"; snd = "angel"; break;
    case "nukestart": t = `☢️ ${a} is fuelling a NUKE…`; cls2 = "big"; snd = "alarm"; break;
    case "nukefail": t = `💨 ${a}'s nuke fizzled out. Phew!`; snd = "click"; break;
    case "nuke": t = `☢️☢️ ${a} NUKED THE CLASS! ☢️☢️`; cls2 = "big"; snd = null; playBlast(e); break;
    case "extstart": t = `🗿 ${a} has entered the temple of the EXTINCTION EVENT…`; cls2 = "big"; snd = "alarm"; break;
    case "extfail": t = `🗿 The gods rejected ${a}'s offering. Phew!`; snd = "click"; break;
    case "ext": t = `☄️☄️ ${a} LAUNCHED AN EXTINCTION EVENT! ☄️☄️`; cls2 = "big"; snd = null; playBlast(e); break;
    case "slime": t = `🧪 ${a} SLIMED ${b}! Double, double, toil and trouble…`; cls2 = "good"; snd = ""; clip("splat"); break;
    case "shell": t = `🐢 ${a} fired a BLUE SHELL at 👑 ${b}!`; cls2 = "big"; snd = "alarm"; watchDuel(e); break;
    case "shellhit": t = `💥 ${a}'s blue shell HIT ${b}${e.n ? `: ${e.n} ${COIN} stolen` : ""}!`; cls2 = "big"; snd = "boom"; if (e.n) clip("nani"); break;
    case "shellmiss": t = `👑 ${b} dodged ${a}'s blue shell!`; cls2 = "good"; snd = "angel"; break;
    case "zeus": t = `⚡ ${a} called down ZEUS'S WRATH on ${b}${e.n ? `: −${e.n} ${COIN}` : ""}!`; cls2 = "big"; snd = null; zeusFlash(); loadNuke().then(() => BPNUKE.thunder()).catch(() => {}); break;
    case "freeze": t = `❄️ ${a} FROZE ${b}!`; cls2 = "ice"; snd = "freeze"; break;
    case "blocked": t = `😇 ${b}'s angel blocked ${a}'s ${e.what === "steal" ? "steal" : e.what === "zeus" ? "lightning bolt" : e.what === "slime" ? "slime curse" : "freeze"}!`; cls2 = "good"; snd = "angel"; break;
    case "duel": t = `🏴‍☠️ ${a} is robbing ${b}…`; cls2 = "big"; snd = "alarm"; break;
    case "stole": t = e.n ? `💰 ${a} STOLE ${e.n} ${COIN} from ${b}!` : `💰 ${a} found ${b}'s gold… but it was empty!`; cls2 = "big"; snd = e.n ? "" : "steal"; if (e.n) clip("nani"); break;
    case "bomb": t = `💣 BOOM! ${a} opened ${b}'s bomb${e.n ? ` and lost ${e.n} ${COIN}` : ""}!`; cls2 = "big"; snd = "boom"; break;
    case "empty": t = `🫙 ${a} opened an empty chest. ${b} outsmarted them!`; snd = "click"; break;
    case "chest": t = `🧰 ${a} found treasure: +${e.n} ${COIN}`; cls2 = "good"; snd = "coins"; break;
    case "mgwin": t = `🎮 ${a} won ${esc(e.g)}: +${e.n} ${COIN}`; cls2 = "good"; snd = "fanfare"; break;
    default: return;
  }
  feed.unshift({t, c: cls2}); feed = feed.slice(0, 9);
  if (snd && SFX[snd]) SFX[snd]();
  renderFeed();
}
/* ---------- nukes and extinction events on the board ---------- */
let nukeTally = null, nukeBusy = false, blastQ = [];
function loadNuke(){
  if (window.BPNUKE) return Promise.resolve();
  if (loadNuke.p) return loadNuke.p;
  loadNuke.p = new Promise((res, rej) => { const s = document.createElement("script"); s.src = "../blue/nuke.js"; s.onload = res; s.onerror = e => { loadNuke.p = null; rej(e); }; document.head.appendChild(s); });
  return loadNuke.p;
}
const NUKE_PCT = .5, DELAY = {nuke: 5000, ext: 8400};
// the board takes the coins from every player itself (the launcher's device is the backup; only one can claim it).
// Nukes take half, extinction takes everything. Angels and demons are wiped out by both.
async function applyBlast(b){
  const claim = await db.tx(G("blasts/" + b.id + "/claimed"), cur => cur ? undefined : "board");
  if (!claim.committed) {   // the launcher's device already did it: read its summary
    for (let i = 0; i < 30; i++) { const sm = await db.get(G("blasts/" + b.id + "/summary")); if (sm) return Object.assign({angels: [], demons: []}, sm); await new Promise(r => setTimeout(r, 500)); }
    return {lost: 0, angels: [], demons: []};
  }
  const snap = Object.assign({}, players); let lost = 0; const angels = [], demons = [];
  for (const pid of Object.keys(snap)) {
    if (pid === b.by) continue;
    const p = snap[pid] || {}; let n = 0;
    await db.tx(G("players/" + pid + "/score"), cur => { cur = cur || 0; n = b.kind === "ext" ? cur : Math.ceil(cur * NUKE_PCT); return cur - n; });
    const upd = {}; if (p.angel > 0) { upd.angel = 0; angels.push(p.name); } if (p.demon) { upd.demon = false; demons.push(p.name); }
    if (Object.keys(upd).length) await db.update(G("players/" + pid), upd);
    lost += n; await db.set(G("blasts/" + b.id + "/loss/" + pid), {n, angel: p.angel > 0, demon: !!p.demon});
  }
  const sm = {lost, angels, demons}; await db.set(G("blasts/" + b.id + "/summary"), sm); return sm;
}
function playBlast(e){ blastQ.push(e); runBoardBlasts(); }
async function runBoardBlasts(){
  if (nukeBusy) return; nukeBusy = true;
  while (blastQ.length) {
    const e = blastQ.shift(), kind = e.k === "ext" ? "ext" : "nuke", b = {id: e.id, by: e.by, kind};
    const applied = (e.id ? new Promise(r => setTimeout(r, DELAY[kind])).then(() => applyBlast(b)) : Promise.resolve({lost: 0, angels: [], demons: []})).then(t => { nukeTally = Object.assign({kind}, t); return nukeTally; }).catch(() => ({lost: 0, angels: [], demons: []}));
    // the music keeps playing through nuke and asteroid cutscenes
    cutPause = true; const tm = $("#tmr"); if (tm) tm.textContent = "⏸ " + fmt(left);
    try {
      await loadNuke();
      const getMessage = async () => { const t = await applied;
        return {sub: `The class lost <b>${t.lost} ${COIN}</b>${t.angels.length ? `<br>😇💥 Angels destroyed: ${t.angels.map(esc).join(", ")}` : ""}${t.demons.length ? `<br>😈💥 Demons destroyed: ${t.demons.map(esc).join(", ")}` : ""}`}; };
      const names = ranked().map(k => players[k].name);
      while (document.visibilityState === "hidden") await new Promise(r => setTimeout(r, 500));   // play it when you come back to this tab
      const show = kind === "ext" ? BPNUKE.asteroid({name: e.a, names, sound: true, button: null, autoCloseMs: 6500, getMessage}) : BPNUKE.cutscene({name: e.a, sound: true, button: null, autoCloseMs: 5000, getMessage});
      await Promise.race([show, new Promise(r => setTimeout(r, 25000))]);
      { const n = document.getElementById("nk"); if (n) n.remove(); }
    } catch (err) { const n = document.getElementById("nk"); if (n) n.remove(); }
    await Promise.race([applied, new Promise(r => setTimeout(r, 15000))]); nukeFeed();
    cutPause = false; { const tm = $("#tmr"); if (tm) tm.textContent = fmt(left); }
    if (bg && musicOn && ph !== "end" && bg.paused) bg.play().catch(() => {});
  }
  nukeBusy = false;
}
function nukeFeed(){
  const t = nukeTally; if (!t) return;
  const what = t.kind === "ext" ? "The asteroid" : "The nuke";
  if (t.demons && t.demons.length) feed.unshift({t: `😈💥 ${what} destroyed ${t.demons.length === 1 ? "a demon" : t.demons.length + " demons"}: ${t.demons.map(esc).join(", ")}`, c: "big"});
  if (t.angels && t.angels.length) feed.unshift({t: `😇💥 ${what} destroyed ${t.angels.length === 1 ? "an angel" : t.angels.length + " angels"}: ${t.angels.map(esc).join(", ")}`, c: "big"});
  feed.unshift({t: `💥 ${what} wiped out <b>${t.lost}</b> ${COIN} from the class!`, c: "big"}); feed = feed.slice(0, 9); renderFeed();
}
// the board shows the blue shell chase live
async function watchDuel(e){
  if (nukeBusy || document.getElementById("nk") || !e.id) return;
  try { await loadNuke(); await BPNUKE.duel({role: "view", shooterName: e.a, kingName: e.b, send: () => {}, listen: cb => db.on(G("shells/" + e.id), cb)}); } catch (err) {}
}
function zeusFlash(){
  const f = document.createElement("div"); f.style.cssText = "position:fixed; inset:0; z-index:80; background:#DFF3FF; opacity:.95; pointer-events:none; transition:opacity .8s";
  document.body.appendChild(f); setTimeout(() => f.style.opacity = "0", 90); setTimeout(() => f.remove(), 1000);
}
function renderFeed(){ const f = $("#feed"); if (f) f.innerHTML = feed.map(x => `<div class="fd ${x.c}">${x.t}</div>`).join("") || `<p class="hint">Steals, freezes and big wins appear here.</p>`; }

/* ---------- end ---------- */
async function endGame(){
  if (ph === "end") return;
  ph = "end"; stopTimer(); pushState(); stopMusic(); SFX.fanfare();
  const r = ranked(), top = r.slice(0, 3).map(k => players[k]);
  const pod = (p, i) => p ? `<div class="pod p${i + 1}"><div class="md">${["🥇", "🥈", "🥉"][i]}</div><div class="pn">${esc(p.name)}</div><div class="ps">${p.score || 0} ${COIN}</div></div>` : "";
  app.innerHTML = `<section class="h-end"><h2 class="logo" style="font-size:clamp(2.6rem,7vw,5rem)">${top[0] ? esc(top[0].name) + " WINS!" : "GAME OVER"}</h2>
    <div class="podium">${pod(top[1], 1)}${pod(top[0], 0)}${pod(top[2], 2)}</div>
    <div class="endlist">${r.map((k, i) => `<div><span>${i + 1}. ${esc(players[k].name)}</span><span>${players[k].score || 0} ${COIN} · ${players[k].correct || 0}/${players[k].answered || 0} right</span></div>`).join("")}</div>
    <div class="actions"><button class="btn cyan" id="bxl">📥 Download results (Excel)</button><button class="btn" id="bnew">🔁 New game</button><button class="btn" id="bclear">🧹 Clear game data</button></div></section>`;
  confetti();
  $("#bxl").onclick = exportResults;
  $("#bnew").onclick = () => { stopSubs(); showSetup(); };
  $("#bclear").onclick = async () => { if (!confirm("Delete this game's online data (names and answers)? Download the results first if you need them.")) return; stopSubs(); await db.remove(G()); code = null; const b = $("#bclear"); b.textContent = "✅ Cleared"; b.disabled = true; $("#bxl").disabled = true; };
}
function confetti(){
  const cols = ["#3FD8FF", "#FFD23F", "#FF5A9E", "#4BE39A", "#9B5DE5"];
  for (let i = 0; i < 120; i++) {
    const d = document.createElement("div"); d.className = "confetti";
    d.style.left = Math.random() * 100 + "vw"; d.style.background = cols[i % cols.length];
    d.style.animationDuration = (2.5 + Math.random() * 2.5) + "s"; d.style.animationDelay = Math.random() * 1.5 + "s";
    document.body.appendChild(d); setTimeout(() => d.remove(), 7000);
  }
}
function loadScript(src){ return new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
async function exportResults(){
  const log = (await db.get(G("log"))) || {}, r = ranked();
  const students = [["Rank", "Student", "Coins", "Questions answered", "Correct", "% correct"]].concat(r.map((k, i) => {
    const p = players[k]; return [i + 1, p.name, p.score || 0, p.answered || 0, p.correct || 0, p.answered ? Math.round(100 * (p.correct || 0) / p.answered) : 0];
  }));
  const per = {};
  Object.keys(log).forEach(pid => Object.values(log[pid] || {}).forEach(x => { const q = per[x.i] || (per[x.i] = {n: 0, ok: 0, wrong: [0, 0, 0, 0], who: []}); q.n++; if (x.ok) q.ok++; else { q.wrong[x.a]++; q.who.push((players[pid] || {}).name || pid); } }));
  const qs = [["Topic", "Question", "Correct answer", "Times answered", "% correct", "Most common wrong answer", "Who got it wrong"]].concat(Object.keys(per).map(Number).sort((a, b) => per[a].ok / per[a].n - per[b].ok / per[b].n).map(i => {
    const [topic, q, opts, ans] = Q[i], x = per[i], wm = Math.max(...x.wrong), wi = x.wrong.indexOf(wm);
    return [topic, q, "ABCD"[ans] + ": " + opts[ans], x.n, Math.round(100 * x.ok / x.n), wm ? `${opts[wi]} (${wm})` : "none", [...new Set(x.who)].join(", ")];
  }));
  const d = new Date(), stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const base = `QNV Quest ${cls.replace(/\//g, "-")} ${stamp}`;
  try {
    if (!window.XLSX) await loadScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js");
    const wb = XLSX.utils.book_new();
    const s1 = XLSX.utils.aoa_to_sheet(students); s1["!cols"] = [{wch: 6}, {wch: 18}, {wch: 8}, {wch: 18}, {wch: 9}, {wch: 10}];
    const s2 = XLSX.utils.aoa_to_sheet(qs); s2["!cols"] = [{wch: 20}, {wch: 60}, {wch: 40}, {wch: 14}, {wch: 10}, {wch: 40}, {wch: 40}];
    XLSX.utils.book_append_sheet(wb, s1, "Students"); XLSX.utils.book_append_sheet(wb, s2, "Questions");
    XLSX.writeFile(wb, base + ".xlsx");
  } catch (e) {
    const csv = rows => rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob(["﻿" + csv(students) + "\r\n\r\n" + csv(qs)], {type: "text/csv"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = base + ".csv"; a.click();
  }
}
window.addEventListener("resize", () => { if (ph === "play" || ph === "pause") renderLB(); });
window.__bph = () => ({code, ph, left, players, feed});
window.__bpEnd = endGame;
showSetup();
})();
