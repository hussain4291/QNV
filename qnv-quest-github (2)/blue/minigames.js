/* Blue Psych mini games (Star Catcher and Feed Mr. Hussain), loaded only when a student picks one. */
(function(){
"use strict";
const $ = s => document.querySelector(s);
const SFX = Object.assign({}, window.BP_SFX || {});
["womp","coins","correct","win","click"].forEach(k => { if (!SFX[k]) SFX[k] = () => {}; });
const ac = () => null;
function tone(f, start, dur, type, vol, f2){ try { const S = window.BP_SFX; if (S && S.__tone) S.__tone(f, start, dur, type, vol, f2); } catch (e) {} }
function speak(text){ try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text.replace(/\p{Extended_Pictographic}|\uFE0F|\u20E3/gu, "")); u.rate = .92; u.lang = "en-GB"; speechSynthesis.speak(u); } catch (e) {} }
function shuffle(a){ a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function kidShell({icon, title, howto, onDone, run}){
  const ov = document.createElement("div"); ov.id = "kg"; document.body.appendChild(ov);
  let alive = true; const L = 1;
  const intro = () => {
    ov.innerHTML = `<div class="kg-card"><div class="big">${icon}</div><h1 class="p">${title}</h1><p class="sub" style="color:#FFF">${typeof howto === "function" ? howto(L) : howto}</p>
      <button class="btn primary block" id="kg-go" style="font-size:1.4rem">▶ Start!</button></div>`;
    $("#kg-go").onclick = play;
  };
  const play = () => {
    ov.innerHTML = `<canvas id="kg-cv"></canvas><div class="kg-hud" id="kg-hud"></div>`;
    const cv = $("#kg-cv"), ctx = cv.getContext("2d"), dpr = window.devicePixelRatio || 1;
    const fit = () => { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; cv.style.width = innerWidth + "px"; cv.style.height = innerHeight + "px"; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    fit(); window.addEventListener("resize", fit);
    run({L, cv, ctx, W: () => innerWidth, H: () => innerHeight, alive: () => alive && document.body.contains(ov), hud: h => { const e = $("#kg-hud"); if (e) e.innerHTML = h; },
      end: (won, msg) => { window.removeEventListener("resize", fit); if (won) SFX.win(); else SFX.womp(); setTimeout(() => result(won, msg), won ? 600 : 300); }});
  };
  const result = (won, msg) => {
    if (!alive || !document.body.contains(ov)) return;
    ov.innerHTML = `<div class="kg-card"><div class="big">${won ? "🏆" : "💫"}</div><h1 class="p" style="color:${won ? "var(--good)" : "var(--gold)"}">${won ? "YOU DID IT!" : "SO CLOSE!"}</h1>
      <p class="sub" style="color:#FFF">${msg || ""}</p><button class="btn primary block" id="kg-x">Carry on</button></div>`;
    $("#kg-x").onclick = () => { alive = false; ov.remove(); onDone && onDone(won); };
  };
  intro();
}
function skyBG(ctx, W, H, T){
  const g = ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,"#3B0A45"); g.addColorStop(1,"#C2407F");
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
  ctx.fillStyle = "#FFF6D6"; for(let k=0;k<40;k++){ const x=(k*137)%W, y=(k*71)%(H*0.6); ctx.globalAlpha=.4+.6*Math.abs(Math.sin(T*2+k)); ctx.fillRect(x,y,2.5,2.5); } ctx.globalAlpha=1;
  ctx.fillStyle="#FFE9A8"; ctx.beginPath(); ctx.arc(W*0.85,H*0.15,H*0.07,0,7); ctx.fill(); ctx.fillStyle="#5A1846"; ctx.beginPath(); ctx.arc(W*0.85+H*0.03,H*0.14,H*0.065,0,7); ctx.fill();
}
function drawUnicorn(ctx, x, y, s, T, flip=false){
  ctx.save(); ctx.translate(x,y); ctx.scale(flip?-s:s, s);
  const cols = ["#FF4FA3","#FF9F43","#FFE066","#5BE39A","#4FC3F7","#A77BFF"];
  cols.forEach((c,i)=>{ ctx.strokeStyle=c; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(-26,-8+i*2); ctx.quadraticCurveTo(-44,-4+i*3+Math.sin(T*8+i)*4,-50,8+i*3); ctx.stroke(); });
  ctx.fillStyle="#FFF"; ctx.beginPath(); ctx.ellipse(0,0,28,16,0,0,7); ctx.fill();
  ctx.fillStyle="#F3E5F5"; [-16,-6,8,18].forEach((lx,i)=>ctx.fillRect(lx,8,6,16+Math.sin(T*16+i)*3));
  ctx.fillStyle="#FFF"; ctx.beginPath(); ctx.ellipse(26,-16,12,10,-0.5,0,7); ctx.fill(); ctx.beginPath(); ctx.ellipse(34,-10,10,7,0.2,0,7); ctx.fill();
  cols.forEach((c,i)=>{ ctx.fillStyle=c; ctx.beginPath(); ctx.ellipse(16-i*2,-20+i*3,6,4,0.8,0,7); ctx.fill(); });
  ctx.fillStyle="#FFD23F"; ctx.beginPath(); ctx.moveTo(30,-25); ctx.lineTo(40,-44); ctx.lineTo(35,-23); ctx.closePath(); ctx.fill();
  ctx.fillStyle="#1E1147"; ctx.beginPath(); ctx.arc(32,-15,2.2,0,7); ctx.fill(); ctx.fillStyle="#FF8FB8"; ctx.beginPath(); ctx.arc(38,-8,2.5,0,7); ctx.fill();
  ctx.restore();
}
/* ---------- 🦄 Unicorn Star Catcher ---------- */
function openStars({team=null, practice=false, onDone}){
  kidShell({icon:"🦄", title:"STAR CATCHER", practice, team, onDone, levelKey:"stars",
    howto:L => `Move the mouse (or drag) to steer the unicorn and catch falling ⭐ stars and 🌈 rainbows. Catch <b>${[12,15,18][L-1]} in 20 seconds</b> to win! Grey ☁️ clouds make the unicorn sneeze and slow down, and ⛈️ storm clouds <b>knock 2 stars off</b> your total.`,
    run:({L, ctx, W, H, alive, hud, end, cv}) => {
      const GOAL = [12,15,18][L-1], FALL = [1.35,1.55,1.75][L-1], CLOUD = [0.24,0.3,0.36][L-1];
      let ux = W()/2, target = ux, got = 0, items = [], spawn = 0, slow = 0, t0 = performance.now(), prev = t0, done = false;
      const move = e => { const r = cv.getBoundingClientRect(); target = (e.touches?e.touches[0].clientX:e.clientX) - r.left; };
      cv.addEventListener("pointermove", move); cv.addEventListener("pointerdown", move);
      (function f(now){
        if(!alive() || done) return;
        const dt = Math.min(.05,(now-prev)/1000); prev = now; const el = (now-t0)/1000, T = now/1000;
        skyBG(ctx, W(), H(), T);
        spawn -= dt; if(spawn<=0){ const r=Math.random(); items.push({x:30+Math.random()*(W()-60), y:-30, v:(120+Math.random()*90+el*6)*FALL, k: r<(1-CLOUD)*0.76?"⭐":r<1-CLOUD?"🌈":(Math.random()<0.45?"⛈️":"☁️")}); spawn = (0.45 + Math.random()*0.35)/Math.sqrt(FALL); }
        if(slow>0) slow -= dt;
        ux += (target-ux) * Math.min(1, dt*(slow>0?2.2:8));
        const uy = H()-70, us = Math.min(1.7, H()/420);
        items.forEach(it => { it.y += it.v*dt; });
        items = items.filter(it => {
          if(Math.abs(it.x-ux) < 50*us && Math.abs(it.y-(uy-10)) < 34*us){
            if(it.k==="☁️"){ slow = 1.5; SFX.womp(); } else if(it.k==="⛈️"){ got = Math.max(0, got-2); slow = 0.8; SFX.womp(); tone(120,0,.3,"sawtooth",.15,60); } else { got++; tone(1200+got*60,0,.12,"triangle",.15); }
            return false; }
          return it.y < H()+40; });
        ctx.font = `${Math.round(38*us)}px sans-serif`; ctx.textAlign="center"; ctx.textBaseline="middle";
        items.forEach(it => ctx.fillText(it.k, it.x, it.y));
        drawUnicorn(ctx, ux, uy, us, T);
        if(slow>0){ ctx.font=`${Math.round(22*us)}px sans-serif`; ctx.fillText("🤧 Achoo!", ux, uy-60*us); }
        hud(`⭐ ${got} / ${GOAL} &nbsp; ⏱️ ${Math.max(0,20-el).toFixed(0)}s`);
        if(got>=GOAL){ done=true; return end(true, `You caught ${got} stars!`); }
        if(el>=20){ done=true; return end(false, `You caught ${got} stars. You needed ${GOAL}.`); }
        requestAnimationFrame(f);
      })(t0);
    }});
}

const DADDY_FOODS = [["🍖","lamb chops"],["🍛","biryani"],["🥟","samosas"],["🍕","pizza"],["🍦","ice cream"],["🥭","mango"],["🍗","chicken"],["🍉","watermelon"]];
function drawDaddy(ctx, x, y, s, T, mood, open){
  ctx.save(); ctx.translate(x,y); ctx.scale(s,s);
  ctx.fillStyle="#90CAF9"; ctx.beginPath(); ctx.ellipse(0,120,95,70,0,Math.PI,0); ctx.fill();
  ctx.fillStyle="#E8B887"; ctx.beginPath(); ctx.ellipse(0,20,70,74,0,0,7); ctx.fill();
  ctx.fillStyle="#1A1A1A"; ctx.beginPath(); ctx.moveTo(-68,20); ctx.quadraticCurveTo(-72,108,0,120); ctx.quadraticCurveTo(72,108,68,20); ctx.quadraticCurveTo(40,50,0,52); ctx.quadraticCurveTo(-40,50,-68,20); ctx.fill();
  ctx.fillStyle="#FFF"; [[-40,70],[22,92],[46,60],[-12,104],[-52,44],[8,80]].forEach(([a,b])=>{ ctx.fillRect(a,b,3,9); });
  // mouth
  ctx.fillStyle="#5A1A1A"; ctx.beginPath(); ctx.ellipse(0,62, open?26:22, open?24:10, 0, 0, 7); ctx.fill();
  if(open){ ctx.fillStyle="#E57373"; ctx.beginPath(); ctx.ellipse(0,74,14,8,0,0,7); ctx.fill(); }
  if(mood==="yuck"){ ctx.fillStyle="#7CB342"; ctx.beginPath(); ctx.ellipse(0,70,10,6,0,0,7); ctx.fill(); }
  // moustache
  ctx.fillStyle="#1A1A1A"; ctx.beginPath(); ctx.ellipse(-16,42,18,7,0.2,0,7); ctx.ellipse(16,42,18,7,-0.2,0,7); ctx.fill();
  ctx.fillStyle="#D9A374"; ctx.beginPath(); ctx.ellipse(0,26,10,12,0,0,7); ctx.fill();
  ctx.fillStyle="#FF8FB8"; ctx.globalAlpha=.5; ctx.beginPath(); ctx.arc(-40,26,10,0,7); ctx.arc(40,26,10,0,7); ctx.fill(); ctx.globalAlpha=1;
  // eyes + glasses
  ctx.fillStyle="#1A1A1A";
  if(mood==="happy"){ ctx.lineWidth=4; ctx.strokeStyle="#1A1A1A"; ctx.beginPath(); ctx.arc(-24,4,7,Math.PI*1.1,Math.PI*1.9); ctx.stroke(); ctx.beginPath(); ctx.arc(24,4,7,Math.PI*1.1,Math.PI*1.9); ctx.stroke(); }
  else { ctx.beginPath(); ctx.arc(-24,2,5,0,7); ctx.arc(24,2,5,0,7); ctx.fill(); }
  ctx.strokeStyle="#333"; ctx.lineWidth=5; ctx.beginPath(); ctx.roundRect(-44,-12,38,28,10); ctx.roundRect(6,-12,38,28,10); ctx.moveTo(-6,0); ctx.lineTo(6,0); ctx.moveTo(-44,0); ctx.lineTo(-66,-6); ctx.moveTo(44,0); ctx.lineTo(66,-6); ctx.stroke();
  ctx.strokeStyle="#1A1A1A"; ctx.lineWidth=5; ctx.beginPath(); ctx.moveTo(-40,-22); ctx.lineTo(-12,-24); ctx.moveTo(12,-24); ctx.lineTo(40,-22); ctx.stroke();
  // prayer hat (topi)
  ctx.fillStyle="#FFFFFF"; ctx.beginPath(); ctx.moveTo(-58,-36); ctx.quadraticCurveTo(0,-104,58,-36); ctx.lineTo(56,-28); ctx.quadraticCurveTo(0,-40,-56,-28); ctx.closePath(); ctx.fill();
  ctx.strokeStyle="#D6C8A8"; ctx.lineWidth=2; for(let k=-40;k<=40;k+=10){ ctx.beginPath(); ctx.moveTo(k,-36); ctx.lineTo(k*0.6,-70); ctx.stroke(); }
  ctx.restore();
}
function openFeedHussain({team=null, practice=false, onDone}){
  kidShell({icon:"🍛", title:"FEED MR. HUSSAIN", practice, team, onDone, levelKey:"hussain",
    howto:L => `Mr. Hussain is hungry! Look at his thought cloud to see what he wants, then <b>flick that food up</b> into his mouth. It can bounce off the walls and ceiling too! Feed him <b>${[9,10,12][L-1]} foods in 20 seconds</b> to win! Every wrong food <b>loses 1</b>. If he dreams of ⭐ <b>lamb chops</b>, that's a BONUS: it counts as 2`,

    run:({L, ctx, W, H, alive, hud, end, cv}) => {
      const GOAL = [9,10,12][L-1], LIMIT = 20, SW = [0.8,1.0,1.15][L-1], AMP = [0.16,0.18,0.2][L-1], AIM = [0.62,0.56,0.5][L-1], MOUTH = [58,55,52][L-1];
      let txt = null, landed = []; let fed = 0, t0 = performance.now(), prev = t0, done = false, mood = "idle", moodT = 0, shot = null, drag = null;
      let lastWant = null;
      const pickWant = () => { let w; do { w = (lastWant!==DADDY_FOODS[0] && Math.random() < 0.22) ? DADDY_FOODS[0] : DADDY_FOODS[1+Math.floor(Math.random()*(DADDY_FOODS.length-1))]; } while(w===lastWant); lastWant = w; return w; };
      let want = pickWant(), tray = [];
      const makeTray = () => { const others = shuffle(DADDY_FOODS.filter(f=>f!==want)).slice(0,4); tray = shuffle([want, ...others]); };
      makeTray();
      window.__fd = () => ({wi: tray.indexOf(want), fed});
      const trayPos = i => ({x: W()*(0.14 + i*0.18), y: H()-84});
      // cannons under each food: they kick back and puff smoke when a food is flicked
      const recoil = [0,0,0,0,0]; let puffs = [];
      const drawCannon = (i, x, top, k) => {
        const off = k*12, base = H()-6;
        ctx.save();
        ctx.fillStyle="#5A3A1E"; ctx.fillRect(x-28, base-24, 56, 12);
        [-19,19].forEach(d => { ctx.fillStyle="#6B4423"; ctx.beginPath(); ctx.arc(x+d, base-10, 11, 0, 7); ctx.fill(); ctx.fillStyle="#C9A24A"; ctx.beginPath(); ctx.arc(x+d, base-10, 3.5, 0, 7); ctx.fill(); });
        const g = ctx.createLinearGradient(x-16, 0, x+16, 0); g.addColorStop(0,"#2B2F38"); g.addColorStop(.45,"#6A7282"); g.addColorStop(1,"#2B2F38");
        ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x-15, top+off, 30, base-24-(top+off)+4, 7); ctx.fill();
        ctx.fillStyle="#1D2027"; ctx.fillRect(x-17, top+off+8, 34, 6);
        ctx.fillStyle="#14161B"; ctx.beginPath(); ctx.ellipse(x, top+off+2, 15, 5, 0, 0, 7); ctx.fill();
        ctx.restore();
      };
      const fire = i => {
        const q = trayPos(i); recoil[i] = 1;
        puffs.push({x:q.x, y:q.y+22, t:0, parts:Array.from({length:9}, () => ({a: -Math.PI/2 + (Math.random()-.5)*2.2, sp: 40+Math.random()*70, r: 6+Math.random()*6}))});
        tone(95,0,.22,"sawtooth",.16,45); tone(1200,0,.05,"square",.06);
      };
      const pos = e => { const r = cv.getBoundingClientRect(); return {x:e.clientX-r.left, y:e.clientY-r.top, t:performance.now()}; };
      cv.addEventListener("pointerdown", e => { if(shot) return; const p = pos(e); tray.forEach((f,i) => { const q = trayPos(i); if(Math.hypot(p.x-q.x,p.y-q.y) < 44) drag = {i, start:p, last:p}; }); });
      cv.addEventListener("pointermove", e => { if(drag) drag.last = pos(e); });
      cv.addEventListener("pointerup", e => { if(!drag) return; const p = pos(e), st = drag.start, dt = Math.max(40, p.t - st.t);
        let vx = (p.x-st.x)/dt*1000*1.5, vy = (p.y-st.y)/dt*1000*1.5;
        if(vy < -120 && vy > -1150){ const k = -1150/vy; vx *= k; vy = -1150; }
        if(vy < -120){
          const q0 = trayPos(drag.i), s0 = Math.min(1, H()/700), my = H()*0.26 + 62*s0, hgt = q0.y - my, G = 600;
          const need = Math.sqrt(2*G*hgt)*1.08; vy = Math.max(-need*1.5, Math.min(vy, -need));
          const tt = (-vy - Math.sqrt(Math.max(0, vy*vy - 2*G*hgt)))/G;
          const mxNow = W()/2 + Math.sin(performance.now()/1000*SW)*W()*AMP;
          vx = (1-AIM)*vx + AIM*(mxNow - q0.x)/Math.max(0.2, tt); const q = trayPos(drag.i); shot = {f:tray[drag.i], x:q.x, y:q.y, vx, vy, r:0}; tone(500,0,.1,"triangle",.12,900); fire(drag.i); }
        drag = null; });
      (function f(now){
        if(!alive()) return;
        const dt = Math.min(.04,(now-prev)/1000); prev = now; const el = (now-t0)/1000, T = now/1000;
        skyBG(ctx, W(), H(), T);
        ctx.fillStyle="#E8A5C8"; ctx.fillRect(0,H()-110,W(),110);
        const s = Math.min(1, H()/700), dx = W()/2 + Math.sin(T*SW)*W()*AMP, dy = H()*0.26;
        if(moodT>0){ moodT -= dt; if(moodT<=0) mood = "idle"; }
        drawDaddy(ctx, dx, dy, s, T, mood, mood!=="yuck");
        // thought cloud
        const cx = Math.min(W() - 58*s, dx + 150*s), cy = dy - 110*s;
        ctx.fillStyle="#FFF"; [[0,0,46],[34,-10,34],[-34,-8,32],[10,22,30],[-18,20,26]].forEach(([a,b,r])=>{ ctx.beginPath(); ctx.arc(cx+a*s,cy+b*s,r*s,0,7); ctx.fill(); });
        ctx.beginPath(); ctx.arc(dx+90*s, dy-50*s, 10*s, 0, 7); ctx.arc(dx+108*s, dy-72*s, 14*s, 0, 7); ctx.fill();
        ctx.font=`${Math.round(52*s)}px sans-serif`; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText(want[0], cx, cy+4*s);
        if(want===DADDY_FOODS[0]){ ctx.fillStyle="#FFD23F"; ctx.font=`bold ${Math.round(18*s)}px Nunito, sans-serif`; ctx.fillText("⭐ BONUS ⭐", cx, cy+60*s); }
        // cannons, then the food sitting in each cannon's mouth
        tray.forEach((fd,i) => { recoil[i] = Math.max(0, recoil[i]-dt*3.5); const q = trayPos(i); drawCannon(i, q.x, q.y+22, recoil[i]); });
        puffs = puffs.filter(p => (p.t += dt) < .6);
        puffs.forEach(p => {
          if(p.t < .14){ ctx.globalAlpha = 1 - p.t/.14; ctx.fillStyle="#FFB347"; ctx.beginPath(); ctx.arc(p.x, p.y, 24, 0, 7); ctx.fill(); }
          p.parts.forEach(m => { const k = p.t/.6; ctx.globalAlpha = Math.max(0, .85*(1-k)); ctx.fillStyle = k < .3 ? "#FFF" : "#D9D9E3"; ctx.beginPath(); ctx.arc(p.x + Math.cos(m.a)*m.sp*p.t*2.2, p.y + Math.sin(m.a)*m.sp*p.t*2.2, m.r*(1+k*1.8), 0, 7); ctx.fill(); });
          ctx.globalAlpha = 1;
          if(p.t < .35){ ctx.fillStyle="#FFF"; ctx.font=`bold 20px "Bungee", Nunito, sans-serif`; ctx.globalAlpha = 1 - p.t/.35; ctx.fillText("PUFF!", p.x + 34, p.y - 18 - p.t*40); ctx.globalAlpha = 1; }
        });
        // tray
        tray.forEach((fd,i) => { const q = trayPos(i); if(shot && shot.f===fd) return; ctx.font="52px sans-serif"; ctx.fillText(fd[0], q.x, q.y); });
        if(drag){ const q = trayPos(drag.i); ctx.strokeStyle="rgba(255,255,255,.7)"; ctx.lineWidth=4; ctx.setLineDash([8,8]); ctx.beginPath(); ctx.moveTo(q.x,q.y); ctx.lineTo(drag.last.x,drag.last.y); ctx.stroke(); ctx.setLineDash([]); }
        if(shot){
          const mx0 = dx; shot.vx += (mx0 - shot.x)*2.2*dt; shot.vy += 600*dt; shot.x += shot.vx*dt; shot.y += shot.vy*dt; shot.r += dt*8;
          const R0 = 26, floorY = H()-110-R0;
          if(shot.x < R0 && shot.vx < 0){ shot.x = R0; shot.vx = -shot.vx*0.8; tone(300,0,.08,"sine",.18,520); }
          if(shot.x > W()-R0 && shot.vx > 0){ shot.x = W()-R0; shot.vx = -shot.vx*0.8; tone(300,0,.08,"sine",.18,520); }
          if(shot.y < R0 && shot.vy < 0){ shot.y = R0; shot.vy = -shot.vy*0.7; tone(260,0,.08,"sine",.18,460); }
          ctx.save(); ctx.translate(shot.x,shot.y); ctx.rotate(shot.r); ctx.font="52px sans-serif"; ctx.fillText(shot.f[0],0,0); ctx.restore();
          const mx = dx, my = dy + 62*s;
          if(Math.hypot(shot.x-mx, shot.y-my) < MOUTH*s){
            if(shot.f===want){
              if(want===DADDY_FOODS[0]){ fed += 2; floatTxt("Mmm, lamb chops! My favourite! 😍"); speak("Mmm, lamb chops! My favourite!"); (SFX.coins || SFX.correct)(); }
              else { fed++; floatTxt("NOM NOM! 😋"); }
              mood="happy"; moodT=1.4; SFX.correct(); want = pickWant(); makeTray(); }
            else { mood="yuck"; moodT=1.4; SFX.womp(); fed = Math.max(0, fed-1); floatTxt(`Bleurgh! I wanted ${want[1]}! −1`); }
            shot = null;
          } else if(shot.vy > 0 && shot.y >= floorY){ landed.push({f:shot.f, x:shot.x, y:floorY, t:0.7}); tone(160,0,.1,"sine",.15); shot = null; }
        }
        landed = landed.filter(l => (l.t -= dt) > 0);
        landed.forEach(l => { ctx.globalAlpha = Math.min(1, l.t/0.4); ctx.font = "52px sans-serif"; ctx.fillText(l.f[0], l.x, l.y); ctx.globalAlpha = 1; });
        if(txt){ txt.t -= dt; ctx.globalAlpha = Math.max(0,Math.min(1,txt.t)); ctx.fillStyle="#FFF"; ctx.font=`bold ${Math.round(30*s)}px Nunito, sans-serif`; ctx.fillText(txt.s, dx, dy+170*s); ctx.globalAlpha=1; if(txt.t<=0) txt=null; }
        hud(`😋 ${Math.min(fed,GOAL)} / ${GOAL} &nbsp; ⏱️ ${Math.max(0,LIMIT-el).toFixed(0)}s`);
        if(fed>=GOAL && !done){ done=true; return end(true, "Mr. Hussain is full and happy! 🍖"); }
        if(el>=LIMIT && !done){ done=true; return end(false, `Mr. Hussain ate ${fed} of the right foods. He needed ${GOAL}!`); }
        requestAnimationFrame(f);
      })(t0);
      function floatTxt(s){ txt = {s, t:2}; }
    }});
}



window.BPMG = { open(key, cb){ (key === "stars" ? openStars : openFeedHussain)({team: null, practice: false, onDone: cb}); } };
})();
