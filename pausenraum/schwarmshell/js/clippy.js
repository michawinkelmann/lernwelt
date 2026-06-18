// clippy.js — der 📎-Helfer: Musterlösungen pro Quest-Key + Tooltip-Logik
// (aus main.js ausgelagert; die Button-Verdrahtung bleibt in main.js).
// CLIPPY_SOLUTIONS ist nach objectiveKey() (js/quests.js) verschlüsselt —
// neue Quests brauchen hier einen Eintrag, sonst greift die Muster-Strategie.

const CLIPPY_SOLUTIONS = {
  tutorial: {
    subtitle:"Die allererste Orientierung in deinem Zimmer.",
    steps:[
      'Schau zuerst, wo du bist: tippe <code>pwd</code>. Du solltest in <code>/home/player</code> landen.',
      'Sieh dir den Raum an: <code>ls</code>. Achte auf <code>readme.txt</code>, weil dort der Start erklärt wird.',
      'Lies die Datei komplett: <code>cat readme.txt</code>. Damit wird die Tutorial-Quest abgeschlossen.',
      'Wenn du unsicher bist: nutze danach <code>quests</code>, um zu prüfen, dass das nächste Ziel aktiv ist.'
    ],
    hint:'Erklärung: Diese Quest trainiert den absoluten Bash-Basis-Loop „sehen → lesen → verstehen“.'
  },
  iserv: {
    subtitle:"Den Ursprung des Glitches finden.",
    steps:[
      'Wechsle in die Schule: <code>cd /school</code> und prüfe mit <code>ls</code>, welche Räume es gibt.',
      'Gehe gezielt in den PC-Raum: <code>cd /school/pcraum</code>.',
      'Öffne den Schul-PC-Ordner: <code>cd Schul-PC</code>.',
      'Lies nacheinander <code>cat boot.txt</code> und <code>cat iserv-glitch.txt</code>, dann mit <code>quests</code> prüfen.'
    ],
    hint:'Erklärung: Der Quest-Trigger sitzt auf dem Lesen von iserv-glitch.txt.'
  },
  keycard: { subtitle:"Zutrittstoken für das Gate besorgen.", steps:[ 'Gehe sicher in den richtigen Ordner: <code>cd /school/pcraum</code>.', 'Prüfe mit <code>ls</code>, dass dort <code>keycard.txt</code> liegt.', 'Lies die Quest-Datei exakt: <code>cat /school/pcraum/keycard.txt</code> (oder <code>cat keycard.txt</code> in diesem Ordner).', 'Kontrolliere direkt danach mit <code>quests</code>, ob „KEYCARD besorgen“ als erledigt markiert ist.' ], hint:'Erklärung: Der Trigger kommt beim echten Lesen der Datei, nicht nur beim Finden per ls/find.' },
  gate: { subtitle:"Server-Gate korrekt entsperren.", steps:[ 'Gehe zum Gate: <code>cd /server_gate</code>.', 'Lies den Gate-Hinweis vollständig: <code>cat gate.txt</code>.', 'Gib den darin genannten Code exakt ein: <code>unlock SCHWARM-ALPHA-7</code>.', 'Prüfe mit <code>quests</code>, dass „Server-Gate öffnen“ erledigt ist (bei Fehler: <code>cat gate.txt</code> erneut lesen und exakt wiederholen).' ], hint:'Erklärung: Diese Quest verlangt den exakten Code als Argument für unlock.' },
  frag1: { subtitle:"Erstes Fragment aus Logs extrahieren.", steps:[ 'Gehe in die Patchbay: <code>cd /patchbay</code>.', 'Suche das erste Log gezielt: <code>ls</code> und dann <code>cat frag_1.log</code> für Kontext.', 'Trigger den Questabschluss direkt über die Suchzeile: <code>grep FRAG1_TOKEN frag_1.log</code>.', 'Prüfe danach mit <code>inventory</code> und <code>quests</code>, dass FRAG1 (PIXEL-SPAWN-42) übernommen wurde.' ], hint:'Erklärung: Für Frag1 zählt die gezielte grep-Suche im richtigen Log als Abschluss-Trigger.' },
  frag2: { subtitle:"Workbench-Struktur für Fragment #2 bauen.", steps:[ 'Gehe in dein Home: <code>cd /home/player</code> (oder nutze direkt immer Pfade mit <code>~/...</code>).', 'Der Ordner <code>~/workbench</code> ist schon da – erstelle nur noch den Unterordner: <code>mkdir ~/workbench/patches</code>.', 'Lege die Quest-Datei an: <code>touch ~/workbench/patches/frag2.txt</code>.', 'Wichtig für den Abschluss: lies die Datei anschließend explizit mit <code>cat ~/workbench/patches/frag2.txt</code>. Erst dann wird FRAG2 gesetzt; prüfe danach mit <code>quests</code>.' ], hint:'Erklärung: Bei Frag2 reicht touch allein nicht – der Trigger passiert beim cat auf frag2.txt.' },
  frag3: { subtitle:"Signaldatei finden und drittes Fragment sichern.", steps:[ 'Gehe in die Patchbay: <code>cd /patchbay</code>.', 'Lies die Pipe-Datei einmal: <code>cat frag_3.pipe</code>.', 'Trigger das Fragment mit der exakten Suche: <code>grep SIGNAL frag_3.pipe</code>.', 'Prüfe direkt mit <code>inventory</code> und <code>quests</code>, dass FRAG3 (NEON-PIPE-7) als gesichert markiert ist.' ], hint:'Erklärung: Für Frag3 zählt die Signal-Suche in frag_3.pipe als konkreter Abschluss-Schritt.' },
  assemble: { subtitle:"Alle Fragmente zu einem Patch kombinieren.", steps:[ 'Verifiziere zuerst in <code>inventory</code>, dass alle 3 Fragmente vorhanden sind.', 'Gehe in deine Workbench: <code>cd ~/workbench</code>.', 'Führe den Assemble-Befehl aus: <code>assemble</code>.', 'Bei Fehlern erst fehlende Fragmente nachholen; danach erneut <code>assemble</code> und mit <code>quests</code> prüfen.' ], hint:'Erklärung: „assemble“ ist der Crafting-Schritt, der mehrere Vorbedingungen zusammenführt.' },
  locate: { subtitle:"Patchlord-Script finden.", steps:[ 'Gehe in den Boss-Bereich: <code>cd /boss</code>.', 'Führe die Suche exakt aus: <code>find /boss -name "patchlord*"</code>.', 'Bestätige den Fund mit <code>cat /boss/patchlord.sh</code>.', 'Prüfe mit <code>quests</code>, dass „Patchlord lokalisieren“ abgeschlossen ist.' ], hint:'Erklärung: Der Quest-Trigger hängt am echten Fundpfad /boss/patchlord.sh.' },
  bug: { subtitle:"Fehlerzeile im Script mit Zeilennummer identifizieren.", steps:[ 'Führe die Suche mit Zeilennummern exakt aus: <code>grep -n BUG /boss/patchlord.sh</code>.', 'Lies danach zur Kontrolle den Kontext: <code>cat /boss/patchlord.sh</code>.', 'Merke dir die gemeldete Zeilennummer für den Hotfix-Schritt.', 'Prüfe mit <code>quests</code>, dass „Bug-Zeile identifizieren“ abgeschlossen ist.' ], hint:'Erklärung: Für diese Quest zählt konkret grep -n BUG auf der Patchlord-Datei.' },
  hotfix: { subtitle:"Sicheres Patchen über Workbench-Kopie.", steps:[ 'Kopiere das Script in die Workbench: <code>cp /boss/patchlord.sh ~/workbench/patchlord.sh</code>.', 'Hänge die notwendige Marker-Zeile an: <code>echo "PATCH_APPLIED" >> ~/workbench/patchlord.sh</code>.', 'Prüfe das Ergebnis mit <code>cat ~/workbench/patchlord.sh</code> und stelle sicher, dass <code>PATCH_APPLIED</code> sichtbar ist.', 'Kontrolliere mit <code>quests</code>, dass „Hotfix vorbereiten“ erledigt ist.' ], hint:'Erklärung: Der Hotfix-Trigger akzeptiert die konkrete Marker-Zeile PATCH_APPLIED in der Workbench-Kopie.' },
  chmod: { subtitle:"Script ausführbar machen.", steps:[ 'Setze das Ausführrecht: <code>chmod +x ~/workbench/patchlord.sh</code>.', 'Starte testweise: <code>./workbench/patchlord.sh</code> oder nach <code>cd ~/workbench</code> mit <code>./patchlord.sh</code>.', 'Bei „Permission denied“: Pfad prüfen und chmod auf exakt dieselbe Datei erneut ausführen.', 'Anschließend mit <code>quests</code> den Haken prüfen.' ], hint:'Erklärung: Ohne Execute-Bit kann ein Script trotz korrektem Inhalt nicht laufen.' },
  boss: { subtitle:"Bossfight final ausführen.", steps:[ 'Prüfe zuerst die Token: <code>inventory</code> muss FRAG1/FRAG2/FRAG3 zeigen.', 'Gehe in die Workbench: <code>cd ~/workbench</code>.', 'Starte das Script exakt mit drei Argumenten: <code>./patchlord.sh PIXEL-SPAWN-42 CRAFTED-DIR-99 NEON-PIPE-7</code>.', 'Bestätige den Erfolg mit <code>quests</code> und folge dem nächsten Story-Hinweis.' ], hint:'Erklärung: Der Bossfight prüft exakte Argument-Reihenfolge und die drei Fragmentwerte.' },
  report: { subtitle:"Zeugnis nach dem Bossfight abholen.", steps:[ 'Gehe ins Sekretariat: <code>cd /school/sekretariat</code>.', 'Rede mit einer der beiden Personen: <code>talk harries</code> oder <code>talk pietsch</code>.', 'Öffne das ausgestellte Zeugnis optional direkt: <code>cat /school/sekretariat/zeugnis.txt</code>.', 'Prüfe mit <code>quests</code>, dass „Zeugnis abholen“ erledigt ist.' ], hint:'Erklärung: Der Abschluss-Trigger kommt beim Gespräch im Sekretariat.' },
  mentor_hub: { subtitle:"Mentor Hub starten und erstes Ziel aktivieren.", steps:[ 'Gehe in den Mentor-Bereich: <code>cd /mentor_hub</code>.', 'Lies das Questboard: <code>cat /mentor_hub/quests.txt</code>.', 'Starte die erste Mentor-Aufgabe mit <code>talk noah</code>.', 'Prüfe mit <code>quests</code>, dass danach „Noah: Lag fixen“ als aktives Ziel angezeigt wird.' ], hint:'Erklärung: Dieser Schritt ist der Einstieg in den Mentor-Arc und schaltet die drei Squad-Quests frei.' },
  lagfix: { subtitle:"Noahs Lag-Problem über Prozesse lösen.", steps:[ 'Starte im Mentor-Hub: <code>cd /mentor_hub</code> und <code>talk noah</code>.', 'Zeige laufende Prozesse: <code>ps</code> (oder CPU-lastig mit <code>top</code>).', 'Beende den Störerprozess: <code>kill 202</code> (das ist <code>rgbd</code>).', 'Rede nochmal mit Noah: <code>talk noah</code>, dann mit <code>quests</code> prüfen.' ], hint:'Erklärung: Die Quest gilt erst nach dem Kill des Prozesses rgbd.' },
  emma: { subtitle:"History-Quest sauber abschließen.", steps:[ 'Gehe zu Emma: <code>cd /mentor_hub</code> und <code>talk emma</code>.', 'Führe den Verlauf-Befehl aus: <code>history</code>.', 'Rede direkt nochmal mit Emma: <code>talk emma</code>.', 'Kontrolliere den Fortschritt mit <code>quests</code>.' ], hint:'Erklärung: Das Ausführen von history setzt den Quest-Trigger.' },
  leo: { subtitle:"QoL-Shortcut per Alias bauen.", steps:[ 'Gehe zu Leo: <code>cd /mentor_hub</code> und <code>talk leo</code>.', 'Lege einen Alias an: <code>alias ll="ls -l"</code>.', 'Teste den Shortcut einmal: <code>ll</code>.', 'Rede nochmal mit Leo: <code>talk leo</code> und prüfe mit <code>quests</code>.' ], hint:'Erklärung: Für den Trigger zählt das erfolgreiche Setzen eines Alias.' },
  mentor_clear: { subtitle:"Mentor-Run vollständig abschließen.", steps:[ 'Prüfe den Stand: <code>quests</code> (Noah, Emma, Leo müssen erledigt sein).', 'Wichtig vor dem Finale: Rede nach jeder erledigten Schüler-Quest nochmal mit Noah, Emma und Leo, damit der Abschluss bestätigt wird.', 'Danach erst Prozesse prüfen: <code>ps</code>. Suche nach <code>quest_aktiv</code> (PID 67).', 'Beende den Abschluss-Prozess: <code>kill 67</code>.', 'Bestätige mit <code>mentor_clear</code> und <code>quests</code>, dass der Run wirklich clear ist.' ], hint:'Erklärung: Erst wenn alle drei Schüler den Abschluss im zweiten Gespräch bestätigt haben, lohnt sich die Suche nach Prozess 67 (quest_aktiv).' },
  report_final: { subtitle:"Finales Zeugnis freischalten.", steps:[ 'Stelle sicher, dass Sidequest + Mentor-Arc fertig sind (Badge vorhanden): <code>quests</code>.', 'Gehe ins Sekretariat: <code>cd /school/sekretariat</code>.', 'Rede erneut mit Harries oder Pietsch: <code>talk harries</code> (alternativ <code>talk pietsch</code>).', 'Lies das finale Dokument: <code>cat /school/sekretariat/zeugnis_final.txt</code> und prüfe mit <code>quests</code>.' ], hint:'Erklärung: Das finale Zeugnis gibt es erst nach Mentor-Arc plus Sidequest-Badge.' },
  arbeitsamt: { subtitle:"Phase 5 starten und einchecken.", steps:[ 'Betritt das Arbeitsamt: <code>cd /arbeitsamt</code>.', 'Lies den Einstieg: <code>cat /arbeitsamt/start.txt</code>.', 'Starte den Arc beim NPC: <code>talk beamter</code>.', 'Prüfe direkt mit <code>quests</code>, dass „Arbeitsamt betreten“ erledigt ist.' ], hint:'Erklärung: Der Phasenwechsel zu Phase 5 passiert beim Betreten von /arbeitsamt.' },
  beamter: { subtitle:"Erstes Gespräch im Arbeitsamt.", steps:[ 'Stelle sicher, dass du in <code>/arbeitsamt</code> bist: <code>pwd</code>.', 'Rede mit dem NPC: <code>talk beamter</code>.', 'Folge der genannten Station, z.B. <code>cd /real_life/snackmaster</code>.', 'Nutze <code>quests</code>, um zu sehen, welche Firmen-Quest als nächstes aktiv ist.' ], hint:'Erklärung: Das Gespräch aktiviert den Job-Quest-Arc mit den fünf Firmenaufträgen.' },
  snackmaster: { subtitle:"Allergene-Marker im Audit-Log finden.", steps:[ 'Gehe zur Firma: <code>cd /real_life/snackmaster</code>.', 'Lies den Auftrag: <code>cat quest.txt</code>.', 'Suche den Marker gezielt im Log: <code>grep ALLERGENE haccp_audit.log</code>.', 'Melde ab bei Jansen: <code>talk jansen</code> und prüfe den Haken mit <code>quests</code>.' ], hint:'Erklärung: Der Trigger setzt auf grep mit ALLERGENE, wenn die Marker-Zeile im Output auftaucht.' },
  ars: { subtitle:"Abholplan in die Workbench kopieren.", steps:[ 'Gehe zur Firma: <code>cd /real_life/ars_recycling</code>.', 'Erstelle den Zielordner: <code>mkdir ~/workbench/ars</code>.', 'Kopiere den Plan: <code>cp /real_life/ars_recycling/docs/abholplan_2026.csv ~/workbench/ars/abholplan_2026.csv</code>.', 'Melde bei Wiebe: <code>talk wiebe</code> und prüfe mit <code>quests</code>.' ], hint:'Erklärung: Quest zählt, sobald der Plan in ~/workbench (oder ~/workbench/ars) liegt.' },
  ohlendorf: { subtitle:"Ticket-Rechte fixen und Token lesen.", steps:[ 'Gehe zur Firma: <code>cd /real_life/ohlendorf_technik</code> und lies <code>cat quest.txt</code>.', 'Lege den Workbench-Ordner an und kopiere das Ticket: <code>mkdir ~/workbench/ohlendorf</code> und <code>cp /real_life/ohlendorf_technik/ticket_net.txt ~/workbench/ohlendorf/ticket_net.txt</code>.', 'Setze Leserechte auf der Kopie: <code>chmod 644 ~/workbench/ohlendorf/ticket_net.txt</code> und lies sie mit <code>cat ~/workbench/ohlendorf/ticket_net.txt</code>.', 'Melde bei Neele: <code>talk neele</code> und prüfe mit <code>quests</code>.' ], hint:'Erklärung: Der Trigger kommt beim Lesen der Ticket-Kopie in deiner Workbench.' },
  berndt: { subtitle:"CPU-Fresser in der Möbelfabrik stoppen.", steps:[ 'Gehe zur Firma: <code>cd /real_life/berndt_moebel</code> (dadurch spawnt der Problemprozess).', 'Zeige Prozesse: <code>ps</code> oder <code>top</code>. Suche <code>cnc_sim</code> mit PID 909.', 'Stoppe den Übeltäter: <code>kill 909</code>.', 'Rede mit Tom: <code>talk tom</code> und prüfe mit <code>quests</code>.' ], hint:'Erklärung: Für den Questabschluss muss der Prozess cnc_sim gekillt werden.' },
  cms: { subtitle:"Komplette CMS-Abnahme mappe bauen.", steps:[ 'Lege die Struktur an: <code>mkdir ~/workbench/cms/{elektro,fliesen,dach,sanitaer,maler,abnahme}</code>.', 'Hole die fünf Codes: <code>cat /school/technikraum/ersatzteile/verteilerplan.txt</code>, <code>cat /school/kunstraum/kacheln.txt</code>, <code>cat /real_life/ars_recycling/platzplan.txt</code>, <code>cat /school/physik/materialschrank/rohrdruck.txt</code>, <code>cat /school/medienraum/ausleihe/farbrolle.txt</code>.', 'Schreibe je Bereich eine Datei (Beispiel): <code>echo "SICHERUNGSLABEL: CMS-EL-2048" > ~/workbench/cms/elektro/bericht.txt</code> (analog für fliesen/dach/sanitaer/maler) und sammle alle Codes in <code>~/workbench/cms/abnahme/uebersicht.txt</code>.', 'Melde bei Holger: <code>talk holger</code> und prüfe den Abschluss mit <code>quests</code>.' ], hint:'Erklärung: CMS ist nur fertig, wenn alle fünf Bereichsberichte plus die Abnahme-Übersicht vollständig sind.' },
  jobangebot: { subtitle:"Finales Jobangebot einsammeln.", steps:[ 'Prüfe, dass alle fünf Firmenquests auf ✅ stehen: <code>quests</code>.', 'Geh zurück ins Arbeitsamt: <code>cd /arbeitsamt</code>.', 'Triggere den Abschluss beim NPC: <code>talk beamter</code>.', 'Lies das Ergebnis: <code>cat /arbeitsamt/jobangebot.txt</code> und bestätige mit <code>quests</code>.' ], hint:'Erklärung: Das Jobangebot wird erst erzeugt, wenn SNACKMASTER, ARS, Ohlendorf, Berndt und CMS erledigt sind.' }
};

