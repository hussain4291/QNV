/* Teacher sign-in screen for the board pages. Needs net.js loaded first. */
(function(){
  const g = document.createElement("div");
  g.id = "pinGate";
  g.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:#0d1020;display:flex;align-items:center;justify-content:center;font-family:system-ui,Segoe UI,Arial,sans-serif";
  const inp = "width:100%;box-sizing:border-box;font-size:18px;padding:11px;border-radius:10px;border:2px solid #3d4580;background:#0d1020;color:#fff;margin-bottom:10px";
  g.innerHTML = `<form id="pinForm" style="background:#1b2040;padding:32px 36px;border-radius:18px;text-align:center;color:#fff;box-shadow:0 10px 40px #0008;width:min(360px,90vw);visibility:hidden">
    <div style="font-size:44px">🔒</div>
    <h2 style="margin:8px 0 6px;font-size:24px">Teacher sign-in</h2>
    <p style="margin:0 0 16px;opacity:.75;font-size:14px">Students: scan the QR code on the board to join.</p>
    <input id="gEmail" type="email" autocomplete="username" placeholder="Email" style="${inp}">
    <input id="pinIn" type="password" autocomplete="current-password" placeholder="Password" style="${inp}">
    <label style="display:flex;gap:8px;align-items:center;justify-content:center;margin:6px 0 14px;font-size:14px;opacity:.85"><input id="pinRem" type="checkbox" checked> Remember this laptop</label>
    <button type="submit" style="width:100%;font-size:18px;padding:11px;border:0;border-radius:10px;background:#3DDC84;color:#0d1020;font-weight:700;cursor:pointer">Sign in</button>
    <div id="pinErr" style="color:#FF5A5F;margin-top:10px;min-height:18px;font-size:14px"></div>
  </form>`;
  document.body.appendChild(g);
  const $ = s => g.querySelector(s), err = $("#pinErr"), form = $("#pinForm");
  let last = ""; try { last = localStorage.getItem("olg-teacher-email") || ""; } catch (e) {}
  $("#gEmail").value = last;
  const ok = u => u && u.uid === NET.TEACHER;
  const show = () => { form.style.visibility = "visible"; ($("#gEmail").value ? $("#pinIn") : $("#gEmail")).focus(); };
  const msg = e => {
    const c = (e && e.code) || "";
    if (/invalid-credential|wrong-password|user-not-found|invalid-email|missing-password/.test(c)) return "Wrong email or password";
    if (/too-many-requests/.test(c)) return "Too many tries. Wait a minute and try again.";
    if (/network/.test(c)) return "No internet connection";
    return "Couldn't sign in" + (c ? " (" + c + ")" : "");
  };
  NET.user().then(u => { if (ok(u)) g.remove(); else show(); }, show);
  form.addEventListener("submit", async ev => {
    ev.preventDefault();
    const email = $("#gEmail").value.trim(), pw = $("#pinIn").value;
    if (!email || !pw) return;
    err.style.color = "#9aa3d8"; err.textContent = "Signing in…";
    try {
      const u = await NET.login(email, pw, $("#pinRem").checked);
      if (!ok(u)) { await NET.logout(); throw {code: "not-teacher"}; }
      try { localStorage.setItem("olg-teacher-email", email); } catch (e) {}
      g.remove();
    } catch (e) {
      err.style.color = "#FF5A5F"; err.textContent = e && e.code === "not-teacher" ? "That account isn't the teacher account" : msg(e);
      $("#pinIn").value = ""; $("#pinIn").focus();
    }
  });
})();
