/* QNV Quest: student page (v2). Everyone plays alone at their own speed.
   Right answer = +1 coin and a spin of your own wheel. Uses questions.js, classes.js and net.js from the year folder. */
(function(){
"use strict";
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const QB = window.QBANK, Q = QB.Q;
const params = new URLSearchParams(location.search);
const store = () => (NET.LOCAL ? sessionStorage : localStorage);   // test mode: each tab is its own student
const LS = {get(k){ try { return store().getItem(k); } catch (e) { return null; } }, set(k, v){ try { store().setItem(k, v); } catch (e) {} }};
let DEV = LS.get("bp-dev"); if (!DEV) { DEV = "d" + Math.random().toString(36).slice(2, 10); LS.set("bp-dev", DEV); }

const STEAL = 3, BOMB = 1, FREEZE_S = 15, TRAP = 2, MG_WIN = 4, ANGEL_MAX = 2, NUKE_PCT = .5, ZEUS = 5, SLIME_S = 30, SHELL = 5, EXT_WINDOW = 120;
const CHEST_VALUES = [0, 1, 0, -1, 2, 0, 1, 0, 3, 1, 0, -1, 0, 1, 0, 0];
// anything that would help you: a sleeping demon wakes up and turns it into a TRAP
const GOOD = new Set(["p1", "p2", "p3", "dbl", "chest", "steal", "freeze", "fifty", "mg", "nuke", "zeus", "ext", "slime", "mystery"]);

let db = null, code = null, info = null, me = null, players = {}, state = {ph: "lobby"}, subs = [];
let view = "code", msg = "", busy = false, inMG = false, frozenUntil = 0, frozenTimer = null, pendingFreeze = [];
let dbl = false, fifty = false, deck = [], dp = 0, curQ = null, qSeq = 0, wheelRot = 0, nukePlaying = false, fxBusy = false;
const G = p => `games/blue-${code}` + (p ? "/" + p : "");
const app = $("#app");
const slug = n => "n_" + n.toLowerCase().replace(/[.#$\[\]\/\s]+/g, "_");
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ---------- coins ---------- */
document.body.insertAdjacentHTML("afterbegin", `<svg width="0" height="0" style="position:absolute"><defs>
  <radialGradient id="bpcoin" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#FFF6B0"/><stop offset=".45" stop-color="#FFCB2E"/><stop offset="1" stop-color="#B07A00"/></radialGradient></defs></svg>`);
const COIN = `<svg class="coin" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="url(#bpcoin)" stroke="#8A5A00" stroke-width="1.2"/><circle cx="12" cy="12" r="7.4" fill="none" stroke="#B07A00" stroke-width="1.2" opacity=".7"/><path d="M12 7.2l1.4 2.9 3.2.4-2.3 2.2.6 3.1-2.9-1.5-2.9 1.5.6-3.1-2.3-2.2 3.2-.4z" fill="#FFF2A8" opacity=".9"/><ellipse cx="8.6" cy="7.4" rx="3" ry="1.6" fill="#FFF" opacity=".55" transform="rotate(-30 8.6 7.4)"/></svg>`;
const coins = n => `${n} ${COIN}`;
function drawCoin(c, x, y, r){
  const g = c.createRadialGradient(x - r * .35, y - r * .35, 1, x, y, r); g.addColorStop(0, "#FFF6B0"); g.addColorStop(.45, "#FFCB2E"); g.addColorStop(1, "#B07A00");
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.strokeStyle = "#8A5A00"; c.lineWidth = 1.5; c.stroke();
  c.strokeStyle = "rgba(176,122,0,.7)"; c.beginPath(); c.arc(x, y, r * .66, 0, 7); c.stroke();
  c.fillStyle = "rgba(255,255,255,.55)"; c.beginPath(); c.ellipse(x - r * .3, y - r * .38, r * .28, r * .14, -.5, 0, 7); c.fill();
}

/* ---------- characters ---------- */
const ANGEL = `<svg viewBox="0 0 120 130" aria-label="Guardian angel">
  <ellipse cx="60" cy="13" rx="19" ry="5.5" fill="none" stroke="#FFD84D" stroke-width="4"/>
  <path d="M48 62 C18 30 2 52 8 80 C22 76 36 74 48 72Z" fill="#FFF" stroke="#C9D6F2" stroke-width="2"/>
  <path d="M72 62 C102 30 118 52 112 80 C98 76 84 74 72 72Z" fill="#FFF" stroke="#C9D6F2" stroke-width="2"/>
  <path d="M44 60 L76 60 L90 118 L30 118Z" fill="#F4F7FF" stroke="#BFD0F0" stroke-width="2"/>
  <rect x="45" y="72" width="30" height="5" rx="2" fill="#FFD84D"/>
  <path d="M46 66 L28 82" stroke="#F6C9A8" stroke-width="5" stroke-linecap="round"/><path d="M74 66 L94 84" stroke="#F6C9A8" stroke-width="5" stroke-linecap="round"/>
  <path d="M10 76 L36 70 L38 96 C34 108 24 113 21 115 C14 109 8 102 8 92Z" fill="#3D7BFF" stroke="#FFD84D" stroke-width="3"/>
  <path d="M23 81 l2.8 5.8 6.4.9-4.6 4.5 1.1 6.3-5.7-3-5.7 3 1.1-6.3-4.6-4.5 6.4-.9z" fill="#FFD84D"/>
  <path d="M100 56 Q120 86 100 116" fill="none" stroke="#8A5A2B" stroke-width="4"/><line x1="100" y1="56" x2="100" y2="116" stroke="#EEE" stroke-width="1.5"/>
  <line x1="84" y1="86" x2="114" y2="86" stroke="#8A5A2B" stroke-width="2.5"/><path d="M114 86 l-6 -4 v8z" fill="#C0C6D0"/>
  <circle cx="60" cy="42" r="17" fill="#F6C9A8"/>
  <path d="M42 44 C40 20 80 20 78 44 C76 32 70 27 60 27 C50 27 44 32 42 44Z" fill="#F2C14E"/><path d="M42 44 C40 52 42 58 46 60 L46 44Z M78 44 C80 52 78 58 74 60 L74 44Z" fill="#F2C14E"/>
  <circle cx="54" cy="43" r="2.3" fill="#2A2A40"/><circle cx="66" cy="43" r="2.3" fill="#2A2A40"/>
  <circle cx="50" cy="49" r="3" fill="#FF9BB0" opacity=".6"/><circle cx="70" cy="49" r="3" fill="#FF9BB0" opacity=".6"/>
  <path d="M55 50 Q60 55 65 50" fill="none" stroke="#B0506A" stroke-width="2" stroke-linecap="round"/></svg>`;
function DEMON(state){
  const eyes = state === "sleep" ? `<path d="M34 56 q6 5 12 0 M54 56 q6 5 12 0" stroke="#3A0010" stroke-width="3" fill="none" stroke-linecap="round"/>`
    : state === "scared" ? `<ellipse cx="40" cy="55" rx="8" ry="10" fill="#FFF"/><ellipse cx="60" cy="55" rx="8" ry="10" fill="#FFF"/><circle cx="40" cy="56" r="2.5"/><circle cx="60" cy="56" r="2.5"/><path d="M32 42 l12 4 M68 42 l-12 4" stroke="#3A0010" stroke-width="3"/>`
    : `<ellipse cx="40" cy="55" rx="7" ry="6" fill="#FFF"/><ellipse cx="60" cy="55" rx="7" ry="6" fill="#FFF"/><circle cx="42" cy="56" r="3"/><circle cx="58" cy="56" r="3"/><path d="M31 46 l13 5 M69 46 l-13 5" stroke="#3A0010" stroke-width="3.5" stroke-linecap="round"/>`;
  const mouth = state === "sleep" ? `<ellipse cx="50" cy="73" rx="3.5" ry="2.5" fill="#3A0010"/>`
    : state === "scared" ? `<path d="M38 74 q4 -4 8 0 q4 4 8 0 q4 -4 8 0" stroke="#3A0010" stroke-width="3" fill="none"/>`
    : `<path d="M34 68 Q50 92 66 68Z" fill="#3A0010"/><path d="M38 69 l4 6 l3 -6z M55 69 l4 6 l3 -6z" fill="#FFF"/>`;
  return `<svg viewBox="0 0 100 100" aria-label="Demon">
    <path d="M70 80 C94 86 96 62 86 58" stroke="#B0102A" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M86 58 l-5 -9 l10 3z" fill="#B0102A"/>
    <path d="M26 58 C8 44 6 64 14 72 C18 66 22 64 26 66Z M74 58 C92 44 94 64 86 72 C82 66 78 64 74 66Z" fill="#7A0A1E"/>
    <ellipse cx="50" cy="62" rx="28" ry="26" fill="#E0283F"/>
    <path d="M30 44 L22 18 L42 38Z M70 44 L78 18 L58 38Z" fill="#F5E6C8" stroke="#C9B48A" stroke-width="1.5"/>
    <ellipse cx="38" cy="88" rx="8" ry="4" fill="#7A0A1E"/><ellipse cx="62" cy="88" rx="8" ry="4" fill="#7A0A1E"/>
    ${eyes}${mouth}</svg>`;
}
const SANDAL = `<svg viewBox="0 0 40 60" width="40"><ellipse cx="20" cy="32" rx="14" ry="26" fill="#3D9BFF" stroke="#1A4F9A" stroke-width="2"/><path d="M8 30 Q20 14 32 30" stroke="#FFD23F" stroke-width="5" fill="none"/><circle cx="20" cy="17" r="3" fill="#FFD23F"/></svg>`;

/* ---------- sounds (devices are usually on mute anyway) ---------- */
let AC = null;
function ac(){ if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (AC && AC.state !== "running") { try { AC.resume(); } catch (e) {} } return AC; }
function tone(f, start, dur, type = "sine", vol = .15, f2){
  const a = ac(); if (!a) return;
  const t = a.currentTime + start, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + .05);
}
// sound clips: NANI! when someone is robbed, a paint splat when someone is slimed
const CLIPS = {};
function clip(name){ try { let a = CLIPS[name]; if (!a) { a = CLIPS[name] = new Audio("" + name + ".mp3"); a.preload = "auto"; } a.currentTime = 0; a.volume = 1; a.play().catch(() => {}); } catch (e) {} }
const SFX = {
  click(){ tone(700, 0, .05, "triangle", .1); }, tick(){ tone(1400, 0, .03, "square", .05); },
  correct(){ [660, 880, 1320].forEach((f, i) => tone(f, i * .09, .2, "sine", .16)); }, wrong(){ tone(220, 0, .3, "sawtooth", .1, 140); },
  coins(){ [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, i * .07, .16, "triangle", .12)); },
  womp(){ tone(300, 0, .25, "sawtooth", .1, 150); tone(200, .22, .4, "sawtooth", .1, 90); },
  win(){ [523, 659, 784, 1047].forEach((f, i) => tone(f, i * .12, .25, "square", .08)); },
  alarm(){ for (let i = 0; i < 4; i++) { tone(880, i * .25, .12, "square", .09); tone(660, i * .25 + .12, .12, "square", .09); } },
  boom(){ tone(120, 0, .6, "sawtooth", .2, 40); },
  freeze(){ [2093, 1760, 1568, 1319, 1175].forEach((f, i) => tone(f, i * .07, .4, "sine", .08)); },
  laugh(){ [0, .22, .44, .66].forEach((t, i) => { tone(330 - i * 20, t, .16, "sawtooth", .12, 250 - i * 20); }); },
  magic(){ [784, 988, 1175, 1568, 1976].forEach((f, i) => tone(f, i * .08, .5, "sine", .09)); },
  thwack(){ tone(160, 0, .12, "square", .18, 70); tone(900, 0, .05, "triangle", .1); },
  snore(){ tone(110, 0, .6, "sawtooth", .05, 90); }
};
SFX.__tone = tone;
window.BP_SFX = SFX;
["pointerdown", "keydown"].forEach(ev => document.addEventListener(ev, ac, {capture: true, once: true}));

/* ---------- wheel ---------- */
const BASE_SLICES = [
  {k: "p1", l: "+1", c: "#3D9BFF"}, {k: "steal", l: "Steal", i: "🏴‍☠️", c: "#E0A800"}, {k: "p2", l: "+2", c: "#2FB86A"}, {k: "demon", l: "Demon", i: "😈", c: "#A0002E"},
  {k: "chest", l: "Treasure", i: "🧰", c: "#C77700"}, {k: "angel", l: "Angel", i: "😇", c: "#E8EEFF", ink: "#3B0816"}, {k: "p1", l: "+1", c: "#3D9BFF"},
  {k: "freeze", l: "Freeze", i: "❄️", c: "#5FD3F0", ink: "#06304A"}, {k: "p3", l: "+3", c: "#9B5DE5"}, {k: "p2", l: "+2", c: "#2FB86A"},
  {k: "nuke", l: "NUKE", i: "☢️", c: "#FFD400", ink: "#111"}, {k: "dbl", l: "Double", i: "✖️", c: "#FF7A2F"}, {k: "zeus", l: "Zeus", i: "⚡", c: "#2A3B8F"},
  {k: "demon", l: "Demon", i: "😈", c: "#A0002E"}, {k: "fifty", l: "50/50", i: "🎯", c: "#FF4F8B"}, {k: "mystery", l: "Mystery", i: "🎁", c: "#7A2FD9"}, {k: "slime", l: "Slime", i: "🧪", c: "#1E9E3A"},
  {k: "p2", l: "+2", c: "#2FB86A"}, {k: "angel", l: "Angel", i: "😇", c: "#E8EEFF", ink: "#3B0816"}, {k: "ext", l: "EXTINCT", i: "☄️", c: "#1A0A00", ink: "#FF8A3A", w: .6},
  {k: "p1", l: "+1", c: "#3D9BFF"}, {k: "mg", l: "Mini game", i: "🎮", c: "#4B2FD9"}
];
const extGone = () => state.total != null && state.left != null && state.total - state.left >= EXT_WINDOW;   // extinction leaves every wheel after 2 minutes
const slices = () => BASE_SLICES.map(s => (s.k === "mg" && P() && P().mg) ? {k: "p2", l: "+2", c: "#2FB86A"} : (s.k === "ext" && extGone()) ? {k: "p1", l: "+1", c: "#3D9BFF", w: .6} : s);
const wOf = s => s.w || 1;
// angle (degrees from the top, clockwise) where each slice starts
function sliceAngles(S){ const tot = S.reduce((a, s) => a + wOf(s), 0); let acc = 0; return S.map(s => { const a0 = acc / tot * 360; acc += wOf(s); return [a0, acc / tot * 360]; }); }
const TRAP_SLICES = BASE_SLICES.map((s, i) => ({k: "trap", l: "TRAP", i: "💀", c: i % 2 ? "#2A0008" : "#7A0016"}));
function drawWheel(cv, S){
  S = S || slices();
  const n = S.length, dpr = window.devicePixelRatio || 1, size = cv.clientWidth;
  cv.width = size * dpr; cv.height = size * dpr;
  const c = cv.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const r = size / 2, ang = sliceAngles(S);
  S.forEach((s, i) => {
    const a0 = -Math.PI / 2 + ang[i][0] * Math.PI / 180, seg = (ang[i][1] - ang[i][0]) * Math.PI / 180;
    c.beginPath(); c.moveTo(r, r); c.arc(r, r, r, a0, a0 + seg); c.closePath(); c.fillStyle = s.c; c.fill();
    c.strokeStyle = "rgba(0,0,0,.25)"; c.lineWidth = 2; c.stroke();
    c.save(); c.translate(r, r); c.rotate(a0 + seg / 2); c.textAlign = "right"; c.textBaseline = "middle"; c.fillStyle = s.ink || "#FFF";
    c.font = `900 ${Math.round(size * .04)}px Nunito, sans-serif`; c.fillText(s.l, r - size * .035, 0);
    if (s.i) { c.font = `${Math.round(size * .045)}px sans-serif`; c.fillText(s.i, r - size * .25, 0); }
    else drawCoin(c, r - size * .27, 0, size * .022);
    c.restore();
  });
  c.beginPath(); c.arc(r, r, size * .09, 0, 7); c.fillStyle = "#3B0816"; c.fill(); c.lineWidth = 4; c.strokeStyle = "#FFD23F"; c.stroke();
}

/* ---------- connection & joining ---------- */
const P = () => players[me];
const others = () => Object.keys(players).filter(k => k !== me);
const ranked = () => Object.keys(players).sort((a, b) => (players[b].score || 0) - (players[a].score || 0) || (players[b].correct || 0) - (players[a].correct || 0) || String(players[a].name).localeCompare(players[b].name));
const fmt = s => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;
const ordinal = n => n + (n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th");

function renderCode(){
  view = "code";
  app.innerHTML = `<h1 class="p">QNV Quest</h1><p class="sub">Type the code on the board</p>
    <input class="codebox" id="code" inputmode="numeric" autocomplete="off" maxlength="5" placeholder="•••••" value="${esc(params.get("c") || "")}">
    <p class="err">${esc(msg)}</p><button class="btn primary block" id="go">Join</button>`;
  const go = () => tryCode($("#code").value.trim());
  $("#go").onclick = go; $("#code").onkeydown = e => { if (e.key === "Enter") go(); };
}
async function tryCode(c){
  if (!/^\d{5}$/.test(c)) { msg = "The code is 5 numbers."; return renderCode(); }
  app.innerHTML = `<h1 class="p">Joining…</h1>`;
  try { db = await NET.init(); code = c; info = await db.get(G("info")); }
  catch (e) { msg = "Couldn't connect. Check the Wi-Fi and try again."; return renderCode(); }
  if (!info) { msg = "No QNV Quest game with that code. Check the board."; return renderCode(); }
  { const here = (location.pathname.match(/\/([^\/]+)\/[^\/]*$/) || [])[1], want = info.folder || ({"8": "y8", "10": "y10", "11": "y11", "12": "y12", "13": "y13", "GK": "gk"})[info.year];
    const siteRoot = location.href.split(/[?#]/)[0].replace(/\/[^\/]+\/[^\/]*$/, "");
    if (info.origin && info.origin !== siteRoot && info.origin !== location.origin && !NET.LOCAL) { location.replace(`${info.origin}/${want}/blue-play.html?c=${c}`); return; }   // a code from the other game site
  }   // single-folder site: no year folders to switch between
  msg = "";
  history.replaceState(null, "", "?c=" + c + (NET.LOCAL ? "&local=1" : ""));
  subs.push(db.on(G("players"), v => { players = {}; Object.keys(v || {}).forEach(k => { if (v[k] && v[k].name) players[k] = v[k]; }); onPlayers(); }));
  subs.push(db.on(G("state"), v => { state = v || {ph: "lobby"}; onState(); }));
  subs.push(db.on(G("info"), v => { if (!v && code) { subs.forEach(u => { try { u(); } catch (e) {} }); subs = []; code = null; me = null; msg = "This game has ended."; renderComp(); renderCode(); } }));
  const saved = LS.get("bp-me-" + c), all = (await db.get(G("players"))) || {};
  if (saved && all[saved] && all[saved].dev === DEV && all[saved].uid === NET.uid) return enter(saved, all[saved].name, all[saved]);
  renderNames();
}
function renderNames(){
  view = "names";
  const list = ((window.CLASSES || {})[info.cls] || []).slice().sort((a, b) => a.localeCompare(b));
  const st = n => { const p = players[slug(n)]; return !p ? "free" : (p.online !== false && p.dev !== DEV) ? "taken" : "rejoin"; };
  app.innerHTML = `<h1 class="p">Who are you?</h1><p class="sub">${esc(info.cls)} · tap your name</p><p class="err">${esc(msg)}</p>
    <div class="names">${list.map(n => { const s = st(n); return `<button data-n="${esc(n)}" ${s === "taken" ? "disabled" : ""}>${esc(n)}${s === "rejoin" ? "<small>tap to rejoin</small>" : ""}</button>`; }).join("")}</div>
    <div class="card" style="margin-top:14px"><p style="margin:0 0 8px">Not on the list?</p><input class="txt" id="own" maxlength="16" placeholder="Type your first name">
    <button class="btn block" id="owngo">Use this name</button></div>`;
  app.querySelectorAll("[data-n]").forEach(b => b.onclick = () => join(b.dataset.n));
  $("#owngo").onclick = () => { const v = $("#own").value.trim().replace(/\s+/g, " "); if (v) join(v); };
}
async function join(name){
  const pid = slug(name);
  let res;
  try {
    res = await db.tx(G("players/" + pid), cur => {
      if (cur && cur.online !== false && (cur.dev !== DEV || (cur.uid && cur.uid !== NET.uid))) return undefined;
      return Object.assign({score: 0, correct: 0, answered: 0, angel: 0, demon: false}, cur || {}, {name: (cur && cur.name) || name, uid: NET.uid, dev: DEV, online: true});
    });
  } catch (e) { msg = "You can't join this game. Ask your teacher."; return renderNames(); }
  if (!res.committed) { msg = name + " is already playing on another device."; return renderNames(); }
  enter(pid, name, res.val);
}
function enter(pid, name, rec){
  me = pid; LS.set("bp-me-" + code, pid);
  db.update(G("players/" + me), {online: true, dev: DEV});
  db.connected(on => { if (on && me) { db.update(G("players/" + me), {online: true}); db.dropOnLeave(G("players/" + me), {online: false}); } });
  subs.push(db.on(G("inbox/" + me), v => { if (v) Object.keys(v).forEach(k => { const m = v[k]; db.remove(G("inbox/" + me + "/" + k)); handleInbox(m); }); }));
  let firstBlast = true;
  subs.push(db.on(G("blast"), v => { if (firstBlast) { firstBlast = false; return; } if (v && v.by !== me) queueBlast(v); }));   // only blasts launched after you joined
  if (!(rec && rec.joinedPlay)) db.get(G("state")).then(st => { if (st && (st.ph === "play" || st.ph === "pause")) { db.update(G("players/" + me), {joinedPlay: true}); ev({k: "join", a: name}); } });
  if (state.ph === "lobby" || state.ph === "setup") renderLobby();
  else if (state.ph === "end") renderEnd();
  else nextQuestion();
  renderComp();
  const frz = Math.max(+LS.get("bp-frz-" + code) || 0, (rec && rec.frz) || 0), sl = Math.max(+LS.get("bp-slime-" + code) || 0, (rec && rec.slime) || 0);
  if (frz > Date.now()) setTimeout(() => freezeMe("", true), 400);
  if (sl > Date.now()) setTimeout(() => slimeMe("", true), 600);
}
function ev(e){ if (db && code) db.push(G("ev"), Object.assign({t: Date.now()}, e)); }

/* ---------- the demon and angel that sit on your screen ---------- */
let compState = "";
function renderComp(){
  const box = $("#comp"); if (!box) return;
  const p = (me && P()) || {}, key = (p.demon ? "D" : "") + (p.angel || 0) + state.ph;
  if (key === compState) return; compState = key;
  if (!me || state.ph === "end" || state.ph === "lobby") { box.innerHTML = ""; return; }
  box.innerHTML = (p.demon ? `<div class="comp left" id="cdem">${DEMON("sleep")}<div class="zzz"><span>z</span><span>z</span><span>Z</span></div></div>` : "")
    + (p.angel > 0 ? `<div class="comp right" id="cang"><div class="pips">🛡️×${p.angel}</div>${ANGEL}</div>` : "");
}
function fxOn(){ const f = $("#fx"); f.className = "on"; f.innerHTML = ""; f.style.background = ""; fxBusy = true; return f; }
function fxOff(){ const f = $("#fx"); f.className = ""; f.innerHTML = ""; f.style.background = ""; fxBusy = false; }
function sprite(f, html, w, x, y){ const d = document.createElement("div"); d.className = "sp"; d.style.width = w + "px"; d.innerHTML = html; d.style.transform = `translate(${x}px,${y}px)`; f.appendChild(d); return d; }
const place = (d, x, y, extra = "") => { d.style.transform = `translate(${x}px,${y}px) ${extra}`; };
function pop(f, text, x, y, color){ const p = document.createElement("div"); p.className = "pop"; p.textContent = text; p.style.left = x + "px"; p.style.top = y + "px"; if (color) p.style.color = color; f.appendChild(p); setTimeout(() => p.remove(), 900); }
function sparkles(f, x, y, n = 18){ for (let i = 0; i < n; i++) { const s = document.createElement("span"); s.className = "sparkle"; s.textContent = i % 3 ? "✦" : "✨"; const a = Math.random() * 7, d = 40 + Math.random() * 110; s.style.left = x + "px"; s.style.top = y + "px"; s.style.setProperty("--dx", Math.cos(a) * d + "px"); s.style.setProperty("--dy", Math.sin(a) * d + "px"); s.style.animationDelay = (Math.random() * .4) + "s"; f.appendChild(s); setTimeout(() => s.remove(), 1900); } }
function anim(ms, step){ return new Promise(res => { const t0 = performance.now(); (function f(now){ const t = now - t0; step(Math.min(t, ms), t); if (t < ms) requestAnimationFrame(f); else res(); })(t0); }); }

// a demon drops onto your screen and falls asleep
async function demonArrives(){
  const f = fxOn(), W = innerWidth, H = innerHeight;
  f.innerHTML = `<div class="txt">😈 A demon has moved in…</div>`;
  const d = sprite(f, DEMON("awake"), 110, W / 2 - 55, -140);
  await anim(700, t => place(d, W / 2 - 55, -140 + (H * .4 + 140) * Math.min(1, t / 600) - (t > 600 ? Math.sin((t - 600) / 100 * Math.PI) * 20 : 0)));
  SFX.laugh(); f.insertAdjacentHTML("beforeend", `<div class="bubble" style="left:${Math.min(W - 160, W / 2 + 40)}px; top:${H * .4 - 10}px">heh heh…</div>`);
  await sleep(900); d.innerHTML = DEMON("sleep"); SFX.snore();
  f.querySelector(".bubble").textContent = "*yawn* … zzz";
  await anim(700, t => { const k = t / 700; place(d, (W / 2 - 55) * (1 - k) + 8 * k, H * .4 + (H - 120 - H * .4) * k, `scale(${1 - .22 * k})`); });
  fxOff();
}
// the angel flies in (or powers up if she's already here)
async function angelArrives(refill){
  const f = fxOn(), W = innerWidth, H = innerHeight;
  if (refill) {
    $("#comp").innerHTML = "";
    f.innerHTML = `<div class="beam" style="right:-24px"></div><div class="txt">⚡ Your angel is FULLY CHARGED! 🛡️🛡️</div>`;
    const a = sprite(f, ANGEL, 96, W - 104, H - 150);
    SFX.magic(); sparkles(f, W - 56, H - 100, 24);
    await anim(1800, t => place(a, W - 104, H - 150 - Math.sin(t / 1800 * Math.PI) * 60, `rotate(${t / 1800 * 360}deg) scale(${1 + .4 * Math.sin(t / 1800 * Math.PI)})`));
    return fxOff();
  }
  f.innerHTML = `<div class="txt">😇 A guardian angel is protecting you!</div>`;
  const a = sprite(f, ANGEL, 150, W / 2 - 75, -200);
  SFX.magic();
  await anim(700, t => place(a, W / 2 - 75, -200 + (H * .3 + 200) * (t / 700)));
  sparkles(f, W / 2, H * .3 + 80, 22); await sleep(900);
  await anim(700, t => { const k = t / 700; place(a, (W / 2 - 75) * (1 - k) + (W - 120) * k, H * .3 + (H - 170 - H * .3) * k, `scale(${1 - .4 * k})`); });
  fxOff();
}
// she chases the demon around the screen, throwing sandals: 2 hits and he runs away
async function angelChase(){
  const f = fxOn(), W = innerWidth, H = innerHeight;
  $("#comp").innerHTML = "";
  f.style.background = "rgba(4,12,32,.45)";
  f.innerHTML = `<div class="txt">😇 Your angel is chasing the demon away!</div>`;
  const d = sprite(f, DEMON("scared"), 90, 20, H - 130), a = sprite(f, ANGEL, 110, W - 120, H - 160);
  let dx = 20, dy = H - 130, ax = W - 120, ay = H - 160, hits = 0, flash = 0;
  const throwAt = [800, 2100], thrown = [];
  await anim(4400, t => {
    if (t < 3000) { dx = W * .5 - 45 + Math.sin(t / 360) * W * .34; dy = H * .45 + Math.sin(t / 230) * H * .14; }
    else dx = Math.min(dx, W * .5) - (t - 3000) * .9;
    ax += ((t < 3800 ? dx + 110 : W - 120) - ax) * .07; ay += ((t < 3800 ? dy - 40 : H - 160) - ay) * .07;
    if (flash > 0) flash -= 16;
    place(d, dx, dy, `${flash > 0 ? "scale(1.15)" : ""} rotate(${Math.sin(t / 60) * 8}deg)`); d.style.filter = flash > 0 ? "brightness(3)" : "";
    place(a, ax, ay);
    throwAt.forEach((at, i) => {
      if (t >= at && !thrown[i]) { const s = sprite(f, SANDAL, 38, ax, ay + 40); thrown[i] = {s, x0: ax, y0: ay + 40, t0: t}; tone(600, 0, .1, "triangle", .08, 300); }
      const th = thrown[i]; if (!th || th.done) return;
      const k = Math.min(1, (t - th.t0) / 420);
      place(th.s, th.x0 + (dx + 30 - th.x0) * k, th.y0 + (dy + 20 - th.y0) * k - Math.sin(k * Math.PI) * 60, `rotate(${k * 900}deg)`);
      if (k >= 1) { th.done = true; th.s.remove(); hits++; flash = 220; SFX.thwack(); pop(f, hits === 2 ? "OW!! 😭" : "OW!", dx + 20, dy - 20); }
    });
    if (t > 3000 && !f.querySelector(".bubble")) f.insertAdjacentHTML("beforeend", `<div class="bubble" style="left:16px; top:${H * .3}px">I'll be back!! 😤</div>`);
  });
  fxOff();
}
// the demon wakes up, grabs your wheel and spins it onto a TRAP
async function demonTrap(cv){
  const f = fxOn(), W = innerWidth, H = innerHeight, r = cv.getBoundingClientRect();
  $("#comp").innerHTML = "";
  const d = sprite(f, DEMON("awake"), 100, 10, H - 130);
  f.insertAdjacentHTML("beforeend", `<div class="txt">😈 The demon woke up!</div>`);
  await sleep(500); d.innerHTML = DEMON("laugh"); SFX.laugh();
  f.insertAdjacentHTML("beforeend", `<div class="bubble" style="left:20px; top:${H - 190}px">MWAHAHAHA!</div>`);
  await sleep(700);
  const tx = r.left + r.width / 2 - 50, ty = r.top + r.height / 2 - 50;
  await anim(600, t => { const k = t / 600; place(d, 10 + (tx - 10) * k, H - 130 + (ty - H + 130) * k - Math.sin(k * Math.PI) * 120); });
  drawWheel(cv, TRAP_SLICES); SFX.laugh();
  wheelRot += 360 * 4 + 9;
  cv.style.transition = "transform 1.8s cubic-bezier(.15,.85,.2,1)"; requestAnimationFrame(() => { cv.style.transform = `rotate(${wheelRot}deg)`; });
  await anim(1900, t => place(d, tx, ty, `rotate(${t * .9}deg)`));
  cv.style.transition = "none";
  await anim(500, t => place(d, tx - (t / 500) * W, ty - (t / 500) * 200));
  fxOff();
}
// shown on the attacker's screen when the victim's angel blocks them
async function angelSpell(victimName){
  const f = fxOn(), W = innerWidth, H = innerHeight;
  f.style.background = "rgba(20,30,70,.6)";
  f.innerHTML = `<div class="txt">😇 ${esc(victimName)}'s angel appears…</div>`;
  const a = sprite(f, ANGEL, 180, W, H * .3);
  SFX.magic();
  await anim(600, t => place(a, W - (W / 2 + 90) * (t / 600), H * .3));
  sparkles(f, W / 2, H * .3 + 90, 30); setTimeout(() => sparkles(f, W / 2, H * .3 + 90, 30), 500);
  await anim(1100, t => place(a, W / 2 - 90, H * .3 - Math.sin(t / 1100 * Math.PI) * 30, `rotate(${Math.sin(t / 120) * 6}deg)`));
  const wf = document.createElement("div"); wf.className = "whiteflash"; f.appendChild(wf); tone(2093, 0, .8, "sine", .12);
  await sleep(150); wf.style.opacity = "0";
  f.querySelector(".txt").textContent = `BLOCKED by ${victimName}'s angel!`;
  await sleep(1500); fxOff();
}

/* ---------- top bar ---------- */
function topHTML(){
  const p = P() || {}, r = ranked().indexOf(me) + 1, n = Object.keys(players).length, tl = state.left != null ? state.left : null;
  return `<div class="p-top" id="top"><span class="me">${esc(p.name || "")}</span><span class="pts" id="tpts">${coins(p.score || 0)}</span>
    <span class="rk" id="trk">${r ? ordinal(r) + " / " + n : ""}</span><span class="tm ${tl != null && tl <= 30 ? "low" : ""}" id="ttm">${tl != null ? "⏱ " + fmt(tl) : ""}</span></div>
    <div class="badges" id="badges">${badgesHTML()}</div>`;
}
function badgesHTML(){
  const p = P() || {}, b = [];
  if (p.angel > 0) b.push(`😇 Angel: ${p.angel} block${p.angel > 1 ? "s" : ""}`);
  if (p.demon) b.push("😈 A demon is sleeping…");
  if (dbl) b.push("✖️2 Double next spin");
  if (fifty) b.push("🎯 50/50 next question");
  return b.map(x => `<span>${x}</span>`).join("");
}
function updateTop(){
  const p = P() || {}, r = ranked().indexOf(me) + 1, n = Object.keys(players).length;
  const a = $("#tpts"); if (a) a.innerHTML = coins(p.score || 0);
  const b = $("#trk"); if (b) b.textContent = r ? ordinal(r) + " / " + n : "";
  const c = $("#ttm"); if (c) { const tl = state.left; c.textContent = tl != null ? "⏱ " + fmt(tl) : ""; c.classList.toggle("low", tl != null && tl <= 30); }
  const d = $("#badges"); if (d) d.innerHTML = badgesHTML();
  const m = $("#minilb"); if (m) m.innerHTML = miniLB();
  if (view === "pick") renderPickList();
  if (!fxBusy) renderComp();
}
function miniLB(){
  const r = ranked(), top = r.slice(0, 5);
  if (!top.includes(me) && r.indexOf(me) >= 0) top.push(me);
  return top.map(k => `<p class="${k === me ? "me" : ""}"><span>${r.indexOf(k) + 1}. ${esc(players[k].name)}</span><span>${coins(players[k].score || 0)}</span></p>`).join("");
}
function onPlayers(){
  if (!me) { if (view === "names") renderNames(); return; }
  if (!players[me]) { try { db.keepOnLeave(G("players/" + me)); } catch (e) {} me = null; try { closeOverlay(); closeMG(); } catch (e) {} msg = "Your teacher removed you from the game."; renderComp(); return renderNames(); }
  updateTop();
}
let lastPh = null;
function onState(){
  const ph = state.ph;
  updateTop();
  if (!me) return;
  if (ph !== lastPh) {
    const prev = lastPh; lastPh = ph; compState = ""; renderComp();
    if (ph === "lobby") return renderLobby();
    if (ph === "end") { closeOverlay(); closeMG(); return renderEnd(); }
    if (ph === "play" && (prev === "lobby" || prev === null || view === "lobby" || view === "end")) {
      if ((prev === "lobby" || view === "lobby") && !(P() && P().joinedPlay)) db.update(G("players/" + me), {joinedPlay: true});
      showPause(false); return nextQuestion();
    }
  }
  showPause(ph === "pause");
}

/* ---------- screens ---------- */
function renderLobby(){
  view = "lobby";
  app.innerHTML = topHTML() + `<div class="big">🔵</div><h1 class="p">You're in!</h1>
    <p class="sub">Every right answer = ${coins(1)} and a spin of your wheel. Steal, freeze, nuke… and watch out for demons.<br>Most coins when the timer ends wins.</p>
    <p class="hint center">Waiting for your teacher to start…</p><div class="mini-lb" id="minilb">${miniLB()}</div>`;
}
function renderEnd(){
  view = "end";
  const r = ranked(), pos = r.indexOf(me) + 1, p = P() || {};
  app.innerHTML = topHTML() + `<div class="big">${pos === 1 ? "🏆" : pos === 2 ? "🥈" : pos === 3 ? "🥉" : "👏"}</div>
    <h1 class="p">${pos === 1 ? "You WON!" : "Time's up!"}</h1>
    <p class="sub">You finished <b>${ordinal(pos)}</b> of ${r.length} with <b>${coins(p.score || 0)}</b>.<br>You got ${p.correct || 0} of ${p.answered || 0} questions right.</p>
    <div class="mini-lb" id="minilb">${miniLB()}</div>`;
}
function nextDeckIdx(){ if (dp >= deck.length) { deck = shuffle(Q.map((_, i) => i)); dp = 0; } return deck[dp++]; }
function nextQuestion(){
  if (!me) return;
  if (state.ph === "end") return renderEnd();
  if (state.ph === "lobby") return renderLobby();
  busy = false; view = "q";
  let saved = null; try { saved = JSON.parse(LS.get("bp-q-" + code) || "null"); } catch (e) {}
  const idx = saved && Q[saved.idx] ? saved.idx : nextDeckIdx(), [topic, text, opts, ans] = Q[idx], order = saved && Q[saved.idx] ? saved.order : shuffle([0, 1, 2, 3]);
  const gone = saved && Q[saved.idx] ? (saved.gone || []) : fifty ? shuffle(order.filter(o => o !== ans)).slice(0, 2) : [];
  fifty = false;
  LS.set("bp-q-" + code, JSON.stringify({idx, order, gone}));
  curQ = {idx, order, ans, n: ++qSeq};
  app.innerHTML = topHTML() + `<span class="tag">${esc(topic)}</span><p class="qtext">${esc(text)}</p>
    <div class="opts">${order.map((o, i) => `<button class="opt ${gone.includes(o) ? "gone" : ""}" data-i="${i}"><span class="l">${"ABCD"[i]}</span><span>${esc(opts[o])}</span></button>`).join("")}</div>
    ${gone.length ? `<p class="hint center">🎯 50/50: two wrong answers removed</p>` : ""}`;
  app.querySelectorAll("[data-i]").forEach(b => b.onclick = () => answer(+b.dataset.i));
  showPause(state.ph === "pause");
}
async function answer(i){
  if (busy || view !== "q" || state.ph !== "play" || Date.now() < frozenUntil) return;
  busy = true;
  const {idx, order, ans} = curQ, ok = order[i] === ans, p = P() || {};
  LS.set("bp-q-" + code, "null");
  app.querySelectorAll("[data-i]").forEach((b, j) => { b.disabled = true; if (order[j] === ans) b.classList.add("right"); else if (j === i) b.classList.add("wrong"); else b.classList.add("dim"); });
  db.push(G("log/" + me), {i: idx, a: order[i], ok: ok ? 1 : 0});
  const upd = {answered: (p.answered || 0) + 1, correct: (p.correct || 0) + (ok ? 1 : 0), joinedPlay: true};
  db.update(G("players/" + me), upd); if (players[me]) Object.assign(players[me], upd);
  if (!ok) {
    deck.splice(Math.min(deck.length, dp + 4 + Math.floor(Math.random() * 4)), 0, idx);   // wrong answers come back later
    SFX.wrong(); app.insertAdjacentHTML("beforeend", `<div class="verdict no">Not this time ❌</div>`);
    await sleep(1700); return nextQuestion();
  }
  SFX.correct(); addMine(1);
  app.insertAdjacentHTML("beforeend", `<div class="verdict ok">Correct! +1 ${COIN} Spin!</div>`);
  await sleep(850); showWheel();
}

/* ---------- wheel ---------- */
function showWheel(){
  view = "wheel";
  app.innerHTML = topHTML() + `<h2 class="p">Spin your wheel!</h2><div class="wheel-box"><div class="pointer"></div><canvas id="wheel"></canvas></div>
    <button class="btn primary block" id="spin" style="font-size:1.5rem">🎡 SPIN</button><div class="mini-lb" id="minilb">${miniLB()}</div>`;
  preloadEvents();
  const cv = $("#wheel"); drawWheel(cv); cv.style.transform = `rotate(${wheelRot % 360}deg)`; wheelRot = wheelRot % 360;
  $("#spin").onclick = () => spin(cv);
}
function spin(cv){
  if (state.ph !== "play" || Date.now() < frozenUntil) return;
  $("#spin").disabled = true; SFX.click();
  const S = slices(), ang = sliceAngles(S), tot = S.reduce((a, s) => a + wOf(s), 0);
  let r = Math.random() * tot, k = 0; while (k < S.length - 1 && r >= wOf(S[k])) { r -= wOf(S[k]); k++; }
  const seg = ang[k][1] - ang[k][0], mid = (ang[k][0] + ang[k][1]) / 2;
  const jitter = (Math.random() - .5) * seg * .7, base = wheelRot - (wheelRot % 360);
  wheelRot = base + 360 * 5 + (360 - mid) + jitter;
  cv.style.transition = "transform 3s cubic-bezier(.15,.85,.2,1)";
  requestAnimationFrame(() => { cv.style.transform = `rotate(${wheelRot}deg)`; });
  let t = 0; const iv = setInterval(() => { SFX.tick(); if ((t += 1) > 22) clearInterval(iv); }, 60 + t * 6);
  setTimeout(() => { cv.style.transition = "none"; landed(S[k], cv); }, 3150);
}
async function addMine(d){
  let applied = 0;
  await db.tx(G("players/" + me + "/score"), cur => { cur = cur || 0; const v = Math.max(0, cur + d); applied = v - cur; return v; });
  return applied;
}
async function setMine(fields){ if (players[me]) Object.assign(players[me], fields); await db.update(G("players/" + me), fields); }
function resultScreen(icon, title, body, cb){
  view = "result";
  app.innerHTML = topHTML() + `<div class="big">${icon}</div><h1 class="p">${title}</h1>${body}
    <button class="btn primary block" id="cont" style="margin-top:18px">Next question ➜</button><div class="mini-lb" id="minilb">${miniLB()}</div>`;
  $("#cont").onclick = () => { SFX.click(); (cb || nextQuestion)(); };
}
async function landed(s, cv){
  const p = P() || {}, name = p.name;
  if (p.demon && GOOD.has(s.k)) {   // the demon ruins it
    await demonTrap(cv);
    await setMine({demon: false});
    const lost = -(await addMine(-TRAP)); SFX.womp(); ev({k: "trap", a: name, n: lost, was: s.l});
    app.classList.add("shake"); setTimeout(() => app.classList.remove("shake"), 600);
    return resultScreen("💀", "TRAP!", `<p class="result-pts" style="color:var(--bad)">−${coins(lost)}</p><p class="sub">You would have got <b>${esc(s.l)}</b>… but the demon spun it into a trap and ran off laughing.</p>`);
  }
  if (/^p[123]$/.test(s.k)) {
    let pts = +s.k[1]; const was = dbl; if (dbl) { pts *= 2; dbl = false; }
    await addMine(pts); SFX.coins();
    if (pts >= 3) ev({k: "pts", a: name, n: pts, dbl: was});
    return resultScreen(`<span style="font-size:.9em">${COIN}</span>`, `+${coins(pts)}`, was ? `<p class="sub">✖️2 Your double kicked in!</p>` : "");
  }
  if (s.k === "dbl") { dbl = true; SFX.win(); ev({k: "dbl", a: name}); return resultScreen("✖️2", "DOUBLE!", `<p class="sub">The coins on your next spin are doubled.</p>`); }
  if (s.k === "fifty") { fifty = true; SFX.coins(); return resultScreen("🎯", "50/50!", `<p class="sub">Two wrong answers vanish on your next question.</p>`); }
  if (s.k === "angel") {
    const had = p.angel > 0;
    await angelArrives(had); await setMine({angel: ANGEL_MAX}); compState = ""; renderComp();
    ev({k: had ? "angelup" : "angel", a: name});
    if (p.demon) { await angelChase(); await setMine({demon: false, angel: ANGEL_MAX - 1}); compState = ""; renderComp(); ev({k: "chase", a: name});
      return resultScreen("😇", "Demon chased away!", `<p class="sub">Your angel hit the demon with 2 sandals and he ran off. She stays with <b>1 block</b> left.</p>`); }
    return resultScreen("😇", had ? "Fully charged!" : "Guardian Angel!", `<p class="sub">She'll block the next <b>${ANGEL_MAX}</b> steals, freezes or Zeus bolts aimed at you. You choose when to use her. (She can't survive a nuke or an asteroid!)</p>`);
  }
  if (s.k === "demon") {
    if (p.angel > 0) {
      await angelChase(); await setMine({angel: p.angel - 1}); compState = ""; renderComp(); ev({k: "chase", a: name});
      return resultScreen("😇", "Demon chased away!", `<p class="sub">Your angel saw him coming! She has <b>${p.angel - 1}</b> block${p.angel - 1 === 1 ? "" : "s"} left.</p>`);
    }
    if (p.demon) return resultScreen("😈", "Another demon?", `<p class="sub">One demon is already sleeping on your screen. He doesn't need a friend.</p>`);
    await demonArrives(); await setMine({demon: true}); compState = ""; renderComp(); ev({k: "demon", a: name});
    return resultScreen("😈", "Uh oh…", `<p class="sub">A demon is sleeping on your screen. The next time you land on something good, he'll wake up and turn it into a <b>TRAP (−${TRAP} coins)</b>. Only an angel can chase him away.</p>`);
  }
  if (s.k === "chest") return treasure();
  if (s.k === "freeze") return pickVictim("freeze");
  if (s.k === "steal") return pickVictim("steal");
  if (s.k === "mg") return miniGameChoice();
  if (s.k === "nuke") return nukeLanding();
  if (s.k === "ext") return extLanding();
  if (s.k === "zeus") return pickVictim("zeus");
  if (s.k === "slime") return pickVictim("slime");
  if (s.k === "mystery") return mysteryBox();
}

/* ---------- treasure ---------- */
function treasure(){
  view = "chest";
  const vals = [0, 1, 2].map(() => CHEST_VALUES[Math.floor(Math.random() * CHEST_VALUES.length)]);
  app.innerHTML = topHTML() + `<div class="big">🧰</div><h1 class="p">Treasure!</h1><p class="sub">Pick a chest. Some have coins… some are empty… one might bite.</p>
    <div class="chests">${[0, 1, 2].map(i => `<button class="chestb" data-c="${i}"><span>🧰</span>${i + 1}</button>`).join("")}</div>`;
  app.querySelectorAll("[data-c]").forEach(b => b.onclick = async () => {
    const pick = +b.dataset.c; app.querySelectorAll("[data-c]").forEach(x => x.disabled = true);
    let v = vals[pick]; const was = dbl && v > 0; if (was) { v *= 2; dbl = false; }
    app.querySelectorAll("[data-c]").forEach((x, i) => { const vv = i === pick ? v : vals[i]; x.classList.add("open"); if (i === pick) x.classList.add("sel"); x.innerHTML = `<span>${vv > 0 ? "💰" : vv < 0 ? "🦂" : "🫙"}</span>${vv > 0 ? "+" + vv : vv < 0 ? vv : "0"}`; });
    const applied = v ? await addMine(v) : 0;
    if (v > 0) SFX.coins(); else if (v < 0) SFX.womp(); else SFX.click();
    if (v >= 2) ev({k: "chest", a: P().name, n: v});
    await sleep(1400);
    resultScreen(v > 0 ? "💰" : v < 0 ? "🦂" : "🫙", v > 0 ? `+${coins(v)}` : v < 0 ? `Ouch! ${applied}` : "Empty!", was ? `<p class="sub">✖️2 Double applied!</p>` : "");
  });
}

/* ---------- mystery box (the bottom 3 might find a blue shell) ---------- */
const GOODIES = [{k: "p1", t: "+1", i: "⭐"}, {k: "p2", t: "+2", i: "✨"}, {k: "p3", t: "+3", i: "💎"}, {k: "dbl", t: "Double", i: "✖️2"}, {k: "fifty", t: "50/50", i: "🎯"}, {k: "p1", t: "+1", i: "⭐"}, {k: "p2", t: "+2", i: "✨"}];
function mysteryBox(){
  view = "mystery";
  const r = ranked(), pos = r.indexOf(me), n = r.length, low = n >= 3 && pos >= n - 3 && pos > 0;
  const boxes = [0, 1, 2].map(() => GOODIES[Math.floor(Math.random() * GOODIES.length)]);
  if (low) boxes[Math.floor(Math.random() * 3)] = {k: "shell", t: "BLUE SHELL", i: "🐢"};
  app.innerHTML = topHTML() + `<div class="big">🎁</div><h1 class="p">Mystery Box!</h1><p class="sub">Pick a box.${low ? " You're near the bottom… one of these might hold something <b>special</b>. 👀" : ""}</p>
    <div class="chests">${[0, 1, 2].map(i => `<button class="chestb" data-m="${i}"><span>🎁</span>${i + 1}</button>`).join("")}</div>`;
  app.querySelectorAll("[data-m]").forEach(b => b.onclick = async () => {
    const pick = +b.dataset.m, g = boxes[pick]; app.querySelectorAll("[data-m]").forEach(x => x.disabled = true);
    app.querySelectorAll("[data-m]").forEach((x, i) => { x.classList.add("open"); if (i === pick) x.classList.add("sel"); x.innerHTML = `<span>${boxes[i].i}</span>${boxes[i].t}`; });
    SFX.click(); await sleep(1200);
    if (g.k === "shell") return blueShell();
    if (g.k === "dbl") { dbl = true; SFX.win(); return resultScreen("✖️2", "DOUBLE!", `<p class="sub">The coins on your next spin are doubled.</p>`); }
    if (g.k === "fifty") { fifty = true; SFX.coins(); return resultScreen("🎯", "50/50!", `<p class="sub">Two wrong answers vanish on your next question.</p>`); }
    let pts = +g.k[1]; const was = dbl; if (dbl) { pts *= 2; dbl = false; }
    await addMine(pts); SFX.coins();
    resultScreen(`<span style="font-size:.9em">${COIN}</span>`, `+${coins(pts)}`, was ? `<p class="sub">✖️2 Your double kicked in!</p>` : "");
  });
}
async function blueShell(){
  view = "shell"; const name = P().name, T = ranked()[0];
  if (!T || T === me || !players[T]) { await addMine(2); return resultScreen("🐢", "No king to hit!", `<p class="sub">Have ${coins(2)} instead.</p>`); }
  const tn = players[T].name, id = uid("s");
  const lock = await db.tx(G("players/" + T + "/duel"), cur => (cur && Date.now() - (cur.ts || 0) < 25000) ? undefined : {id, by: me, ts: Date.now()});
  if (!lock.committed) { await addMine(2); return resultScreen("🐢", "The king is busy!", `<p class="sub">${esc(tn)} is already in a duel. Have ${coins(2)} instead.</p>`); }
  await db.set(G("shells/" + id), {s: {x: .5, y: .9, a: -1.57}, k: {x: .5, y: .22}, sn: name, tn, ts: Date.now()});
  db.push(G("inbox/" + T), {type: "shell", id, from: name});
  ev({k: "shell", a: name, b: tn, id});
  let res = {hit: false};
  try {
    await loadNuke();
    res = await BPNUKE.duel({role: "shell", shooterName: name, kingName: tn, send: o => db.update(G("shells/" + id), o), listen: cb => db.on(G("shells/" + id), cb)});
  } catch (e) {}
  let amt = 0;
  if (res && res.hit) {
    await db.tx(G("players/" + T + "/score"), cur => { cur = cur || 0; amt = Math.min(SHELL, cur); return cur - amt; });
    if (amt) await addMine(amt);
    ev({k: "shellhit", a: name, b: tn, n: amt});
  } else ev({k: "shellmiss", a: name, b: tn});
  db.remove(G("players/" + T + "/duel"));
  setTimeout(() => db.remove(G("shells/" + id)), 5000);
  if (res && res.hit) return resultScreen("💥", "Direct hit!", `<p class="sub">Your blue shell smashed into <b>${esc(tn)}</b>.${amt ? ` You took <b>${coins(amt)}</b> from them!` : ""}</p>`);
  resultScreen("👑", "The king escaped!", `<p class="sub">${esc(tn)} dodged your shell this time.</p>`);
}
async function kingDuel(m){
  while (nukePlaying || document.getElementById("nk")) await sleep(300);
  try {
    await loadNuke();
    const res = await BPNUKE.duel({role: "king", shooterName: m.from, kingName: P().name, send: o => db.update(G("shells/" + m.id), o), listen: cb => db.on(G("shells/" + m.id), cb)});
    if (res && res.hit) clip("nani");
    if (res && res.hit) toast(`🐢 ${esc(m.from)}'s blue shell hit you! −${SHELL} coins`, ""); else toast("👑 You dodged the blue shell!", "good");
  } catch (e) {}
}

/* ---------- angels blocking attacks ---------- */
let promptChain = Promise.resolve();
// shows "use your angel?" with a 5 second countdown. No tap = she blocks automatically.
function angelChoice(text){
  const run = () => new Promise(res => {
    const p = P() || {};
    if (!(p.angel > 0)) return res("allow");
    if (inMG) return res("block");
    const box = $("#prompt"); let left = 5, done = false;
    const finish = d => { if (done) return; done = true; clearInterval(iv); box.className = ""; box.innerHTML = ""; res(d); };
    box.className = "on";
    box.innerHTML = `<div class="pc"><div style="width:110px; margin:0 auto">${ANGEL}</div><h2 class="p" style="color:#FFE066">${text}</h2>
      <p class="sub" style="color:#FFF">Use your angel? You have <b>${p.angel}</b> block${p.angel > 1 ? "s" : ""}.</p>
      <div class="cd" id="pcd">5</div>
      <button class="btn primary block" id="pblk">🛡️ BLOCK IT</button><button class="btn block" id="pnot">Let it happen</button>
      <p class="hint">No answer = she blocks it for you.</p></div>`;
    SFX.alarm();
    $("#pblk").onclick = () => finish("block"); $("#pnot").onclick = () => finish("allow");
    const iv = setInterval(() => { left--; const c = $("#pcd"); if (c) c.textContent = left; if (left <= 0) finish("block"); }, 1000);
  });
  const p = promptChain.then(run); promptChain = p.catch(() => {}); return p;
}
async function useAngel(){
  await db.tx(G("players/" + me + "/angel"), cur => Math.max(0, (cur || 0) - 1));
  compState = ""; renderComp();
  const a = $("#cang"); if (a) { a.classList.add("glow"); setTimeout(() => a.classList.remove("glow"), 2200); }
  SFX.magic();
}
// attacker side: if the victim has an angel, ask them first. Returns "block" or "allow".
async function askAngel(v, kind){
  if (!(players[v] && players[v].angel > 0)) return "allow";
  const id = uid("a"), vn = players[v].name;
  view = "asking";
  app.innerHTML = topHTML() + `<div class="big">😇</div><h1 class="p">${esc(vn)} has a guardian angel…</h1><p class="sub">Will she block your ${KIND_WORD[kind]}? 🤞</p>`;
  await db.set(G("atk/" + id), {kind, from: me, to: v, ts: Date.now()});
  db.push(G("inbox/" + v), {type: "atk", id, kind, from: P().name});
  let dec = null, waited = 0;
  const off = db.on(G("atk/" + id + "/dec"), d => { if (d) dec = d; });
  while (!dec && waited < 9000) { await sleep(200); waited += 200; }
  try { off(); } catch (e) {} db.remove(G("atk/" + id));
  return dec || "block";
}
async function handleAtk(m){
  const d = await angelChoice(`${esc(m.from)} is trying to ${m.kind === "steal" ? "STEAL from" : m.kind === "zeus" ? "call ZEUS'S WRATH on" : m.kind === "slime" ? "SLIME" : "FREEZE"} you!`);
  if (d === "block") { await useAngel(); ev({k: "blocked", a: m.from, b: P().name, what: m.kind}); toast(`😇 Your angel blocked ${esc(m.from)}!`, "good"); }
  await db.set(G("atk/" + m.id + "/dec"), d);
}

/* ---------- pick a victim (steal / freeze) ---------- */
let pickKind = null;
const KIND_ICON = {steal: "🏴‍☠️", freeze: "❄️", zeus: "⚡", slime: "🧪"}, KIND_WORD = {steal: "steal", freeze: "freeze", zeus: "lightning bolt", slime: "slime curse"};
function pickVictim(kind){
  view = "pick"; pickKind = kind;
  if (!others().length) return resultScreen(KIND_ICON[kind], "Nobody to pick!", `<p class="sub">You're the only player. Have a coin instead.</p>`, async () => { await addMine(1); nextQuestion(); });
  app.innerHTML = topHTML() + `<div class="big">${KIND_ICON[kind]}</div>
    <h1 class="p">${kind === "steal" ? "STEAL!" : kind === "zeus" ? "ZEUS'S WRATH!" : kind === "slime" ? "SLIME CURSE!" : "FREEZE!"}</h1>
    <p class="sub">${kind === "steal" ? `Pick who to rob. They hide 💰 gold and a 💣 bomb in 3 chests, then you pick one. Gold = <b>+${coins(STEAL)}</b>. Bomb = <b>you lose ${coins(BOMB)}</b> to them.` : kind === "zeus" ? `Zeus looks down from Mount Olympus… Pick who he strikes with lightning. They lose <b>${coins(ZEUS)}</b>.` : kind === "slime" ? `The witches are stirring their cauldron… Pick who gets green slime oozing over their screen for <b>${SLIME_S} seconds</b>.` : `Pick who to freeze. Their screen locks for <b>${FREEZE_S} seconds</b>.`}
      <br>😇 = they have an angel who might block you.</p>
    <div class="picklist" id="plist"></div><p class="err" id="perr"></p>
    <button class="btn block" id="pskip" style="margin-top:14px">Skip (take +1 coin instead)</button>`;
  $("#pskip").onclick = async () => { if (view !== "pick") return; view = "result"; await addMine(1); SFX.coins(); nextQuestion(); };
  renderPickList();
}
function renderPickList(){
  const box = $("#plist"); if (!box) return;
  const r = ranked().filter(k => k !== me);
  box.innerHTML = r.map(k => { const p = players[k]; return `<button data-v="${esc(k)}" ${p.online === false ? "disabled" : ""}><span>${esc(p.name)} ${p.angel > 0 ? "😇" : ""}${p.online === false ? " (offline)" : ""}</span><span class="s">${coins(p.score || 0)}</span></button>`; }).join("");
  box.querySelectorAll("[data-v]").forEach(b => b.onclick = () => chooseVictim(b.dataset.v));
}
async function chooseVictim(v){
  if (view !== "pick") return;
  const p = players[v], kind = pickKind; if (!p) return;
  const vn = p.name, name = P().name;
  const d = await askAngel(v, kind);
  if (d === "block") {
    await angelSpell(vn);
    return resultScreen("😇", "Blocked!", `<p class="sub">${esc(vn)}'s angel protected them. Your ${KIND_WORD[kind]} bounced off!</p>`);
  }
  if (kind === "slime") {
    view = "result";
    try { await loadNuke(); await BPNUKE.witches({victimName: vn}); } catch (e) {}
    db.push(G("inbox/" + v), {type: "slime", from: name});
    ev({k: "slime", a: name, b: vn});
    return resultScreen("🧪", "Slimed!", `<p class="sub"><b>${esc(vn)}</b> has green slime all over their screen for ${SLIME_S} seconds. 🤢</p>`);
  }
  if (kind === "zeus") {
    view = "result";
    try { await loadNuke(); await BPNUKE.zeusThrow({victimName: vn}); } catch (e) {}
    let lost = 0;
    await db.tx(G("players/" + v + "/score"), cur => { cur = cur || 0; lost = Math.min(ZEUS, cur); return cur - lost; });
    db.push(G("inbox/" + v), {type: "zeus", from: name, n: lost});
    ev({k: "zeus", a: name, b: vn, n: lost});
    return resultScreen("⚡", "Struck down!", `<p class="sub">Zeus hit <b>${esc(vn)}</b> with a lightning bolt.${lost ? ` They lost <b>${coins(lost)}</b>.` : " They had no coins to lose!"}</p>`);
  }
  if (kind === "freeze") {
    view = "result"; SFX.freeze();
    db.push(G("inbox/" + v), {type: "freeze", from: name});
    ev({k: "freeze", a: name, b: vn});
    return resultScreen("❄️", "Frozen!", `<p class="sub"><b>${esc(vn)}</b> is frozen for ${FREEZE_S} seconds.</p>`);
  }
  const id = uid("d");
  const lock = await db.tx(G("players/" + v + "/duel"), cur => (cur && Date.now() - (cur.ts || 0) < 25000) ? undefined : {id, by: me, ts: Date.now()});
  if (!lock.committed) { pickVictim("steal"); const e = $("#perr"); if (e) e.textContent = `${vn} is busy in another steal. Pick someone else!`; return; }
  duelThief(id, v);
}

/* ---------- the steal duel: thief side ---------- */
async function duelThief(id, v){
  view = "duel";
  const vn = players[v].name, name = P().name;
  await db.set(G("duels/" + id), {thief: me, tn: name, victim: v, vn, ts: Date.now()});
  db.push(G("inbox/" + v), {type: "duel", id, from: name});
  ev({k: "duel", a: name, b: vn});
  app.innerHTML = topHTML() + `<div class="big">🏴‍☠️</div><h1 class="p">Robbing ${esc(vn)}…</h1>
    <p class="sub" id="dmsg">${esc(vn)} is hiding the 💰 gold and the 💣 bomb…</p><p class="center bung" id="dcd" style="font-size:2rem"></p>`;
  let hide = null, waited = 0;
  const off = db.on(G("duels/" + id + "/hide"), h => { if (h) hide = h; });
  while (!hide && waited < 9000) { await sleep(250); waited += 250; const c = $("#dcd"); if (c) c.textContent = Math.max(0, Math.ceil((9000 - waited) / 1000)); }
  if (!hide) { const o = shuffle([0, 1, 2]); const r = await db.tx(G("duels/" + id + "/hide"), cur => cur ? undefined : {gold: o[0], bomb: o[1], auto: true}); hide = r.val; }
  try { off(); } catch (e) {}
  const m = $("#dmsg"); if (m) m.innerHTML = `${hide.auto ? "Hidden at random! " : "Hidden! "}Pick a chest. 💰 = <b>+${coins(STEAL)}</b> · 💣 = <b>−${coins(BOMB)}</b> · 🫙 = nothing`;
  const c = $("#dcd"); if (c) c.remove();
  app.insertAdjacentHTML("beforeend", `<div class="chests">${[0, 1, 2].map(i => `<button class="chestb" data-c="${i}"><span>🧰</span>${i + 1}</button>`).join("")}</div>`);
  app.querySelectorAll("[data-c]").forEach(b => b.onclick = async () => {
    const pick = +b.dataset.c; app.querySelectorAll("[data-c]").forEach(x => x.disabled = true);
    const outcome = pick === hide.gold ? "gold" : pick === hide.bomb ? "bomb" : "empty"; let amt = 0;
    if (outcome === "gold") { await db.tx(G("players/" + v + "/score"), cur => { cur = cur || 0; amt = Math.min(STEAL, cur); return cur - amt; }); if (amt) await addMine(amt); }
    else if (outcome === "bomb") { await db.tx(G("players/" + me + "/score"), cur => { cur = cur || 0; amt = Math.min(BOMB, cur); return cur - amt; }); if (amt) await db.tx(G("players/" + v + "/score"), cur => (cur || 0) + amt); }
    await db.update(G("duels/" + id), {pick, outcome, amt});
    db.remove(G("players/" + v + "/duel"));
    ev({k: outcome === "gold" ? "stole" : outcome === "bomb" ? "bomb" : "empty", a: name, b: vn, n: amt});
    app.querySelectorAll("[data-c]").forEach((x, i) => { x.classList.add("open"); if (i === pick) x.classList.add("sel"); x.innerHTML = `<span>${i === hide.gold ? "💰" : i === hide.bomb ? "💣" : "🫙"}</span>${i === pick ? "YOU" : ""}`; });
    if (outcome === "gold") SFX.coins(); else if (outcome === "bomb") SFX.boom(); else SFX.womp();
    await sleep(1600);
    if (outcome === "gold") resultScreen("💰", amt ? `You stole ${coins(amt)}!` : "Found the gold…", amt ? `<p class="sub">Robbed <b>${esc(vn)}</b>. 😈</p>` : `<p class="sub">…but ${esc(vn)} had no coins to take!</p>`);
    else if (outcome === "bomb") resultScreen("💣", "BOOM!", `<p class="sub">You opened ${esc(vn)}'s bomb${amt ? ` and lost <b>${coins(amt)}</b> to them` : ""}.</p>`);
    else resultScreen("🫙", "Empty!", `<p class="sub">${esc(vn)} outsmarted you. Nothing happens.</p>`);
  });
}

/* ---------- inbox: things other players do to you ---------- */
let toastT = null;
function toast(text, kind = ""){ const t = $("#toast"); t.className = "on " + kind; t.innerHTML = text; clearTimeout(toastT); toastT = setTimeout(() => { t.className = kind; }, 3600); }
function handleInbox(m){
  if (!m || state.ph === "end") return;
  if (m.type === "freeze") { if (inMG) { pendingFreeze.push(m); return; } return freezeMe(m.from); }
  if (m.type === "atk") return handleAtk(m);
  if (m.type === "duel") return duelVictimSide(m.id, m.from);
  if (m.type === "zeus") { pendingZaps.push(m); return runZaps(); }
  if (m.type === "slime") return slimeMe(m.from, false);
  if (m.type === "shell") return kingDuel(m);
}
function freezeMe(from, penalty){
  SFX.freeze();
  frozenUntil = Date.now() + FREEZE_S * 1000;
  LS.set("bp-frz-" + code, String(frozenUntil)); if (me) db.update(G("players/" + me), {frz: frozenUntil});
  const ov = $("#ov"); ov.className = "on ice";
  const draw = () => {
    const left = Math.ceil((frozenUntil - Date.now()) / 1000);
    if (left <= 0) { clearInterval(frozenTimer); frozenTimer = null; if (ov.classList.contains("ice")) closeOverlay(); return; }
    ov.innerHTML = `<div class="ovc"><div class="big">🥶</div><h1 class="p">${penalty ? "Nice try!" : esc(from) + " froze you!"}</h1>${penalty ? `<p class="sub" style="color:#06304A"><b>Refreshing restarts your freeze.</b></p>` : ""}<div class="cd">${left}</div></div>`;
  };
  clearInterval(frozenTimer); draw(); frozenTimer = setInterval(draw, 250);
}
let slimeStop = null, slimeTimer = null;
async function slimeMe(from, penalty){
  if (state.ph === "end") return;
  const until = Date.now() + SLIME_S * 1000;
  LS.set("bp-slime-" + code, String(until)); if (me) db.update(G("players/" + me), {slime: until});
  try { await loadNuke(); } catch (e) { return; }
  if (slimeStop) slimeStop();
  if (penalty !== true) clip("splat");
  slimeStop = BPNUKE.slimed();
  toast(penalty ? "🧪 Nice try! Refreshing restarts the slime." : `🧪 ${esc(from)} SLIMED you! It'll wear off in ${SLIME_S} seconds…`, "");
  clearTimeout(slimeTimer); slimeTimer = setTimeout(() => { if (slimeStop) { slimeStop(); slimeStop = null; } }, SLIME_S * 1000);
}
function closeOverlay(){ const ov = $("#ov"); ov.className = ""; ov.innerHTML = ""; delete ov.dataset.duel; if (state.ph === "pause") showPause(true); }
function showPause(on){
  const ov = $("#ov");
  if (on) { if (ov.classList.contains("on")) return; ov.className = "on dark"; ov.innerHTML = `<div class="ovc"><div class="big">⏸️</div><h1 class="p">Paused</h1><p class="sub">Eyes on your teacher.</p></div>`; }
  else if (ov.classList.contains("dark") && !ov.dataset.duel) closeOverlay();
}
async function duelVictimSide(id, from){
  const ov = $("#ov");
  const d = await db.get(G("duels/" + id)); if (!d) return;
  if (inMG || nukePlaying) { const o = shuffle([0, 1, 2]); await db.tx(G("duels/" + id + "/hide"), cur => cur ? undefined : {gold: o[0], bomb: o[1], auto: true}); return watchDuel(id, from, true); }
  SFX.alarm();
  ov.className = "on alarm"; ov.dataset.duel = "1";
  let gold = null, bomb = null, done = false, left = 6;
  const draw = () => {
    ov.innerHTML = `<div class="ovc"><div class="big">🚨</div><h1 class="p">${esc(from)} is robbing you!</h1>
      <p class="sub" style="color:#FFF">${gold == null ? "Tap a chest to hide your 💰 GOLD" : "Now tap a different chest for your 💣 BOMB"}</p>
      <p class="bung" style="font-size:2.4rem; margin:0">${left}</p>
      <div class="chests">${[0, 1, 2].map(i => `<button class="chestb ${i === gold || i === bomb ? "sel" : ""}" data-h="${i}" ${i === gold || i === bomb ? "disabled" : ""}><span>${i === gold ? "💰" : i === bomb ? "💣" : "🧰"}</span>${i + 1}</button>`).join("")}</div></div>`;
    ov.querySelectorAll("[data-h]").forEach(b => b.onclick = () => { SFX.click(); const i = +b.dataset.h; if (gold == null) gold = i; else if (bomb == null && i !== gold) bomb = i; if (gold != null && bomb != null) finish(); else draw(); });
  };
  const finish = async () => {
    if (done) return; done = true; clearInterval(iv);
    if (gold == null) gold = Math.floor(Math.random() * 3);
    if (bomb == null) bomb = shuffle([0, 1, 2].filter(i => i !== gold))[0];
    await db.tx(G("duels/" + id + "/hide"), cur => cur ? undefined : {gold, bomb});
    watchDuel(id, from, false);
  };
  const iv = setInterval(() => { left--; if (left <= 0) finish(); else if (!done) { const el = ov.querySelector(".bung"); if (el) el.textContent = left; } }, 1000);
  draw();
}
function watchDuel(id, from, quiet){
  const ov = $("#ov");
  if (!quiet) ov.innerHTML = `<div class="ovc"><div class="big">🫣</div><h1 class="p">Hidden!</h1><p class="sub" style="color:#FFF">Waiting for ${esc(from)} to pick a chest…</p></div>`;
  let off = null; const timer = setTimeout(() => { try { off && off(); } catch (e) {} if (!quiet) closeOverlay(); }, 30000);
  off = db.on(G("duels/" + id), d => {
    if (!d || !d.outcome) return;
    clearTimeout(timer); setTimeout(() => { try { off(); } catch (e) {} }, 0);
    const txt = d.outcome === "gold" ? (d.amt ? `${esc(from)} found your gold and stole <b>${coins(d.amt)}</b>! 😭` : `${esc(from)} found your gold… but you had nothing to take! 😅`)
      : d.outcome === "bomb" ? `💣 BOOM! ${esc(from)} opened your bomb${d.amt ? ` and you got <b>+${coins(d.amt)}</b>!` : "!"}` : `${esc(from)} opened an empty chest. You outsmarted them! 😎`;
    if (d.outcome === "gold") { if (d.amt) clip("nani"); else SFX.womp(); } else SFX.win();
    if (quiet) return toast(txt, d.outcome === "gold" ? "" : "good");
    ov.innerHTML = `<div class="ovc"><div class="big">${d.outcome === "gold" ? "💸" : d.outcome === "bomb" ? "💥" : "😎"}</div><h1 class="p">${d.outcome === "gold" ? "Robbed!" : d.outcome === "bomb" ? "Gotcha!" : "Safe!"}</h1><p class="sub" style="color:#FFF">${txt}</p></div>`;
    setTimeout(closeOverlay, 2600);
  });
}

/* ---------- NUKE 'EM, EXTINCTION EVENT and ZEUS ---------- */
function loadNuke(){
  if (window.BPNUKE) return Promise.resolve();
  if (loadNuke.p) return loadNuke.p;
  loadNuke.p = new Promise((res, rej) => { const s = document.createElement("script"); s.src = "nuke.js"; s.onload = res; s.onerror = e => { loadNuke.p = null; rej(e); }; document.head.appendChild(s); });
  return loadNuke.p;
}
let preloaded = false;
function preloadEvents(){   // fetch the big-event files quietly, so they appear instantly when needed
  if (preloaded) return; preloaded = true;
  loadNuke().catch(() => {});
  try { new Image().src = "nuke-splash.jpg"; const a = new Audio(); a.preload = "auto"; a.src = "siren.mp3"; } catch (e) {}
}
// the same blast logic runs on the board (normally) and on the launcher's device (backup); only one can claim it
async function applyBlast(b){
  const claim = await db.tx(G("blasts/" + b.id + "/claimed"), cur => cur ? undefined : (me || "x"));
  if (!claim.committed) return;
  const snap = Object.assign({}, players); let lost = 0; const angels = [], demons = [];
  for (const pid of Object.keys(snap)) {
    if (pid === b.by) continue;
    const p = snap[pid] || {}; let n = 0;
    await db.tx(G("players/" + pid + "/score"), cur => { cur = cur || 0; n = b.kind === "ext" ? cur : Math.ceil(cur * NUKE_PCT); return cur - n; });
    const upd = {}; if (p.angel > 0) { upd.angel = 0; angels.push(p.name); } if (p.demon) { upd.demon = false; demons.push(p.name); }
    if (Object.keys(upd).length) await db.update(G("players/" + pid), upd);
    lost += n; await db.set(G("blasts/" + b.id + "/loss/" + pid), {n, angel: p.angel > 0, demon: !!p.demon});
  }
  await db.set(G("blasts/" + b.id + "/summary"), {lost, angels, demons});
}
async function launchBlast(kind){
  const id = uid(kind === "ext" ? "x" : "n"), name = P().name, b = {id, kind, by: me, name, ts: Date.now()};
  await db.set(G("blast"), b); ev({k: kind, a: name, id, by: me});
  setTimeout(() => applyBlast(b).catch(() => {}), kind === "ext" ? 8000 : 5000);   // takes the coins as it lands, even if the board misses it
}
async function nukeLanding(){
  view = "nuke"; const name = P().name;
  ev({k: "nukestart", a: name});
  try { await loadNuke(); } catch (e) { return resultScreen("😕", "The nuke wouldn't load", `<p class="sub">Have a coin instead.</p>`, async () => { await addMine(1); nextQuestion(); }); }
  const qs = shuffle(Q.map((_, i) => i)).slice(0, 4).map(i => Q[i]);
  let ok = false;
  try { ok = await BPNUKE.challenge({questions: qs, onLaunch: () => launchBlast("nuke")}); } catch (e) {}
  if (!ok) { ev({k: "nukefail", a: name}); return resultScreen("💨", "Mission failed", `<p class="sub">The missile fizzled out. Nobody got nuked… this time.</p>`); }
  resultScreen("☢️", "You NUKED the class!", `<p class="sub">Everyone else just lost half their coins, and every angel and demon was wiped out. 😈</p>`);
}
async function extLanding(){
  view = "ext"; const name = P().name;
  ev({k: "extstart", a: name});
  try { await loadNuke(); } catch (e) { return resultScreen("😕", "The temple wouldn't load", `<p class="sub">Have a coin instead.</p>`, async () => { await addMine(1); nextQuestion(); }); }
  let ok = false;
  try { ok = await BPNUKE.temple({onLaunch: () => launchBlast("ext")}); } catch (e) {}
  if (!ok) { ev({k: "extfail", a: name}); return resultScreen("🗿", "The gods said no", `<p class="sub">The temple goes dark. No asteroid this time.</p>`); }
  resultScreen("☄️", "EXTINCTION!", `<p class="sub">Everyone else just lost <b>ALL</b> their coins. 😈</p>`);
}
let blastQueue = [];
function queueBlast(v){
  blastQueue.push(v); runBlasts();
  setTimeout(async () => { try { if (!(await db.get(G("blasts/" + v.id + "/claimed")))) await applyBlast(v); } catch (e) {} }, 14000 + Math.random() * 3000);
}
async function runBlasts(){
  if (nukePlaying) return;
  while (blastQueue.length) {
    while (inMG || ($("#ov").dataset.duel) || fxBusy || document.getElementById("zapov")) await sleep(400);
    const v = blastQueue.shift(); nukePlaying = true;
    try {
      await loadNuke();
      const getMessage = async () => {
        let loss = null, waited = 0;   // the board takes the coins; wait for its answer
        while (loss == null && waited < 20000) { loss = await db.get(G("blasts/" + v.id + "/loss/" + me)); if (loss == null) { await sleep(500); waited += 500; } }
        compState = ""; renderComp();
        if (loss == null) return {sub: v.kind === "ext" ? "☄️ Your coins are gone!" : "☢️ Your coins took a hit!"};
        const extra = (loss.angel ? "<br>😇💥 Your angel couldn't survive…" : "") + (loss.demon ? "<br>😈💥 …but at least your demon is gone too!" : "");
        return {sub: (loss.n ? `You lost ${coins(loss.n)} 💸` : "You had no coins to lose 😅") + extra};
      };
      if (v.kind === "ext") await BPNUKE.asteroid({name: v.name, names: ranked().map(k => players[k].name), sound: true, button: "Carry on", getMessage});
      else await BPNUKE.cutscene({name: v.name, sound: true, button: "Carry on", getMessage});
    } catch (e) { const n = document.getElementById("nk"); if (n) n.remove(); }
    nukePlaying = false;
  }
}
let pendingZaps = [], zapping = false;
async function runZaps(){
  if (zapping) return; zapping = true;
  while (pendingZaps.length) {
    while (inMG || nukePlaying || fxBusy) await sleep(400);
    const m = pendingZaps.shift();
    try { await loadNuke(); await BPNUKE.zapped({from: m.from, lost: m.n}); } catch (e) {}
  }
  zapping = false;
}

/* ---------- mini game (one go per game) ---------- */
function miniGameChoice(){
  view = "mgchoice";
  app.innerHTML = topHTML() + `<div class="big">🎮</div><h1 class="p">Mini game!</h1><p class="sub">You only get <b>one</b> mini game per game, so choose well. Win = <b>+${coins(MG_WIN)}</b>${dbl ? " (doubled!)" : ""}.</p>
    <button class="btn cyan block" data-g="stars">🦄 Star Catcher</button><button class="btn cyan block" data-g="hussain">🍛 Feed Mr. Hussain</button>`;
  app.querySelectorAll("[data-g]").forEach(b => b.onclick = () => playMG(b.dataset.g));
}
function loadMG(){
  if (window.BPMG) return Promise.resolve();
  return new Promise((res, rej) => { const s = document.createElement("script"); s.src = "minigames.js"; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
}
function closeMG(){ const k = document.getElementById("kg"); if (k) k.remove(); inMG = false; }
async function playMG(key){
  app.querySelectorAll("[data-g]").forEach(b => b.disabled = true);
  await setMine({mg: true});
  try { await loadMG(); } catch (e) { return resultScreen("😕", "Couldn't load the game", `<p class="sub">Have a coin instead.</p>`, async () => { await addMine(1); nextQuestion(); }); }
  inMG = true;
  window.BPMG.open(key, async won => {
    inMG = false;
    let pts = 0; const was = dbl && won;
    if (won) { pts = MG_WIN * (dbl ? 2 : 1); dbl = false; await addMine(pts); ev({k: "mgwin", a: P().name, n: pts, g: key === "stars" ? "Star Catcher" : "Feed Mr. Hussain"}); }
    resultScreen(won ? "🏆" : "💫", won ? `+${coins(pts)}!` : "So close!", won ? (was ? `<p class="sub">✖️2 Double applied!</p>` : "") : `<p class="sub">No coins this time.</p>`);
    while (pendingFreeze.length) freezeMe(pendingFreeze.shift().from);
  });
}

/* ---------- start ---------- */
if (params.get("c")) tryCode(params.get("c")); else renderCode();
window.__bp = () => ({me, view, dbl, fifty, players, state, curQ});
})();
