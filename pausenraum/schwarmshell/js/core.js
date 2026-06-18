// core.js — DOM helpers, output rendering, shared utilities
  const el = (id)=>document.getElementById(id);
  const term = el("term");
  const cmdInput = el("cmd");
  const promptEl = el("prompt");
  let lastInputRow = null;
  let lastOutputRow = null;
  // Bewusst de-DE: now() landet nur in Spielinhalten (Savegame-Zeitstempel wie
  // state.startedAt) — und Spielinhalte bleiben Deutsch, auch wenn die UI auf
  // Englisch steht (siehe i18n.js).
  const now = ()=>new Date().toLocaleString("de-DE");
  const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));

  // Scrollback-Limit: ältere DOM-Zeilen werden getrimmt, damit lange Sessions nicht laggen
  // oder das DOM aufblähen. Das Replay-Log (state.replayLog) bleibt davon unberührt.
  const MAX_SCROLLBACK_ROWS = 500;
  function trimTerminalScrollback(){
    if(!term) return;
    const rows = term.children;
    if(rows.length <= MAX_SCROLLBACK_ROWS) return;
    const removeCount = rows.length - MAX_SCROLLBACK_ROWS;
    for(let i=0;i<removeCount;i++){
      const child = term.firstElementChild;
      if(!child) break;
      if(child === lastInputRow) lastInputRow = null;
      if(child === lastOutputRow) lastOutputRow = null;
      term.removeChild(child);
    }
    if(removeCount > 0 && !term.dataset.trimmedNoticeShown){
      const notice = document.createElement("div");
      notice.className = "row";
      notice.innerHTML = '<span class="p">… ältere Zeilen wurden ausgeblendet (clear leert das Terminal komplett).</span>';
      term.insertBefore(notice, term.firstElementChild);
      term.dataset.trimmedNoticeShown = "1";
    }
  }

  function escapeHtml(s){
    return String(s)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }
  function clearRowTracking(){
    lastInputRow = null;
    lastOutputRow = null;
  }
  window.clearRowTracking = clearRowTracking;

  function markLatestRow(rowEl, kind){
    if(kind === "input"){
      if(lastInputRow) lastInputRow.classList.remove("rowLatestInput");
      if(lastOutputRow) lastOutputRow.classList.remove("rowLatestOutput");
      lastInputRow = rowEl;
      lastOutputRow = null;
      rowEl.classList.add("rowLatestInput");
      return;
    }
    if(lastOutputRow) lastOutputRow.classList.remove("rowLatestOutput");
    lastOutputRow = rowEl;
    rowEl.classList.add("rowLatestOutput");
  }

  function row(text, cls="", kind="output"){
    const d = document.createElement("div");
    d.className="row";
    if(cls) d.innerHTML = `<span class="${cls}">${escapeHtml(text)}</span>`;
    else d.textContent = text;
    term.appendChild(d);
    markLatestRow(d, kind);
    trimTerminalScrollback();
    term.scrollTop = term.scrollHeight;
  }
  function rowHtml(html, kind="output"){
    const d = document.createElement("div");
    d.className="row";
    d.innerHTML = html;
    term.appendChild(d);
    markLatestRow(d, kind);
    trimTerminalScrollback();
    term.scrollTop = term.scrollHeight;
  }

  // appendReplay: Eintrag in state.replayLog hängen (max 400 Einträge). Wird von runLine()
  // genutzt, um Befehle und Ausgaben mitzuschneiden. saveState() ist optional, weil das
  // sowieso direkt danach passiert.
  function appendReplay(kind, text){
    try{
      if(typeof state === "undefined" || !state) return;
      if(!Array.isArray(state.replayLog)) state.replayLog = [];
      const trimmed = String(text||"").slice(0, 600);
      state.replayLog.push({ kind: (kind==="input" ? "input" : "output"), text: trimmed, t: Date.now() });
      if(state.replayLog.length > 400){
        state.replayLog = state.replayLog.slice(-400);
      }
    }catch(_err){}
  }
  window.appendReplay = appendReplay;

  // toast: kurze nicht-blockierende Erfolgs-/Hinweis-Meldung am Bildschirmrand.
  // type ∈ "success" | "info" | "warn" (default "info"). Kein DOM-Crash wenn Container fehlt.
  function toast(message, opts={}){
    try{
      const container = el("toastContainer");
      if(!container) return;
      const type = String(opts.type||"info");
      const title = opts.title ? String(opts.title) : "";
      const d = document.createElement("div");
      d.className = "toast toast" + (type.charAt(0).toUpperCase() + type.slice(1));
      d.setAttribute("role", type === "warn" ? "alert" : "status");
      const titleHtml = title ? `<span class="toastTitle">${escapeHtml(title)}</span>` : "";
      d.innerHTML = `${titleHtml}<span>${escapeHtml(message)}</span>`;
      container.appendChild(d);
      const ttl = Number.isFinite(opts.ttl) ? opts.ttl : 3200;
      setTimeout(()=>{ try{ d.remove(); }catch(_e){} }, ttl);
      // Optionaler Sound — Settings können das deaktivieren.
      if(opts.audio !== false && window.playBeep){
        try{ window.playBeep(type); }catch(_e){}
      }
    }catch(_err){}
  }
  window.toast = toast;

  function escapeXml(s){
    return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&apos;");
  }
  function svgData(title, subtitle, mood){
    const bg = mood==="school" ? "#142033" :
               mood==="lab" ? "#1a1433" :
               mood==="server" ? "#141b2b" :
               mood==="arena" ? "#12261a" :
               mood==="office" ? "#20141a" :
               mood==="library" ? "#151a22" :
               mood==="yard" ? "#0f2522" :
               "#151a22";
    const glow = mood==="arena" ? "#7cf4b0" :
                 mood==="office" ? "#ff6b6b" :
                 mood==="yard" ? "#ffcf5a" :
                 "#5b9cff";
    const s = `
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">
  <defs>
    <radialGradient id="g" cx="30%" cy="10%" r="90%">
      <stop offset="0%" stop-color="${glow}" stop-opacity="0.26"/>
      <stop offset="55%" stop-color="${glow}" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="l" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fff" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="#fff" stop-opacity="0.02"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="720" rx="36" fill="${bg}"/>
  <rect width="1280" height="720" fill="url(#g)"/>
  <rect x="36" y="36" width="1208" height="648" rx="28" fill="url(#l)" stroke="#25344a"/>
  <g opacity="0.92" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" fill="#e7eef8">
    <text x="90" y="160" font-size="54" font-weight="800">${escapeXml(title)}</text>
    <text x="92" y="220" font-size="26" fill="#9fb0c5">${escapeXml(subtitle)}</text>
  </g>
  <g opacity="0.88" stroke="${glow}">
    <path d="M90 580 L360 580" stroke-width="3" opacity="0.55"/>
    <path d="M90 610 L520 610" stroke-width="3" opacity="0.35"/>
  </g>
  <g opacity="0.55" fill="#9fb0c5" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas" font-size="18">
    <text x="90" y="655">SchwarmShell • Offline</text>
  </g>
</svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);
  }
