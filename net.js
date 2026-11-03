/* Online connection layer shared by the host screen and the student page.
   Uses Firebase Realtime Database. Add ?local=1 to the address to run a
   test version that only works between tabs of one browser (no internet needed). */
(function(){
  const CFG = {
    apiKey: "AIzaSyAzXf4ID8uy3qN7Tio4WTz3pHnudcQ8d3A",
    authDomain: "psych-game-1.firebaseapp.com",
    databaseURL: "https://psych-game-1-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "psych-game-1",
    storageBucket: "psych-game-1.firebasestorage.app",
    messagingSenderId: "283514807627",
    appId: "1:283514807627:web:206e8fd0cfbb73e380b4ce"
  };
  const SDK = "https://www.gstatic.com/firebasejs/13.0.0/";
  const LOCAL = /[?&]local=1/.test(location.search);
  let ready = null;

  let appP = null, authP = null;
  const app = () => appP || (appP = import(SDK + "firebase-app.js").then(A => A.initializeApp(CFG)));
  /* Sign-in: the teacher uses email + password; students get an invisible anonymous ID. */
  function fbAuth(){
    return authP || (authP = Promise.all([app(), import(SDK + "firebase-auth.js")]).then(async ([a, U]) => {
      const auth = U.getAuth(a); await auth.authStateReady();
      return {U, auth};
    }));
  }
  const userOf = u => u ? {uid: u.uid, email: u.email || "", anon: !!u.isAnonymous} : null;
  const fbUser = () => fbAuth().then(({auth}) => userOf(auth.currentUser));
  const fbLogin = (email, pw, remember) => fbAuth().then(async ({U, auth}) => {
    await U.setPersistence(auth, remember ? U.browserLocalPersistence : U.browserSessionPersistence);
    return userOf((await U.signInWithEmailAndPassword(auth, email, pw)).user);
  });
  const fbLogout = () => fbAuth().then(({U, auth}) => U.signOut(auth));
  async function fbStudent(){   // make sure this device has an ID before touching the database
    const {U, auth} = await fbAuth();
    if (!auth.currentUser) await U.signInAnonymously(auth);
    return auth.currentUser.uid;
  }

  function firebaseBackend(){
    const host = document.body && document.body.classList.contains("host");
    return Promise.all([app(), import(SDK + "firebase-database.js"), host ? fbUser().then(u => u && u.uid) : fbStudent()]).then(([a, D, uid]) => {
      window.NET.uid = uid;
      const db = D.getDatabase(a);
      const r = p => D.ref(db, p);
      return {
        set: (p, v) => D.set(r(p), v),
        update: (p, v) => D.update(r(p), v),
        remove: p => D.remove(r(p)),
        push: (p, v) => D.push(r(p), v),
        get: p => D.get(r(p)).then(s => s.val()),
        on: (p, cb) => D.onValue(r(p), s => cb(s.val()), () => {}),
        claim: (p, v) => D.runTransaction(r(p), cur => (cur == null ? v : undefined)).then(res => res.committed),
        tx: (p, fn) => D.runTransaction(r(p), cur => fn(cur)).then(res => ({committed: res.committed, val: res.snapshot.val()})),
        now: () => D.serverTimestamp(),
        dropOnLeave: (p, v) => D.onDisconnect(r(p)).update(v),
        keepOnLeave: p => D.onDisconnect(r(p)).cancel(),
        connected: cb => D.onValue(r(".info/connected"), s => cb(!!s.val())),
        local: false
      };
    });
  }

  /* Test backend: a shared data tree in this browser's storage, synced between tabs. */
  const localUser = () => { try { return JSON.parse(localStorage.getItem("olg-local-teacher")); } catch (e) { return null; } };
  function localBackend(){
    const KEY = "olg-local-db", chan = ("BroadcastChannel" in window) ? new BroadcastChannel("olg-local") : null;
    const listeners = new Set();
    const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
    const parts = p => String(p).split("/").filter(Boolean);
    const getAt = (tree, p) => parts(p).reduce((n, k) => (n == null ? null : (n[k] === undefined ? null : n[k])), tree);
    function prune(o){ if (o && typeof o === "object") { for (const k of Object.keys(o)) { prune(o[k]); if (o[k] == null || (typeof o[k] === "object" && !Object.keys(o[k]).length)) delete o[k]; } } return o; }
    function setAt(tree, p, v){
      const ks = parts(p); if (!ks.length) return v == null ? {} : v;
      let n = tree; for (let i = 0; i < ks.length - 1; i++) { if (!n[ks[i]] || typeof n[ks[i]] !== "object") n[ks[i]] = {}; n = n[ks[i]]; }
      if (v == null) delete n[ks[ks.length - 1]]; else n[ks[ks.length - 1]] = JSON.parse(JSON.stringify(v));
      return tree;
    }
    function notify(){ listeners.forEach(l => { const v = getAt(read(), l.p), j = JSON.stringify(v); if (j !== l.last) { l.last = j; l.cb(v); } }); }
    function write(fn){ const t = prune(fn(read())); localStorage.setItem(KEY, JSON.stringify(t)); notify(); if (chan) chan.postMessage(1); }
    if (chan) chan.onmessage = notify;
    window.addEventListener("storage", e => { if (e.key === KEY) notify(); });
    let seq = 0;
    const host = document.body && document.body.classList.contains("host");
    let uid = null; try { uid = host ? (localUser() || {}).uid || null : (sessionStorage.getItem("olg-local-uid") || ("s" + Math.random().toString(36).slice(2, 10))); if (!host) sessionStorage.setItem("olg-local-uid", uid); } catch (e) { uid = "s" + Math.random().toString(36).slice(2, 10); }
    window.NET.uid = uid;
    const chk = (p, v) => { if (window.__rulesCheck) window.__rulesCheck(read(), p, v, uid); };   // test-only: rules simulator
    return Promise.resolve({
      set: (p, v) => { try { chk(p, v); } catch (e) { return Promise.reject(e); } return Promise.resolve(write(t => setAt(t, p, v))); },
      update: (p, v) => { try { Object.keys(v).forEach(k => chk(parts(p).concat(parts(k)).join("/"), v[k])); } catch (e) { return Promise.reject(e); } return Promise.resolve(write(t => { Object.keys(v).forEach(k => setAt(t, parts(p).concat(parts(k)).join("/"), v[k])); return t; })); },
      remove: p => { try { chk(p, null); } catch (e) { return Promise.reject(e); } return Promise.resolve(write(t => setAt(t, p, null))); },
      push: (p, v) => { const k = Date.now().toString(36) + (seq++).toString(36) + Math.random().toString(36).slice(2, 5); try { chk(p + "/" + k, v); } catch (e) { return Promise.reject(e); } write(t => setAt(t, p + "/" + k, v)); return Promise.resolve({key: k}); },
      get: p => Promise.resolve(getAt(read(), p)),
      on: (p, cb) => { const l = {p, cb, last: undefined}; listeners.add(l); setTimeout(() => { const v = getAt(read(), p); l.last = JSON.stringify(v); cb(v); }, 0); return () => listeners.delete(l); },
      tx: (p, fn) => { let out, err; write(t => { const cur = getAt(t, p), v = fn(cur); if (v === undefined) { out = {committed: false, val: cur}; return t; } try { chk(p, v); } catch (e) { err = e; return t; } out = {committed: true, val: v}; return setAt(t, p, v); }); return err ? Promise.reject(err) : Promise.resolve(out); },
      claim: (p, v) => { let ok = false; write(t => { if (getAt(t, p) == null) { ok = true; return setAt(t, p, v); } return t; }); return Promise.resolve(ok); },
      now: () => Date.now(),
      dropOnLeave: () => Promise.resolve(),
      keepOnLeave: () => Promise.resolve(),
      connected: cb => { setTimeout(() => cb(true), 0); return () => {}; },
      local: true
    });
  }

  window.NET = {
    LOCAL, uid: null,
    TEACHER: "VBCS6fxZyyXfaCNU8IiXefXDoYk2",
    init(){ if (!ready) ready = LOCAL ? localBackend() : firebaseBackend(); return ready; },
    user: () => LOCAL ? Promise.resolve(localUser()) : fbUser(),
    login: (email, pw, remember) => LOCAL ? (pw === "test" ? Promise.resolve((localStorage.setItem("olg-local-teacher", JSON.stringify({uid: "VBCS6fxZyyXfaCNU8IiXefXDoYk2", email, anon: false})), localUser())) : Promise.reject({code: "auth/invalid-credential"})) : fbLogin(email, pw, remember),
    logout: () => LOCAL ? Promise.resolve(localStorage.removeItem("olg-local-teacher")) : fbLogout(),
    stamp: ts => (typeof ts === "number" ? ts : Date.now())
  };
})();