function getCurrentMainObjective(){
  const list = OBJECTIVES.filter((o)=>o.phase===state.phase);
  return list.find((o)=>!o.done(state)) || null;
}

const CLIPPY_COOLDOWN_MS = 5 * 60 * 1000;

function ensureClippyState(){
  if(!state.clippy || typeof state.clippy !== "object") state.clippy = { lastUsedAt: 0, usageCount: 0 };
  if(!Number.isFinite(Number(state.clippy.lastUsedAt))) state.clippy.lastUsedAt = 0;
  if(!Number.isFinite(Number(state.clippy.usageCount))) state.clippy.usageCount = 0;
}

function getClippyCooldownRemainingMs(){
  ensureClippyState();
  const elapsed = Date.now() - Number(state.clippy.lastUsedAt || 0);
  return Math.max(0, CLIPPY_COOLDOWN_MS - elapsed);
}

function formatCooldown(ms){
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function renderClippyAvailability(){
  const btn = el("clippyHelperBtn");
  const status = el("clippyStatus");
  const usage = el("clippyUsage");
  if(!btn || !status) return;

  ensureClippyState();
  if(usage) usage.textContent = `Nutzungen: ${Math.max(0, Number(state.clippy.usageCount)||0)}`;

  const remaining = getClippyCooldownRemainingMs();
  const hasObjective = !!getCurrentMainObjective();
  const isCooldown = remaining > 0;

  btn.classList.toggle("isCooldown", isCooldown);
  status.classList.remove("isReady", "isCooldown");

  if(!hasObjective){
    btn.disabled = true;
    btn.textContent = "📎 Clippy Helfer";
    status.textContent = "Status: aktuell keine Mainquest aktiv";
    status.classList.add("isCooldown");
    return;
  }

  if(isCooldown){
    btn.disabled = true;
    btn.textContent = `📎 Clippy Cooldown (${formatCooldown(remaining)})`;
    status.textContent = `Status: Cooldown aktiv · Restzeit ${formatCooldown(remaining)}`;
    status.classList.add("isCooldown");
    return;
  }

  btn.disabled = false;
  btn.textContent = "📎 Clippy Helfer";
  status.textContent = "Status: bereit";
  status.classList.add("isReady");
}

function buildClippyContent(){
  const current = getCurrentMainObjective();
  if(!current) return null;
  const key = objectiveKey(current);
  const template = CLIPPY_SOLUTIONS[key] || {
    subtitle:"Für diese Quest gibt es aktuell eine allgemeine Musterstrategie.",
    steps:[
      'Lies zuerst den Quest-Hinweis komplett und markiere das Zielverb (z.B. finden, lesen, kopieren, ausführen).',
      'Nutze den Standardablauf: <code>pwd</code> → <code>ls</code> → <code>cat relevante_datei</code>.',
      'Wenn etwas gesucht werden muss: <code>find</code> und <code>grep -n</code> kombinieren, dann Ergebnis in die Workbench sichern.',
      'Nach jedem Schritt sofort mit <code>quests</code> kontrollieren, ob die Quest bereits als erledigt markiert wurde.'
    ],
    hint:'Erklärung: Die meisten Mainquests folgen demselben Lernmuster aus Navigation, Analyse und sauberer Ausführung.'
  };
  return { key, objective: current, template };
}

function getOpenClippyObjectiveKey(){
  const tooltip = el("clippyTooltip");
  if(!tooltip) return "";
  return String(tooltip.dataset.objectiveKey || "");
}

function getOpenClippyObjectiveTitle(){
  const tooltip = el("clippyTooltip");
  if(!tooltip) return "";
  return String(tooltip.dataset.objectiveTitle || "");
}

function positionClippyTooltip(){
  const tooltip = el("clippyTooltip");
  const btn = el("clippyHelperBtn");
  if(!tooltip || !btn || tooltip.hidden) return;
  const r = btn.getBoundingClientRect();
  const top = Math.min(window.innerHeight - tooltip.offsetHeight - 12, r.bottom + 10);
  const left = Math.min(window.innerWidth - tooltip.offsetWidth - 12, Math.max(12, r.right - tooltip.offsetWidth));
  tooltip.style.top = `${Math.max(12, top)}px`;
  tooltip.style.left = `${left}px`;
}

function closeClippyTooltip(){
  const tooltip = el("clippyTooltip");
  const btn = el("clippyHelperBtn");
  if(!tooltip || !btn) return;
  tooltip.hidden = true;
  tooltip.style.top = "";
  tooltip.style.left = "";
  delete tooltip.dataset.objectiveKey;
  delete tooltip.dataset.objectiveTitle;
  btn.setAttribute("aria-expanded", "false");
}

function showClippyTooltip(){
  const tooltip = el("clippyTooltip");
  const btn = el("clippyHelperBtn");
  if(!tooltip || !btn) return;
  const remaining = getClippyCooldownRemainingMs();
  if(remaining > 0){
    closeClippyTooltip();
    return;
  }
  const payload = buildClippyContent();
  if(!payload){
    closeClippyTooltip();
    return;
  }
  const { key, objective, template } = payload;

  // Difficulty entscheidet, ob die Schritt-Lösung direkt sichtbar ist (Story-Modus)
  // oder erst auf Knopfdruck (Classic). Hardcore blendet Clippy schon im Header aus.
  const difficulty = (state.settings && state.settings.difficulty) || "classic";
  const showStepsImmediately = difficulty === "story";

  const stepsHtml = template.steps.map((step)=>`<li>${step}</li>`).join("");
  tooltip.innerHTML = `
    <h3 class="clippyTitle">📎 Clippy Helfer für [${escapeHtml(key)}]</h3>
    <p class="clippySub"><strong>${escapeHtml(objective.title)}</strong><br>${escapeHtml(template.subtitle)}</p>
    <div class="clippyHintBlock"><strong>Tipp ohne Spoiler:</strong> ${escapeHtml(template.hint)}</div>
    <ol class="clippySteps" id="clippyStepsList" ${showStepsImmediately ? "" : "hidden"}>${stepsHtml}</ol>
    <div class="clippyActions">
      <button class="btn" id="clippyRevealBtn" type="button" ${showStepsImmediately ? 'hidden' : ''}>Lösung anzeigen</button>
      <button class="btn" id="clippyCloseBtn" type="button">Okay</button>
    </div>
  `;
  tooltip.hidden = false;
  tooltip.dataset.objectiveKey = key;
  tooltip.dataset.objectiveTitle = objective.title;
  btn.setAttribute("aria-expanded", "true");

  ensureClippyState();
  state.clippy.lastUsedAt = Date.now();
  state.clippy.usageCount = Math.max(0, Number(state.clippy.usageCount)||0) + 1;
  saveState();
  renderClippyAvailability();

  const closeBtn = el("clippyCloseBtn");
  if(closeBtn) closeBtn.addEventListener("click", closeClippyTooltip);
  const revealBtn = el("clippyRevealBtn");
  if(revealBtn){
    revealBtn.addEventListener("click", ()=>{
      const list = el("clippyStepsList");
      if(list) list.hidden = false;
      revealBtn.hidden = true;
      requestAnimationFrame(positionClippyTooltip);
    });
  }
  requestAnimationFrame(positionClippyTooltip);
}

function syncClippyTooltip(){
  renderClippyAvailability();
  const tooltip = el("clippyTooltip");
  if(!tooltip || tooltip.hidden) return;
  const payload = buildClippyContent();
  if(!payload){
    closeClippyTooltip();
    return;
  }
  if(payload.key !== getOpenClippyObjectiveKey()){
    closeClippyTooltip();
    return;
  }
  if(payload.objective.title !== getOpenClippyObjectiveTitle()){
    closeClippyTooltip();
    return;
  }
  positionClippyTooltip();
}
