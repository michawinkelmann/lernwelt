// state.js — save/load state and phase progression
  const STORAGE_KEY = "schwarmshell_all_phases_v5";
  const INITIAL_STATE = {
    v: 5,
    startedAt: null,
    phase: 1,
    cwd: "/home/player",
    lastCmds: [],
    historyIndex: 0,
    flags: {
      booted:false,
      introSeen:false,
      iserv_glitch:false,
      got_key:false,
      opened_gate:false,
      frag1:false,
      frag2:false,
      frag3:false,
      reality_patch:false,
      found_boss:false,
      inspected_boss:false,
      fixed_script:false,
      exec_script:false,
      escaped:false,
      system_fixed:false,
      report_given:false,
      report_final:false,
      report_followup:false,
      job_arc_unlocked:false,
      job_arc_started:false,
      job_arc_done:false,
      // Phase 6 — Scriptlab
      scriptlab_entered:false,
      script_hello:false,
      script_variable:false,
      script_cleanup:false,
      talked:{},
    },
    fragments: { f1:null, f2:null, f3:null },
    rewards: [],
    inventory: [],
    perms: {},
    created: { dirs:[], files:[] },
    aliases: {},
    processes: [],
    mentor: { lag_fixed:false, history_checked:false, alias_made:false, students_helped:0, clear_done:false },
    npcTipShown:false,
    sidequest: {
      unlocked:false,
      stage:0,
      found_lab:false,
      parts:{ lens:false, coil:false, ups:false },
      net:{ blueprint:false, shield:false },
      traces:{ gym:false, igs:false },
      traceMeter: { gym:0, igs:0 },
      badge:false
    },
    jobArc: { active:false, stage:0, quests:{ snackmaster:false, ars:false, ohlendorf:false, berndt:false, cms:false }, startedAt:null },
    superpc: { active:false, returnCwd:"" },
    npcDialog: { active:false, npcId:null, nodeId:null },
    mapVisited: ["/home/player"],
    mapFilter: "all",
    clippy: { lastUsedAt: 0, usageCount: 0 },
    settings: {
      difficulty: "classic",       // "story" | "classic" | "hardcore"
      audio: true,                  // kurze Web-Audio-Töne bei Erfolg
      reducedMotion: false,         // zusätzliche Bewegungs-Reduktion (ergänzt prefers-reduced-motion)
      conceptsSeen: {},             // welche Konzept-Karten der Spieler schon gesehen hat
      conceptsDisabled: false,      // global "nicht mehr zeigen"
      locale: "de"                  // UI-Sprache: "de" (Default) | "en"
    },
    replayLog: []                   // [{ kind:"input"|"output", text, t }] — auf ~400 Einträge begrenzt
  };

  function normalizeState(candidate){
    try{
      const s = JSON.parse(JSON.stringify(candidate));
      if(!s || typeof s !== "object") return structuredClone(INITIAL_STATE);

      if(s.v === 4){
        const merged = structuredClone(INITIAL_STATE);
        for(const k of Object.keys(s)) merged[k] = s[k];
        merged.v = 5;
        merged.flags = Object.assign({}, INITIAL_STATE.flags, (s.flags||{}));
        merged.mentor = Object.assign({}, INITIAL_STATE.mentor, (s.mentor||{}));
        merged.sidequest = Object.assign({}, INITIAL_STATE.sidequest, (s.sidequest||{}));
        merged.jobArc = Object.assign({}, INITIAL_STATE.jobArc, (s.jobArc||{}));
        merged.npcDialog = Object.assign({}, INITIAL_STATE.npcDialog, (s.npcDialog||{}));
        merged.settings = Object.assign({}, INITIAL_STATE.settings, (s.settings||{}));
        merged.replayLog = Array.isArray(s.replayLog) ? s.replayLog.slice(-400) : [];
        return merged;
      }

      if(s.v !== 5) return structuredClone(INITIAL_STATE);
      s.flags = Object.assign({}, INITIAL_STATE.flags, (s.flags||{}));
      s.mentor = Object.assign({}, INITIAL_STATE.mentor, (s.mentor||{}));
      s.sidequest = Object.assign({}, INITIAL_STATE.sidequest, (s.sidequest||{}));
      s.jobArc = Object.assign({}, INITIAL_STATE.jobArc, (s.jobArc||{}));
      s.jobArc.quests = Object.assign({}, INITIAL_STATE.jobArc.quests, (s.jobArc.quests||{}));
      s.npcDialog = Object.assign({}, INITIAL_STATE.npcDialog, (s.npcDialog||{}));
      if(!Array.isArray(s.mapVisited)) s.mapVisited = ["/home/player"];
      if(!["active","all","unvisited"].includes(s.mapFilter)) s.mapFilter = "all";
      s.clippy = Object.assign({}, INITIAL_STATE.clippy, (s.clippy||{}));
      if(!Number.isFinite(Number(s.clippy.usageCount))) s.clippy.usageCount = 0;
      // Settings + Replay-Log: vorwärtskompatibel ergänzen, alte Saves dürfen die Felder nicht haben.
      s.settings = Object.assign({}, INITIAL_STATE.settings, (s.settings||{}));
      if(!["story","classic","hardcore"].includes(s.settings.difficulty)) s.settings.difficulty = "classic";
      if(typeof s.settings.audio !== "boolean") s.settings.audio = true;
      if(typeof s.settings.reducedMotion !== "boolean") s.settings.reducedMotion = false;
      if(!s.settings.conceptsSeen || typeof s.settings.conceptsSeen !== "object") s.settings.conceptsSeen = {};
      if(typeof s.settings.conceptsDisabled !== "boolean") s.settings.conceptsDisabled = false;
      if(!["de","en"].includes(s.settings.locale)) s.settings.locale = "de";
      if(!Array.isArray(s.replayLog)) s.replayLog = [];
      // Replay-Log hart begrenzen, damit localStorage nicht überläuft (5–10 MB pro Origin).
      if(s.replayLog.length > 400) s.replayLog = s.replayLog.slice(-400);
      return s;
    }catch(e){
      return structuredClone(INITIAL_STATE);
    }
  }

  function loadState(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return structuredClone(INITIAL_STATE);
      const s = JSON.parse(raw);
      if(typeof s !== "object") return structuredClone(INITIAL_STATE);

      return normalizeState(s);
    }catch(e){
      return structuredClone(INITIAL_STATE);
    }
  }
  // Performance-Notiz: saveState wird pro Befehl 2–4× aufgerufen und serialisiert
  // den kompletten State. Gemessen (Chromium, volles 400-Einträge-Replay-Log,
  // ~250 KB State): ~0,8 ms pro Aufruf — für ein eingabegetriebenes Spiel
  // unkritisch. Bewusst KEIN Debouncing: synchrones Speichern garantiert, dass
  // Reload/Tab-Schließen nie Fortschritt verliert.
  function saveState(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    // UI: Header-Hinweis zum Zeugnis-Druck sofort aktualisieren (ohne Reload)
    try{
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
    } catch(e){}
  }

  function hasAutosave(){
    return !!localStorage.getItem(STORAGE_KEY);
  }

  function toBase64Url(str){
    return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function fromBase64Url(str){
    const normalized = String(str||"").replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return decodeURIComponent(escape(atob(padded)));
  }

  function createSavePassphrase(){
    const payload = { t:"schwarmshell-save", v:1, state };
    return `SS1.${toBase64Url(JSON.stringify(payload))}`;
  }

  function loadStateFromPassphrase(passphrase){
    const raw = String(passphrase||"").trim();
    if(!raw.startsWith("SS1.")) return { ok:false, error:"Ungültiges Format." };
    try{
      const decoded = fromBase64Url(raw.slice(4));
      const payload = JSON.parse(decoded);
      if(!payload || payload.t !== "schwarmshell-save" || payload.v !== 1 || !payload.state){
        return { ok:false, error:"Passphrase konnte nicht gelesen werden." };
      }
      state = normalizeState(payload.state);
      saveState();
      return { ok:true };
    }catch(e){
      return { ok:false, error:"Passphrase ist beschädigt oder unvollständig." };
    }
  }
  let state = loadState();

  // Boot-Guard: Ohne SCHWARM_DATA (data.js fehlgeschlagen oder falsche Script-Reihenfolge)
  // würde das Destructuring unten hart crashen — mit leerer Seite und ohne Hinweis.
  // Stattdessen sichtbare Meldung anzeigen und mit klarer Fehlermeldung abbrechen.
  if(!window.SCHWARM_DATA){
    if(window.schwarmBootError) window.schwarmBootError("window.SCHWARM_DATA fehlt — data.js wurde nicht (korrekt) geladen.");
    throw new Error("SchwarmShell: window.SCHWARM_DATA fehlt. Lade-Reihenfolge der <script>-Tags in index.html prüfen.");
  }
  const { FS, NPCS, OBJECTIVES } = window.SCHWARM_DATA;


  

  

  const REWARD_LIBRARY = {
    badge_tutorial: { name:"Tutorial Badge", desc:"Du hast die Basics gecheckt.", img: svgData("Badge: Tutorial","Unlocked","arena") },
    badge_keycard:  { name:"Keycard Drop", desc:"Legendary? Naja. Aber wichtig.", img: svgData("Badge: Keycard","Loot acquired","lab") },
    badge_grep:     { name:"Grep Scout", desc:"STRG+F, aber im Terminal. 😤", img: svgData("Badge: Grep","Search master","lab") },
    badge_builder:  { name:"Patch Builder", desc:"Du craftest Ordner wie ein Profi.", img: svgData("Badge: Builder","mkdir+touch","arena") },
    badge_pipe:     { name:"Pipe Wizard", desc:"Combo-Moves (im Spiel später)", img: svgData("Badge: Pipe","cat + grep","arena") },
    badge_patch:    { name:"Reality Patch", desc:"Du hast den Exit gebaut.", img: svgData("Badge: Reality","Phase 2 clear","arena") },
    badge_find:     { name:"Find Sherlock", desc:"Du findest Dinge, die sich verstecken.", img: svgData("Badge: Find","Detective","lab") },
    badge_chmod:    { name:"Permission Pro", desc:"Du gibst Scripts Beine.", img: svgData("Badge: chmod","+x unlocked","arena") },
    badge_boss:     { name:"Reality Slayer", desc:"Patchlord down. GG.", img: svgData("Badge: Boss","Victory","arena") },
    badge_sysadmin: { name:"Sysadmin in Training", desc:"Du hast einen Lag-Prozess gekillt.", img: svgData("Badge: Sysadmin","kill confirmed","server") },
    badge_history:  { name:"History Detective", desc:"Du hast aus Fehlern gelernt. W.", img: svgData("Badge: History","rewind","library") },
    badge_alias:    { name:"QoL Wizard", desc:"Alias = Shortcut. Speedrun vibes.", img: svgData("Badge: Alias","macro unlocked","arena") },
    badge_mentor:   { name:"Shell Coach", desc:"Du hast den Squad gecarried (nett).", img: svgData("Badge: Mentor","Phase 4 clear","arena") },
    badge_job:      { name:"Real‑Life Starter", desc:"Du hast den Sprung aus dem Game ins echte Leben gemacht.", img: svgData("Badge: Job","Phase 5 clear","office") },
    badge_hello_script:   { name:"Skript-Premiere",  desc:"Erstes eigenes Bash-Skript geschrieben und ausgeführt.", img: svgData("Badge: Hello","First script","arena") },
    badge_var_script:     { name:"Variable Master",  desc:"Du hast Variablen in einem Skript benutzt.", img: svgData("Badge: Vars","NAME=…","lab") },
    badge_cleanup_script: { name:"Cleanup Crew",     desc:"Du hast ein Cleanup-Skript mit mehreren rm-Aufrufen gebaut.", img: svgData("Badge: Cleanup","rm-rm","server") },
  };

  function award(id){
    if(state.rewards.includes(id)) return;
    state.rewards.push(id);
    saveState();
    renderRewards();
    const rewardName = REWARD_LIBRARY[id]?.name || id;
    row(`+ Belohnung: ${rewardName}`, "ok");
    // Zusätzliche, gut sichtbare Bestätigung — vorher war der Erfolg leicht zu übersehen.
    if(typeof window.toast === "function"){
      window.toast(rewardName, { type:"success", title:"🏅 Badge freigeschaltet" });
    }
  }

  function ensurePerm(path){
    if(!state.perms[path]){
      const isScript = path.endsWith(".sh");
      state.perms[path] = { mode: isScript ? "755" : "644", exec: isScript };
      saveState();
    }
    return state.perms[path];
  }
  (function initPerms(){
    // Patchlord-Script startet absichtlich ohne Ausführrecht (Phase-3-Quest:
    // erst nach chmod +x soll bash patchlord.sh / ./patchlord.sh laufen).
    const p = "/boss/patchlord.sh";
    ensurePerm(p);
    state.perms[p].mode = "644";
    state.perms[p].exec = false;

    // Hidden Miniquests: iPad-Sync-File startet ohne Leserechte (chmod-Quest)
    const ipad = "/home/player/ipad_sync/zoe/wichtig.txt";
    ensurePerm(ipad);
    state.perms[ipad].mode = "000";
    state.perms[ipad].exec = false;

    saveState();
  })();
