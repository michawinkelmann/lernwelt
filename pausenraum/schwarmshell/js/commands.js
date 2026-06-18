// commands.js — Befehls-Implementierungen (cmdImpl), Autocomplete, runLine
// Registry/man-Pages: js/manpages.js · NPC-Dialogbäume: js/npc-dialogs.js ·
// Quest-Trigger/Script-Engine: js/quests.js
//
// Fehlerformat-Konvention (siehe auch fs.js):
//   Befehls-Implementierungen (cmdImpl-Cases) geben IMMER { ok, out } zurück —
//   `out` ist das, was im Terminal landet, auch im Fehlerfall (mit Befehls-Präfix,
//   z.B. out:"cat: foo.txt: No such file"). Das Feld `err` ist der FS-/Parser-Schicht
//   vorbehalten (präfixfreier Grund) und wird hier in `out` übersetzt.
function allowedCommands(){
    let base = [];
    if(state.phase === 1){
      base = ["help","hint","ls","cd","pwd","cat","clear","echo","unlock","talk","choose","quests","inventory","reset","man"];
    } else if(state.phase === 2){
      base = ["help","hint","ls","cd","pwd","cat","clear","echo","grep","mkdir","touch","rm","cp","mv","talk","choose","quests","inventory","reset","man","find"];
    } else if(state.phase === 3){
      base = ["help","hint","ls","cd","pwd","cat","clear","echo","grep","mkdir","touch","rm","cp","mv","find","talk","choose","quests","inventory","reset","man","chmod"];
    } else if(state.phase === 4){
      base = ["help","hint","ls","cd","pwd","cat","clear","echo","grep","mkdir","touch","rm","cp","mv","find","talk","choose","quests","inventory","reset","man","chmod","ps","top","kill","history","alias","mentor_clear"];
    } else if(state.phase >= 5){
      // Phase 5: Alles aus 1–4 ist freigeschaltet (Real Life).
      base = ["help","hint","ls","cd","pwd","cat","clear","echo","grep","mkdir","touch","rm","cp","mv","find","talk","choose","quests","inventory","reset","man","chmod","ps","top","kill","history","alias","mentor_clear"];
      // Phase 6 schaltet zusätzlich den Editor frei.
      if(state.phase >= 6) base.push("edit");
    }

    // "assemble" is only meaningful after all fragments are collected
    if(state.flags && state.flags.frag1 && state.flags.frag2 && state.flags.frag3){
      if(!base.includes("assemble")) base.push("assemble");
    }


    if(state.sidequest && state.sidequest.unlocked){
      base.push("connect");
      if(state.superpc && state.superpc.active){
        base.push("ping","ssh","scp","logwipe","netmap","exit");
      }
    }
    return Array.from(new Set(base));
  }

  function levenshtein(a, b){
    const s = String(a || "");
    const t = String(b || "");
    const rows = s.length + 1;
    const cols = t.length + 1;
    const dp = Array.from({ length: rows }, () => Array(cols).fill(0));
    for(let i = 0; i < rows; i++) dp[i][0] = i;
    for(let j = 0; j < cols; j++) dp[0][j] = j;
    for(let i = 1; i < rows; i++){
      for(let j = 1; j < cols; j++){
        const cost = s[i - 1] === t[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
      }
    }
    return dp[s.length][t.length];
  }

  function isSubsequence(needle, haystack){
    if(!needle) return true;
    let i = 0;
    for(let j = 0; j < haystack.length && i < needle.length; j++){
      if(needle[i] === haystack[j]) i++;
    }
    return i === needle.length;
  }

  function suggestCommands(input, limit = 3){
    const query = String(input || "").toLowerCase();
    if(!query) return [];

    const candidates = allowedCommands().map((cmd) => {
      const candidate = cmd.toLowerCase();
      const dist = levenshtein(query, candidate);
      let score = dist;
      if(candidate.startsWith(query)) score -= 1.5;
      if(query.startsWith(candidate)) score -= 0.75;
      if(isSubsequence(query, candidate)) score -= 0.5;
      return { cmd, score, dist };
    });

    const ranked = candidates
      .sort((a, b) => (a.score - b.score) || (a.dist - b.dist) || a.cmd.localeCompare(b.cmd))
      .slice(0, limit)
      .map((entry) => entry.cmd);

    return ranked;
  }

  function unknownCommandMessage(cmd){
    const suggestions = suggestCommands(cmd, 3);
    let out = `Command not found: ${cmd}`;
    if(suggestions.length){
      out += `\nMeintest du: ${suggestions[0]} ?`;
      if(suggestions.length > 1){
        out += `\nWeitere Kandidaten: ${suggestions.slice(1).join(", ")}`;
      }
    }
    out += "\nTipp: help | man <cmd>";
    return out;
  }

  // Mentor-Arc: Nach 3/3 geholfenen Schüler*innen taucht ein extra Prozess auf,
  // der als "Abschluss-Schalter" dient. Wird dieser Prozess gekillt, ist mentor_clear erfüllt.
  function ensureQuestAktivProcess(){
    if(state.phase < 4) return;
    const helped = (state.mentor && state.mentor.students_helped) ? state.mentor.students_helped : 0;
    const cleared = !!(state.mentor && state.mentor.clear_done);
    if(helped < 3 || cleared) return;
    state.processes = state.processes || [];
    const has = state.processes.some(p => p && p.name === "quest_aktiv");
    if(!has){
      state.processes.push({ pid: 67, name: "quest_aktiv", cpu: 1, mem: 8 });
      saveState();
    }
  }


  function splitAutocompleteArg(argToken){
    const token = String(argToken || "");
    if(!token) return { baseInput: ".", prefix: "" };
    if(token.endsWith("/")) return { baseInput: token, prefix: "" };
    const slash = token.lastIndexOf("/");
    if(slash < 0) return { baseInput: ".", prefix: token };
    return {
      baseInput: token.slice(0, slash + 1),
      prefix: token.slice(slash + 1)
    };
  }

  function joinAutocompleteCandidate(baseInput, name){
    const base = String(baseInput || "");
    if(!base || base === ".") return name;
    if(base === "/") return `/${name}`;
    return base.replace(/\/$/, "") + "/" + name;
  }

  function autocomplete(partial){
    if(!partial || partial.includes("|")) return null;
    const input = String(partial);
    const cmds = allowedCommands();
    const hasTrailingSpace = /\s$/.test(input);
    const tokens = input.trim().split(/\s+/).filter(Boolean);
    if(!tokens.length) return null;

    if(tokens.length === 1 && !hasTrailingSpace){
      const cand = cmds.filter((c)=>c.startsWith(tokens[0]));
      return {
        kind: "command",
        replacement: cand.length === 1 ? cand[0] : null,
        candidates: cand
      };
    }

    const firstSpaceIdx = input.search(/\s/);
    if(firstSpaceIdx < 0) return null;
    const cmd = tokens[0];
    const argString = input.slice(firstSpaceIdx + 1);
    const argTokens = argString.trim().length ? argString.trim().split(/\s+/) : [];
    const activeToken = hasTrailingSpace ? "" : (argTokens[argTokens.length - 1] || "");
    const activePrefix = hasTrailingSpace ? input : input.slice(0, input.length - activeToken.length);

    const { baseInput, prefix } = splitAutocompleteArg(activeToken);
    const dirPath = normPath(baseInput || ".");
    const children = listDir(dirPath);
    if(!children) return null;

    const candidates = children
      .filter((name)=>name.startsWith(prefix))
      .map((name)=>{
        const fullPath = (dirPath === "/" ? "" : dirPath) + "/" + name;
        const node = getNode(fullPath);
        const suffix = node?.type === "dir" ? "/" : "";
        return joinAutocompleteCandidate(baseInput, name) + suffix;
      });

    return {
      kind: "path",
      command: cmd,
      replacement: candidates.length === 1 ? `${activePrefix}${candidates[0]}` : null,
      candidates,
      activePrefix
    };
  }

  function stripQuotes(s){
    s = String(s).trim();
    if((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return s.slice(1,-1);
    return s;
  }

  function parseEchoRedir(line){
    const m = line.match(/^echo\s+(.+?)\s*(>>|>)\s*(.+)$/);
    if(!m) return null;
    return { text: m[1], op: m[2], file: m[3].trim() };
  }

  function parseGrep(args){
    let n=false, i=false;
    const rest = [];
    for(const a of args){
      if(a === "-n") n=true;
      else if(a === "-i") i=true;
      else rest.push(a);
    }
    if(!rest.length) return { err:"grep: missing pattern" };
    const pattern = rest[0];
    const file = rest[1] || null;
    return { n,i,pattern,file };
  }

  function parseFind(args){
    if(args.length < 3) return { err:"find: usage: find <path> -name <pattern>" };
    const start = args[0];
    if(args[1] !== "-name") return { err:"find: only supports -name in this game" };
    const pattern = args.slice(2).join(" ");
    return { start, pattern: stripQuotes(pattern) };
  }

  function cmdImpl(line, stdin=null){
    const trimmed = line.trim();
    if(!trimmed) return { ok:true, out:"" };

    const firstToken = trimmed.split(/\s+/, 1)[0];
    if(firstToken !== "choose"){
      let changedDialogState = false;
      if(state.npcDialog && state.npcDialog.active){
        resetNpcDialog();
        changedDialogState = true;
      }
      if(state.sidequest && state.sidequest.dialog === "winkelmann"){
        state.sidequest.dialog = null;
        state.sidequest.winkMenu = "main";
        changedDialogState = true;
      }
      if(changedDialogState) saveState();
    }

    if(state.phase >= 3 && trimmed.startsWith("./")){
      const rest = trimmed.slice(2).trim();
      const parts = rest.split(/\s+/);
      const file = parts[0];
      const argv = parts.slice(1);
      const p = normPath("~/workbench/" + file.replace(/^\/+/, ""));
      return runScript(p, argv);
    }

    const red = parseEchoRedir(trimmed);
    if(red){
      const target = normPath(red.file);
      let t = stripQuotes(red.text.trim());
      const content = t + "\n";
      const w = writeFile(target, content, red.op === ">>");
      if(!w.ok) return { ok:false, out:`echo: ${w.err}` };

      // Hotfix-Trigger: alles akzeptieren, was den Marker "PATCH_APPLIED" enthält —
      // egal ob "PATCH_APPLIED", "echo PATCH_APPLIED", "echo 'PATCH_APPLIED'" oder ein
      // semantisch identischer Kommentar. Vorher war das ein exakt-Match-Regex, der
      // Spieler frustrierte, die Quotes weggelassen hatten.
      if(target === "/home/player/workbench/patchlord.sh" && /PATCH_APPLIED/.test(t)){
        state.flags.fixed_script = true;
        saveState();
        renderObjectives();
        row("Script-Fix detected ✅ Patchlord ist jetzt nervös. 😤", "ok");
      }
      return { ok:true, out:`(wrote) ${target}` };
    }

    const parts = trimmed.split(/\s+/);
    const c = parts[0];

    // Registry-Lock: bekannte Commands, aber in dieser Phase (noch) gesperrt
    const allowedNow = allowedCommands();
    if(COMMAND_REGISTRY[c] && !allowedNow.includes(c)){
      return {
        ok:false,
        out:`${c}: (gesperrt) — erst Phase ${state.phase} spielen / Fortschritt machen.\nTipp: help | man ${c}`
      };
    }

    // Unbekannter Command (nicht im Registry)
    if(!COMMAND_REGISTRY[c]){
      return { ok:false, out:unknownCommandMessage(c) };
    }
    const args = parts.slice(1);

    switch(c){
      case "help":{
        const cmds = allowedCommands();
        const explain = {
          help:"zeigt diese Hilfe (oder help - <quest>)",
          hint:"zeigt einen Tipp zur aktuellen Quest",
          ls:"listet Inhalte",
          cd:"wechselt Ordner",
          pwd:"zeigt aktuellen Pfad",
          cat:"liest Datei",
          echo:"gibt Text aus (und kann in Datei schreiben)",
          clear:"leert Terminal",
          talk:"NPC-Dialog",
          quests:"Quest-Tracker",
          inventory:"Inventar/Fragmente",

          unlock:"(Story) Gate öffnen",
          grep:"Textsuche (optional: -n, -i)",
          mkdir:"Ordner erstellen (nur unter ~)",
          touch:"Datei erstellen (nur unter ~)",
          rm:"Datei löschen (nur unter ~)",
          cp:"Datei kopieren (dst unter ~)",
          mv:"Datei verschieben (nur unter ~)",
          assemble:"Reality-Patch bauen",
          find:"Dateien finden (mit -name und *)",
          chmod:"Rechte ändern (+x)",
          bash:"Script ausführen",
          ps:"Prozesse anzeigen",
          top:"Prozesse nach CPU sortiert",
          kill:"Prozess beenden",
          history:"Command-Verlauf",
          alias:"Shortcut/Abkürzung",
          mentor_clear:"Mentor-Run abschließen",
          reset:"alles neu starten",
          man:"Mini-Doku",
        };

        const questHelp = {
          "tutorial": [
            "Tutorial – Grundlagen (ohne Spoiler)",
            "Was du hier übst: Dateien lesen, Inhalte anzeigen, zwischen Ordnern wechseln.",
            "Commands erklärt:",
            "  ls            → zeigt, was in einem Ordner liegt",
            "  cd <ordner>   → wechselt in einen Ordner (z.B. cd /beispiel/raum)",
            "  cat <datei>   → liest eine Datei (z.B. cat hinweis.txt)",
            "Tipp: Nutze erst ls, dann cd, dann cat – wie: erst schauen, dann hingehen, dann lesen."
          ],
          "keycard": [
            "Quest-Hilfe: Zugang/Keycard finden (ohne Route)",
            "Typisches Muster: In einem Bereich liegt eine Textdatei oder Notiz mit einem Hinweis.",
            "Commands erklärt (Beispiele):",
            "  cd <bereich>        → zu einem Ort wechseln",
            "  ls                  → nach auffälligen Dateien suchen (z.B. note.txt, clue.log)",
            "  cat <datei>         → Hinweis lesen",
            "Wenn du etwas einsammelst oder ein Ziel erfüllt ist: quests / inventory checken."
          ],
          "gate": [
            "Quest-Hilfe: Gate/Schloss öffnen (ohne Code)",
            "Meist brauchst du einen Schlüssel-Code aus einer Datei oder einem Dialog.",
            "Commands erklärt:",
            "  cat <hinweisdatei>  → Code/Passwort nachlesen",
            "  unlock <code>       → Gate öffnen (Code exakt übernehmen!)",
            "Beispiel (neutral): unlock ABC-123"
          ],
          "frag1": [
            "Fragment #1 – Text in Logdatei finden (grep)",
            "grep sucht ein Muster in einer Datei und zeigt passende Zeilen.",
            "Beispiele (nicht aus der Quest):",
            "  grep ERROR system.log        → alle Zeilen mit 'ERROR'",
            "  grep -n TODO notes.txt       → mit Zeilennummern (-n)",
            "Optional: -i ignoriert Groß-/Kleinschreibung, Zusätze lassen sich kombinieren (z.B. -n -i).",
            "Workflow: Datei/Ort finden → dann grep <muster> <datei>."
          ],
          "frag2": [
            "Fragment #2 – Ordner & Datei anlegen (mkdir + touch)",
            "mkdir erstellt Ordner, touch erstellt (oder aktualisiert) Dateien.",
            "Beispiele:",
            "  mkdir ~/workbench/projekt",
            "  touch ~/workbench/projekt/info.txt",
            "  cat ~/workbench/projekt/info.txt",
            "Wenn mkdir meldet, dass es den Ordner schon gibt: okay – dann weiter mit touch/cat."
          ],
          "frag3": [
            "Fragment #3 – Muster in Datei finden (grep)",
            "Beispiele:",
            "  grep SIGNAL daten.txt",
            "  grep -n SIGNAL daten.txt",
            "Optional: -i ignoriert Groß-/Kleinschreibung, Zusätze lassen sich kombinieren (z.B. -n -i).",
            "Wenn du das Muster kennst, aber nicht die Datei: erst ls / find verwenden."
          ],
          "assemble": [
            "Reality-Patch bauen (assemble) – Erklärung",
            "assemble nutzt Fragmente aus deinem Inventar und baut daraus etwas im Workbench.",
            "Typischer Ablauf:",
            "  inventory            → prüfen, ob du alles hast",
            "  cd ~/workbench       → im richtigen Ordner arbeiten",
            "  assemble             → Bau starten",
            "Wenn es eine README im Workbench gibt, lohnt sich: cat README*.txt"
          ],
          "find": [
            "Etwas aufspüren (find) – Erklärung",
            "find hilft, Dateien über Namen zu suchen (mit * als Platzhalter).",
            "Beispiele:",
            "  find -name \"patch*\"",
            "  find -name \"*.sh\"",
            "Tipp: Erst finden, dann mit cat/grep reinschauen."
          ],
          "locate": [
			"Lokalisieren – Suche nach Dateinamen",
			"Wenn du nur einen Teil des Namens kennst, nutze Platzhalter (*).",
			"Du musst immer einen Startpfad angeben.",
			"Beispiele:",
			"  find . -name \"*lord*\"",
			"  find /network -name \"*report*\"",
			"  find ~/workbench -name \"*.txt\"",
			"Danach: cat <datei> oder grep <muster> <datei>."
          ],
          "bug": [
            "Bug-Zeile finden – Zeilennummern nutzen (grep -n)",
            "Mit -n bekommst du Zeilennummern: praktisch wie Koordinaten.",
            "Beispiele:",
            "  grep -n BUG script.sh",
            "  grep -n FIXME script.sh",
            "Wenn du das Muster nicht kennst: cat script.sh und nach Hinweisen suchen."
          ],
          "fix": [
            "Script fixen – ohne Editor (cp + echo >>)",
            "Du kannst eine Kopie bearbeiten, indem du Text ans Ende anhängst.",
            "Commands erklärt (Beispiele):",
            "  cp quell.sh ~/workbench/            → Kopie anlegen",
            "  echo 'echo \"OK\"' >> ~/workbench/quell.sh  → Zeile anhängen (>>)",
            "Danach oft nötig:",
            "  chmod +x ~/workbench/quell.sh       → ausführbar machen",
            "  ./quell.sh                          → ausführen"
          ],
          "hotfix": [
            "Hotfix vorbereiten – sicher arbeiten",
            "Regel: Originaldateien nicht überschreiben – arbeite mit einer Kopie in ~/workbench.",
            "Beispiel-Workflow:",
            "  cp original.sh ~/workbench/original.sh",
            "  echo '# hotfix' >> ~/workbench/original.sh",
            "  chmod +x ~/workbench/original.sh",
            "  ./original.sh"
          ],
          "chmod": [
            "Rechte/Permissions – ausführbar machen (chmod +x)",
            "Wenn ein Script nicht startet, fehlt oft das Ausführrecht.",
            "Beispiele:",
            "  chmod +x tool.sh",
            "  chmod +x ~/workbench/tool.sh",
            "Ausführen dann mit:",
            "  ./tool.sh"
          ],
          "boss": [
            "Boss/Finale – Script korrekt ausführen (ohne Tokens)",
            "Typischer Ablauf bei Script-Quests:",
            "  1) Script liegt in deinem Arbeitsordner (~/workbench)",
            "  2) ausführbar machen: chmod +x <script>",
            "  3) starten: ./<script> <argument1> <argument2> ...",
            "Argumente bekommst du meist aus vorherigen Hinweisen/Fragmenten – exakt abschreiben."
          ],
          "iserv": [
            "iServ-Glitch untersuchen – generelles Vorgehen",
            "Du suchst Hinweise in einem Bereich (Datei lesen, eventuell etwas einsammeln).",
            "Commands, die fast immer helfen:",
            "  cd <ort>   → zum Ort wechseln",
            "  ls         → umsehen",
            "  cat <datei>→ Hinweise lesen",
            "Danach: quests prüfen, ob ein neues Ziel freigeschaltet wurde."
          ],
          "lagfix": [
            "Lag-Fix – Prozess finden & beenden (ps/top/kill)",
            "Ziel: einen Prozess identifizieren, der viel CPU frisst, und ihn mit kill stoppen.",
            "Vorgehen (Beispiele):",
            "  ps                 → Prozessliste",
            "  top                → nach CPU sortiert ansehen",
            "  kill <PID>         → Prozess beenden (PID aus ps/top)",
            "Tipp: Erst sicherstellen, dass du den richtigen Prozess erwischst."
          ],
          "noah": [
            "Noah – Prozessproblem (ohne konkrete PID)",
            "Du übst: ps/top lesen, PID finden, kill nutzen.",
            "Beispiel:",
            "  ps",
            "  top",
            "  kill <PID>",
            "Danach mit dem NPC reden: talk <name>"
          ],
          "emma": [
            "Emma – Verlauf/History",
            "history zeigt dir, welche Befehle du schon eingegeben hast.",
            "Beispiele:",
            "  history",
            "  history | (im Spiel nicht nötig – einfach history nutzen)",
            "Danach: talk emma"
          ],
          "leo": [
            "Leo – Aliase/Shortcuts",
            "alias legt Abkürzungen für längere Befehle an.",
            "Beispiele:",
            "  alias ll=\"ls -l\"",
            "  ll",
            "Wenn du dich vertippst: alias neu setzen oder reset (falls angeboten)."
          ],
          "mentor_clear": [
            "Mentor-Run abschließen – komplette Lösung",
            "1) Noah-Quest erledigen (Lag-Prozess stoppen), danach direkt nochmal reden:",
            "  talk noah",
            "2) Emma-Quest erledigen (history prüfen), danach direkt nochmal reden:",
            "  talk emma",
            "3) Leo-Quest erledigen (alias setzen), danach direkt nochmal reden:",
            "  talk leo",
            "4) Jetzt Abschluss triggern: Prozessliste anzeigen und den Quest-Prozess beenden:",
            "  ps",
            "  kill <PID von quest_aktiv>",
            "  (oder direkt: kill 67, falls quest_aktiv mit PID 67 angezeigt wird)",
            "Wichtig: Gesucht ist der Prozessname 'quest_aktiv'. Erst nach dem Kill ist mentor_clear wirklich abgeschlossen."
          ],
          "report": [
            "Abschluss/Report – allgemeiner Hinweis",
            "Manchmal musst du nach dem Fix an einen Ort zurück und mit einer Person sprechen.",
            "Workflow:",
            "  cd <ort>",
            "  talk <person>",
            "Optional: cat <dokument> um den Abschluss-Text zu lesen."
          ],

          // Phase 5 — Real Life (nur Hinweise/Beispiele, keine Komplettlösungen)
          "arbeitsamt": [
            "Arbeitsamt – Einstieg",
            "Du brauchst hier meistens: Ort wechseln + mit der richtigen Person reden.",
            "Beispiele:",
            "  cd /arbeitsamt",
            "  ls",
            "  cat start.txt",
            "  talk beamter",
            "Tipp: Wenn du nicht weiterkommst, lies die quest.txt pro Firma unter /real_life/."
          ],
          "beamter": [
            "Beamter – Gespräch/Quest-Arc starten",
            "Wenn ein NPC dir Aufträge gibt, ist der nächste Schritt oft: 'geh zu Ort X' oder 'lies Datei Y'.",
            "Beispiele:",
            "  talk beamter",
            "  cd /real_life",
            "  ls",
            "Hinweis: Notier dir die Firmennamen – die sind deine 'Quest-Hubs'."
          ],
          "snackmaster": [
            "SNACKMASTER – Audit-Log prüfen",
            "Jansen weiß nur: irgendwo im Audit-Log steht der Allergene-Abschnitt – aber nicht mehr wo.",
            "Dein Ziel: finde die passende Zeile/den Marker im Log und geh damit zurück zu Jansen.",
            "Beispiele:",
            "  cd /real_life/snackmaster",
            "  ls",
            "  cat quest.txt",
            "  cat haccp_audit.log",
            "Wenn du etwas Auffälliges findest: talk jansen."
          ],
          "ars": [
            "A‑R‑S Recycling – Datei besorgen (ohne Schritt-für-Schritt)",
            "Ziel: Den Abholplan finden und in deiner Workbench ablegen, damit Frau Wiebe ihn sieht.",
            "Hinweise:",
            "  • Schau in den Firmen-Ordner und lies quest.txt.",
            "  • Wenn du Dateien 'nicht findest': erst suchen, dann lesen.",
            "Beispiele (allgemein, nicht 1:1 übernehmen):",
            "  find <bereich> -name \"<dateiname>\"",
            "  ls ~/workbench/<ordner>",
            "Wenn die Datei in deiner Workbench liegt: talk wiebe."
          ],
          "ohlendorf": [
            "Ohlendorf‑Technik – Ticket lesen (ohne Rechte-Rezept)",
            "Ziel: Ticket in deine Workbench holen und so einstellen, dass du es lesen darfst.",
            "Hinweise:",
            "  • Manche Dateien sind absichtlich 'zu' (Permissions).",
            "  • Arbeite immer in ~/workbench (nicht am Original).",
            "Beispiele (generisch):",
            "  ls -l <datei>        → Rechte ansehen",
            "  chmod <modus> <datei>→ Rechte ändern (Modus hängt vom Fall ab)",
            "Wenn du den Token gelesen hast: talk neele."
          ],
          "berndt": [
            "Möbelfabrik – Performance retten (ohne Prozessname)",
            "Ziel: Herausfinden, was die CPU frisst, und den richtigen Prozess stoppen.",
            "Hinweise:",
            "  • Erst identifizieren, dann handeln (nicht 'blind' beenden).",
            "  • Prozess-Tools zeigen dir Name + PID.",
            "Beispiele (generisch):",
            "  ps",
            "  top",
            "  kill <PID>           → nur wenn du sicher bist",
            "Danach: talk tom."
          ],
          "cms": [
            "CMS – Multi-Trade Abnahme",
            "Ziel: In ~/workbench/cms für alle Fachbereiche Dokumentation ablegen.",
            "Hinweise:",
            "  • Codes stehen NICHT bei CMS, sondern in anderen Orten.",
            "  • Struktur anlegen: mkdir ~/workbench/cms/{elektro,fliesen,dach,sanitaer,maler,abnahme}",
            "  • Dateien mit echo füllen: <bereich>/bericht.txt",
            "  • In abnahme/uebersicht.txt alle Codes sammeln.",
            "Danach: talk holger."
          ],
          "jobangebot": [
            "Jobangebot – Abschluss",
            "Nach allen Firmen-Aufträgen musst du oft zum 'Hub' zurück und den Abschluss triggern.",
            "Beispiele:",
            "  cd /arbeitsamt",
            "  talk beamter",
            "Wenn was fehlt: quests zeigt dir, welche Firma noch offen ist."
          ],
          "mentor_hub": [
            "Mentor Hub – Ankommen",
            "Du bist in der Lobby. Erst Überblick, dann Quests.",
            "Beispiele:",
            "  ls",
            "  cat quests.txt",
            "  talk noah   (oder emma / leo)",
            "Die Squad-Quests kannst du in beliebiger Reihenfolge machen."
          ],
          "report_final": [
            "Finales Zeugnis – Bonus einsammeln",
            "Für das finale Zeugnis brauchst du Bonus Points aus der versteckten Sidequest.",
            "Grobe Richtung (ohne Spoiler): Unter der Schule gibt es mehr als Lagerräume…",
            "Danach: zurück ins Sekretariat (talk harries oder talk pietsch)."
          ],
          "scriptlab": [
            "Scriptlab – Einstieg (Phase 6)",
            "Jetzt schreibst du eigene Skripte. Erst lesen, dann loslegen:",
            "  cd /scriptlab",
            "  cat README.txt",
            "  cat auftraege.txt"
          ],
          "hello_script": [
            "Hello-World-Skript",
            "Workflow: Datei anlegen → Inhalt schreiben → ausführbar machen.",
            "Beispiele:",
            "  edit ~/scripts/hello.sh        (Inhalt: echo \"Hallo SchwarmShell\")",
            "  chmod +x ~/scripts/hello.sh",
            "Die Quest zählt, sobald die Datei das echo enthält UND ausführbar ist."
          ],
          "var_script": [
            "Skript mit Variable",
            "Eine Variable setzen und mit $ wieder ausgeben:",
            "  edit ~/scripts/greet.sh",
            "  Inhalt z.B.:  NAME=\"Welt\"  und  echo \"Hi $NAME\"",
            "Trigger: Zuweisung (NAME=...) plus ein echo mit $."
          ],
          "cleanup_script": [
            "Cleanup-Skript",
            "Ein Skript, das aufräumt — mindestens zwei rm-Zeilen.",
            "  edit ~/scripts/cleanup.sh",
            "  Inhalt z.B.:  rm ~/lager/alt1.tmp  und  rm ~/lager/alt2.tmp",
            "Trigger: zwei oder mehr Zeilen, die mit \"rm \" beginnen."
          ]
        };

        // help - <questkey>
        if(args && args.length && args[0] === "-"){
          const key = (args.slice(1).join(" ") || "").trim().toLowerCase();
          if(!key){
            return { ok:true, out:
`Quest-Hilfe:
  help - tutorial
  help - keycard
  help - gate
  help - frag1 | frag2 | frag3
  help - assemble
  help - iserv
  help - find | locate | bug | fix | hotfix | chmod | boss
  help - report | report_final
  help - mentor_hub | noah | emma | leo | mentor_clear
  help - arbeitsamt | beamter
  help - snackmaster | ars | ohlendorf | berndt | cms
  help - jobangebot
  help - scriptlab | hello_script | var_script | cleanup_script

Tipp: quests zeigt dir die Quest-Keys in [eckigen Klammern].` };
          }
          const info = questHelp[key];
          if(!info){
            return { ok:false, out:`Keine Quest-Hilfe für '${key}'. Tipp: help - (ohne Key) für Liste.` };
          }
          return { ok:true, out: info.join("\n") };
        }

        const lines = [];
        lines.push(`Freigeschaltete Commands (Phase ${state.phase}):`);
        for(const c of cmds){
          lines.push(`  ${c.padEnd(12)} - ${explain[c] || ""}`.trimEnd());
        }
        lines.push("");
        lines.push("Quest-Hilfe: help - <questkey>  (z.B. help - frag3)");
        // Pipes sind aktiv (max. 2 Verkettungen, siehe runLine) — Limit steht im BEGLEITMATERIAL.
        if(state.phase===3) lines.push("Boss-Run: find → grep -n → cp → echo >> → chmod +x → ./patchlord.sh ...");
        if(state.phase===4) lines.push("Mentor-Arc: ps/top/kill · history · alias · mentor_clear");
        lines.push("");
        lines.push("Mini Manual - Zeigt dir, wie die Befehle funktionieren: man <cmd> (z.B. man grep) | clear | reset");
        return { ok:true, out: lines.join("\n") };
      }

      
      case "hint":{
        const list = OBJECTIVES.filter(o=>o.phase===state.phase);
        const next = list.find(o=>!o.done(state)) || null;
        if(!next) return { ok:true, out:"hint: In dieser Phase ist gerade nichts offen. 🎉 (quests zeigt alles)" };

        const key = objectiveKey(next);
        const msg = [
          `Tipp zur aktuellen Quest: ${next.hint}`,
          `Mehr Hilfe: help - ${key}`
        ].join("\n");
        return { ok:true, out: msg };
      }

case "man":{
        const target = (args[0]||"").toLowerCase().trim();
        if(!target){
          return { ok:false, out:"man: usage: man <cmd>" };
        }
        const meta = COMMAND_REGISTRY[target];
        if(!meta){
          return { ok:false, out:`man: Keine Doku für '${target}' gefunden.` };
        }

        let out = `${target.toUpperCase()} — ${meta.desc}

`;
        out += `Kategorie: ${meta.group}

`;
        if(meta.usage){
          out += `Syntax:
  ${meta.usage}

`;
        }
        if(meta.example){
          out += `Beispiel:
  ${meta.example}

`;
        }

        // Ausführliche Doku (Beschreibung + Namensherkunft)
        const manual = MANUALS[target];
        if(manual){
          out += "DETAILS:\n" + manual + "\n";
        }

        // Mini-Hinweise je nach Command
        if(target==="cd"){
          out += `Pro-Tipp:
  cd ..  = ein Ordner hoch  •  cd /  = zur Wurzel
`;
        }
        if(target==="grep"){
          out += `Pro-Tipp:
  Mit -n bekommst du Zeilennummern: grep -n "PATTERN" file
`;
        }
        if(target==="find"){
          out += `Pro-Tipp:
  Muster in Anführungszeichen: find / -name "*.log"
`;
        }
        if(target==="chmod"){
          out += `Pro-Tipp:
  Für Scripts: chmod +x file  und dann: ./file
`;
        }
        if(["ssh","scp","logwipe","netmap","ping","connect"].includes(target)){
          out += `Hinweis:
  Diese Tools sind Teil der Netzwerk-/Winkelmann-Sidequest.
  Einstieg: im Keller talk winkelmann → choose 3
`;
        }
        if(target==="talk"){
          out += `Hinweis:
  Du kannst NPCs meist auch mit Nachnamen ansprechen (z.B. talk remmers).
`;
        }

        return { ok:true, out };
      }


      case "pwd": return { ok:true, out: state.cwd };

      case "ls":{
        let long = false;
        let targetArg = null;
        if(args[0] === "-l"){
          long = true;
          targetArg = args[1] || null;
        }else{
          targetArg = args[0] || null;
        }
        const target = targetArg ? normPath(targetArg) : state.cwd;
        const children = listDir(target);
        if(!children) return { ok:false, out:`ls: cannot access '${targetArg||target}': No such directory` };
        if(!long){
          const out = children.map(name=>{
            const p = (target==="/" ? "" : target) + "/" + name;
            const n = getNode(p);
            return n?.type==="dir" ? name + "/" : name;
          }).join("  ");
          return { ok:true, out, pipeable:true };
        }
        const lines = [];
        for(const name of children){
          const p = (target==="/" ? "" : target) + "/" + name;
          const n = getNode(p);
          if(n?.type === "dir"){
            lines.push(`drwxr-xr-x  ${name}/`);
          }else{
            const perm = ensurePerm(p);
            const exec = perm.exec ? "x" : "-";
            lines.push(`-rw-r--r-${exec}  ${name}`);
          }
        }
        return { ok:true, out: lines.join("\n"), pipeable:true };
      }

      case "cd":{
        const targetArg = args[0] || "~";
        const target = normPath(targetArg);
        // Story-Gate: Arbeitsamt / Real-Life erst nach finalem Zeugnis sichtbar.
        const gateUnlocked = !!(state.flags && state.flags.job_arc_unlocked);
        if(!gateUnlocked && (target === "/arbeitsamt" || target.startsWith("/real_life"))){
          return { ok:false, out:`cd: no such file or directory: ${targetArg}` };
        }
        const node = getNode(target);
        if(!node || node.type!=="dir") return { ok:false, out:`cd: no such file or directory: ${targetArg}` };
        state.cwd = target;

        // Phase 5 startet erst beim Betreten des Arbeitsamts.
        if(target === "/arbeitsamt" && state.flags && state.flags.job_arc_unlocked && state.phase < 5){
          state.phase = 5;
          state.flags.job_arc_started = true;
          if(state.sidequest){
            state.sidequest.unlocked = false;
            state.sidequest.found_lab = false;
          }
          if(!state.jobArc) state.jobArc = { active:false, stage:0, quests:{ snackmaster:false, ars:false, ohlendorf:false, berndt:false, cms:false }, startedAt:null };
          state.jobArc.stage = Math.max(0, state.jobArc.stage||0);
          row("📎 Neuer Story-Arc unlocked: Phase 5 — Real Life.", "ok");
          row("Tipp: cat /arbeitsamt/start.txt  und dann talk beamter", "p");
        }

        // Phase 6: scriptlab_entered Trigger beim Betreten des Scriptlabs.
        if(target === "/scriptlab" && state.phase >= 6){
          if(state.flags && !state.flags.scriptlab_entered){
            state.flags.scriptlab_entered = true;
            row("Tipp: lies cat README.txt und cat auftraege.txt — dann edit ~/scripts/hello.sh", "p");
          }
        }

        // Quest-Spawn: Möbelfabrik hat einen neuen Lag-Prozess, sobald die Quest aktiv ist.
        try{
          if(target === "/real_life/berndt_moebel" && state.phase >= 5){
            state.processes = state.processes || [];
            const has = state.processes.some(p => p && p.name === "cnc_sim");
            if(!has){
              state.processes.push({ pid: 909, name: "cnc_sim", cpu: 96, mem: 256 });
            }
          }
        }catch(e){ console.warn("[SchwarmShell] Quest-Trigger fehlgeschlagen:", e); }
        saveState();
        promptEl.textContent = promptText();
        renderLocation();
        renderPhasePill();
        try{ renderHeaderSub(); }catch(e){}
        renderObjectives();
        renderRewards();
        renderSidequestPanel();
        return { ok:true, out:"" };
      }

      case "cat":{
        if(!args[0]) return { ok:false, out:"cat: missing file operand" };
        const path = normPath(args[0]);
        const rf = readFileChecked(path);
        if(!rf.ok){
          const msg = (rf.err === "Permission denied") ? `cat: ${args[0]}: Permission denied` : `cat: ${args[0]}: No such file`;
          return { ok:false, out: msg };
        }
        let content = rf.content;

        if(path.endsWith("/readme.txt")) state.flags.introSeen = true;
        if(path.endsWith("/keycard.txt")){
          if(!state.flags.got_key){
            state.flags.got_key = true;
            award("badge_keycard");
            row("KEYCARD gelootet ✅", "ok");
          }
        }
        if(path === "/school/pcraum/Schul-PC/iserv-glitch.txt"){
          if(!state.flags.iserv_glitch){
            state.flags.iserv_glitch = true;
            row("iServ-Glitch untersucht ✅", "ok");
          }
        }
        if(path === "/home/player/workbench/patches/frag2.txt"){
          content = `FRAG2=CRAFTED-DIR-99\n(du hast das gebaut. legit W.)\n`;
          FS[path].content = content;
          if(!state.flags.frag2){
            state.flags.frag2 = true;
            state.fragments.f2 = "CRAFTED-DIR-99";
            award("badge_builder");
          }
        }

        // Phase 5 — Ohlendorf: Ticket gelesen
        try{
          if(state.phase >= 5 && (path === "/home/player/workbench/ohlendorf/ticket_net.txt" || path === "/home/player/workbench/ticket_net.txt")){
            if(String(content||"").includes("JOB_OHLENDORF_OK")){
              state.jobArc = state.jobArc || { active:true, stage:0, quests:{ snackmaster:false, ars:false, ohlendorf:false, berndt:false, cms:false } };
              state.jobArc.active = true;
              state.jobArc.quests = state.jobArc.quests || {};
              state.jobArc.quests.ohlendorf = true;
            }
          }
        }catch(e){ console.warn("[SchwarmShell] Quest-Trigger fehlgeschlagen:", e); }
        saveState();
        renderObjectives();
        progressPhaseIfReady();
        return { ok:true, out: content, pipeable:true };
      }

      case "echo":{
        return { ok:true, out: args.join(" "), pipeable:true };
      }

      case "clear":{
        term.innerHTML="";
        try{ if(window.clearRowTracking) window.clearRowTracking(); }catch(e){}
        return { ok:true, out:"" };
      }

      case "talk": return cmdTalk(args);

      case "quests":{
        const keyFor = (title)=>{
          const t = title.toLowerCase();
          if(t.includes("tutorial")) return "tutorial";
          if(t.includes("keycard")) return "keycard";
          if(t.includes("server-gate")) return "gate";
          if(t.includes("fragment #1")) return "frag1";
          if(t.includes("fragment #2")) return "frag2";
          if(t.includes("fragment #3")) return "frag3";
          if(t.includes("reality")) return "assemble";
          if(t.includes("patchlord finden") || (t.includes("finden") && t.includes("patchlord"))) return "find";
          if(t.includes("bug")) return "bug";
          if(t.includes("script fixen") || t.includes("fixen")) return "fix";
          if(t.includes("ausführbar")) return "chmod";
          if(t.includes("bossfight")) return "boss";
          if(t.includes("noah")) return "noah";
          if(t.includes("emma")) return "emma";
          if(t.includes("leo")) return "leo";
          if(t.includes("mentor-run") || t.includes("squad geholfen")) return "mentor_clear";

if(t.includes("iserv-glitch")) return "iserv";
if(t.includes("patchlord lokalisieren")) return "locate";
if(t.includes("hotfix vorbereiten")) return "hotfix";
if(t.includes("zeugnis abholen")) return "report";
          return "quest";
        };

        const open = OBJECTIVES
          .filter(o=>o.phase===state.phase && !o.done(state))
          .map(o=>{
            const k = (o.key || keyFor(o.title) || "quest");
            return `- [${k}] ${o.title} → ${o.hint}`;
          })
          .join("\n");

// Globale Story-Reminders (auch wenn Phase gewechselt wurde)
let extra = "";
if(state.flags && state.flags.system_fixed && !state.flags.report_given){
  extra += `- [zeugnis] Zeugnis abholen → Geh ins Sekretariat: talk harries / talk pietsch\n`;
} else if(state.flags && state.flags.report_given && !state.flags.report_final){
  extra += `- [zeugnis+] Finales Zeugnis verdienen → Phase 4 + Bonus Points (Sidequest)\n`;
}
const outText = (extra + open).trim();
        return { ok:true, out: outText || "Alle aktuellen Quests erledigt. 😌" };

      }

      case "inventory":{
        const fr = state.fragments;
        const inv = state.inventory.length ? state.inventory.join(", ") : "(leer)";
        const lines = [
          `Inventar: ${inv}`,
          `Fragmente: FRAG1=${fr.f1||"—"}  FRAG2=${fr.f2||"—"}  FRAG3=${fr.f3||"—"}`
        ];
        if(state.sidequest && state.sidequest.unlocked){
          lines.push("");
          lines.push("SIDEQUEST (Winkelmann):");
          const p = state.sidequest.parts||{};
          lines.push(`  Teile: Linse=${p.lens?"✅":"❌"}  Spule=${p.coil?"✅":"❌"}  USV=${p.ups?"✅":"❌"}`);
          const n = state.sidequest.net||{};
          lines.push(`  Daten: Blueprint=${n.blueprint?"✅":"❌"}  ShieldKey=${n.shield?"✅":"❌"}`);
          const t = state.sidequest.traces||{};
          lines.push(`  Spuren: gym=${t.gym?"🔴":"🟢"}  igs=${t.igs?"🔴":"🟢"}`);
          if(state.sidequest.badge) lines.push("  Badge: Physica potestas est ✅");
        }
        return { ok:true, out: lines.join("\n") };
      }

      case "unlock":{
        if(state.phase !== 1) return { ok:false, out:"unlock ist nur Phase 1." };
        const key = args.join(" ").trim();
        const atGate = locationPath() === "/server_gate";
        if(!atGate) return { ok:false, out:"Du bist nicht am Server-Gate. cd /server_gate" };
        if(key === "SCHWARM-ALPHA-7"){
          if(!state.flags.got_key) return { ok:false, out:"ACCESS DENIED: KEYCARD fehlt." };
          row("ACCESS GRANTED. Tür geht auf…", "ok");
          state.flags.opened_gate = true;
          saveState();
          renderObjectives();
          progressPhaseIfReady();
          return { ok:true, out:"" };
        }
        return { ok:false, out:"ACCESS DENIED: falscher Key." };
      }

      case "grep":{
        if(state.phase < 2) return { ok:false, out:"grep ist ab Phase 2 freigeschaltet." };
        const g = parseGrep(args);
        if(g.err) return { ok:false, out:g.err };
        let sourceText = "";
        if(stdin !== null){
          sourceText = String(stdin);
        }else{
          if(!g.file) return { ok:false, out:"grep: missing file operand" };
          const path = normPath(g.file);
          const rf = readFileChecked(path);
          if(!rf.ok){
            const msg = (rf.err === "Permission denied") ? `grep: ${g.file}: Permission denied` : `grep: ${g.file}: No such file`;
            return { ok:false, out: msg };
          }
          sourceText = rf.content;
        }
        const pat = stripQuotes(g.pattern);
        const matches = grepLines(sourceText, pat, {n:g.n, i:g.i});
        const out = matches.join("\n");
        grepTrigger(pat, out || "");
        return { ok:true, out: out || "", pipeable:true };
      }

      case "mkdir":{
        if(state.phase < 2) return { ok:false, out:"mkdir ist ab Phase 2." };
        if(!args[0]) return { ok:false, out:"mkdir: missing operand" };
        const path = normPath(args[0]);
        const r = mkdir(path);
        if(!r.ok) return { ok:false, out:`mkdir: ${r.err}` };
        return { ok:true, out:"" };
      }

      case "touch":{
        if(state.phase < 2) return { ok:false, out:"touch ist ab Phase 2." };
        if(!args[0]) return { ok:false, out:"touch: missing file operand" };
        const path = normPath(args[0]);
        const ex = getNode(path);
        if(ex && ex.type==="file") return { ok:true, out:"" };
        const w = writeFile(path, "", false);
        if(!w.ok) return { ok:false, out:`touch: ${w.err}` };
        row("Tip: Wenn es um Frag2 geht: cat ~/workbench/patches/frag2.txt", "p");
        return { ok:true, out:"" };
      }

      case "edit":{
        // Phase 6 — eigenes Skript schreiben. Öffnet den Editor-Modal in main.js
        // mit dem aktuellen Inhalt der Datei. Speichern triggert evaluateScriptQuests().
        if(state.phase < 6) return { ok:false, out:"edit ist ab Phase 6 verfügbar (nach Abschluss des Job-Arcs)." };
        if(!args[0]) return { ok:false, out:"edit: usage: edit <file>" };
        const path = normPath(args[0]);
        if(!path.startsWith("/home/player/")) return { ok:false, out:"edit: nur unter ~/... erlaubt." };
        const existing = getNode(path);
        const initial = (existing && existing.type === "file") ? String(existing.content||"") : "";
        if(typeof window.openScriptEditor === "function"){
          window.openScriptEditor(path, initial);
          return { ok:true, out:`(Editor geöffnet: ${path})` };
        }
        return { ok:false, out:"edit: Editor nicht verfügbar (UI nicht geladen)." };
      }

      case "rm":{
        if(state.phase < 2) return { ok:false, out:"rm ist ab Phase 2." };
        if(!args[0]) return { ok:false, out:"rm: missing operand" };
        const path = normPath(args[0]);
        const r = rm(path);
        if(!r.ok) return { ok:false, out:`rm: ${r.err}` };
        return { ok:true, out:"" };
      }

      case "cp":{
        if(state.phase < 2) return { ok:false, out:"cp ist ab Phase 2." };
        if(args.length<2) return { ok:false, out:"cp: missing operand" };
        const r = cp(args[0], args[1]);
        if(!r.ok) return { ok:false, out:`cp: ${r.err}` };

        // Phase 5 — Job Quests triggers
        try{
          const src = normPath(args[0]);
          let dst = normPath(args[1]);
          // Keep triggers in sync with fs.cp(): if destination is a directory,
          // the effective target becomes <dir>/<basename(src)>
          const dn = getNode(dst);
          if(dn && dn.type==="dir") dst = dst.replace(/\/$/,"") + "/" + src.split("/").pop();

          // A-R-S: Plan in Workbench kopieren
          if(state.phase >= 5 && src === "/real_life/ars_recycling/docs/abholplan_2026.csv" && (dst === "/home/player/workbench/abholplan_2026.csv" || dst.startsWith("/home/player/workbench/ars/") || dst === "/home/player/workbench/ars/abholplan_2026.csv")){
            state.jobArc = state.jobArc || { active:true, stage:0, quests:{ snackmaster:false, ars:false, ohlendorf:false, berndt:false, cms:false } };
            state.jobArc.active = true;
            state.jobArc.quests = state.jobArc.quests || {};
            state.jobArc.quests.ars = true;
          }

          // Ohlendorf: Ticket ins Home kopieren, dann erstmal ohne Leserechte (chmod-Quest)
          // Akzeptiere sowohl ~/workbench/ohlendorf/ als auch direkt ~/workbench/
          if(state.phase >= 5 && src === "/real_life/ohlendorf_technik/ticket_net.txt" && (dst === "/home/player/workbench/ohlendorf/ticket_net.txt" || dst === "/home/player/workbench/ticket_net.txt")){
            const p = ensurePerm(dst);
            // Ohne owner-read darf cat nicht lesen -> Spieler*in MUSS chmod nutzen.
            p.mode = "000";
            p.exec = false;
            state.perms[dst] = p;
          }
        }catch(e){}
        saveState();
        renderObjectives();
        return { ok:true, out:"" };
      }

      case "mv":{
        if(state.phase < 2) return { ok:false, out:"mv ist ab Phase 2." };
        if(args.length<2) return { ok:false, out:"mv: missing operand" };
        const r = mv(args[0], args[1]);
        if(!r.ok) return { ok:false, out:`mv: ${r.err}` };
        return { ok:true, out:"" };
      }

      case "assemble":{
        if(state.phase < 2) return { ok:false, out:"assemble ist ab Phase 2." };
        if(!(state.flags.frag1 && state.flags.frag2 && state.flags.frag3)){
          return { ok:false, out:"assemble: Dir fehlen Fragmente. (quests / inventory)" };
        }
        if(!state.flags.reality_patch){
          state.flags.reality_patch = true;
          saveState();
          renderObjectives();
          award("badge_patch");
          row("REALITY‑PATCH BUILT ✅", "ok");
          row("Neon-HUD flackert… aber ein Rest-Update lebt noch…", "warn");
        }
        progressPhaseIfReady();
        return { ok:true, out:"" };
      }

      case "find":{
        if(state.phase < 3) return { ok:false, out:"find ist ab Phase 3." };
        const f = parseFind(args);
        if(f.err) return { ok:false, out:f.err };
        const r = findPaths(f.start, f.pattern);
        if(!r.ok) return { ok:false, out:`find: ${r.err}` };
        const out = r.out.join("\n");
        if(out.includes("/boss/patchlord.sh")) state.flags.found_boss = true;
        saveState();
        renderObjectives();
        return { ok:true, out, pipeable:true };
      }

      case "chmod":{
        if(state.phase < 3) return { ok:false, out:"chmod ist ab Phase 3." };
        if(args.length < 2) return { ok:false, out:"chmod: usage: chmod +x <file> OR chmod 644 <file>" };
        const mode = args[0];
        const path = normPath(args[1]);
        const node = getNode(path);
        if(!node || node.type!=="file") return { ok:false, out:"chmod: file not found" };
        if(!writable(path)) return { ok:false, out:"chmod: Permission denied (nur unter ~)" };
        const p = ensurePerm(path);

        if(mode === "+x"){
          p.exec = true;
          p.mode = "755";
          // Phase-3-Quest "Script ausführbar machen" soll nur zählen,
          // wenn exakt die Workbench-Kopie von patchlord.sh ausführbar gesetzt wird.
          if(path === "/home/player/workbench/patchlord.sh"){
            state.flags.exec_script = true;
          }
          award("badge_chmod");
        } else if(mode.match(/^\d{3}$/)){
          p.mode = mode;
          // exec-Bit ist im Owner-Oktett (erste Ziffer): 1=x, 3=wx, 5=rx, 7=rwx.
          // Vorher wurde fälschlich nur die letzte Ziffer (others) geprüft — chmod 700
          // hätte exec=false gesetzt, obwohl der Owner ausführen darf.
          const ownerOct = parseInt(mode[0], 10);
          p.exec = Number.isFinite(ownerOct) ? ((ownerOct & 1) === 1) : false;
        } else {
          return { ok:false, out:"chmod: unsupported mode" };
        }
        state.perms[path] = p;
        saveState();
        renderObjectives();
        return { ok:true, out:"" };
      }

      case "bash":{
        if(state.phase < 3) return { ok:false, out:"bash ist ab Phase 3." };
        if(!args[0]) return { ok:false, out:"bash: missing file operand" };
        const file = args[0];
        const argv = args.slice(1);
        const p = normPath(file);
        return runScript(p, argv);
      }

      
      case "history":{
        const out = state.lastCmds
          .slice()
          .reverse()
          .map((c,i)=>`${i+1}  ${c}`)
          .join("\n");
        if(state.phase>=4) state.mentor.history_checked = true;
        saveState();
        renderObjectives();
        return { ok:true, out: out || "(no history yet)" };
      }

      case "alias":{
        if(state.phase < 4) return { ok:false, out:"alias ist ab Phase 4." };
        if(!args.length){
          const keys = Object.keys(state.aliases||{});
          const out = keys.length ? keys.map(k=>`alias ${k}="${state.aliases[k]}"`).join("\n") : "(no aliases)";
          maybeAppendRumor();
          saveState();
          return { ok:true, out };
        }
        // alias NAME="value"
        const joined = args.join(" ");
        const m = joined.match(/^([A-Za-z0-9_-]+)=(.+)$/);
        if(!m) return { ok:false, out:'alias: usage: alias name="command"' };
        const name = m[1];
        let val = m[2].trim();
        if((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1,-1);
        state.aliases = state.aliases || {};
        state.aliases[name] = val;
        if(name==="ll" && val==="ls -l"){
          state.mentor.alias_made = true;
          award("badge_alias");
        }
        saveState();
        renderObjectives();
        return { ok:true, out:`alias set: ${name}="${val}"` };
      }

      case "ps":{
        if(state.phase < 4) return { ok:false, out:"ps ist ab Phase 4." };
        const procs = (state.processes||[]).map(p=>`${String(p.pid).padStart(3,'0')}\t${p.name}`);
        return { ok:true, out: "PID\tCMD\n" + procs.join("\n") };
      }

      case "top":{
        if(state.phase < 4) return { ok:false, out:"top ist ab Phase 4." };
        const procs = (state.processes||[]).slice().sort((a,b)=>b.cpu-a.cpu);
        const lines = ["PID  CPU%  MEMMB  CMD"];
        for(const p of procs){
          lines.push(`${String(p.pid).padStart(3,'0').padEnd(4)} ${String(p.cpu).padEnd(5)} ${String(p.mem).padEnd(6)} ${p.name}`);
        }
        return { ok:true, out: lines.join("\n") };
      }

      case "kill":{
        if(state.phase < 4) return { ok:false, out:"kill ist ab Phase 4." };
        if(!args[0]) return { ok:false, out:"kill: usage: kill <PID>" };
        const raw = String(args[0]).trim();
        // Akzeptiere optionales Signal-Argument (kill -9 <pid>, kill -15 <pid>) — auch wenn
        // wir Signale (noch) nicht differenziert behandeln. So lernt der Spieler die echte
        // Bash-Syntax kennen, ohne abgewiesen zu werden.
        const pidStr = raw.startsWith("-") ? String(args[1]||"").trim() : raw;
        if(!/^\d+$/.test(pidStr)) return { ok:false, out:"kill: usage: kill [-9|-15] <PID>" };
        const pid = parseInt(pidStr, 10);
        if(!Number.isFinite(pid) || pid <= 0) return { ok:false, out:"kill: usage: kill [-9|-15] <PID>" };
        const idx = (state.processes||[]).findIndex(p=>p.pid===pid);
        if(idx===-1) return { ok:false, out:`kill: (${pid}) - No such process` };
        const proc = state.processes[idx];
        state.processes.splice(idx,1);
        saveState();
        if(proc.name==="rgbd" && !state.mentor.lag_fixed){
          state.mentor.lag_fixed = true;
          state.mentor.students_helped = Math.max(state.mentor.students_helped, 1);
          award("badge_sysadmin");
          // update scoreboard file
          const scorePath = "/mentor_hub/arena2/score.txt";
          if(FS[scorePath]){
            FS[scorePath].content = FS[scorePath].content.replace("geholfene Leute: 0/3", "geholfene Leute: 1/3");
          }
        }

        // Mentor-Finale: "quest_aktiv" (PID 067) beenden -> mentor_clear abgeschlossen
        if(proc.name === "quest_aktiv"){
          state.mentor = state.mentor || {};
          state.mentor.clear_done = true;
          saveState();
          award("badge_mentor");
          row("🎉 Mentor-Run clear! Du hast 3/3 geholfen — und jetzt ist wirklich alles still.", "ok");
          row("Du hast jetzt: Game Sense + Bash. Das ist einfach unfair stark. 😌", "p");
        }

        // Phase 5 — Job Quest: Berndt (cnc_sim)
        if(state.phase >= 5 && proc.name === "cnc_sim"){
          state.jobArc = state.jobArc || { active:true, stage:0, quests:{ snackmaster:false, ars:false, ohlendorf:false, berndt:false, cms:false } };
          state.jobArc.active = true;
          state.jobArc.quests = state.jobArc.quests || {};
          state.jobArc.quests.berndt = true;
          row("✅ Produktion wieder smooth. cnc_sim ist weg.", "ok");
        }
        renderObjectives();
        return { ok:true, out:`killed ${pid} (${proc.name})` };
      }

      case "mentor_clear":{
        if(state.phase < 4) return { ok:false, out:"mentor_clear ist ab Phase 4." };
        if(state.mentor.students_helped < 3){
          return { ok:false, out:"Noch nicht. Hilf erst Noah, Emma, Leo (3/3)." };
        }
        if(state.mentor && state.mentor.clear_done){
          return { ok:true, out:"MENTOR MODE CLEARED" };
        }
        ensureQuestAktivProcess();
        return { ok:false, out:"Da läuft noch was… check ps/top und kill den letzten Prozess." };
      }

case "reset":{
        return { ok:true, out:"__RESET__" };
      }

      
      case "choose": return cmdChoose(args);

      case "connect":{
        if(!state.sidequest || !state.sidequest.unlocked) return { ok:false, out:"connect: erst Winkelmann finden." };
        const target = (args[0]||"").trim().toLowerCase();
        if(target !== "superpc") return { ok:false, out:"Usage: connect superpc" };
        if(state.cwd !== "/school/keller/winkelmann_lab") return { ok:false, out:"connect: Du musst im Winkelmann-Lab sein. (cd /school/keller/winkelmann_lab)" };
        if(state.superpc && state.superpc.active) return { ok:false, out:"connect: SUPER-PC läuft schon. (exit)" };
        state.superpc = { active:true, returnCwd: state.cwd };
        state.cwd = "/superpc";
        saveState();
        return { ok:true, out:`[SUPER-PC] Verbindung steht. Lüfter: ON. Formeln: ON.
MODE: SUPER-PC
Tools: netmap · ping · ssh · scp · logwipe · exit
Tipp: ping gym-ost-core` };
      }

      case "netmap":{
        if(!state.sidequest || !state.sidequest.unlocked) return { ok:false, out:"netmap: erst Winkelmann finden." };
        if(!state.superpc || !state.superpc.active) return { ok:false, out:"netmap: erst connect superpc." };
        const t = state.sidequest.traces||{};
        const lines = [];
        lines.push("SUPER-PC // Netzwerkübersicht");
        lines.push("");
        lines.push(`- gym-ost-core   (Blueprint)   Trace: ${(state.sidequest.traceMeter&&state.sidequest.traceMeter.gym)||0}% ${t.gym?"🔴":"🟢"}   -> ping/ssh gym-ost-core`);
        lines.push(`- igs-edu-lab    (ShieldKey)   Trace: ${(state.sidequest.traceMeter&&state.sidequest.traceMeter.igs)||0}% ${t.igs?"🔴":"🟢"}   -> ping/ssh igs-edu-lab`);
        lines.push("");
        lines.push("Tipp: cd /superpc/net  (Details)   |  exit (Modus verlassen)");
        return { ok:true, out: lines.join("\n") };
      }

      case "ping":{
        if(!state.sidequest || !state.sidequest.unlocked) return { ok:false, out:"ping: erst Winkelmann finden." };
        if(!state.superpc || !state.superpc.active) return { ok:false, out:"ping: erst connect superpc im Keller-Lab." };
        const host = (args[0]||"").trim();
        if(!host) return { ok:false, out:"Usage: ping <host>" };
        const known = ["gym-ost-core","igs-edu-lab"];
        if(!known.includes(host)) return { ok:false, out:`ping: unknown host '${host}'` };
        const rtt1 = (Math.random()*12+7).toFixed(1);
        const rtt2 = (Math.random()*12+7).toFixed(1);
        bumpTrace((host==="gym-ost-core")?"gym":"igs", 3);
        return { ok:true, out:`PING ${host} ...
64 bytes from ${host}: icmp_seq=1 time=${rtt1} ms
64 bytes from ${host}: icmp_seq=2 time=${rtt2} ms

Tipp: ssh ${host}` };
      }

      case "ssh":{
        if(!state.sidequest || !state.sidequest.unlocked) return { ok:false, out:"ssh: (Sidequest) erst Winkelmann finden." };
        const host = (args[0]||"").trim();
        if(!host) return { ok:false, out:"Usage: ssh <host>" };
        const known = ["gym-ost-core","igs-edu-lab"];
        if(!known.includes(host)) return { ok:false, out:`ssh: unknown host '${host}'` };
        if(state.netSession && state.netSession.active) return { ok:false, out:`ssh: already connected to ${state.netSession.host}. (exit)` };
        state.netSession = { active:true, host, returnCwd: state.cwd };
        state.cwd = `/net/${host}/home/${host==="gym-ost-core"?"guest":"student"}`;
        
        // Spuren werden "heiß", sobald du dich einloggst (Hacknet-Style)
        if(host==="gym-ost-core"){ state.sidequest.traces.gym = true; bumpTrace("gym", 10); }
        if(host==="igs-edu-lab"){ state.sidequest.traces.igs = true; bumpTrace("igs", 10); }

saveState();
        return { ok:true, out:`[ssh] connected to ${host}
Du bist im Remote-Home. Tipp: ls · cat hint.txt/memo.txt
Wichtig: Nach dem Kopieren → logwipe, sonst bleiben Spuren.` };
      }

      case "exit":{
        if(state.netSession && state.netSession.active){
          const host = state.netSession.host;
          state.cwd = state.netSession.returnCwd || "/school/keller/winkelmann_lab";
          state.netSession = { active:false, host:"", returnCwd:"" };
          saveState();
          return { ok:true, out:`[ssh] disconnected from ${host}` };
        }
        if(state.superpc && state.superpc.active){
          const back = state.superpc.returnCwd || "/school/keller/winkelmann_lab";
          state.superpc = { active:false, returnCwd:"" };
          state.cwd = back;
          saveState();
          return { ok:true, out:"[SUPER-PC] Verbindung getrennt. MODE: NORMAL." };
        }
        return { ok:true, out:"exit: nothing to exit." };
      }

      case "scp":{
        try{
          if(!state.sidequest || !state.sidequest.unlocked) return { ok:false, out:"scp: (Sidequest) erst Winkelmann finden." };
          if(!state.superpc || !state.superpc.active) return { ok:false, out:"scp: erst connect superpc." };
          if(!state.netSession || !state.netSession.active) return { ok:false, out:"scp: not connected. (ssh <host>)" };

          let src = (args[0]||"").trim();
          let dst = (args[1]||"").trim();
          if(!src || !dst) return { ok:false, out:"Usage: scp <remote_file> <local_path>" };
          if(!dst.startsWith("~/")) return { ok:false, out:"scp: Ziel muss unter ~/ liegen (z.B. ~/workbench/blueprint.dat)" };

          const srcBase = src.split("/").filter(Boolean).pop() || "file.dat";

          const host = state.netSession.host;

          // Remote-Datei: normPath nutzt state.cwd (in SSH bist du in /net/<host>/...)
          const remotePath = normPath(src);
          const nodeRoot = `/net/${host}`;
          if(!remotePath.startsWith(nodeRoot)) return { ok:false, out:"scp: invalid remote path" };

          const rf = FS[remotePath];
          if(!rf || rf.type!=="file") return { ok:false, out:`scp: remote file not found (${src})` };

          // Local Zielpfad (nur unter /home/player)
          let dstAbs = dst.replace(/^~\//, "/home/player/");

          // Wie bei cp: Wenn das Ziel ein existierender Ordner ist, Datei darin ablegen.
          // Dadurch wird z.B. "scp blueprint.dat ~/workbench" robust behandelt.
          const dstNode = FS[dstAbs];
          if((dstNode && dstNode.type==="dir") || dst.endsWith("/")){
            const clean = dstAbs.replace(/\/$/, "");
            dstAbs = `${clean}/${srcBase}`;
            dst = dst.endsWith("/") ? dst + srcBase : `${dst}/${srcBase}`;
          }

          const parent = dstAbs.split("/").slice(0,-1).join("/") || "/";
          const parentEntry = FS[parent];
          if(!parentEntry || parentEntry.type!=="dir") return { ok:false, out:`scp: local parent dir missing (${parent})` };

          if(FS[dstAbs] && FS[dstAbs].type === "dir"){
            return { ok:false, out:`scp: cannot overwrite directory (${dst})` };
          }

          FS[dstAbs] = { type:"file", content: rf.content };
          const leaf = dstAbs.split("/").pop();
          if(leaf && !parentEntry.children.includes(leaf)) parentEntry.children.push(leaf);

          const inWorkbench = dstAbs.startsWith("/home/player/workbench/");
          const extra = inWorkbench
            ? "[OK] Artefakt gesichert in ~/workbench/\n"
            : "[WARN] Datei kopiert, aber als Artefakt zählt sie erst in ~/workbench/\n";

          // Quest-Zählung: nur wenn in Workbench gelandet
          const srcLower = src.toLowerCase();
          if(inWorkbench && host==="gym-ost-core" && srcLower.endsWith("blueprint.dat")) state.sidequest.net.blueprint = true;
          if(inWorkbench && host==="igs-edu-lab" && srcLower.endsWith("shield.key")) state.sidequest.net.shield = true;

          // Kopieren erhöht Trace deutlich + macht Logs "heiß"
          if(host==="gym-ost-core"){ bumpTrace("gym", 15); state.sidequest.traces.gym = true; }
          if(host==="igs-edu-lab"){ bumpTrace("igs", 15); state.sidequest.traces.igs = true; }

          saveState();
          renderRewards();

          return { ok:true, out: extra + `scp: copied ${src} -> ${dst}\nJetzt: logwipe (Spuren weg) · exit` };
        }catch(e){
          return { ok:false, out:`scp: error (${e && e.message ? e.message : "unknown"})` };
        }
      }

      case "logwipe":{
        if(!state.sidequest || !state.sidequest.unlocked) return { ok:false, out:"logwipe: erst Winkelmann finden." };
        if(!state.superpc || !state.superpc.active) return { ok:false, out:"logwipe: erst connect superpc." };
        if(!state.sidequest.traceMeter) state.sidequest.traceMeter = { gym:0, igs:0 };
    if(!state.sidequest.alarm) state.sidequest.alarm = { gym:false, igs:false };
    if(!state.sidequest.winkMenu) state.sidequest.winkMenu = "main";

        // Wenn du gerade in einer ssh-Session bist: nur diesen Host säubern.
        if(state.netSession && state.netSession.active){
          const host = state.netSession.host;
          if(host==="gym-ost-core"){
            state.sidequest.traces.gym = false;
            state.sidequest.traceMeter.gym = 0;
          }
          if(host==="igs-edu-lab"){
            state.sidequest.traces.igs = false;
            state.sidequest.traceMeter.igs = 0;
          }
          saveState();
          renderRewards();
          return { ok:true, out:`logwipe: ${host} logs cleaned (🟢)` };
        }

        // Im SUPER-PC ohne SSH: alles kalt schalten (Notfall)
        state.sidequest.traces.gym = false;
        state.sidequest.traces.igs = false;
        state.sidequest.traceMeter.gym = 0;
        state.sidequest.traceMeter.igs = 0;
        saveState();
        renderRewards();
        return { ok:true, out:"logwipe: global clean (🟢). Tipp: ssh <host> → logwipe (host-spezifisch)" };
      }

      default:
        return { ok:false, out:unknownCommandMessage(c) };
    }
  }

  function runLine(line){
    let trimmed = String(line||"").trim();
    if(!trimmed) return;

    let guidedBlockMessage = "";
    try{
      if(window.getGuidedTutorialBlockMessage){
        guidedBlockMessage = window.getGuidedTutorialBlockMessage(trimmed) || "";
      }
    }catch(e){}
    if(guidedBlockMessage){
      state.lastCmds.unshift(trimmed);
      state.lastCmds = state.lastCmds.slice(0, 120);
      state.historyIndex = 0;
      saveState();
      row(`${promptText()} ${trimmed}`, "p", "input");
      row(guidedBlockMessage, "warn");
      return;
    }

    if(trimmed === "1337"){
      applyCheat1337();
      return;
    }

    // alias expand (only first token)
    const firstTok = trimmed.split(/\s+/)[0];
    if(state.aliases && state.aliases[firstTok]){
      const rest = trimmed.slice(firstTok.length).trim();
      trimmed = (state.aliases[firstTok] + (rest ? " " + rest : "")).trim();
    }



    state.lastCmds.unshift(trimmed);
    state.lastCmds = state.lastCmds.slice(0, 120);
    state.historyIndex = 0;
    saveState();

    row(`${promptText()} ${trimmed}`, "p", "input");
    // Replay-Mitschnitt: jede Eingabe wird festgehalten. Hardcore-Schüler können das
    // später per Settings deaktivieren / leeren.
    try{ if(window.appendReplay) window.appendReplay("input", trimmed); }catch(_e){}

    // Konzept-Karten-Trigger (einmaliges Mini-Tutorial, nur beim ERSTEN Auftreten und
    // nur wenn der Befehl in der aktuellen Phase überhaupt freigeschaltet ist —
    // sonst würden Spieler*innen die Erklärung sehen, bevor sie sie nutzen dürfen).
    try{
      if(window.showConceptCard){
        const firstTok = trimmed.split(/\s+/)[0];
        const allowed = allowedCommands();
        if(state.phase >= 2 && /[^|]\|[^|]/.test(trimmed)){
          window.showConceptCard("pipes");
        }
        if(state.phase >= 2 && /^echo\s.+(>>|>)\s*\S/.test(trimmed)){
          window.showConceptCard("redirects");
        }
        if(firstTok === "chmod" && allowed.includes("chmod")){
          window.showConceptCard("permissions");
        }
        if((firstTok === "ps" || firstTok === "top" || firstTok === "kill")
            && allowed.includes(firstTok)){
          window.showConceptCard("processes");
        }
      }
    }catch(_e){}

    // Support && and || (left-to-right). Each segment may contain pipes.
    const parts = trimmed.split(/(\s&&\s|\s\|\|\s)/);
    const chain = [];
    for(let i=0;i<parts.length;i++){
      const p = parts[i];
      if(!p) continue;
      if(p.trim()==="&&" || p.trim()==="||"){
        chain.push({op:p.trim()});
      }else{
        chain.push({cmd:p.trim()});
      }
    }

    let lastOk = true;
    for(let i=0;i<chain.length;i++){
      const node = chain[i];
      if(node.op){
        continue;
      }
      // check previous operator
      const prev = chain[i-1];
      if(prev && prev.op==="&&" && !lastOk) continue;
      if(prev && prev.op==="||" && lastOk) continue;

      const seg = node.cmd;
      const segments = seg.split("|").map(s=>s.trim()).filter(Boolean);
      if(segments.length > 3){
        row("Pipe-Limit: max 2 Pipes in diesem Game 😅", "warn");
        lastOk = false;
        continue;
      }

      let stdin = null;
      let ok = true;
      for(let j=0;j<segments.length;j++){
        const r = cmdImpl(segments[j], stdin);
        if(r.out === "__RESET__"){
          doReset(true);
          return;
        }
        if(!r.ok){
          row(r.out, "bad");
          row("Tipp: help / quests", "p");
          try{ if(window.appendReplay) window.appendReplay("output", r.out || ""); }catch(_e){}
          ok = false;
          break;
        }
        stdin = r.out ?? "";
        if(j === segments.length - 1){
          if(r.out){
            row(r.out);
            try{ if(window.appendReplay) window.appendReplay("output", r.out); }catch(_e){}
          }
        }
        try{ if(window.checkTutorialCommand) window.checkTutorialCommand(segments[j]); }catch(e){}
        saveState();
        renderObjectives();
        renderLocation();
        promptEl.textContent = promptText();
        progressPhaseIfReady();
        renderRewards();
        renderSidequestPanel();
        renderHeader();
        try{ if(window.syncClippyTooltip) window.syncClippyTooltip(); }catch(e){}
      }
      lastOk = ok;
    }
  }

  function doReset(withMessage){
    // Settings (Difficulty, Audio, Reduced-Motion, Konzept-Karten-Status) sind nicht
    // run-spezifisch — sie überleben einen Reset, damit Spieler*innen ihre Präferenzen
    // nicht jedes Mal neu setzen müssen. Replay-Log wird absichtlich geleert.
    const preservedSettings = (state && state.settings)
      ? JSON.parse(JSON.stringify(state.settings))
      : null;
    localStorage.removeItem(STORAGE_KEY);
    state = structuredClone(INITIAL_STATE);
    state.flags.escaped = false;
    state.startedAt = now();
    if(preservedSettings) state.settings = preservedSettings;
    saveState();
    try{ if(typeof applySettings === "function") applySettings(); }catch(_e){}
    term.innerHTML = "";
    try{ if(window.clearRowTracking) window.clearRowTracking(); }catch(e){}
    promptEl.textContent = promptText();
    renderPhasePill();
    try{ renderHeaderSub(); }catch(e){}
    renderLocation();
    renderObjectives();
    renderRewards();
    renderSidequestPanel();
    try{ if(window.syncClippyTooltip) window.syncClippyTooltip(); }catch(e){}
    if(withMessage){
      row("Hard reset. Neustart…", "warn");
      intro();
    }
  }

  function intro(){
    // Clean, size-to-text welcome box (prevents trailing border artifacts)
    const msg = "Willkommen im SchwarmShell";
    const innerWidth = msg.length + 4; // 2 spaces left + 2 spaces right
    const line = "═".repeat(innerWidth);
    row("╔" + line + "╗");
    row("║  " + msg + "  ║");
    row("╚" + line + "╝");
    row("Du bist Schüler*in der KGS Schwarmstedt.");
    row("Und heute passiert etwas komplett Unnötiges:", "warn");
    row("Euer Schulsystem glitched — und die Welt fühlt sich an wie ein Game.");
    row("Dein Job: Bash lernen und raus-escapen. (Main Character Moment.)");
    row("");
    row("Start: cat readme.txt", "ok");
    row("Oder: cd /school und dann ls", "ok");
    row("");
    row("Mini-Navi (wichtig):", "muted");
    row("Du startest in /home/player. Check das mit: pwd", "muted");
    row("Ein Ordner höher geht so: cd ..   (.. = ‚eins hoch‘)", "muted");
    row("Zu einem Unterordner: cd name    •  Zurück: cd ..", "muted");
    row("Oder direkt springen (absolute Pfade): cd /school", "muted");

      }

  function guidedIntro(){
    const msg = "Willkommen im SchwarmShell";
    const innerWidth = msg.length + 4;
    const line = "═".repeat(innerWidth);
    row("╔" + line + "╗");
    row("║  " + msg + "  ║");
    row("╚" + line + "╝");
    row("Du bist Schüler*in der KGS Schwarmstedt.");
    row("Und heute passiert etwas komplett Unnötiges:", "warn");
    row("Euer Schulsystem glitched — und die Welt fühlt sich an wie ein Game.");
    row("Dein Job: Bash lernen und raus-escapen. (Main Character Moment.)");
  }
