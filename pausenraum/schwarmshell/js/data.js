// SchwarmShell — Daten-Aggregator
// FS und NPCS sind in js/data/fs.js bzw. js/data/npcs.js ausgelagert (die laden
// sich vor diesem File via index.html und legen window.SCHWARM_FS / window.SCHWARM_NPCS an).
// OBJECTIVES bleibt hier inline, weil jedes Objective eine done(state)-Funktion enthält
// — Funktionen lassen sich nicht in JSON serialisieren. Wenn Lehrkräfte Quest-Ziele
// hinzufügen wollen, ist das hier der richtige Ort.
(function(){
  const FS = window.SCHWARM_FS;
  const NPCS = window.SCHWARM_NPCS;
  if(!FS || !NPCS){
    const msg = "data.js: window.SCHWARM_FS oder window.SCHWARM_NPCS fehlt. Lade-Reihenfolge in index.html prüfen.";
    if(window.schwarmBootError) window.schwarmBootError(msg);
    else console.error("[SchwarmShell] " + msg);
    return;
  }

// Phase 6 — Scriptlab-Bereich: Spieler schreiben eigene Bash-Skripte. Wird nach
// Abschluss des Job-Arcs (state.flags.job_arc_done) freigeschaltet. Das System
// ist absichtlich simpel: wir prüfen per Pattern, ob bestimmte Strukturen
// (echo, Variablen, mehrere rm) im Skript stehen. Echte Bash-Semantik bleibt
// eine bewusste Vereinfachung.
if(!FS["/scriptlab"]){
  FS["/scriptlab"] = { type:"dir", children:["README.txt","auftraege.txt"] };
  FS["/scriptlab/README.txt"] = { type:"file", content:
`Willkommen im Scriptlab.

In Phase 6 schreibst du deine eigenen Bash-Skripte. Workflow:
  1. edit ~/scripts/<name>.sh      → öffnet einen Editor (Modal mit Textarea)
  2. chmod +x ~/scripts/<name>.sh  → Ausführbar machen
  3. cd ~/scripts && ./<name>.sh   → Ausführen

Lies "auftraege.txt", um die Quests zu sehen. Quest-Trigger prüfen, ob bestimmte
Patterns in deinem Skript stehen — nicht, ob die Bash-Ausführung "richtig" ist.
` };
  FS["/scriptlab/auftraege.txt"] = { type:"file", content:
`Drei Aufträge — drei Skill-Level.

(A) Hello World — schreib ein Skript ~/scripts/hello.sh mit dem Zeilen-Echo:
        echo "Hallo SchwarmShell"
    Speichern, chmod +x, dann ./hello.sh — die Quest zählt, sobald die Datei
    das echo enthält UND ausführbar ist.

(B) Variable nutzen — schreib ein Skript ~/scripts/greet.sh, das eine Variable
    setzt und ausgibt:
        NAME="Welt"
        echo "Hi $NAME"
    Trigger: Datei enthält ein Variablen-Assignment (NAME=...) und ein echo
    mit $.

(C) Cleanup-Skript — schreib ein Skript ~/scripts/cleanup.sh, das mindestens
    zwei rm-Aufrufe enthält (z.B. .tmp-Dateien aus deinem Lager wegräumen).
    Trigger: Datei enthält zwei oder mehr Zeilen, die mit "rm " beginnen.
` };
  // ~/scripts vorbereiten, damit edit-Pfade unter ~ funktionieren
  if(FS["/home/player"] && !FS["/home/player"].children.includes("scripts")){
    FS["/home/player"].children.push("scripts");
  }
  if(!FS["/home/player/scripts"]){
    FS["/home/player/scripts"] = { type:"dir", children:[] };
  }
  if(FS["/"] && !FS["/"].children.includes("scriptlab")){
    FS["/"].children.push("scriptlab");
  }
}

const OBJECTIVES = [
    // Phase 1 — Tutorial
    { phase:1, title:"Tutorial starten", key:"tutorial", hint:"Lies zuerst die README. Da steht, was hier überhaupt abgeht.", done:(s)=>!!s.flags.introSeen },
    { phase:1, title:"iServ-Glitch untersuchen", key:"iserv", hint:"In der Schule gibt’s einen Raum mit PCs… da ist der Ursprung vom Glitch ziemlich sus.", done:(s)=>!!s.flags.iserv_glitch },
    { phase:1, title:"KEYCARD besorgen", key:"keycard", hint:"Irgendwo liegt ein Hinweis/Token, der nach ‚Zutritt‘ klingt. Schau dich in den PC-Ordnern um.", done:(s)=>!!s.flags.got_key },
    { phase:1, title:"Server-Gate öffnen", key:"gate", hint:"Am Gate brauchst du den richtigen Code. Wenn du ihn hast: einmal sauber eingeben.", done:(s)=>!!s.flags.opened_gate },

    // Phase 2 — Quests / Fragmente
    { phase:2, title:"Fragment #1 sichern", key:"frag1", hint:"In den Patch-Logs versteckt sich ein Token. Such nach einem eindeutigen Wort/Tag.", done:(s)=>!!s.flags.frag1 },
    { phase:2, title:"Fragment #2 craften", key:"frag2", hint:"Du brauchst eine kleine ‚Werkbank‘ in deinem Home. Ordner + Datei = Loot-Slot.", done:(s)=>!!s.flags.frag2 },
    { phase:2, title:"Fragment #3: Signal finden", key:"frag3", hint:"Da gibt’s ein Signal in einer Datei. Such gezielt nach dem Signal und sichere das Fragment.", done:(s)=>!!s.flags.frag3 },
    { phase:2, title:"Reality-Patch zusammenbauen", key:"assemble", hint:"Wenn du alle 3 Fragmente hast, kannst du sie zu einem Patch kombinieren.", done:(s)=>!!s.flags.reality_patch },

    // Phase 3 — Boss
    { phase:3, title:"Patchlord lokalisieren", key:"locate", hint:"Im Boss-Bereich liegt ein Script mit einem auffälligen Namen. Finde es gezielt.", done:(s)=>!!s.flags.found_boss },
    { phase:3, title:"Bug-Zeile identifizieren", key:"bug", hint:"Im Script steht irgendwo ein eindeutiger Marker. Lass dir die Zeilennummern anzeigen.", done:(s)=>!!s.flags.inspected_boss },
    { phase:3, title:"Hotfix vorbereiten", key:"hotfix", hint:"Du kannst das Original nicht einfach überschreiben. Mach eine Kopie in deine Workbench und patch sie.", done:(s)=>!!s.flags.fixed_script },
    { phase:3, title:"Script ausführbar machen", key:"chmod", hint:"Wenn ein Script nicht starten will, fehlt oft ‚Erlaubnis‘. Das muss man fixen.", done:(s)=>!!s.flags.exec_script },
    { phase:3, title:"Bossfight ausführen", key:"boss", hint:"Starte das Script mit den richtigen Tokens. Tippfehler = RIP.", done:(s)=>!!s.flags.escaped },

    // Phase 4 — Mentor / Multiplayer
    { phase:4, title:"Mentor Hub betreten", key:"mentor_hub", hint:"Du bist jetzt in der Lobby. Check das Questboard und sprich die Squad-NPCs an.", done:(s)=>s.phase>=4 },
    { phase:4, title:"Noah: Lag fixen", key:"lagfix", hint:"Noah hat 3-FPS-Vibes. Finde den Prozess, der alles frisst, und stoppe ihn.", done:(s)=>!!s.mentor?.lag_fixed },
    { phase:4, title:"Emma: History-Detective", key:"emma", hint:"Emma hat den Überblick verloren. Du brauchst den Verlauf, um den Fehler zu sehen.", done:(s)=>!!s.mentor?.history_checked },
    { phase:4, title:"Leo: QoL-Shortcut", key:"leo", hint:"Leo will Speedrun. Bau ihm einen Shortcut, damit er weniger tippen muss.", done:(s)=>!!s.mentor?.alias_made },
    { phase:4, title:"Mentor-Run clear", key:"mentor_clear", hint:"Alles beendet oder läuft noch was?", done:(s)=>!!(s.mentor && s.mentor.clear_done) },
  
    // Ende — Zeugnis-Arc
    { phase:3, title:"Zeugnis abholen", key:"report", hint:"Der Glitch ist weg? Dann ab ins Sekretariat: talk harries oder talk pietsch.", done:(s)=>!!s.flags.report_given },
    { phase:4, title:"Finales Zeugnis verdienen", key:"report_final", hint:"Hol dir Bonus Points (Sidequest) und komm dann nochmal ins Sekretariat.", done:(s)=>!!s.flags.report_final },

    // Phase 5 — Real Life
    // NOTE: Phase 5 braucht explizite Quest-Keys, damit "help - <questkey>" funktioniert.
    { phase:5, title:"Arbeitsamt betreten", key:"arbeitsamt", hint:"Nach dem finalen Zeugnis taucht ein neuer Ort auf. Geh hin: cd /arbeitsamt", done:(s)=>!!(s.flags && s.flags.job_arc_started) },
    { phase:5, title:"Erstes Gespräch: Beamter", key:"beamter", hint:"Im Arbeitsamt wartet jemand auf dich: talk beamter", done:(s)=>!!(s.jobArc && s.jobArc.active) },
    { phase:5, title:"Job-Quest: SNACKMASTER", key:"snackmaster", hint:"Im Audit-Log bei SNACKMASTER steht irgendwo die Allergene-Zeile mit einem Marker. Finde sie und sprich dann Jansen an.", done:(s)=>!!(s.jobArc && s.jobArc.quests && s.jobArc.quests.snackmaster) },
    { phase:5, title:"Job-Quest: A‑R‑S Recycling", key:"ars", hint:"Bei A‑R‑S liegt eine wichtige Datei irgendwo im Firmenordner. Bring sie in deine Workbench und melde dich bei Wiebe.", done:(s)=>!!(s.jobArc && s.jobArc.quests && s.jobArc.quests.ars) },
    { phase:5, title:"Job-Quest: Ohlendorf-Technik", key:"ohlendorf", hint:"Bei Ohlendorf klemmt’s an Zugriffsrechten. Hol dir das Ticket in die Workbench, prüf die Rechte und sprich dann Neele an.", done:(s)=>!!(s.jobArc && s.jobArc.quests && s.jobArc.quests.ohlendorf) },
    { phase:5, title:"Job-Quest: Möbelfabrik", key:"berndt", hint:"In der Möbelfabrik läuft etwas aus dem Ruder (CPU). Finde den Verursacher-Prozess und stoppe ihn, dann zu Tom.", done:(s)=>!!(s.jobArc && s.jobArc.quests && s.jobArc.quests.berndt) },
    { phase:5, title:"Job-Quest: CMS Handwerk", key:"cms", hint:"CMS braucht eine Abnahme-Mappe für alle Fachbereiche. Sammle die Codes aus anderen Orten, dokumentiere sie in ~/workbench/cms und sprich dann Holger.", done:(s)=>!!(s.jobArc && s.jobArc.quests && s.jobArc.quests.cms) },
    { phase:5, title:"Abschluss: Jobangebot sichern", key:"jobangebot", hint:"Zurück zum Arbeitsamt: talk beamter", done:(s)=>!!(s.flags && s.flags.job_arc_done) },

    // Phase 6 — Skript schreiben (eigene Bash-Logik)
    { phase:6, title:"Scriptlab betreten", key:"scriptlab", hint:"cd /scriptlab und lies README.txt + auftraege.txt.", done:(s)=>!!(s.flags && s.flags.scriptlab_entered) },
    { phase:6, title:"Hello-World-Skript", key:"hello_script", hint:'edit ~/scripts/hello.sh, schreibe echo "Hallo SchwarmShell" rein, dann chmod +x.', done:(s)=>!!(s.flags && s.flags.script_hello) },
    { phase:6, title:"Skript mit Variable", key:"var_script", hint:"edit ~/scripts/greet.sh — setze eine Variable (NAME=...) und gib sie mit echo $NAME aus.", done:(s)=>!!(s.flags && s.flags.script_variable) },
    { phase:6, title:"Cleanup-Skript", key:"cleanup_script", hint:"edit ~/scripts/cleanup.sh mit mindestens zwei rm-Zeilen.", done:(s)=>!!(s.flags && s.flags.script_cleanup) },
];

  window.SCHWARM_DATA = { FS, NPCS, OBJECTIVES };
})();
