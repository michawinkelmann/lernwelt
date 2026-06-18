// main.js — boot, savegame panel, reset safety, audio, settings + event wiring
// Clippy-Logik: js/clippy.js · Tutorial/Cinematic-Intro: js/tutorial.js

let gameStarted = false;
let bootLoadSource = "Autosave";

function boot(){
  gameStarted = true;
  promptEl.textContent = promptText();
  renderLocation();
  renderObjectives();
  renderRewards();
  renderSidequestPanel();
  renderPhasePill();

  try{ renderHeaderSub(); }catch(e){}
  syncClippyTooltip();

  const ps = document.getElementById("printStatus");
  if(ps){
    if(Number(state.phase) >= 5){
      ps.hidden = true;
    }else if(state.flags && state.flags.system_fixed){
      ps.hidden = false;
      ps.textContent = "✅ Druckdienste online — Zeugnisse verfügbar.";
      ps.classList.remove("warnInline");
      ps.classList.add("okInline");
    } else {
      ps.hidden = false;
      ps.textContent = "⚠️ Wegen eines System-Glitches können aktuell keine Zeugnisse gedruckt werden.";
      ps.classList.remove("okInline");
      ps.classList.add("warnInline");
    }
  }

  if(!state.processes || !state.processes.length){
    state.processes = [
      { pid: 101, name: "terminald", cpu: 3, mem: 42 },
      { pid: 202, name: "rgbd", cpu: 99, mem: 180 },
      { pid: 303, name: "patchwatch", cpu: 5, mem: 65 },
    ];
    saveState();
  }

  if(!state.flags.booted){
    state.flags.booted = true;
    if(!state.startedAt){
      state.startedAt = now();
      state.flags.escaped = false;
    }
    saveState();
    intro();
    row("Mini-Tipp: help zeigt deine freigeschalteten Commands.", "p");
    row("Mini-Tipp 2: quests ist dein Quest-Tracker.", "p");
  }else{
    if(bootLoadSource === "Guided"){
      if(typeof guidedIntro === "function"){
        guidedIntro();
      }
      bootLoadSource = "Autosave";
      progressPhaseIfReady();
      return;
    }
    rowHtml(`<span class="p">[${escapeHtml(now())}] ${escapeHtml(bootLoadSource)} geladen. Tipp: <span class="kbd">quests</span></span>`);
    bootLoadSource = "Autosave";
    progressPhaseIfReady();
  }
}

function showStartModal(){
  const overlay = el("startOverlay");
  overlay.hidden = false;
  const autoBtn = el("startAutosave");
  autoBtn.disabled = !hasAutosave();
}

function closeStartModal(){
  el("startOverlay").hidden = true;
}

function showSavegamePanel(phrase){
  const overlay = el("savegameOverlay");
  const out = el("savegamePhraseOutput");
  const hint = el("savegamePanelHint");
  if(!overlay || !out || !hint) return;
  out.value = phrase;
  hint.textContent = "Tipp: Mit Kopieren oder Export musst du auf mobilen Geräten nichts manuell markieren.";
  overlay.hidden = false;
  out.focus();
  out.select();
}

function closeSavegamePanel(){
  const overlay = el("savegameOverlay");
  if(overlay) overlay.hidden = true;
}

async function copySavegamePhrase(){
  const out = el("savegamePhraseOutput");
  const hint = el("savegamePanelHint");
  if(!out || !hint) return;
  const phrase = String(out.value || "");
  if(!phrase){
    hint.textContent = "Es ist noch keine Passphrase vorhanden.";
    return;
  }

  if(navigator.clipboard && typeof navigator.clipboard.writeText === "function"){
    try{
      await navigator.clipboard.writeText(phrase);
      hint.textContent = "✅ Passphrase in die Zwischenablage kopiert.";
      return;
    }catch(_err){
      // fallback below
    }
  }

  out.focus();
  out.select();
  hint.textContent = "⚠️ Automatisches Kopieren nicht verfügbar. Bitte manuell kopieren (Strg/Cmd + C).";
}

