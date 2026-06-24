// quests.js — Quest-Trigger, Phasen-Fortschritt und Script-Engine (aus commands.js ausgelagert)
//
// grepTrigger/progressPhaseIfReady: setzen Flags und schalten Phasen frei,
// wenn Quest-Bedingungen (OBJECTIVES in js/data.js) erfüllt sind.
// evaluateScriptQuests/runScript: Phase-6-Scriptlab — Pattern-Checks und die
// bewusst vereinfachte Ausführung eigener Skripte. applyCheat1337: Dev-Cheat.

// objectiveKey — kanonischer Quest-Key eines Objectives. Wird überall benutzt,
// wo Quests adressiert werden: "help - <key>", Clippy-Lösungen (CLIPPY_SOLUTIONS
// in main.js) und Karten-Pfade (QUEST_PATH_BY_KEY in fs.js). Alle OBJECTIVES in
// js/data.js tragen ein explizites key-Feld; "quest" ist nur der Fallback für
// selbst ergänzte Objectives ohne key.
function objectiveKey(objective){
  return (objective && objective.key) ? String(objective.key).trim().toLowerCase() : "quest";
}

  function grepTrigger(pattern, outText){
    // FRAG1 quest: accept both the exact tag and broader searches like TOKEN/token.
    // We only mark progress when the output looks like it comes from frag_1.log context.
    const p = String(pattern || "").toLowerCase();
    const o = String(outText || "").toLowerCase();
    const frag1Hit = (
      (p === "frag1_token" || p === "token") &&
      (o.includes("frag1_token=") || o.includes("hid the token") || o.includes("token in plain sight"))
    );
    if(state.phase >= 2 && frag1Hit){
      if(!state.flags.frag1){
        state.flags.frag1 = true;
        state.fragments.f1 = "PIXEL-SPAWN-42";
        award("badge_grep");
        row("FRAG1 gesnackt ✅ (PIXEL-SPAWN-42)", "ok");
      }
    }
    const frag3Pattern = String(pattern || "").toLowerCase();
    const frag3Output = String(outText || "").toLowerCase();
    if(state.phase >= 2 && frag3Pattern === "signal" && frag3Output.includes("frag3=")){
      if(!state.flags.frag3){
        state.flags.frag3 = true;
        state.fragments.f3 = "NEON-PIPE-7";
        award("badge_pipe");
        row("FRAG3 geklärt ✅ (NEON-PIPE-7)", "ok");
      }
    }
    // Vorher case-sensitive ("BUG" exakt) — das stand im Widerspruch dazu, dass die
    // Quest dem Spieler grep -i als legitime Variante beibringt. Jetzt zählt jedes
    // Pattern, das "bug" enthält (z.B. "BUG", "Bug", "bugfix"), solange Zeilennummern
    // (grep -n) im Output stehen.
    if(state.phase >= 3 && /bug/i.test(pattern) && outText.match(/^\s*\d+:/m)){
      state.flags.inspected_boss = true;
    }

    // Phase 5 — Job Quest: SNACKMASTER (Marker muss im Output auftauchen)
    if(state.phase >= 5){
      const pp = String(pattern||"").toLowerCase();
      const oo = String(outText||"").toLowerCase();
      if(pp.includes("allergene") && oo.includes("ok:job_snackmaster")){
        if(!state.jobArc) state.jobArc = { active:true, stage:0, quests:{ snackmaster:false, ars:false, ohlendorf:false, berndt:false, cms:false } };
        state.jobArc.active = true;
        state.jobArc.quests = state.jobArc.quests || {};
        state.jobArc.quests.snackmaster = true;
      }
    }
    saveState();
    renderObjectives();
  }

  function progressPhaseIfReady(){
    if(state.phase === 1 && state.flags.opened_gate){
      state.phase = 2;
      state.cwd = "/arena";
      award("badge_tutorial");
      saveState();
      promptEl.textContent = promptText();
      renderLocation();
      renderObjectives();
      renderPhasePill();
      row("✨ Phase 2 unlocked. Arena-Zeit. HUD ist da. Reality ist kurz AFK.", "ok");
      row("Pro-Move: cat /arena/quests.txt", "p");
    }
    if(state.phase === 2 && state.flags.reality_patch){
      state.phase = 3;
      state.cwd = "/network";
      award("badge_patch");
      saveState();
      promptEl.textContent = promptText();
      renderLocation();
      renderObjectives();
      renderPhasePill();
      row("🔥 Phase 3 unlocked. Reality-Patch hat’s fast geschafft… aber PATCHLORD lebt noch.", "warn");
      row("Check die Logs: find /network -name \"*.log\"  (und dann grep -n PATCHLORD …)", "p");
    }
    if(state.phase === 3 && state.flags.escaped && state.flags.report_followup){
      state.phase = 4;
      state.cwd = "/mentor_hub";
      award("badge_mentor");
      saveState();
      promptEl.textContent = promptText();
      renderLocation();
      renderObjectives();
      renderPhasePill();
      row("🧑‍🤝‍🧑 Phase 4 unlocked. Mentor-Arc gestartet: Du bist jetzt der Shell-Coach.", "ok");
      row("Check: cat /mentor_hub/quests.txt  und dann talk noah", "p");
    }
    if(state.phase === 5 && state.flags && state.flags.job_arc_done){
      state.phase = 6;
      state.cwd = "/scriptlab";
      saveState();
      promptEl.textContent = promptText();
      renderLocation();
      renderObjectives();
      renderPhasePill();
      row("🧪 Phase 6 unlocked. Scriptlab ist offen — du schreibst jetzt eigene Skripte.", "ok");
      row("Lies: cat /scriptlab/README.txt  und  cat /scriptlab/auftraege.txt", "p");
    }
  }

  // Quest-Auswertung für Phase 6: prüft den Inhalt der gespeicherten Skripte
  // gegen einfache Patterns. Wird vom Editor nach jedem Speichern aufgerufen,
  // damit die Spieler sofort feedback bekommen.
  function evaluateScriptQuests(){
    try{
      if(state.phase < 6) return;
      const get = (p)=>{ const n = getNode(p); return n && n.type === "file" ? String(n.content||"") : ""; };
      const helloContent = get("/home/player/scripts/hello.sh");
      const helloPerm = state.perms && state.perms["/home/player/scripts/hello.sh"];
      const helloOk = /(^|\n)\s*echo\b/.test(helloContent) && helloPerm && helloPerm.exec;
      if(helloOk && !state.flags.script_hello){
        state.flags.script_hello = true;
        award("badge_hello_script");
        row("Quest erfüllt: Hello-World-Skript ✅", "ok");
      }
      const greet = get("/home/player/scripts/greet.sh");
      // mindestens eine VAR=... Zeile + ein echo, das $-Variable nutzt
      const greetOk = /(^|\n)\s*[A-Za-z_]\w*\s*=/.test(greet) && /echo\b[^\n]*\$/.test(greet);
      if(greetOk && !state.flags.script_variable){
        state.flags.script_variable = true;
        award("badge_var_script");
        row("Quest erfüllt: Skript mit Variable ✅", "ok");
      }
      const cleanup = get("/home/player/scripts/cleanup.sh");
      const rmCount = (cleanup.match(/(^|\n)\s*rm\b/g) || []).length;
      if(rmCount >= 2 && !state.flags.script_cleanup){
        state.flags.script_cleanup = true;
        award("badge_cleanup_script");
        row("Quest erfüllt: Cleanup-Skript ✅", "ok");
      }
      saveState();
      renderObjectives();
    }catch(_e){}
  }
  window.evaluateScriptQuests = evaluateScriptQuests;

  function runScript(path, argv){
    const p = normPath(path);
    const node = getNode(p);
    if(!node || node.type!=="file") return { ok:false, out:"bash: file not found" };
    const perms = ensurePerm(p);
    const isWork = p.startsWith("/home/player/workbench/");
    if(!isWork) return { ok:false, out:"Boss-Regeln: Script muss in ~/workbench liegen. (cp zuerst)" };

    if(!perms.exec){
      return { ok:false, out:"Permission denied: Script ist nicht executable. (chmod +x ...)" };
    }

    const content = String(node.content || "");
    // Hotfix: akzeptiere sowohl eine rohe Marker-Zeile als auch eine echo-Zeile.
    // Wichtig: Sobald der Hotfix einmal erkannt wurde, soll chmod/Permissions
    // den Quest-Fortschritt niemals wieder "verlieren".
    const hasPatchLine = content
      .split(/\r?\n/)
      .some((line)=>/^(?!\s*#)\s*(PATCH_APPLIED|echo\s+(["'])?PATCH_APPLIED\2)\s*$/.test(line));
    const patchReady = hasPatchLine || !!state.flags.fixed_script;
    if(!patchReady){
      return { ok:true, out:`Patchlord lacht: "Bro, wo ist PATCH_APPLIED ?"
(du musst PATCH_APPLIED oder echo "PATCH_APPLIED" ins Script hängen)` };
    }

    if(hasPatchLine && !state.flags.fixed_script){
      state.flags.fixed_script = true;
      saveState();
      renderObjectives();
    }

    const [a,b,c] = argv;
    const need = [state.fragments.f1, state.fragments.f2, state.fragments.f3];
    if(!need[0] || !need[1] || !need[2]){
      return { ok:true, out:"[OK] Artefakt gesichert in ~/workbench/\n" + "Du hast noch nicht alle Fragmente. (inventory / quests)" };
    }
    if(a === need[0] && b === need[1] && c === need[2]){
      state.flags.escaped = true;
      state.flags.system_fixed = true;
      // Zurück in die Schule teleportieren (nach dem Bossfight)
      state.cwd = "/school";
      // Zeugnis-Druckdienste wieder online (Text in der Datei aktualisieren)
      try{
        const z = getNode("/school/sekretariat/zeugnis.txt");
        if(z && z.type==="file"){
          z.content = `ZEUGNIS-DRUCK (Status):
✅ Online — Dienste wieder verfügbar

Hinweis:
Hol dein Zeugnis im Sekretariat ab:
talk harries  /  talk pietsch`;
        }
      }catch(e){}

      award("badge_boss");
      saveState();
      renderObjectives();
      return { ok:true, out:`PATCH_APPLIED
WEAKNESS FOUND
Patchlord: *8-bit death sound* 🔊

GG. Der Game-Layer klappt zu.
*Teleport…* 🌀
Du landest wieder in der echten KGS.
(Und ja, du hast gerade Bash gelernt. Ohne es zu merken. W.)

✅ Systemstatus: STABIL
📄 Zeugnis-Update: Druckdienste laufen wieder.

QUEST UPDATE:
→ Geh ins Sekretariat und hol dein Zeugnis ab: talk harries / talk pietsch` };
    }
    return { ok:true, out:"NOPE. Tokens falsch. Tip: inventory zeigt deine Fragmente." };
  }

  function applyCheat1337(){
    row(`${promptText()} 1337`, "p", "input");
    row("🎮 Cheatcode 1337 aktiviert: Teleport ans Ende von Phase 4.", "ok");

    state.phase = 4;
    state.cwd = "/school/sekretariat";

    state.flags = Object.assign({}, state.flags, {
      introSeen: true,
      iserv_glitch: true,
      got_key: true,
      opened_gate: true,
      frag1: true,
      frag2: true,
      frag3: true,
      reality_patch: true,
      found_boss: true,
      inspected_boss: true,
      fixed_script: true,
      exec_script: true,
      escaped: true,
      system_fixed: true,
      report_given: true,
      report_followup: true,
      report_final: false
    });

    state.fragments = {
      f1: state.fragments?.f1 || "PIXEL-SPAWN-42",
      f2: state.fragments?.f2 || "CRAFTED-DIR-99",
      f3: state.fragments?.f3 || "NEON-PIPE-7"
    };

    state.mentor = Object.assign({}, state.mentor, {
      lag_fixed: true,
      history_checked: true,
      alias_made: true,
      students_helped: 3,
      clear_done: true
    });

    if(!state.sidequest) state.sidequest = {};
    state.sidequest = Object.assign({}, state.sidequest, {
      unlocked: true,
      stage: 6,
      found_lab: true,
      parts: { lens: true, coil: true, ups: true },
      net: { blueprint: true, shield: true },
      traces: { gym: false, igs: false },
      traceMeter: { gym: 0, igs: 0 },
      badge: true
    });

    if(!state.badges) state.badges = [];
    if(!state.badges.includes("Physica potestas est")) state.badges.push("Physica potestas est");

    state.processes = [
      { pid: 101, name: "terminald", cpu: 3, mem: 42 },
      { pid: 202, name: "rgbd", cpu: 99, mem: 180 },
      { pid: 303, name: "patchwatch", cpu: 5, mem: 65 },
    ];

    try{
      const z = getNode("/school/sekretariat/zeugnis.txt");
      if(z && z.type==="file"){
        z.content = `ZEUGNIS-DRUCK (Status):
✅ Online — Dienste wieder verfügbar

Hinweis:
Hol dein Zeugnis im Sekretariat ab:
talk harries  /  talk pietsch`;
      }
      const score = getNode("/mentor_hub/arena2/score.txt");
      if(score && score.type==="file"){
        score.content = score.content
          .replace("geholfene Leute: 0/3", "geholfene Leute: 3/3")
          .replace("geholfene Leute: 1/3", "geholfene Leute: 3/3")
          .replace("geholfene Leute: 2/3", "geholfene Leute: 3/3");
      }
    }catch(e){}

    award("badge_patch");
    award("badge_boss");
    award("badge_sysadmin");
    award("badge_history");
    award("badge_alias");
    award("badge_mentor");

    saveState();
    renderObjectives();
    renderRewards();
    renderLocation();
    renderPhasePill();
    try{ renderHeaderSub(); }catch(e){}
  }