function exportSavegamePhrase(){
  const out = el("savegamePhraseOutput");
  const hint = el("savegamePanelHint");
  if(!out || !hint) return;
  const phrase = String(out.value || "");
  if(!phrase){
    hint.textContent = "Es ist noch keine Passphrase vorhanden.";
    return;
  }
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `schwarmshell-savegame-${ts}.txt`;
  const blob = new Blob([`SchwarmShell Savegame Passphrase

${phrase}
`], { type:"text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  hint.textContent = `✅ Export gestartet (${fileName}).`;
}

const RESET_UNDO_STORAGE_KEY = "schwarmshell_reset_undo_snapshot_v1";
const RESET_UNDO_WINDOW_MS = 10_000;
const AUTOSAVE_STORAGE_KEY = (typeof STORAGE_KEY === "string" && STORAGE_KEY) ? STORAGE_KEY : "schwarmshell_all_phases_v5";
let resetUndoTimer = null;

function readResetUndoSnapshot(){
  try{
    const raw = localStorage.getItem(RESET_UNDO_STORAGE_KEY);
    if(!raw) return null;
    const parsed = JSON.parse(raw);
    if(!parsed || typeof parsed !== "object") return null;
    if(!parsed.passphrase || !parsed.expiresAt) return null;
    if(Date.now() > Number(parsed.expiresAt)){
      localStorage.removeItem(RESET_UNDO_STORAGE_KEY);
      return null;
    }
    return parsed;
  }catch(_err){
    localStorage.removeItem(RESET_UNDO_STORAGE_KEY);
    return null;
  }
}

function clearResetUndoState(){
  localStorage.removeItem(RESET_UNDO_STORAGE_KEY);
  if(resetUndoTimer){
    clearTimeout(resetUndoTimer);
    resetUndoTimer = null;
  }
  const resetBtn = el("reset");
  if(resetBtn) resetBtn.textContent = "Reset";
}

function startResetUndoWindow(snapshot){
  const expiresAt = Date.now() + RESET_UNDO_WINDOW_MS;
  localStorage.setItem(RESET_UNDO_STORAGE_KEY, JSON.stringify({
    passphrase: snapshot.passphrase,
    autosaveRaw: snapshot.autosaveRaw,
    expiresAt
  }));

  const resetBtn = el("reset");
  if(resetBtn) resetBtn.textContent = "Undo Reset (10s)";

  if(resetUndoTimer) clearTimeout(resetUndoTimer);
  resetUndoTimer = setTimeout(()=>{
    clearResetUndoState();
  }, RESET_UNDO_WINDOW_MS + 50);
}

function tryUndoReset(){
  const snapshot = readResetUndoSnapshot();
  if(!snapshot) return false;

  const shouldUndo = confirm("Letzten Reset rückgängig machen? Der Spielstand vor dem Reset wird wiederhergestellt.");
  if(!shouldUndo) return true;

  const restored = loadStateFromPassphrase(snapshot.passphrase);
  if(!restored.ok){
    row("⚠️ Undo fehlgeschlagen: Snapshot konnte nicht geladen werden.", "warn");
    clearResetUndoState();
    return true;
  }

  if(snapshot.autosaveRaw){
    localStorage.setItem(AUTOSAVE_STORAGE_KEY, snapshot.autosaveRaw);
  }
  clearResetUndoState();
  term.innerHTML = "";
  bootLoadSource = "Undo";
  boot();
  return true;
}

function requestResetWithSafety(){
  if(tryUndoReset()) return;

  const confirmed = confirm("Willst du wirklich resetten? Dabei wird dein Autosave gelöscht und dein Fortschritt geht verloren.");
  if(!confirmed) return;

  const wantsBackup = confirm("Optional: Vor dem Reset eine Backup-Passphrase erzeugen?");
  if(wantsBackup){
    const phrase = createSavePassphrase();
    showSavegamePanel(phrase);
    const continueReset = confirm("Backup-Passphrase wurde erzeugt. Jetzt wirklich resetten?");
    if(!continueReset) return;
  }

  const snapshot = {
    passphrase: createSavePassphrase(),
    autosaveRaw: localStorage.getItem(AUTOSAVE_STORAGE_KEY)
  };

  doReset(true);
  startResetUndoWindow(snapshot);
  row("↩️ Undo verfügbar: 10 Sekunden über den Reset-Button.", "p");
}

el("startNew").addEventListener("click", beginNewGameFlow);

el("startAutosave").addEventListener("click", ()=>{
  closeStartModal();
  if(!hasAutosave()){
    doReset(false);
  }
  bootLoadSource = "Autosave";
  boot();
});

el("startSavegame").addEventListener("click", ()=>{
  el("savegameLoad").hidden = false;
  el("savegameLoadError").textContent = "";
  el("savegamePassphrase").focus();
});

el("savegameCancel").addEventListener("click", ()=>{
  el("savegameLoad").hidden = true;
  el("savegameLoadError").textContent = "";
});

el("savegameConfirm").addEventListener("click", ()=>{
  const pass = el("savegamePassphrase").value;
  const result = loadStateFromPassphrase(pass);
  if(!result.ok){
    el("savegameLoadError").textContent = `${result.error} Beispiel für gültiges Format: SS1...`;
    return;
  }
  closeStartModal();
  el("savegameLoad").hidden = true;
  bootLoadSource = "Savegame";
  boot();
});

el("savegamePassphrase").addEventListener("keydown", (e)=>{
  if(e.key !== "Enter") return;
  e.preventDefault();
  el("savegameConfirm").click();
});

el("run").addEventListener("click", ()=>{
  const v = cmdInput.value;
  cmdInput.value = "";
  runLine(v);
});
el("reset").addEventListener("click", requestResetWithSafety);
el("savegame").addEventListener("click", ()=>{
  const phrase = createSavePassphrase();
  row("🔐 Savegame-Passphrase erstellt.", "ok");
  showSavegamePanel(phrase);
});

el("savegamePanelClose").addEventListener("click", closeSavegamePanel);
el("savegameCopy").addEventListener("click", ()=>{ copySavegamePhrase(); });
el("savegameExport").addEventListener("click", exportSavegamePhrase);

cmdInput.addEventListener("keydown", (e)=>{
  if(e.key === "Enter"){
    const v = cmdInput.value;
    cmdInput.value = "";
    runLine(v);
    e.preventDefault();
    return;
  }
  if(e.key === "ArrowUp"){
    const i = clamp(state.historyIndex + 1, 0, state.lastCmds.length);
    state.historyIndex = i;
    cmdInput.value = state.lastCmds[i-1] || cmdInput.value;
    e.preventDefault();
    saveState();
    return;
  }
  if(e.key === "ArrowDown"){
    const i = clamp(state.historyIndex - 1, 0, state.lastCmds.length);
    state.historyIndex = i;
    cmdInput.value = state.lastCmds[i-1] || "";
    e.preventDefault();
    saveState();
    return;
  }
  if(e.key === "Tab"){
    cmdInput._tabState = cmdInput._tabState || { source:"", index:-1, candidates:[], kind:"", activePrefix:"" };
    const tabState = cmdInput._tabState;

    const canContinueCycle = tabState.candidates.length > 1 && (
      (tabState.kind === "path" && tabState.candidates.some((candidate)=>`${tabState.activePrefix}${candidate}` === cmdInput.value)) ||
      (tabState.kind !== "path" && tabState.candidates.includes(cmdInput.value))
    );

    if(canContinueCycle){
      tabState.index = (tabState.index + 1) % tabState.candidates.length;
      if(tabState.kind === "path"){
        cmdInput.value = `${tabState.activePrefix}${tabState.candidates[tabState.index]}`;
      }else{
        cmdInput.value = tabState.candidates[tabState.index];
      }
      e.preventDefault();
      return;
    }

    const auto = autocomplete(cmdInput.value);
    if(!auto){
      e.preventDefault();
      return;
    }

    const candidates = Array.isArray(auto.candidates) ? auto.candidates : [];

    if(auto.replacement){
      cmdInput.value = auto.replacement;
      tabState.source = "";
      tabState.index = -1;
      tabState.candidates = [];
      tabState.kind = "";
      tabState.activePrefix = "";
      e.preventDefault();
      return;
    }

    if(candidates.length > 1){
      if(tabState.source === cmdInput.value && tabState.candidates.join("\x00") === candidates.join("\x00")){
        tabState.index = (tabState.index + 1) % candidates.length;
      }else{
        tabState.source = cmdInput.value;
        tabState.index = 0;
        tabState.candidates = candidates.slice();
        tabState.kind = auto.kind || "";
        tabState.activePrefix = auto.activePrefix || "";
        const preview = candidates.slice(0, 12).join("   ");
        const suffix = candidates.length > 12 ? `   … +${candidates.length - 12} weitere` : "";
        row(`Tab-Kandidaten (${candidates.length}): ${preview}${suffix}`, "muted");
      }

      if(auto.kind === "path"){
        cmdInput.value = `${auto.activePrefix}${tabState.candidates[tabState.index]}`;
      }else{
        cmdInput.value = tabState.candidates[tabState.index];
      }
    }
    e.preventDefault();
    return;
  }

  if(cmdInput._tabState){
    cmdInput._tabState.source = "";
    cmdInput._tabState.index = -1;
    cmdInput._tabState.candidates = [];
    cmdInput._tabState.kind = "";
    cmdInput._tabState.activePrefix = "";
  }
});

const clippyBtn = el("clippyHelperBtn");
if(clippyBtn){
  clippyBtn.addEventListener("click", ()=>{
    renderClippyAvailability();
    const tooltip = el("clippyTooltip");
    if(tooltip && !tooltip.hidden){
      closeClippyTooltip();
      return;
    }
    showClippyTooltip();
  });
}
window.addEventListener("resize", ()=>{
  positionClippyTooltip();
});

setInterval(()=>{
  renderClippyAvailability();
}, 1000);
renderClippyAvailability();

// ============================================================================
//  Audio-Feedback (Web Audio API, kein Asset-Download)
// ============================================================================
let _audioCtx = null;
function getAudioCtx(){
  if(_audioCtx) return _audioCtx;
  try{
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if(!Ctx) return null;
    _audioCtx = new Ctx();
    return _audioCtx;
  }catch(_e){ return null; }
}
function playBeep(kind){
  try{
    if(!state || !state.settings || state.settings.audio !== true) return;
    const ctx = getAudioCtx();
    if(!ctx) return;
    if(ctx.state === "suspended"){ try{ ctx.resume(); }catch(_e){} }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    let freq = 660, dur = 0.12;
    if(kind === "success"){ freq = 880; dur = 0.16; }
    else if(kind === "warn"){ freq = 300; dur = 0.18; }
    else if(kind === "info"){ freq = 520; dur = 0.10; }
    osc.type = "triangle";
    osc.frequency.value = freq;
    gain.gain.value = 0.0001;
    const t0 = ctx.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.12, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
    if(kind === "success"){
      // kleiner Aufstieg: 2. Ton
      setTimeout(()=>{
        try{
          const osc2 = ctx.createOscillator();
          const g2 = ctx.createGain();
          osc2.connect(g2); g2.connect(ctx.destination);
          osc2.type = "triangle";
          osc2.frequency.value = 1175;
          const tt = ctx.currentTime;
          g2.gain.value = 0.0001;
          g2.gain.exponentialRampToValueAtTime(0.10, tt + 0.01);
          g2.gain.exponentialRampToValueAtTime(0.0001, tt + 0.16);
          osc2.start(tt);
          osc2.stop(tt + 0.18);
        }catch(_e){}
      }, 130);
    }
  }catch(_e){}
}
window.playBeep = playBeep;

// ============================================================================
//  Settings-Anwendung (Difficulty / Reduced Motion / Audio)
// ============================================================================
function applySettings(){
  try{
    if(!state.settings) return;
    document.body.classList.toggle("reducedMotion", !!state.settings.reducedMotion);
    // Difficulty wirkt auf Clippy-Sichtbarkeit. In Hardcore: Clippy-Button blenden wir aus
    // (Spieler bekommt nur die fest eingebaute `hint`-Funktion ohne Schritt-Lösung).
    const clippyBtn = el("clippyHelperBtn");
    const clippyUsage = el("clippyUsage");
    const clippyStatus = el("clippyStatus");
    if(clippyBtn){
      const hide = state.settings.difficulty === "hardcore";
      clippyBtn.hidden = hide;
      if(clippyUsage) clippyUsage.hidden = hide;
      if(clippyStatus) clippyStatus.hidden = hide;
      if(hide){
        const tt = el("clippyTooltip");
        if(tt) tt.hidden = true;
      }
    }
    // i18n: Settings-Panel-Labels aktualisieren
    applyLocale();
  }catch(_e){}
}

// applyLocale: schreibt die übersetzten Strings in die statischen UI-Labels.
// Bewusst defensiv (Element-checks), weil die Seite auch im "Spieler hat alles
// kaputt"-Modus noch laden soll.
function applyLocale(){
  try{
    if(!window.t) return;
    const set = (id, text)=>{ const el2 = el(id); if(el2) el2.textContent = text; };
    set("settingsTitle", t("settings.title"));
    set("settingsClose", t("settings.close"));
    set("settingsReplayLabel", t("settings.replay"));
    set("settingsReplayDesc", t("settings.replay.desc"));
    set("settingsLanguageLabel", t("settings.language"));
    set("settingsLanguageDesc", t("settings.language.desc"));
    // Difficulty-Buttons
    const diffLabels = {
      story: t("settings.difficulty.story"),
      classic: t("settings.difficulty.classic"),
      hardcore: t("settings.difficulty.hardcore")
    };
    document.querySelectorAll('[data-difficulty]').forEach((btn)=>{
      const k = btn.dataset.difficulty;
      if(diffLabels[k]) btn.textContent = diffLabels[k];
    });
    // Locale-Toggles
    document.querySelectorAll('[data-locale]').forEach((btn)=>{
      const isActive = (state.settings && state.settings.locale) === btn.dataset.locale;
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
    // Update audio/motion toggles' text
    const audioBtn = el("settingsAudioToggle");
    if(audioBtn){
      const on = !!(state.settings && state.settings.audio);
      audioBtn.textContent = on ? t("settings.sound.on") : t("settings.sound.off");
    }
    const rmBtn = el("settingsReducedMotion");
    if(rmBtn){
      const on = !!(state.settings && state.settings.reducedMotion);
      rmBtn.textContent = on ? t("settings.motion.on") : t("settings.motion.off");
    }
    // Reset-Concepts-Button
    const resetBtn = el("settingsResetConcepts");
    if(resetBtn) resetBtn.textContent = t("settings.concepts.reset");
    // Phase-Pill neu schreiben (nutzt t() jetzt indirekt über renderPhasePill)
    if(typeof renderPhasePill === "function") renderPhasePill();
  }catch(_e){}
}

// ============================================================================
//  Settings-Modal
// ============================================================================
function openSettingsModal(){
  const ov = el("settingsOverlay");
  if(!ov) return;
  // Buttons synchronisieren mit aktuellem State
  const diff = (state.settings && state.settings.difficulty) || "classic";
  document.querySelectorAll('[data-difficulty]').forEach((btn)=>{
    btn.setAttribute("aria-pressed", btn.dataset.difficulty === diff ? "true" : "false");
  });
  const audioBtn = el("settingsAudioToggle");
  if(audioBtn){
    const on = !!(state.settings && state.settings.audio);
    audioBtn.setAttribute("aria-pressed", on ? "true" : "false");
    audioBtn.textContent = `Sound: ${on ? "an" : "aus"}`;
  }
  const rmBtn = el("settingsReducedMotion");
  if(rmBtn){
    const on = !!(state.settings && state.settings.reducedMotion);
    rmBtn.setAttribute("aria-pressed", on ? "true" : "false");
    rmBtn.textContent = `Reduzierte Bewegung: ${on ? "an" : "aus"}`;
  }
  ov.hidden = false;
}
function closeSettingsModal(){
  const ov = el("settingsOverlay");
  if(ov) ov.hidden = true;
}

// ============================================================================
//  Konzept-Karten (kurze Inline-Tutorials zu Permissions, Prozessen, Pipes)
//  Werden beim allerersten Auftreten gezeigt — Settings → "wieder zeigen" resettet.
// ============================================================================
const CONCEPT_CARDS = {
  permissions: {
    kicker: "Was sind Permissions?",
    title: "Datei-Rechte: rwx, Owner / Group / Others",
    body: "Jede Datei hat drei Rechte-Blöcke: für dich (Owner), deine Gruppe und alle anderen. Jeder Block hat drei Bits: r (lesen), w (schreiben), x (ausführen). Die Zahl 644 bedeutet z.B. rw-r--r-- — du darfst lesen und schreiben, der Rest nur lesen. 755 = rwxr-xr-x (du darfst zusätzlich ausführen). chmod ändert genau diese Bits.",
    example: "chmod +x script.sh      # exec-Bit setzen\nchmod 644 notiz.txt    # rw-r--r--\nchmod 755 hack.sh      # rwxr-xr-x",
    hint: "Im echten Linux gibt's noch chown/chgrp und Sonder-Bits wie setuid — die brauchst du jetzt aber nicht."
  },
  processes: {
    kicker: "Was ist ein Prozess?",
    title: "Prozesse: Programme, die gerade laufen",
    body: "Wenn du ein Programm startest, läuft es als 'Prozess' im RAM mit einer eindeutigen PID (Process ID). ps listet diese Prozesse auf, top sortiert nach CPU-Last. kill schickt einem Prozess ein Signal — Standard ist SIGTERM (sanft beenden), -9 ist SIGKILL (sofort, hart).",
    example: "ps                  # alle Prozesse\ntop                 # nach CPU sortiert\nkill 1337           # PID 1337 sanft beenden\nkill -9 1337        # PID 1337 hart killen",
    hint: "Im Spiel sind die Prozesse simuliert — auf echtem Linux siehst du Hunderte. Hilfreich bei Lags oder hängenden Programmen."
  },
  pipes: {
    kicker: "Was ist eine Pipe?",
    title: "Pipes (|): Output → Input verketten",
    body: "Mit | leitest du die Ausgabe eines Befehls direkt als Eingabe in den nächsten. Das ist der Kern der Unix-Philosophie: kleine Tools kombinieren statt einen Riesen-Befehl. cat datei.txt | grep error filtert nur die Zeilen mit 'error'. Im Spiel sind max. 2 Pipes erlaubt.",
    example: 'cat readme.txt | grep "FRAG"\nls | grep .log\necho "hi" | grep h',
    hint: "Verwandt: > schreibt Output in eine Datei, >> hängt an. Beispiel: ls > liste.txt"
  },
  redirects: {
    kicker: "Was sind Redirects?",
    title: "Output umleiten: > und >>",
    body: "Statt im Terminal zu landen, kann die Ausgabe eines Befehls in eine Datei umgeleitet werden. > überschreibt die Datei, >> hängt ans Ende an. So baust du Logs oder Patch-Dateien.",
    example: 'echo "hi" > greeting.txt    # Datei wird neu geschrieben\necho "noch eine zeile" >> greeting.txt    # angehängt',
    hint: "Aufpassen: > überschreibt ohne Rückfrage. Lieber zweimal lesen, bevor du das auf wichtige Dateien anwendest."
  }
};

function showConceptCard(key){
  try{
    if(!CONCEPT_CARDS[key]) return;
    if(!state.settings) state.settings = { conceptsSeen:{}, conceptsDisabled:false };
    if(state.settings.conceptsDisabled) return;
    if(state.settings.conceptsSeen && state.settings.conceptsSeen[key]) return;
    const card = CONCEPT_CARDS[key];
    const overlay = el("conceptOverlay");
    if(!overlay) return;
    el("conceptKicker").textContent = card.kicker;
    el("conceptTitle").textContent = card.title;
    el("conceptBody").textContent = card.body;
    el("conceptExample").textContent = card.example;
    el("conceptHint").textContent = card.hint;
    overlay.dataset.conceptKey = key;
    overlay.hidden = false;
    const contBtn = el("conceptContinue");
    if(contBtn) contBtn.focus();
  }catch(_e){}
}
function closeConceptCard(){
  const overlay = el("conceptOverlay");
  if(!overlay) return;
  const key = overlay.dataset.conceptKey;
  if(key){
    if(!state.settings) state.settings = { conceptsSeen:{}, conceptsDisabled:false };
    if(!state.settings.conceptsSeen) state.settings.conceptsSeen = {};
    state.settings.conceptsSeen[key] = true;
    saveState();
  }
  overlay.hidden = true;
  delete overlay.dataset.conceptKey;
}
window.showConceptCard = showConceptCard;

// ============================================================================
//  Replay-Modal — zeigt mitgeschnittene Befehle + Ausgaben
// ============================================================================
function openReplayModal(){
  const ov = el("replayOverlay");
  if(!ov) return;
  const body = el("replayBody");
  const meta = el("replayMeta");
  const log = Array.isArray(state.replayLog) ? state.replayLog : [];
  if(!log.length){
    body.textContent = "(Noch kein Replay vorhanden — spiel ein paar Befehle, dann schau wieder vorbei.)";
    meta.textContent = "0 Zeilen";
  }else{
    const inputs = log.filter(e=>e.kind==="input").length;
    meta.textContent = `${log.length} Zeilen · ${inputs} Eingaben`;
    body.innerHTML = log.map((e)=>{
      const txt = escapeHtml(e.text);
      if(e.kind === "input"){
        return `<span class="replayLine input"><span class="replayCaret">›</span>${txt}</span>`;
      }
      return `<span class="replayLine output">${txt}</span>`;
    }).join("\n");
  }
  ov.hidden = false;
}
function closeReplayModal(){
  const ov = el("replayOverlay");
  if(ov) ov.hidden = true;
}
async function copyReplayToClipboard(){
  try{
    const log = Array.isArray(state.replayLog) ? state.replayLog : [];
    const text = log.map(e => (e.kind==="input" ? `> ${e.text}` : e.text)).join("\n");
    if(navigator.clipboard && typeof navigator.clipboard.writeText === "function"){
      await navigator.clipboard.writeText(text);
      toast("Replay in die Zwischenablage kopiert.", { type:"success" });
    }else{
      toast("Automatisches Kopieren nicht verfügbar.", { type:"warn" });
    }
  }catch(_e){
    toast("Kopieren fehlgeschlagen.", { type:"warn" });
  }
}

// ============================================================================
//  Phase-6 Skript-Editor — schreibt eigene Bash-Skripte in einem Modal
// ============================================================================
function openScriptEditor(path, initialContent){
  const overlay = el("editorOverlay");
  const ta = el("editorTextarea");
  const pathLabel = el("editorPath");
  if(!overlay || !ta) return;
  ta.value = String(initialContent || "");
  if(pathLabel) pathLabel.textContent = path;
  overlay.dataset.editPath = path;
  overlay.hidden = false;
  setTimeout(()=>ta.focus(), 50);
}
window.openScriptEditor = openScriptEditor;

function closeScriptEditor(){
  const overlay = el("editorOverlay");
  if(!overlay) return;
  overlay.hidden = true;
  delete overlay.dataset.editPath;
}

function saveScriptEditor(){
  const overlay = el("editorOverlay");
  const ta = el("editorTextarea");
  if(!overlay || !ta) return;
  const path = overlay.dataset.editPath;
  if(!path) return;
  const content = String(ta.value || "");
  // writeFile ist im fs.js-Scope global verfügbar (kein type=module)
  const result = (typeof writeFile === "function") ? writeFile(path, content, false) : { ok:false, err:"writeFile fehlt" };
  if(!result.ok){
    toast(`Editor: ${result.err}`, { type:"warn" });
    return;
  }
  closeScriptEditor();
  toast(`${path} gespeichert.`, { type:"success" });
  // Phase-6-Trigger sofort prüfen, damit Spieler*innen direkt Feedback bekommen
  if(typeof window.evaluateScriptQuests === "function") window.evaluateScriptQuests();
  if(typeof renderObjectives === "function") renderObjectives();
}

const _editorSave = el("editorSave");
if(_editorSave) _editorSave.addEventListener("click", saveScriptEditor);
const _editorCancel = el("editorCancel");
if(_editorCancel) _editorCancel.addEventListener("click", closeScriptEditor);
// Strg/Cmd+S im Editor speichert; Esc schließt
document.addEventListener("keydown", (e)=>{
  const overlay = el("editorOverlay");
  if(!overlay || overlay.hidden) return;
  if((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")){
    e.preventDefault();
    saveScriptEditor();
  } else if(e.key === "Escape"){
    closeScriptEditor();
  }
});

// ============================================================================
//  Event-Wiring für all die neuen UI-Elemente
// ============================================================================
const _settingsBtn = el("settingsBtn");
if(_settingsBtn) _settingsBtn.addEventListener("click", openSettingsModal);
const _settingsClose = el("settingsClose");
if(_settingsClose) _settingsClose.addEventListener("click", closeSettingsModal);
const _settingsOverlay = el("settingsOverlay");
if(_settingsOverlay){
  _settingsOverlay.addEventListener("click", (e)=>{
    if(e.target === _settingsOverlay) closeSettingsModal();
  });
}

document.querySelectorAll('[data-difficulty]').forEach((btn)=>{
  btn.addEventListener("click", ()=>{
    const d = btn.dataset.difficulty;
    if(!["story","classic","hardcore"].includes(d)) return;
    state.settings.difficulty = d;
    saveState();
    document.querySelectorAll('[data-difficulty]').forEach((b)=>{
      b.setAttribute("aria-pressed", b.dataset.difficulty === d ? "true" : "false");
    });
    applySettings();
    const labelKey = "settings.difficulty." + d;
    toast(t("toast.difficulty", t(labelKey)), { type:"info" });
  });
});

document.querySelectorAll('[data-locale]').forEach((btn)=>{
  btn.addEventListener("click", ()=>{
    const loc = btn.dataset.locale;
    if(!["de","en"].includes(loc)) return;
    state.settings.locale = loc;
    saveState();
    applySettings();
  });
});

const _audioBtn = el("settingsAudioToggle");
if(_audioBtn){
  _audioBtn.addEventListener("click", ()=>{
    state.settings.audio = !state.settings.audio;
    saveState();
    _audioBtn.setAttribute("aria-pressed", state.settings.audio ? "true" : "false");
    _audioBtn.textContent = `Sound: ${state.settings.audio ? "an" : "aus"}`;
    if(state.settings.audio) playBeep("info");
  });
}
const _rmBtn = el("settingsReducedMotion");
if(_rmBtn){
  _rmBtn.addEventListener("click", ()=>{
    state.settings.reducedMotion = !state.settings.reducedMotion;
    saveState();
    _rmBtn.setAttribute("aria-pressed", state.settings.reducedMotion ? "true" : "false");
    _rmBtn.textContent = `Reduzierte Bewegung: ${state.settings.reducedMotion ? "an" : "aus"}`;
    applySettings();
  });
}
const _resetConcepts = el("settingsResetConcepts");
if(_resetConcepts){
  _resetConcepts.addEventListener("click", ()=>{
    state.settings.conceptsSeen = {};
    state.settings.conceptsDisabled = false;
    saveState();
    toast("Konzept-Karten werden beim nächsten Anlass wieder gezeigt.", { type:"info" });
  });
}
const _replayBtn = el("settingsReplay");
if(_replayBtn) _replayBtn.addEventListener("click", ()=>{ closeSettingsModal(); openReplayModal(); });
const _replayClear = el("settingsReplayClear");
if(_replayClear){
  _replayClear.addEventListener("click", ()=>{
    state.replayLog = [];
    saveState();
    toast("Replay-Mitschnitt gelöscht.", { type:"info" });
  });
}
const _replayClose = el("replayClose");
if(_replayClose) _replayClose.addEventListener("click", closeReplayModal);
const _replayCopy = el("replayCopy");
if(_replayCopy) _replayCopy.addEventListener("click", copyReplayToClipboard);

// Konzept-Karte schließen / dauerhaft deaktivieren
const _conceptContinue = el("conceptContinue");
if(_conceptContinue) _conceptContinue.addEventListener("click", closeConceptCard);
const _conceptDontShow = el("conceptDontShowAgain");
if(_conceptDontShow){
  _conceptDontShow.addEventListener("click", ()=>{
    if(!state.settings) state.settings = { conceptsSeen:{}, conceptsDisabled:false };
    state.settings.conceptsDisabled = true;
    saveState();
    closeConceptCard();
    toast("Konzept-Karten deaktiviert (kann in den Einstellungen wieder aktiviert werden).", { type:"info" });
  });
}

// Tutorial-Skip
const _tutSkip = el("tutorialSkipBtn");
if(_tutSkip){
  _tutSkip.addEventListener("click", ()=>{
    if(confirm("Tutorial wirklich überspringen? Du kannst die Hinweise später nicht erneut starten.")){
      endGuidedTutorial();
      toast("Tutorial übersprungen. help / quests zeigen dir, wo's weitergeht.", { type:"info" });
    }
  });
}

// Settings-Overlay per Esc schließen
document.addEventListener("keydown", (e)=>{
  if(e.key !== "Escape") return;
  const settingsOv = el("settingsOverlay");
  if(settingsOv && !settingsOv.hidden){ closeSettingsModal(); return; }
  const replayOv = el("replayOverlay");
  if(replayOv && !replayOv.hidden){ closeReplayModal(); return; }
  const conceptOv = el("conceptOverlay");
  if(conceptOv && !conceptOv.hidden){ closeConceptCard(); return; }
});

// Initiales Anwenden der Settings (auch nach Reload mit Autosave)
applySettings();

showStartModal();

// --- UI/State Helpers (Refactor light) ---
function commitUI(opts={}){
  const o = Object.assign({ loc:true, obj:true, rewards:true, phase:true }, opts||{});
  saveState();
  try{ if(o.phase) renderPhasePill(); }catch(e){}
  try{ if(o.phase) renderHeaderSub(); }catch(e){}
  try{ if(o.loc) renderLocation(); }catch(e){}
  try{ if(o.obj) renderObjectives(); }catch(e){}
  try{ if(o.rewards) renderRewards(); }catch(e){}
  try{ if(o.rewards) renderSidequestPanel(); }catch(e){}
  try{ syncClippyTooltip(); }catch(e){}

  try{
    const base = allowedCommands();
    return base.filter(c=>COMMAND_REGISTRY[c]);
  }catch(e){
    return [];
  }
}

// Verwaister Aufruf aus einem alten Refactor: renderHeader() wird in commands.js
// und fs.js noch referenziert, aber nirgends mehr definiert. Pass-through-Funktion
// verhindert ReferenceError-Crashes — sie aktualisiert sinnvoll Header-Subtext
// und Phase-Pill.
function renderHeader(){
  try{ renderHeaderSub(); }catch(_e){}
  try{ renderPhasePill(); }catch(_e){}
}

function renderHeaderSub(){
  const phaseInline = document.getElementById("phaseStatusInline");
  const ps = document.getElementById("printStatus");

  if(Number(state.phase) >= 5){
    const phaseText = "Schule fertig. Ab zur Arbeit: regel dein eigenes Leben — und guck mal, ob dir Schule überhaupt was gebracht hat. 😎";
    if(phaseInline) phaseInline.textContent = phaseText;
    if(ps) ps.hidden = true;
  }else{
    if(phaseInline) phaseInline.textContent = "";
    if(ps) ps.hidden = false;
  }
}


function setPhase(n){
  state.phase = Math.max(1, Math.min(99, Number(n)||1));
  commitUI({ phase:true, loc:true, obj:true, rewards:true });
}

function unlockSidequestWinkelmann(){
  if(!state.sidequest) state.sidequest = { unlocked:false };
  state.sidequest.unlocked = true;
  commitUI({ rewards:true, obj:true, loc:true, phase:false });
}

function sanityCheckNPCs(){
  try{
    const roomMap = {};
    for(const [id,n] of Object.entries(NPCS)){
      if(!n || !n.name || !n.at) continue;
      const nm = (n.name||"").trim().toLowerCase();
      for(const room of n.at){
        roomMap[room] = roomMap[room] || {};
        roomMap[room][nm] = (roomMap[room][nm]||0) + 1;
      }
    }
    const dupRooms = Object.entries(roomMap)
      .filter(([room,counts])=>Object.values(counts).some(c=>c>1))
      .map(([room,counts])=>({room, dups:Object.entries(counts).filter(([k,c])=>c>1).map(([k,c])=>`${k}×${c}`)}));
    if(dupRooms.length){
      console.warn("[SchwarmShell] Duplicate NPC names in rooms:", dupRooms);
    }
  }catch(e){}

  try{
    const missing = [];
    for(const [id,n] of Object.entries(NPCS)){
      if(!n || !n.at) continue;
      for(const room of n.at){
        if(!FS || !FS[room]) missing.push({ npc:id, room });
      }
    }
    if(missing.length){
      console.warn("[SchwarmShell] Missing NPC rooms in FS (NPC will never appear there):", missing);
    }
  }catch(e){}
}

window.checkTutorialCommand = checkTutorialCommand;
window.getGuidedTutorialBlockMessage = getGuidedTutorialBlockMessage;
window.syncClippyTooltip = syncClippyTooltip;

if(!window.__traceInterval){
  window.__traceInterval = setInterval(()=>{
    try{
      if(state.sidequest && state.sidequest.unlocked && state.netSession && state.netSession.active){
        const host = state.netSession.host;
        const k = (host==="gym-ost-core") ? "gym" : (host==="igs-edu-lab") ? "igs" : null;
        if(k){
          bumpTrace(k, 1);
          const tm = state.sidequest.traceMeter || {gym:0,igs:0};

          if((tm[k]||0) >= 100){
            if(!state.sidequest.alarm) state.sidequest.alarm = {gym:false,igs:false};
            state.sidequest.alarm[k] = true;
            state.sidequest.traces[k] = true;

            const kickedHost = state.netSession.host;
            state.netSession = { active:false, host:"", user:"", returnCwd:"" };
            state.cwd = "/superpc";

            row(`⚠️ TRACE ALARM (${kickedHost}): Du wurdest rausgekickt!`, "warn");
            row("Security-Sweep läuft… Wenn du weiter willst: logwipe (und diesmal stealth).", "warn");
          }

          saveState();
          renderRewards();
          renderSidequestPanel();
        }
      }
    }catch(e){}
  }, 1000);
}
