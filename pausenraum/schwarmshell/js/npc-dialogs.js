// npc-dialogs.js — generisches NPC-Dialog-System (aus commands.js ausgelagert)
//
// Mehrstufen-Dialoge für Schüler-/Lehrer-NPCs: Dialogbäume, Sprecher-Namen,
// Flavor-Lines. Spezial-NPCs (Winkelmann, Sidequest-Geber, Story-NPCs) sind in
// NPC_DIALOG_EXCLUDED gelistet und werden direkt in case "talk" (js/commands.js)
// behandelt. Wird zur Laufzeit von cmdImpl() aufgerufen — lädt vor commands.js.
  const NPC_DIALOG_EXCLUDED = new Set([
    "winkelmann","harries","pietsch","beamter","jansen","wiebe","neele","tom","holger","noah","emma","leo",
    // nur Story-/Spezial-NPCs ohne Auswahlmenü
    "groffmann","ruebke","kaluza","dumke","bauer","weymann"
  ]);

  function isStudentNpc(npcId, npc){
    const role = String((npc && npc.role) || "").toLowerCase();
    return role.includes("schüler") || role.includes("schueler") || /^s_\d/i.test(String(npcId||"")) || /^s_/i.test(String(npcId||""));
  }

  function isTeacherNpc(npcId, npc, inSchool){
    const studentIds = new Set(["noah","emma","leo"]);
    if(inSchool) return (!studentIds.has(npcId) && !isStudentNpc(npcId, npc));
    return (npc && (
      /lehr|schule|direktor|sekret|beratung|schul|klassen/i.test(String(npc.role||"")) ||
      /herr|frau/i.test(String(npc.name||""))
    ) && !isStudentNpc(npcId, npc));
  }

  function resetNpcDialog(){
    if(!state.npcDialog || typeof state.npcDialog !== "object") state.npcDialog = { active:false, npcId:null, nodeId:null };
    state.npcDialog.active = false;
    state.npcDialog.npcId = null;
    state.npcDialog.nodeId = null;
  }

  function getNpcDialogType(npcId, npc){
    const role = String((npc && npc.role) || "").toLowerCase();
    if(role.includes("schüler") || role.includes("schueler") || /^s_/i.test(npcId)) return "student";
    return "teacher";
  }

  function pickNpcLine(npcId, options){
    let h = 0;
    for(const ch of String(npcId||"")) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
    return options[h % options.length];
  }

  function getTeacherDialogName(npc){
    const rawName = String((npc && npc.name) || "").trim();
    const role = String((npc && npc.role) || "").toLowerCase();
    const nameWithoutParens = rawName.replace(/\s*\([^)]*\)\s*/g, " ").trim();
    const tokens = nameWithoutParens.split(/\s+/).filter(Boolean);
    const clean = tokens.filter(t => !/^(herr|frau|dr\.?|prof\.?|prof\.dr\.?)$/i.test(t));
    const lastName = (clean[clean.length - 1] || tokens[tokens.length - 1] || "Lehrkraft").replace(/,$/, "");
    const femaleFirstNames = new Set([
      "mascha","maren","kathrin","johanna","dörte","ulrike","kristina","julia","karla","simona",
      "agnieszka","chiara","silke","lena","lara","claudia"
    ]);
    const firstName = (clean[0] || tokens[0] || "").toLowerCase();
    let honorific = "Herr";
    if(/\bfrau\b/i.test(rawName)) honorific = "Frau";
    else if(/\bherr\b/i.test(rawName)) honorific = "Herr";
    else if(role.includes("leiterin") || role.includes("direktorstellvertreterin") || femaleFirstNames.has(firstName)) honorific = "Frau";
    return `${honorific} ${lastName}`;
  }

  function getDialogSpeakerName(npcId, npc){
    if(getNpcDialogType(npcId, npc) === "teacher") return getTeacherDialogName(npc);
    return String((npc && npc.name) || npcId || "NPC");
  }

  function normalizeTeacherRoleKey(roleText){
    const normalized = String(roleText || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    if(!normalized) return "general";
    if(/\b(mathe|mathematik)\b/.test(normalized)) return "math";
    if(/\b(englisch|english)\b/.test(normalized)) return "english";
    if(/\b(deutsch|german)\b/.test(normalized)) return "german";
    if(/\b(geschichte|history)\b/.test(normalized)) return "history";
    if(/\b(sport)\b/.test(normalized)) return "sport";
    if(/\b(kunst|art)\b/.test(normalized)) return "art";
    if(/\b(chemie|chemistry)\b/.test(normalized)) return "chemistry";
    if(/\b(bio|biologie|biology)\b/.test(normalized)) return "biology";
    if(/\b(erdkunde|geografie|geographie|geography)\b/.test(normalized)) return "geography";
    if(/\b(werte und normen|ethik|philosophie)\b/.test(normalized)) return "ethics";
    return "general";
  }

  function getTeacherOpenerPool(roleText){
    const key = normalizeTeacherRoleKey(roleText);
    const pools = {
      math: [
        "„Taschenrechner bleibt erstmal zu — erst Denkweg, dann Ergebnis.“",
        "„Zeig mir den Rechenweg. Das Ergebnis allein rettet dir heute nichts.“",
        "„Nicht raten, begründen: Welche Regel nutzt du an dieser Stelle?“",
        "„Wir rechnen strukturiert: Gegeben, gesucht, Ansatz, Kontrolle.“"
      ],
      english: [
        "„Short answers, clear grammar — start simple and precise.“",
        "„Bitte in ganzen Sätzen antworten, nicht im Telegrammstil.“",
        "„Vocabulary first, then style. Sag es klar, dann schön.“",
        "„Read the task carefully — key words entscheiden die Punktzahl.“"
      ],
      german: [
        "„Erst den Text erfassen, dann interpretieren — nicht andersrum.“",
        "„Achte auf Signalwörter. Die tragen oft das ganze Argument.“",
        "„Eine starke These braucht immer ein passendes Textbeispiel.“",
        "„Schreib klar, knapp und begründet — das überzeugt am meisten.“"
      ],
      history: [
        "„Ordne das erst zeitlich ein — ohne Kontext bleibt es nur eine Anekdote.“",
        "„Quelle ist nicht gleich Wahrheit: Wer spricht, wann und warum?“",
        "„Geschichte lernt man über Zusammenhänge, nicht über Jahreszahlen allein.“",
        "„Vergleichen statt aufzählen: Was hat sich verändert, was blieb?“"
      ],
      sport: [
        "„Tempo ist gut, Technik ist besser — wir machen's sauber.“",
        "„Warm-up ernst nehmen, dann laufen die Übungen von allein besser.“",
        "„Teamplay heißt: reden, schauen, mitdenken — nicht nur rennen.“",
        "„Saubere Wiederholung schlägt hektische zehn Extra-Runden.“"
      ],
      art: [
        "„Mut zur Fläche — der erste Strich darf ruhig sichtbar sein.“",
        "„Beobachten vor Bewerten. Schau erst, dann entscheide.“",
        "„Komposition schlägt Perfektion: Ordnung im Bild führt den Blick.“",
        "„Material spricht mit — nutz die Struktur, statt gegen sie zu arbeiten.“"
      ],
      chemistry: [
        "„Im Labor gilt: erst Sicherheit, dann Reaktion.“",
        "„Beobachtung vor Deutung — was siehst du wirklich?“",
        "„Formel ist Sprache. Lies sie, bevor du rechnest.“",
        "„Wir arbeiten sauber: Hypothese, Versuch, Auswertung.“"
      ],
      biology: [
        "„In der Biologie zählt Struktur: Ebene für Ebene verstehen.“",
        "„Beschreiben, vergleichen, erklären — so wird aus Wissen Verständnis.“",
        "„Funktion folgt Aufbau. Frag immer: Wozu dient das?“",
        "„Nicht auswendig runterrattern — Zusammenhänge zeigen!“"
      ],
      geography: [
        "„Karte lesen heißt Muster erkennen, nicht nur Orte finden.“",
        "„Denk in Räumen: Lage, Nutzung, Wirkung.“",
        "„Mensch und Umwelt immer zusammen betrachten — das ist der Kern.“",
        "„Beschreibe erst den Raum, erkläre dann die Prozesse.“"
      ],
      ethics: [
        "„Gute Diskussion heißt: Position begründen, nicht Lautstärke erhöhen.“",
        "„Wir trennen Meinung und Argument — beides darf da sein, aber sauber.“",
        "„Erst Perspektiven sammeln, dann bewerten.“",
        "„Fairness beginnt beim Zuhören, nicht beim Gewinnen.“"
      ],
      general: [
        "„So, alle einmal mitschreiben — und du kommst bitte kurz zu mir.“",
        "„Erst lesen, dann reden. Und jetzt: Was brauchst du?“",
        "„Handys weg, Köpfe an. Wir klären das jetzt sauber.“",
        "„Ruhe bitte. Wir gehen das in sinnvollen Schritten durch.“",
        "„Nicht raten — begründen. Also: Wo hängst du?“",
        "„Wer eine Fehlermeldung hat, liest sie. Wer keine hat, denkt mit.“",
        "„Wir machen das ordentlich: Ziel, Schritt, Kontrolle.“",
        "„Stopp, einmal sortieren. Dann lösen wir's ohne Chaos.“"
      ]
    };
    return pools[key] || pools.general;
  }

  function pickRandom(arr){
    return arr[Math.floor(Math.random()*arr.length)];
  }

  function getTeacherRoomLabel(cwd){
    const room = String(cwd || "");
    if(room === "/school/lehrerzimmer") return "lehrerzimmer";
    if(room.startsWith("/school/klassenraume")) return "klassenzimmer";
    if(room === "/school/pcraum") return "pcraum";
    if(room === "/school/digitallab") return "digitallab";
    if(room === "/school/turnhalle") return "turnhalle";
    if(room === "/school/musikraum") return "musikraum";
    if(room === "/school/kunstraum") return "kunstraum";
    if(room === "/school/chemie") return "chemie";
    if(room === "/school/biologie") return "biologie";
    if(room === "/school/bibliothek") return "bibliothek";
    if(room === "/school/beratung") return "beratung";
    return "schule";
  }

  function getTeacherFlavorLine(npc, cwd){
    const roleText = String((npc && npc.role) || "");
    const subjectKey = normalizeTeacherRoleKey(roleText);
    const roomKey = getTeacherRoomLabel(cwd);
    const roomPools = {
      lehrerzimmer:[
        "„Das Lehrerzimmer ist Arbeitsbereich. Wenn du ein Anliegen hast, bitte übers Sekretariat.“",
        "„Wir sind hier mitten in Planung und Korrektur. Bitte zurück in den öffentlichen Bereich.“",
        "„Zwischen Konferenzmappen und Kaffeeplan ist hier kein Platz für Besucher*innen.“",
        "„Interne Unterlagen bleiben intern. Bitte verlasse das Lehrerzimmer wieder.“"
      ],
      klassenzimmer:[
        "„Unterrichtszeit heißt: klare Struktur, klare Fragen, klare Antworten.“",
        "„Wir bleiben beim Thema und arbeiten den Stoff Schritt für Schritt durch.“",
        "„Wenn du was wissen willst: Handzeichen, dann klären wir’s sauber.“"
      ],
      pcraum:[
        "„Im PC-Raum gilt: erst lesen, dann klicken, dann dokumentieren.“",
        "„Keine wilden Tabs. Wir arbeiten reproduzierbar, nicht zufällig.“",
        "„Technikfehler sind Lernanlässe — wenn man sie ordentlich protokolliert.“"
      ],
      digitallab:[
        "„Im Digital-Lab zählt nicht Show, sondern ein nachvollziehbarer Workflow.“",
        "„Hier testen wir iterativ: Hypothese, Versuch, Auswertung.“",
        "„Projektarbeit heißt: Versionen sichern, Entscheidungen begründen.“"
      ],
      turnhalle:[
        "„In der Halle gilt: Sicherheit vor Tempo, Technik vor Risiko.“",
        "„Wir starten sauber aufgewärmt — Verletzungen sind kein Achievement.“",
        "„Teamplay, Fairness, Fokus: das ist heute der eigentliche Lerninhalt.“"
      ],
      musikraum:[
        "„Im Musikraum hörst du nicht nur zu — du reagierst aufeinander.“",
        "„Rhythmus hält die Gruppe zusammen. Also: erst zählen, dann einsetzen.“",
        "„Jede Probe lebt von Präzision und Rücksicht, nicht von Lautstärke.“"
      ],
      kunstraum:[
        "„Im Kunstraum zählt Idee plus Begründung, nicht nur ‘sieht cool aus’.“",
        "„Skizze, Entscheidung, Überarbeitung — das ist der eigentliche Prozess.“",
        "„Material ist Sprache. Nutze es bewusst, nicht nur dekorativ.“"
      ],
      chemie:[
        "„Im Chemieraum gilt: Schutz zuerst, Experiment danach.“",
        "„Beobachtung vor Interpretation — erst was passiert, dann warum.“",
        "„Saubere Protokolle sind hier genauso wichtig wie das Ergebnis.“"
      ],
      biologie:[
        "„Im Bioraum arbeiten wir präzise: beobachten, vergleichen, einordnen.“",
        "„Lebende Systeme sind komplex — deshalb argumentieren wir mit Daten, nicht Bauchgefühl.“",
        "„Biologie beginnt bei Details und endet bei Zusammenhängen.“"
      ],
      bibliothek:[
        "„In der Bibliothek spricht man leise, denkt aber sehr laut.“",
        "„Quelle, Beleg, Schlussfolgerung — so wird aus Recherche Erkenntnis.“",
        "„Nimm dir Zeit fürs Lesen; Geschwindigkeit ersetzt kein Verständnis.“"
      ],
      beratung:[
        "„Im Beratungsraum geht es um nächste Schritte, nicht um perfekte Antworten.“",
        "„Wir sortieren erst die Lage und planen dann realistische Ziele.“",
        "„Gute Beratung heißt: zuhören, konkretisieren, verabreden.“"
      ],
      schule:[
        "„Schulalltag läuft besser mit klaren Absprachen und ruhigem Kopf.“",
        "„Wenn etwas hakt: Problem benennen, Option prüfen, Entscheidung treffen.“",
        "„Lernen ist kein Sprint — es ist saubere, wiederholte Praxis.“"
      ]
    };
    const subjectPools = {
      math:[
        "„In Mathe zählt der Lösungsweg. Ergebnis ohne Begründung ist nur geraten.“",
        "„Struktur schlägt Tempo: erst gegeben/gesucht, dann Rechnung.“",
        "„Jeder Rechenschritt muss überprüfbar sein — das ist die eigentliche Kompetenz.“"
      ],
      german:[
        "„Im Deutschunterricht trägt jedes Argument einen Beleg, sonst bleibt es Behauptung.“",
        "„Präzise Sprache ist kein Extra, sondern Teil der Aufgabe.“",
        "„Textverständnis heißt: zwischen den Zeilen begründet lesen.“"
      ],
      english:[
        "„In Englisch gilt: sprechen trotz Fehlern — Kommunikation vor Perfektion.“",
        "„Use simple structures first, then add detail.“",
        "„Vocabulary grows only when you use it actively.“"
      ],
      history:[
        "„Geschichte ist Deutung mit Quellen, nicht nur Jahreszahlen auswendig.“",
        "„Wir trennen Ereignis, Perspektive und Bewertung sauber voneinander.“",
        "„Ohne Kontext bleibt selbst ein Fakt missverständlich.“"
      ],
      sport:[
        "„Im Sport zählt Technik plus Fairness, nicht nur das Ergebnis.“",
        "„Konzentration im Ablauf spart Kraft und verhindert Fehler.“",
        "„Leistung wächst mit Disziplin, nicht mit Hektik.“"
      ],
      art:[
        "„Kunst heißt Entscheidungen sichtbar machen und begründen können.“",
        "„Idee, Form, Wirkung — diese drei Ebenen schauen wir uns immer an.“",
        "„Mut zur Überarbeitung ist oft der Schritt zur besseren Arbeit.“"
      ],
      chemistry:[
        "„Chemie braucht Genauigkeit: Mengen, Reihenfolge, Sicherheit.“",
        "„Reaktionen erklären wir mit Teilchenmodell und Beobachtung.“",
        "„Wer sauber misst, versteht später auch sauber.“"
      ],
      biology:[
        "„Biologie erklärt Zusammenhänge — vom Detail zum System.“",
        "„Wir arbeiten hypothesengeleitet, nicht nach Gefühl.“",
        "„Wer Prozesse versteht, kann auch Ausnahmen einordnen.“"
      ],
      geography:[
        "„Erdkunde verbindet Raum, Ressourcen und menschliche Entscheidungen.“",
        "„Karten lesen heißt Muster erkennen und Ursachen erklären.“",
        "„Lokale Beobachtung ohne globalen Kontext ist zu kurz gedacht.“"
      ],
      ethics:[
        "„In Werte und Normen zählt die Begründung, nicht Lautstärke.“",
        "„Wir prüfen Positionen fair, auch wenn wir sie nicht teilen.“",
        "„Gute Urteile entstehen durch Perspektivwechsel und klare Kriterien.“"
      ],
      general:[
        "„Professionell arbeiten heißt: ruhig analysieren, dann handeln.“",
        "„Wir lösen Probleme nachvollziehbar, damit andere anknüpfen können.“",
        "„Lernen gelingt besser mit Klarheit als mit Druck.“"
      ]
    };
    const roomLine = pickRandom(roomPools[roomKey] || roomPools.schule);
    const subjectLine = pickRandom(subjectPools[subjectKey] || subjectPools.general);
    return pickRandom([roomLine, subjectLine]);
  }

  // Erreichbarkeit (Stand: E2E-getestet):
  //   - Klassenraum-Schüler*innen und Lehrkräfte werden in cmdTalk von früheren
  //     Zweigen (Flavor-Lines + Gerüchte bzw. Fach-Pools) abgefangen — sie sehen
  //     diesen Baum nicht.
  //   - Der "student"-Baum öffnet sich für generische Schüler-NPCs außerhalb der
  //     Klassenräume ohne eigenen Branch (z.B. nagel im SV-Büro).
  //   - Der "teacher"-Zweig unten ist derzeit NICHT verdrahtet: cmdTalk schließt
  //     Lehrkräfte vor dem Baum-Zweig aus (isTeacherNpc-Gate). Wer Lehrkräften
  //     Mehrstufen-Dialoge geben will, muss dieses Gate in cmdTalk lockern.
  function buildNpcDialogTree(npcId, npc){
    const shortName = String((npc && npc.name) || npcId || "NPC").split(" ")[0];
    const teacherName = getTeacherDialogName(npc);
    let hash = 0;
    for(const ch of String(npcId||"")) hash = (hash * 33 + ch.charCodeAt(0)) >>> 0;

    if(getNpcDialogType(npcId, npc) === "teacher"){
      const roleText = String((npc && npc.role) || "Unterricht");
      const teacherOpeners = getTeacherOpenerPool(roleText);
      const planOptions = [
        { label:`Wie priorisiere ich Aufgaben in ${roleText}?`, response:"„Sortiere nach Wirkung: erst das, was den nächsten Fortschritt freischaltet.“" },
        { label:"Ich brauche eine Reihenfolge statt Trial-and-Error.", response:"„Dann gehst du so: Ziel lesen, Fundort prüfen, erst dann handeln.“" },
        { label:"Wie erkenne ich früh, dass mein Ansatz nicht trägt?", response:"„Wenn du viel tippst, aber nichts Neues lernst, brauchst du einen Kurswechsel.“" },
        { label:"Wie halte ich den Überblick bei mehreren To-dos?", response:"„Maximal drei aktive Schritte. Alles andere kommt auf die Parkliste.“" },
        { label:"Wie plane ich kurze, aber effektive Lernblöcke?", response:"„25 Minuten Fokus, 5 Minuten Check — dann bewusst neu priorisieren.“" },
        { label:`Was wäre ein guter Arbeitsmodus für ${teacherName}?`, response:"„Ruhig, präzise, überprüfbar. Kein Aktionismus ohne Kontrollpunkt.“" }
      ];
      const learnOptions = [
        { label:`Wie lerne ich ${roleText} nachhaltiger?`, response:"„Nicht nur Lösungen sammeln — Muster notieren und aktiv wiederholen.“" },
        { label:"Ich will Kommandos verstehen, nicht nur kopieren.", response:"„Frag immer: Was ändert sich, was bleibt, woran erkenne ich Erfolg?“" },
        { label:"Wie trainiere ich Ruhe in Prüfungsphasen?", response:"„Routinen schlagen Panik. Kleine, feste Abläufe geben Sicherheit.“" },
        { label:"Wie werde ich sicherer beim Erklären meiner Lösung?", response:"„Erkläre in drei Sätzen: Ausgangslage, Aktion, Ergebnis.“" },
        { label:"Wie baue ich ein gutes persönliches Nachschlage-System?", response:"„Dokumentiere kurz: Ursache, Kommando, Wirkung, nächster Check.“" },
        { label:"Wie steigere ich Qualität, ohne zu langsam zu werden?", response:"„Präzision zuerst. Tempo kommt als Nebenprodukt von Klarheit.“" }
      ];
      const talkOptions = [
        { label:"Was ist Ihr Anti-Stress-Trick im Unterricht?", response:"„Komplexes in kleine, überprüfbare Schritte zerlegen.“" },
        { label:"Was nervt Lehrkräfte bei chaotischen Abgaben am meisten?", response:"„Unklare Benennung. Gute Struktur spart allen Zeit.“" },
        { label:"Welche Gewohnheit bringt im Schulalltag den größten Effekt?", response:"„Vor jedem Schritt kurz prüfen: Hilft das wirklich dem Ziel?“" },
        { label:"Was schätzen Sie bei Schüler*innen am meisten?", response:"„Saubere Fragen. Die zeigen bereits gutes Denken.“" },
        { label:`Was ist Ihr Standardsatz für ${roleText}?`, response:"„Erst verstehen, dann ausführen, dann kontrollieren.“" },
        { label:"Wie bleiben Sie in stressigen Wochen gelassen?", response:"„Ich priorisiere nach Wirkung, nicht nach Lautstärke.“" }
      ];
      const pickUnique = (pool, start)=>{
        const len = pool.length;
        const first = pool[start % len];
        const second = pool[(start + 2 + ((hash >>> 3) % (len - 1))) % len];
        return [first, second];
      };

      const opener = teacherOpeners[hash % teacherOpeners.length];
      const [planA, planB] = pickUnique(planOptions, hash + 1);
      const [learnA, learnB] = pickUnique(learnOptions, hash + 5);
      const [talkA, talkB] = pickUnique(talkOptions, hash + 9);

      return {
        intro: `${teacherName} schaut dich an: ${opener}\n${teacherName}: „Okay, wir klären dein Thema ohne Umwege.“`,
        nodes: {
          start: { prompt:"Wie antwortest du?", choices:[
            { label: planA.label, response: planA.response, next:"plan" },
            { label: learnA.label, response: learnA.response, next:"learning" },
            { label: talkA.label, response: talkA.response, next:"smalltalk" }
          ]},
          plan: { prompt:"Worauf willst du den Fokus setzen?", choices:[
            { label: planB.label, response: planB.response, next:"plan_deep" },
            { label:"Gib mir bitte eine 3-Punkte-Checkliste.", response:"„1) Auftrag klären. 2) Konkreten Schritt ausführen. 3) Ergebnis validieren.“", next:"plan_deep" },
            { label:"Reicht mir erstmal, ich setze das direkt um.", response:"„Sehr gut. Sauber anfangen ist die halbe Lösung.“", next:"endnode" }
          ]},
          plan_deep: { prompt:"Noch eine Ebene tiefer?", choices:[
            { label:"Ja: Wie teile ich große Aufgaben sinnvoll auf?", response:"„Orientierung, Umsetzung, Kontrolle — und nach jedem Block ein sichtbares Ergebnis.“", next:"endnode" },
            { label:"Nein, ich hab jetzt einen klaren Plan.", response:"„Perfekt. Dann arbeite Schritt für Schritt.“", next:"endnode" }
          ]},
          learning: { prompt:"Welcher Lernaspekt hilft dir jetzt am meisten?", choices:[
            { label: learnB.label, response: learnB.response, next:"learning_deep" },
            { label:"Wie baue ich mir ein eigenes Nachschlage-System auf?", response:"„Dokumentiere gelöste Probleme kurz mit Ursache, Aktion, Ergebnis.“", next:"learning_deep" },
            { label:"Danke, das reicht für jetzt.", response:"„Top. Hauptsache, du setzt es direkt in Handlung um.“", next:"endnode" }
          ]},
          learning_deep: { prompt:"Letzter Lern-Impuls?", choices:[
            { label:"Ja, bitte einen konkreten Übungsmodus.", response:"„Nimm einen Befehl pro Session und teste gezielt Varianten statt alles gleichzeitig.“", next:"endnode" },
            { label:"Nein, ich starte direkt mit den Tipps.", response:"„Sehr gut. Routine entsteht durchs Tun.“", next:"endnode" }
          ]},
          smalltalk: { prompt:"Noch eine Frage?", choices:[
            { label: talkB.label, response: talkB.response, next:"endnode" },
            { label:"Was wäre ein guter Standardsatz gegen Chaos?", response:"„Erst verstehen, dann ausführen, dann kontrollieren.“", next:"endnode" }
          ]},
          endnode: { prompt:"Zum Abschluss?", choices:[
            { label:"Danke, das war hilfreich.", end:true, response:"„Gern. Meld dich, wenn du beim nächsten Schritt hängst.“" },
            { label:"Ich probiere es jetzt direkt aus.", end:true, response:"„Sehr gute Entscheidung — direkt anwenden verankert es am besten.“" }
          ]}
        }
      };
    }

    const studentStyles = [
      {
        intro:`„${shortName} dreht sich zu dir: 'Yo, was geht gerade ab?'“`,
        helpA:{ label:"Ich hänge fest — kannst du kurz mitdenken?", response:"„Klar. Mit Plan ist das direkt weniger wild.“" },
        helpB:{ label:"Was war dein bester Move gegen Quest-Chaos?", response:"„Ich fang immer mit einem Mini-Schritt an und check danach sofort den Stand.“" },
        vibeA:{ label:"Wie bleibst du entspannt, wenn alles gleichzeitig kommt?", response:"„Ich nehme erst eine Sache auseinander, nicht fünf auf einmal.“" },
        vibeB:{ label:"Welche Gewohnheit hat dir am meisten geholfen?", response:"„Kurz notieren, was funktioniert hat. Dann muss ich's nicht jedes Mal neu erfinden.“" }
      },
      {
        intro:`„${shortName} hebt die Hand zum Gruß: 'Brauchst du kurz Backup?'“`,
        helpA:{ label:"Ja, ich brauche einen klaren nächsten Schritt.", response:"„Safe. Erst Standort checken, dann gezielt suchen, dann validieren.“" },
        helpB:{ label:"Wie vermeide ich dieselben Fehler immer wieder?", response:"„Nach jedem Fail kurz Ursache notieren. Das spart später richtig Zeit.“" },
        vibeA:{ label:"Wie gehst du mit Frust in Abgaben um?", response:"„Kurz resetten, dann klein neu starten. Sonst driftet man komplett weg.“" },
        vibeB:{ label:"Was motiviert dich bei nervigen Aufgaben?", response:"„Mini-Erfolge sammeln. Die ziehen dich durch den Rest.“" }
      },
      {
        intro:`„${shortName} grinst: 'Lass kurz sortieren, was dein nächster Win sein kann.'“`,
        helpA:{ label:"Ich brauche Struktur, nicht noch mehr Inputs.", response:"„Fair. Dann machen wir nur einen klaren Pfad statt zehn Ideen.“" },
        helpB:{ label:"Hast du eine schnelle Methode für Fokus?", response:"„Ja: Timer an, ein Ziel, null Kontextwechsel bis der Timer klingelt.“" },
        vibeA:{ label:"Wie bleibst du bei Prüfungsstress stabil?", response:"„Mit festen Abläufen. Dann ist der Kopf nicht komplett auf Alarm.“" },
        vibeB:{ label:"Was sagst du dir, wenn's gar nicht läuft?", response:"„Ein sauberer Schritt reicht erstmal. Perfekt muss es jetzt nicht sein.“" }
      }
    ];

    const style = studentStyles[hash % studentStyles.length];
    return {
      intro: style.intro,
      nodes: {
        start: { prompt:"Wie reagierst du?", choices:[
          { label: style.helpA.label, response: style.helpA.response, next:"help" },
          { label:"Ich will lernen, das nächstes Mal selbst zu lösen.", response:"„Stark. Dann bauen wir dir eine eigene Mini-Methode.“", next:"growth" },
          { label: style.vibeA.label, response: style.vibeA.response, next:"vibe" }
        ]},
        help: { prompt:"Was brauchst du konkret?", choices:[
          { label: style.helpB.label, response: style.helpB.response, next:"endnode" },
          { label:"Gib mir eine 3-Schritte-Notfallroutine.", response:"„Ziel lesen, einen Schritt machen, Ergebnis prüfen. Dann wiederholen.“", next:"endnode" }
        ]},
        growth: { prompt:"Worauf willst du langfristig gehen?", choices:[
          { label:"Mehr Selbstständigkeit bei kniffligen Aufgaben.", response:"„Dann dokumentierst du ab heute kurz jeden gelösten Knoten.“", next:"endnode" },
          { label:"Sicherer werden beim Erklären vor anderen.", response:"„Erklär deinen Lösungsweg erst dir selbst laut in 3 Sätzen.“", next:"endnode" }
        ]},
        vibe: { prompt:"Noch eine kurze Frage?", choices:[
          { label: style.vibeB.label, response: style.vibeB.response, next:"endnode" },
          { label:"Hast du einen Satz, der sofort den Druck rausnimmt?", response:"„Nicht alles auf einmal. Ein klarer Schritt reicht für jetzt.“", next:"endnode" }
        ]},
        endnode: { prompt:"Zum Abschluss?", choices:[
          { label:"Danke dir, das hilft mir echt.", end:true, response:"„Gern. Ping mich, wenn du wieder Input brauchst.“" },
          { label:"Ich setze das jetzt direkt um.", end:true, response:"„Nice. Genau so kommt Momentum rein.“" }
        ]}
      }
    };
  }

  function renderNpcDialogNode(npcId, npc){
    const tree = buildNpcDialogTree(npcId, npc);
    const node = tree.nodes[state.npcDialog.nodeId || "start"] || tree.nodes.start;
    const speakerName = getDialogSpeakerName(npcId, npc);
    let out = `🗨️ ${speakerName} — ${npc.role}
`;
    if((state.npcDialog.nodeId || "start") === "start") out += `${tree.intro}

`;
    out += `${node.prompt}
`;
    node.choices.forEach((choice, idx)=>{ out += `  (${idx+1}) ${choice.label}
`; });
    out += `  (0) Gespräch beenden

Eingabe: choose <nummer>`;
    return out;
  }

  // cmdTalk — Implementierung des talk-Befehls (aus cmdImpl in commands.js extrahiert).
  // Enthält NPC-Auflösung, Story-/Sidequest-Branches (Winkelmann, beamter, Job-NPCs),
  // Lehrer-/Schüler-Dialoge und das Gerüchte-System.
  function cmdTalk(args){
        const raw = (args.join(" ")||"").trim();
        if(!raw) return { ok:false, out:"talk: missing npc name (z.B. talk remmers)" };

        // Wenn vorher ein NPC-spezifischer Custom-Branch (z.B. Noah-Lag-Choices) offen war
        // und der Spieler ohne `choose` einfach zu einem anderen NPC läuft, würde ein
        // späteres `choose N` sonst noch in den alten Branch gehen. Daher: bei JEDEM neuen
        // talk den NPC-Dialog-State neutralisieren — die Story-Branches setzen ihn ggf.
        // gleich wieder neu.
        if(state.npcDialog && state.npcDialog.nodeId === "lag_choices"){
          resetNpcDialog();
        }

        const normalizeToken = (s)=>String(s||"")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/^["'`]+|["'`]+$/g, "")
          .replace(/[^a-z0-9äöüß]+/g, "")
          .trim();
        const nameTokens = (s)=>String(s||"")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/["'`]/g, "")
          .split(/[^a-z0-9äöüß]+/)
          .map(t=>t.trim())
          .filter(Boolean);

        const query = raw.toLowerCase();
        const qTokens = nameTokens(raw);
        const qNormSingle = normalizeToken(raw);
        const here = state.cwd;

        // resolve NPC by id OR by name substring (so: talk remmers / talk zoe)
        let id = query.split(/\s+/)[0].replace(/^["'`]+|["'`]+$/g, "");
        let npc = NPCS[id];
        if(npc && !(npc.at||[]).includes(here)) npc = null;

        if(!npc){
          let best = null;
          let bestScore = -1;
          for(const nid in NPCS){
            const n = NPCS[nid];
            if(!(n.at||[]).includes(here)) continue;
            const nm = String(n.name||"").toLowerCase();
            const nmNormSingle = normalizeToken(n.name);
            const nmTokens = nameTokens(n.name);

            if(qNormSingle && (qNormSingle === normalizeToken(nid) || qNormSingle === nmNormSingle)){
              best = nid;
              bestScore = 999;
              break;
            }

            let score = 0;
            for(const t of qTokens){
              const tokNorm = normalizeToken(t);
              if(!tokNorm) continue;
              if(nmNormSingle.includes(tokNorm)) score += 2;
              if(nmTokens.includes(tokNorm)) score += 3;
            }
            const last = normalizeToken(qTokens[qTokens.length-1]);
            if(last && nmTokens.includes(last)) score += 3;
            if(score > bestScore){ bestScore = score; best = nid; }
          }
          if(best && bestScore >= 2){
            id = best;
            npc = NPCS[best];
          }
        }

        if(!npc) return { ok:false, out:`talk: '${raw}' ist hier nicht (oder existiert nicht). Tipp: Schau bei "NPCs hier" im aktuellen Raum nach.` };

        state.flags.talked[id] = true;
        let out = `🗨️ ${npc.name} — ${npc.role}\n`;

// Keller-Gerüchte: nur Schüler-NPCs, und nur als Anhang unter dem normalen Text
// (Lehrkräfte geben keine Gerüchte von sich.)
const isStudent = (nid, n) => {
  // lokal für Rumor-Logik; globale Teacher-Erkennung nutzt isStudentNpc().
  const role = String((n && n.role) || "").toLowerCase();
  return role.includes("schüler") || role.includes("schueler") || /^s_\d/i.test(nid) || /^s_/i.test(nid);
};
// Fallback-Gerüchtepool, falls einzelne Schüler-NPCs keine eigenen rumorLines haben.
// Dadurch bekommt man auch bei vielen neuen generischen Schülern regelmäßig Keller-Hinweise.
const RUMOR_POOL = [
  "„Wenn ein Raum ‘zu sauber’ wirkt… geh nicht allein rein.“",
  "„Unten soll’s eine Tür geben, die manchmal… summt.“",
  "„Hausmeister sagt ‘nur Leitungen’. Aber warum ist es dann so kalt da?“",
  "„Ich hab einmal unten Schritte gehört, aber da war niemand. Kein Witz.“",
  "„Manche sagen: Wenn die Neonröhre flackert, ist ‘was’ online.“",
  "„Da gibt’s angeblich ’nen Bereich ohne WLAN… aber dein Handy vibriert trotzdem.“",
  "„Wenn du unten ‘nen Ventilator hörst: Das ist kein Ventilator.“",
  "„Jemand hat ‘KELLER = DEBUG’ an die Tafel geschrieben. Keine Ahnung was das heißt.“",
  "„Wenn du den Geruch von Ozon merkst… nope.“",
  "„Ich schwör, da unten ist ‘ne Ecke, die sich wie ein Loading-Screen anfühlt.“"
];
const maybeAppendRumor = () => {
  // Nach dem Fix: keine Keller-Gerüchte mehr (Story ist dann "durch").
  if(state.flags && state.flags.system_fixed) return;

  // Nur vor der Sidequest-Unlock-Story, damit Winkelmanns Arc nicht sofort gespoilert wird.
  if(state.sidequest && state.sidequest.unlocked) return;
  if(id === "winkelmann") return;
  if(!isStudent(id, npc)) return;
  const lines = (npc.rumorLines && npc.rumorLines.length) ? npc.rumorLines : RUMOR_POOL;
  if(!lines || !lines.length) return;

  // nicht jedes Mal — Ziel: ca. jeder 10. Schüler-Dialog enthält ein Gerücht
  let chance = 0.07;
  if((state.cwd||"").startsWith("/school/keller")) chance = 0.18;
  else if((state.cwd||"").startsWith("/school")) chance = 0.10;

  if(Math.random() < chance){
    const line = lines[Math.floor(Math.random()*lines.length)];
    out += "\n\n(🗝️ flüstert) " + line;
  }
};

        // Lehrerzimmer: Lehrkräfte reagieren verdutzt und schicken dich freundlich-bestimmt raus.
        if(here === "/school/lehrerzimmer" && String(id).startsWith("lz_")){
          const lines = [
            "„Äh… warum bist du im Lehrerzimmer? Das ist ein Personalbereich.“",
            "„Moment mal — Schüler*innen haben hier nichts verloren. Bitte raus auf den Flur.“",
            "„Du bist nicht falsch abgebogen, oder? Lehrerzimmer ist kein Aufenthaltsraum für Lernende.“",
            "„Wir haben gleich Konferenz. Du bitte jetzt direkt wieder raus, danke.“",
            "„Das hier ist intern. Wenn du ein Anliegen hast: Sekretariat, nicht Lehrerzimmer.“",
            "„Ich bin gerade etwas verdutzt, dass du hier einfach reinspazierst.“",
            "„Nein, das ist nicht der PC‑Raum. Und ja: du musst leider wieder raus.“",
            "„Bitte keine Schränke, keine Ordner, keine Ausnahmen — raus aus dem Lehrerzimmer.“",
            "„Ich sag’s nett: falscher Raum für dich. Ab auf den Flur.“",
            "„Du willst sicher nichts Böses — aber hier hast du wirklich nichts verloren.“"
          ];
          const spice = [
            "(Im Hintergrund: „Wer hat den Kaffeeplan schon wieder umgehängt?!“)",
            "(Leise) „Und falls irgendwo ‚Permission denied‘ steht: Das ist hier Absicht.“",
            "(Du hörst hektisches Papierrascheln und entscheidest dich, lieber nicht weiter zu fragen.)"
          ];
          out += lines[Math.floor(Math.random()*lines.length)];
          if(Math.random() < 0.4) out += "\n\n" + spice[Math.floor(Math.random()*spice.length)];
          saveState();
          return { ok:true, out };
        }
// === Sidequest NPC: Herr Dr. Winkelmann (Physik-Zaubermeister) ===
        if(id === "winkelmann"){
          state.sidequest.unlocked = true;
          state.sidequest.stage = Math.max(state.sidequest.stage, 1);
          state.sidequest.dialog = "winkelmann";
          // Teile zählen als "abgegeben", sobald sie in ~/workbench/ liegen.
          state.sidequest.parts = state.sidequest.parts || {};
          const wb = "/home/player/workbench";
          if(getNode(wb + "/photon_linse.part")) state.sidequest.parts.lens = true;
          if(getNode(wb + "/gyro_spule.part")) state.sidequest.parts.coil = true;
          if(getNode(wb + "/usv_modul.part")) state.sidequest.parts.ups = true;

          const p = state.sidequest.parts||{};
          const d = state.sidequest.net||{};
          const t = state.sidequest.traces||{};
          const clean = !t.gym && !t.igs;

          out += "🧙‍♂️ Herr Dr. Winkelmann — „Lehrling… du bist gekommen.“\n";
          out += "„Physik ist eine Sprache, um Chaos zu bändigen.“\n";
          out += "„Und heute bändigen wir: Eindringlinge aus fremden Netzen.“\n\n";

          // Reaktionen auf den Spielzustand: heiße Logs, halbe Artefakt-Sammlung,
          // falsch abgelegte Artefakte, fast volle Trace-Leiste.
          const misplacedBlueprint = Object.keys(FS).some(pth=>pth.startsWith("/home/player/") && pth.endsWith("/blueprint.dat") && !pth.startsWith("/home/player/workbench/"));
          const misplacedShield = Object.keys(FS).some(pth=>pth.startsWith("/home/player/") && pth.endsWith("/shield.key") && !pth.startsWith("/home/player/workbench/"));
          const tm = state.sidequest.traceMeter || {gym:0,igs:0};
          const reactions = [];
          if((t.gym || t.igs) && !(t.gym && t.igs)){
            reactions.push("„Ich rieche heiße Logs… du warst irgendwo drin. Wisch deine Spuren, Lehrling.“");
          }
          if(t.gym && t.igs){
            reactions.push("„Bro… beide Logs brennen. Das ist kein Stealth, das ist ein Feuerwerk. logwipe.“");
          }
          if((d.blueprint && !d.shield) || (d.shield && !d.blueprint)){
            reactions.push("„Halbe Artefakt‑Sammlung ist wie halber Taschenrechner: bringt dich nicht durch.“");
          }
          if(misplacedBlueprint || misplacedShield){
            reactions.push("„Und noch was: Artefakte gehören in DEINE Workbench. Nicht irgendwohin. ~/workbench/.“");
          }
          if(tm.gym >= 70 || tm.igs >= 70){
            reactions.push("„Die Trace‑Leiste ist fast voll… noch ein Move und das Netz schreit. logwipe. Jetzt.“");
          }
          if((d.blueprint && d.shield) && (t.gym || t.igs)){
            reactions.push("„Daten hast du — aber die Logs sind noch heiß. Ohne saubere Spuren kein Ritual.“");
          }
          if(reactions.length) out += reactions.join("\n") + "\n\n";

          out += "Wähle ein Thema:\n";
          out += "  (1) Was ist die Maschine?\n";
          out += "  (2) Welche Bauteile fehlen?  (Hinweis: in ~/workbench/ ablegen)\n";
          out += "  (3) Netzwerk‑Mission (Hacknet‑Style)\n";
          out += "  (4) Status / was fehlt mir noch?\n";
          out += "  (5) Wie benutze ich den SUPER‑PC?\n";
          out += "  (6) Ritual: Maschine reparieren\n\n";
          out += "Eingabe: choose <nummer>   (z.B. choose 3)\n\n";
          out += `Kurzstatus: Teile ${(p.lens&&p.coil&&p.ups)?"✅":"⏳"}  Daten ${(d.blueprint&&d.shield)?"✅":"⏳"}  Spuren ${clean?"🟢":"🔴"}`;

          maybeAppendRumor();
          saveState();
          return { ok:true, out };
        }

        // --- Phase 5 NPCs (Arbeitsamt / Real Life) ---
        if(id==="beamter"){
          // Nur nach finalem Zeugnis
          if(!(state.flags && state.flags.job_arc_unlocked)){
            out += `„...ich hab grad Pause. Komm wieder, wenn du überhaupt ein Zeugnis hast.“`;
            saveState();
            return { ok:true, out };
          }
          if(state.phase < 5){
            out += `„Du bist noch nicht mal hier eingecheckt. Geh erst rein: cd /arbeitsamt“`;
            saveState();
            return { ok:true, out };
          }

          state.jobArc = state.jobArc || { active:true, stage:0, quests:{ snackmaster:false, ars:false, ohlendorf:false, berndt:false, cms:false }, startedAt: now() };
          state.jobArc.active = true;
          state.jobArc.startedAt = state.jobArc.startedAt || now();
          state.flags.job_arc_started = true;

          const q = state.jobArc.quests || {};
          const allDone = !!(q.snackmaster && q.ars && q.ohlendorf && q.berndt && q.cms);
          if(allDone){
            if(!state.flags.job_arc_done){
              state.flags.job_arc_done = true;
              // Jobangebot reinschreiben
              try{
                const jo = getNode("/arbeitsamt/jobangebot.txt");
                if(jo && jo.type==="file"){
                  jo.content = `JOBANGEBOT — FINAL\n\nBetreff: „Shell‑Allrounder*in (m/w/d)“\n\nDu hast:\n- Logs gescannt (grep)\n- Dateien gefunden (find)\n- Ordnung gebaut (mkdir/cp)\n- Rechte gefixt (chmod)\n- Prozesse gekillt (kill)\n- Dokumentation erstellt (echo > file)\n\nKurz: Du kannst Probleme lösen.\n\nGlückwunsch. Du bist offiziell ready für Real Life.\n\n(Und ja: das war Phase 5. GG.)`;
                }
              }catch(e){}
              award("badge_job");
            }
            out += `„Aha.“\n\n`;
            out += `„Alle Quests erledigt. Ich... bin beeindruckt. Ein bisschen.“\n`;
            out += `„Hier. Dein Jobangebot. Bitte nicht knicken. Das ist... Papierarbeit.“\n\n`;
            out += `Tipp: cat /arbeitsamt/jobangebot.txt`;
            saveState();
            renderObjectives();
            return { ok:true, out };
          }

          // Nächste offene Quest ansagen
          let next = null;
          if(!q.snackmaster) next = "snackmaster";
          else if(!q.ars) next = "ars_recycling";
          else if(!q.ohlendorf) next = "ohlendorf_technik";
          else if(!q.berndt) next = "berndt_moebel";
          else if(!q.cms) next = "cms";

          out += `„Nummer gezogen? Egal."\n`;
          out += `„Du willst Arbeit? Ich hab Arbeit."\n\n`;
          out += `Deine nächste Station: /real_life/${next}\n`;
          out += `Geh hin: cd /real_life/${next}\n`;
          out += `Dann: cat quest.txt  und talk mit der Person dort.\n\n`;
          out += `Status: SNACKMASTER ${q.snackmaster?"✅":"⏳"} · A‑R‑S ${q.ars?"✅":"⏳"} · Ohlendorf ${q.ohlendorf?"✅":"⏳"} · Berndt ${q.berndt?"✅":"⏳"} · CMS ${q.cms?"✅":"⏳"}`;
          saveState();
          renderObjectives();
          return { ok:true, out };
        }

        if(id==="jansen"){
          if(state.phase < 5) {
            out += `„Wir sind grad im Stress. Komm später."`;
            saveState();
            return { ok:true, out };
          }
          const q = (state.jobArc && state.jobArc.quests) ? state.jobArc.quests : {};
          // Auto-detect completion: if the ticket is readable in Workbench (either in /ohlendorf or directly in ~/workbench)
          try{
            if(!q.ohlendorf && state.phase >= 5){
              const paths = ["/home/player/workbench/ohlendorf/ticket_net.txt", "/home/player/workbench/ticket_net.txt"];
              for(const p of paths){
                const rf = readFileChecked(p);
                if(rf.ok && String(rf.content||"").includes("JOB_OHLENDORF_OK")){
                  state.jobArc = state.jobArc || { active:true, stage:0, quests:{ snackmaster:false, ars:false, ohlendorf:false, berndt:false, cms:false } };
                  state.jobArc.active = true;
                  state.jobArc.quests = state.jobArc.quests || {};
                  state.jobArc.quests.ohlendorf = true;
                  break;
                }
              }
            }
          }catch(e){ console.warn("[SchwarmShell] Quest-Trigger fehlgeschlagen:", e); }
          // Accept if player placed the plan either in ~/workbench/ars/ OR directly in ~/workbench/
          try{
            const p1 = "/home/player/workbench/abholplan_2026.csv";
            const p2 = "/home/player/workbench/ars/abholplan_2026.csv";
            if(!q.ars && state.phase >= 5){
              if(getNode(p1)?.type==="file" || getNode(p2)?.type==="file"){
                state.jobArc = state.jobArc || { active:true, stage:0, quests:{ snackmaster:false, ars:false, ohlendorf:false, berndt:false, cms:false } };
                state.jobArc.active = true;
                state.jobArc.quests = state.jobArc.quests || {};
                state.jobArc.quests.ars = true;
              }
            }
          }catch(e){ console.warn("[SchwarmShell] Quest-Trigger fehlgeschlagen:", e); }
          if(q.snackmaster){
            out += `„Etikett stimmt. Allergene sind drin. Du hast uns grad ... gerettet."\n\n`;
            out += `„Sag dem Beamten, er soll aufhören zu gähnen."`;
            saveState();
            return { ok:true, out };
          }
          out += `„HACCP-Audit ist kurz vorm Explodieren."\n`;
          out += `„Wenn du die richtige Zeile findest: ich brauch den Marker."\n\n`;
          out += `Tipp: Im Audit-Log gibt’s einen Abschnitt zu Allergenen – such die passende Stelle und notier dir den Marker.`;
          saveState();
          return { ok:true, out };
        }

        if(id==="wiebe"){
          if(state.phase < 5){
            out += `„Wir fahren hier keine Schul-Quests."`;
            saveState();
            return { ok:true, out };
          }
          const q = (state.jobArc && state.jobArc.quests) ? state.jobArc.quests : {};
          if(q.ars){
            out += `„Plan ist da. Ich seh ihn. Ich atme wieder."\n\n`;
            out += `„Geh zurück zum Arbeitsamt. Die lieben Papier."`;
            saveState();
            return { ok:true, out };
          }
          out += `„Der Abholplan ist irgendwo in den Docs."\n`;
          out += `„Find ihn. Kopier ihn in deine Workbench. Schnell."\n\n`;
          out += `Tipp: Such nach dem Dateinamen in den Unterlagen und lege eine Kopie in deiner Workbench ab.`;
          saveState();
          return { ok:true, out };
        }

        if(id==="neele"){
          if(state.phase < 5){
            out += `„Wir sind grad im Netz-Notfall."`;
            saveState();
            return { ok:true, out };
          }
          const q = (state.jobArc && state.jobArc.quests) ? state.jobArc.quests : {};
          if(q.ohlendorf){
            out += `„Yes. Rechte gefixt, Ticket gelesen. Das war ... actually clean."\n\n`;
            out += `„Okay, zurück zum Arbeitsamt mit dir."`;
            saveState();
            return { ok:true, out };
          }
          out += `„Ich hab ein Ticket, aber es darf nicht jeder lesen."\n`;
          out += `„Kopier’s in deine Workbench, dann fix die Rechte. Erst dann lesen."\n\n`;
          out += `Tipp: cat quest.txt`;
          saveState();
          return { ok:true, out };
        }

        if(id==="tom"){
          if(state.phase < 5){
            out += `„Die Maschinen laufen. Oder auch nicht."`;
            saveState();
            return { ok:true, out };
          }
          const q = (state.jobArc && state.jobArc.quests) ? state.jobArc.quests : {};
          if(q.berndt){
            out += `„Lag ist weg. Produktion wieder smooth. Stabil."\n\n`;
            out += `„Arbeitsamt wartet schon mit der nächsten Nummer."`;
            saveState();
            return { ok:true, out };
          }
          out += `„Der Rechner hängt. Ich seh nur noch 2 FPS."\n`;
          out += `„Finde heraus, welcher Prozess alles ausbremst – und mach das Problem weg."\n\n`;
          out += `Tipp: Erst Prozessliste ansehen, dann den passenden Prozess gezielt stoppen.`;
          saveState();
          return { ok:true, out };
        }

        if(id==="holger"){
          if(state.phase < 5){
            out += `„Wir sind ein echter Betrieb. Komm wieder, wenn du im Real‑Life‑Teil bist."`;
            saveState();
            return { ok:true, out };
          }
          state.jobArc = state.jobArc || { active:true, stage:0, quests:{ snackmaster:false, ars:false, ohlendorf:false, berndt:false, cms:false }, startedAt: now() };
          state.jobArc.active = true;
          state.jobArc.quests = state.jobArc.quests || {};

          const q = state.jobArc.quests;
          if(q.cms){
            out += `„Die Abnahme‑Mappe ist sauber. Genau so will ich das sehen."`;
            out += `\n\n„Sag dem Arbeitsamt: CMS ist zufrieden."`;
            saveState();
            return { ok:true, out };
          }

          const requirements = [
            { label:"Elektro", path:"/home/player/workbench/cms/elektro/bericht.txt", token:"SICHERUNGSLABEL: CMS-EL-2048" },
            { label:"Fliesen", path:"/home/player/workbench/cms/fliesen/bericht.txt", token:"FUGENMIX: STEINGRAU-7" },
            { label:"Dach", path:"/home/player/workbench/cms/dach/bericht.txt", token:"DACHCODE: RINNE-R3" },
            { label:"Sanitär", path:"/home/player/workbench/cms/sanitaer/bericht.txt", token:"ROHRCHECK: DRUCK-1.6BAR" },
            { label:"Maler", path:"/home/player/workbench/cms/maler/bericht.txt", token:"FARBCODE: SAND-NEBEL-12" }
          ];
          const missing = [];
          for(const req of requirements){
            const rf = readFileChecked(req.path);
            if(!rf.ok || !String(rf.content||"").includes(req.token)){
              missing.push(req.label);
            }
          }

          const summaryPath = "/home/player/workbench/cms/abnahme/uebersicht.txt";
          const summary = readFileChecked(summaryPath);
          const summaryOk = summary.ok && requirements.every(req => String(summary.content||"").includes(req.token));

          if(missing.length === 0 && summaryOk){
            q.cms = true;
            out += `„Okay. Alle Fachbereiche sauber dokumentiert. Das ist echte Abnahme‑Qualität."`;
            out += `\n\n„Du hast dir die Empfehlung verdient. Ab zum Arbeitsamt."`;
            saveState();
            renderObjectives();
            return { ok:true, out };
          }

          out += `„Ich seh noch Lücken. CMS ist groß — wir brauchen jeden Bereich."`;
          out += `\n\nStatus:`;
          for(const req of requirements){
            const rf = readFileChecked(req.path);
            const ok = rf.ok && String(rf.content||"").includes(req.token);
            out += `\n- ${req.label}: ${ok ? "✅" : "⏳"}`;
          }
          out += `\n- Abnahme‑Übersicht: ${summaryOk ? "✅" : "⏳"}`;
          out += `\n\nTipp: cat /real_life/cms/quest.txt`;
          saveState();
          return { ok:true, out };
        }

        if(id==="semrau"){
          if(state.phase===1){
            out += `„Okay, ich sag’s wie’s ist: Das hier ist maximal sus.\n`
                + `Du machst Tutorial: keycard holen, dann Gate unlocken.\n`
                + `Bash ist wie Zauberspruch, nur ohne Umhang.“`;
          } else if(state.phase===2){
            out += `„Phase 2 ist grindy, aber fair.\n`
                + `Frag1: grep in Logs.\nFrag2: craften (mkdir/touch).\nFrag3: grep SIGNAL in frag_3.pipe.\n`
                + `Wenn du das kannst, bist du Shell‑Sorcerer.“`;
          } else {
            out += `„Phase 3 ist Bossfight.\n`
                + `find -> grep -n -> fix -> chmod +x -> ./script.\n`
                + `Du bist im Tech-Anime-Arc. Go.“`;
          }
        } else if(id==="ommen"){
          out += `„Ich weiß nicht, wer unsere Schule in ein Game verwandelt hat.\n`
              + `Aber ich weiß: Du packst das.\n`
              + `Mach Quests, hol dir Hilfe, und dann: zurück in die Realität.“`;
        } else if(id==="fischer"){
          out += `„grep -n gibt dir Zeilennummern.\n`
              + `Wie Map-Koordinaten — nur für Text.“`;
        } else if(id==="harries" || id==="pietsch"){
          const who = (id==="harries") ? "Frau Harries" : "Frau Pietsch";

          // === Zeugnis-Ende ===
          if(state.flags && state.flags.system_fixed){
            const zPath = "/school/sekretariat/zeugnis.txt";
            const zBetaPath = "/school/sekretariat/zeugnis_beta.txt";
            const zFinalPath = "/school/sekretariat/zeugnis_final.txt";

            // 1) Erstes Zeugnis (nach Bossfight)
            if(!state.flags.report_given){
              state.flags.report_given = true;

              const beta = `────────────────────────────
ZEUGNIS · KGS SCHWARMSTEDT
────────────────────────────

Name: Spieler*in
Klasse: ????

Informatik: 67
Begründung:
„Hat das System gefixt,
obwohl es nicht seine Aufgabe war.“

Bemerkung:
„67 – kein Perfect Run,
aber absolut Main-Character-Move.“

Status:
✔ bestanden
✔ respektvoll carried
✔ kein NPC geblieben
────────────────────────────`;

              try{
                const z = getNode(zPath);
                if(z && z.type==="file") z.content = beta;
                const zb = getNode(zBetaPath);
                if(zb && zb.type==="file") zb.content = beta;
              }catch(e){}

              out += `„Ach! Du bist das.\n`
                  + `Ja… das System läuft wieder. Unglaublich eigentlich.“\n\n`
                  + `Sie tippt etwas. Der Drucker rattert los.\n`
                  + `„Hier ist dein Zeugnis.“\n\n`
                  + beta + `\n\n`
                  + `(Tipp: Du kannst es auch mit cat ${zPath} anschauen.)

⚠️ Hinweis: Das sieht irgendwie komisch aus… sprich Frau Harries oder Frau Pietsch lieber nochmal darauf an.`;
              saveState();
              renderObjectives();
              return { ok:true, out };
            }

            // 2) Upgrade-Hinweis oder finales Zeugnis
            if(!state.flags.report_final){
              const canFinal = (state.phase >= 4) && (state.sidequest && state.sidequest.badge);

              if(!canFinal){
                out += `„Sag mal… du weißt schon, dass das Zeugnis technisch gesehen noch… Beta ist, oder?“\n\n`
                    + `„Du kannst ein neues bekommen.\n`
                    + `Aber nur, wenn du wirklich alles abgeschlossen hast:\n`
                    + `– Phase 4 (Mentor-Modus)\n`
                    + `– Bonus Points (Sidequest abgeschlossen)“`;
// Phase 3 soll erst nach diesem Gespräch als abgeschlossen gelten.
state.flags.report_followup = true;
if(state.phase === 3){
  state.phase = 4;
  state.cwd = "/mentor_hub";
  award("badge_mentor");
  out += `

✅ Phase 3 abgeschlossen.
🧑‍🤝‍🧑 Phase 4 unlocked: Mentor-Arc gestartet.
Tipp: cat /mentor_hub/quests.txt  und dann talk noah`;
  // UI direkt aktualisieren (Teleport/Phase sichtbar)
  try{
    promptEl.textContent = promptText();
    renderLocation();
    renderPhasePill();
  }catch(e){}
}

                saveState();
                renderObjectives();
                return { ok:true, out };
              }

              state.flags.report_final = true;

              const final = `────────────────────────────
ABSCHLUSSZEUGNIS · FINAL
────────────────────────────

Name: Spieler*in
Rolle: Systemfixer*in

Informatik: 1
Soziales Lernen: 1
Verantwortung: OP

Bemerkung:
„Hat verstanden, dass Wissen
nur dann etwas bringt,
wenn man es teilt.“

Status:
✔ abgeschlossen
✔ Mentor
✔ Realität gepatcht

GG.
────────────────────────────`;

              try{
                const z = getNode(zPath);
                if(z && z.type==="file") z.content = final;
                const zf = getNode(zFinalPath);
                if(zf && zf.type==="file") zf.content = final;
              }catch(e){}

              out += `„Okay.\nDas hier ist jetzt offiziell.“\n\n`
                  + `Der Drucker ist leise. Kein Flackern. Kein Glitch.\n\n`
                  + `„Du hast nicht nur gelernt.\nDu hast anderen geholfen.\nUnd das… zählt.“\n\n`
                  + final + `\n\n`
                  + `Danke fürs Spielen von SchwarmShell.\n\n`
                  + `Und jetzt mal Real Talk: Mit dem Zeugnis kannst du dich auch endlich um’n Job kümmern. 😅\n`
                  + `Check mal das Arbeitsamt, die haben safe Quests für dich.\n\n`
                  + `Neuer Ort unlocked: cd /arbeitsamt`;

              // Real-Life Arc freischalten
              state.flags.job_arc_unlocked = true;
              saveState();
              renderObjectives();
              return { ok:true, out };
            }

            // Wenn bereits final
            out += `„Du hast dein finales Zeugnis schon.\n`
                + `Ich würd’s an deiner Stelle safe nicht verlieren.“`;
            saveState();
            renderObjectives();
            return { ok:true, out };
          }

          // === Ticket-Quest (vor dem Bossfight) ===
          const ticketPath = "/home/player/workbench/ticket.md";
          const hasTicket = !!getNode(ticketPath);
          if(!hasTicket){
            out += `„Ticket? Ohne Ticket nix.\n`
                + `Lies /school/sekretariat/ticket.txt und bau ticket.md.\n`
                + `Bürokratie ist der Endboss, sorry not sorry.“`;
          }else{
            out += `„Ticket ist da.\nOkay: du bekommst ein offizielles ‚W‘.“`;
          }
        } else if(id==="jeske" || id==="biringer"){
          out += `„Real Talk: Wenn’s stressig wird, ist Pause kein L.
`
              + `Du musst nicht solo-queuen.“`;
        } else if(id==="noah"){
          // Anti-Softlock: Mentor-Prozesse (wieder) starten, sobald man mit Noah redet.
          if(state.phase >= 4){
            const wanted = [101, 202, 303];
            const cur = (state.processes || []);
            const pids = new Set(cur.map(p=>p.pid));
            const missing = (!cur.length) || wanted.some(pid => !pids.has(pid));
            if(missing){
              const baseProcs = [
                { pid: 101, name: "terminald", cpu: 3, mem: 42 },
                { pid: 202, name: "rgbd", cpu: 99, mem: 180 },
                { pid: 303, name: "patchwatch", cpu: 5, mem: 65 },
              ];
              const helped = (state.mentor && state.mentor.students_helped) ? state.mentor.students_helped : 0;
              const cleared = !!(state.mentor && state.mentor.clear_done);
              if(helped >= 3 && !cleared){
                baseProcs.push({ pid: 67, name: "quest_aktiv", cpu: 1, mem: 8 });
              }
              state.processes = baseProcs;
              saveState();
            } else {
              // Falls 3/3 schon erreicht sind, aber der Abschluss-Prozess fehlt.
              ensureQuestAktivProcess();
            }
          }
          if(state.phase < 4){
            out += `„Bro ich bin noch nicht mal im Mentor-Arc. 🤨“`;
          } else if(!state.mentor.lag_fixed){
            // Echte Verzweigung statt nur Hint-Wall: Spieler*innen wählen, wie sie das
            // Problem angehen. Jeder Pfad führt zum Ziel, vermittelt aber unterschiedliche
            // Konzept-Tiefe — das ist der Proof-of-Concept für "NPC mit Konsequenzen".
            state.npcDialog = { active:true, npcId:"noah", nodeId:"lag_choices" };
            out += `„Mein Terminal laggt SO HART. Es fühlt sich an wie 3 FPS.
`
                + `Kannst du bitte kurz schauen? Ich schwöre, irgendwas frisst CPU…“

Wie gehst du ran?
  (1) Einfach killen — was-auch-immer, weg damit.
  (2) Erst mit top schauen, was die CPU wirklich frisst.
  (3) Frag erstmal: „was ist überhaupt rgbd?“
  (0) Lass mich kurz nachdenken.

Tipp: choose 1   ·   choose 2   ·   choose 3`;
          } else {
            out += `„OMG danke! Es ist wieder smooth.
`
                + `Du bist legit Sysadmin-Core. W.“`;
          }
        } else if(id==="emma"){
          if(state.phase < 4){
            out += `„Ich bin noch nicht dran. Aber ich hab Angst. 😭“`;
          } else if(!state.mentor.history_checked){
            out += `„Ich hab so viel getippt und jetzt… ich weiß nicht mehr was.
`
                + `Kann man das irgendwie zurückspulen? Like… Verlauf?“
`
                + `Hint: history`;
          } else if(state.mentor.history_checked && state.mentor.students_helped < 2){
            state.mentor.students_helped = Math.max(state.mentor.students_helped, 2);
            award("badge_history");
            const scorePath = "/mentor_hub/arena2/score.txt";
            if(FS[scorePath]){
              FS[scorePath].content = FS[scorePath].content
                .replace("geholfene Leute: 1/3", "geholfene Leute: 2/3")
                .replace("geholfene Leute: 0/3", "geholfene Leute: 2/3");
            }
            out += `„Ahhh okay, jetzt seh ich’s. Ich hab einfach random Sachen gespammt.
`
                + `Danke, dass du nicht judged. (okay bisschen schon, aber nett).“`;
          } else {
            out += `„History ist lowkey OP. Danke nochmal.“`;
          }
        } else if(id==="leo"){
          if(state.phase < 4){
            out += `„Ich warte auf meinen Speedrun-Arc. 😤“`;
          } else if(!state.mentor.alias_made){
            out += `„Kann man so ein… Shortcut machen?
`
                + `Ich will nicht immer ls -l tippen. Ich will Macro. ll muss reichen.
`
                + `Hint: alias`;
          } else if(state.mentor.alias_made && state.mentor.students_helped < 3){
            state.mentor.students_helped = 3;
            // Nach 3/3: Abschluss-Prozess spawnen
            ensureQuestAktivProcess();
            const scorePath = "/mentor_hub/arena2/score.txt";
            if(FS[scorePath]){
              FS[scorePath].content = FS[scorePath].content
                .replace("geholfene Leute: 2/3", "geholfene Leute: 3/3")
                .replace("geholfene Leute: 1/3", "geholfene Leute: 3/3")
                .replace("geholfene Leute: 0/3", "geholfene Leute: 3/3");
            }
            out += `„YESSS. ll ist so clean.
`
                + `Du hast gerade mein Leben um 0.8 Sekunden pro Command verbessert.
`
                + `Das sind am Tag… sehr viele Sekunden. W.“`;
          } else {
            out += `„Alias ist einfach QoL-legendär.“`;
          }
        } else {
          
        // classroom role-based lines (teachers/students)
        if(npc && /Lehrkraft/i.test(String(npc.role||"")) && String(state.cwd||"").startsWith("/school/klassenraume")){
          const subj = (String(npc.role).match(/\(([^)]+)\)/)||[])[1] || "Unterricht";
          const lines = {
                        "Mathe":[
              "„Okay Leute, heute: Gleichungen. Und nein, ‚ich fühl das nicht‘ zählt nicht als Begründung.“",
              "„Rechnen ist wie Gaming: erst Mechanics, dann Game Sense. Also: sauber aufschreiben.“",
              "„Wenn ihr irgendwo hängen bleibt: schreibt den Schritt hin, nicht nur das Ergebnis.“",
              "„Tipp: erst Ordnung, dann Tempo. Mathe mag Struktur.“",
              "„Wer ‘ich kann das nicht’ sagt, ergänzt bitte: ‘…noch nicht’.“",
              "„Heute machen wir’s kurz: verstehen statt auswendig.“",
              "„Mini‑Check: Was ist gegeben? Was wird gesucht? Dann erst rechnen.“"
            ],
            "Deutsch":[
              "„Wir interpretieren jetzt den Text. Ja, auch wenn er nicht auf TikTok ist.“",
              "„Satzzeichen retten Leben. Mindestens die Noten.“",
              "„Belegstellen. Nicht ‘weil ich finde’. Danke.“",
              "„Wenn ihr’s nicht versteht: markiert Wörter, stellt Fragen, macht’s konkret.“",
              "„Schreibt so, dass jemand Fremdes euren Gedanken folgen kann.“",
              "„Heute: Argumente statt Meinung. Meinung darf rein – aber mit Begründung.“",
              "„Wir üben: klarer Anfang, roter Faden, sauberes Ende.“"
            ],
            "Englisch":[
              "„Let’s keep it simple: speak, even if it’s scuffed. Practice ist king.“",
              "„No cap: wer redet, lernt. Wer schweigt, bleibt im Bronze‑Rank.“",
              "„Mistakes are allowed. Silence is expensive.“",
              "„Today’s goal: one sentence more than last time.“",
              "„Vocabulary ist wie Loot – sammeln, benutzen, wiederholen.“",
              "„If you don’t know a word: describe it. Don’t freeze.“",
              "„Quick warm‑up: two minutes English only. Let’s go.“"
            ],
            "Bio":[
              "„Zellen sind basically Mini‑Fabriken. Und wenn da was glitched, wird’s spannend.“",
              "„Wenn ihr ‚ew‘ sagt, weil’s um Organe geht: welcome to Bio.“",
              "„Biologie ist Alltag – Essen, Schlaf, Stress: alles Bio.“",
              "„Merke: Struktur + Funktion. Warum ist es so gebaut?“",
              "„Heute schauen wir uns an, wie Systeme zusammenarbeiten. Wie ein Team.“",
              "„Wenn’s kompliziert wirkt: erst grob verstehen, dann Details.“",
              "„Kurzer Reality‑Check: Ihr seid auch Biologie. 😄“"
            ],
            "Geschichte":[
              "„Geschichte ist nicht nur Daten auswendig. Es ist: warum Menschen so wild entscheiden.“",
              "„Spoiler: Die Vergangenheit hat öfter Patchnotes als ihr denkt.“",
              "„Frage: Wer hatte Macht? Wer nicht? Dann wird’s klarer.“",
              "„Quellen sind wie Screenshots aus der Vergangenheit – nie komplett, aber hilfreich.“",
              "„Wir unterscheiden: Meinung, Fakt, Perspektive.“",
              "„Heute: Ursachen & Folgen. Nicht nur ‘was’, auch ‘warum’.“",
              "„Wenn ihr glaubt ‘das passiert heute nicht mehr’: Geschichte lacht leise.“"
            ],
            "Erdkunde":[
              "„Wir schauen heute auf Karten. Nein, nicht Google Maps—richtige Karten.“",
              "„Klima, Platten, Städte: alles hat Gründe. Auch wenn’s manchmal random wirkt.“",
              "„Merke: Raum prägt Menschen – und Menschen prägen Raum.“",
              "„Heute gibt’s Geo‑Detektivarbeit: Wo liegt was und warum?“",
              "„Wenn ihr’s euch nicht vorstellen könnt: zeichnet es schnell.“",
              "„Wir bleiben bei Fakten – und interpretieren dann.“",
              "„Kleine Challenge: Erklärt’s so, dass ein Fünftklässler es versteht.“"
            ],
            "Physik":[
              "„Kraft, Energie, Impuls. Das ist nicht Magie—das ist Mathe mit Style.“",
              "„Wenn der Beamer spinnt: das ist kein Geist, das ist Physik. (Oder Kabel.)“",
              "„Wir machen heute: Einheiten checken. Die retten euch in jeder Aufgabe.“",
              "„Wenn ihr euch vertut: nicht schlimm. Wichtig ist, dass ihr’s merkt.“",
              "„Physik ist Muster erkennen – und sauber messen.“",
              "„Erst Skizze, dann Formel. Nicht andersrum.“",
              "„Bonus: Wenn’s komisch klingt, ist es meistens ein Vorzeichen.“"
            ],
            "Chemie":[
              "„Heute mischen wir nichts Explosives. Chill. Safety first.“",
              "„Reaktionen sind wie Drama: zwei treffen sich und plötzlich passiert alles.“",
              "„Merke: Stoffe ändern sich – aber Masse verschwindet nicht einfach.“",
              "„Wenn’s nach ‘Zauber’ aussieht: es sind Teilchen.“",
              "„Heute: Formeln lesen wie Rezepte – mit Regeln.“",
              "„Schutzbrille ist kein Accessoire. Sie ist Pflicht.“",
              "„Wer sauber arbeitet, hat am Ende weniger Chaos.“"
            ],
            "Sport":[
              "„Handy weg, wir bewegen uns. Ja, auch du mit 2% Akku.“",
              "„Warm‑up ist Pflicht. Sonst gibt’s morgen Muskelkater‑DLC.“",
              "„Heute zählt: Technik vor Tempo.“",
              "„Fairness ist Teil der Note. Kein Meme.“",
              "„Trinken nicht vergessen. Wasser ist OP.“",
              "„Wer verletzt ist, sagt’s. Ich bin keine Gedankenleserin.“",
              "„Wir spielen – aber mit Regeln. Sonst wird’s wild.“"
            ],
            "Informatik":[
              "„Terminal ist kein Feind. Es ist nur ehrlich.“",
              "„Wenn’s nicht läuft: nicht panisch. Fehlermeldung lesen. Dann fixen.“",
              "„Erst reproduzieren, dann debuggen. Sonst jagt ihr Gespenster.“",
              "„Speichern ist kein Vorschlag. Es ist eine Lebensversicherung.“",
              "„Wenn ihr kopiert, versteht ihr’s nicht automatisch. Checkt, was ihr tut.“",
              "„Heute: kleine Schritte. Jeder Schritt ein Commit im Kopf.“",
              "„Tipp: Befehle sind Werkzeuge – nicht Zaubersprüche.“"
            ]
         
          };
          const pick = (lines[subj] || ["„Okay, heute machen wir Unterricht. Überraschung.“"]);
          out += pickRandom([pick[Math.floor(Math.random()*pick.length)], getTeacherFlavorLine(npc, state.cwd)]);
        maybeAppendRumor();
        saveState();
        return { ok:true, out };
        } else if(npc && /Schüler/i.test(String(npc.role||"")) && String(state.cwd||"").startsWith("/school/klassenraume")){
          const lines = [
            "„Bro, ich schwöre, ich war grad noch wach…“",
            "„Wenn der Glitch wieder kommt, bin ich raus. Kein Bock auf Horror‑DLC.“",
            "„Die Tafel hat grad wieder geflackert… sag mir, dass du das auch gesehen hast.“",
            "„Sag bitte nicht der Lehrkraft, dass ich nix gecheckt hab. 😭“",
            "„Ich hab gehört, der Serverraum ist wie ein Boss‑Level. Safe kein Spaß.“",
            "„Lowkey fühlt sich die Schule an wie ’ne Game‑Map seit dem Glitch.“",
            "„Mathe ist eh scam. Aber der Glitch ist irgendwie… sus.“",
            "„Wenn du rausfindest, was das ist, sag Bescheid. Ich will nicht als NPC sterben.“",
            "„Ich hab aus Versehen 27 Tabs offen und jetzt stürzt mein Gehirn ab.“",
            "„Heute ist so ein Tag: ich existiere nur auf Energiesparmodus.“",
            "„Wenn jemand ‘Gruppenarbeit’ sagt, alt+f4 ich innerlich.“",
            "„Der PC hier klingt wie ’ne PS4 im Bossfight.“",
            "„Kannst du kurz checken, ob ich im richtigen Ordner bin? Ich bin lost.“",
            "„Wenn du ein Cheatcode für Hausaufgaben hast: DM.“",
            "„Ich hab’s verstanden… glaub ich. Also so 40%.“",
            "„Ich tu so, als würde ich mitschreiben. Profi‑Move.“",
            "„Warum sind Passwörter immer entweder ‘1234’ oder ‘unmöglich’?“",
            "„Wenn ich noch einmal ‘abgeben bis 23:59’ höre, ragequit.“",
            "„Ich hab das Gefühl, die Schule hat heute Patchnotes bekommen. Nur schlechter.“",
            "„Stell dir vor, wir sind alle nur Background‑NPCs. Wild.“",
            "„Ich hab ‘nen USB‑Stick, der ist älter als ich. Funktioniert trotzdem.“",
            "„Wenn du rausfindest, wo hier das WLAN wirklich gut ist: sag’s mir.“",
            "„Ich hab grad gelernt: Fehlermeldungen sind eigentlich Tipps. Verrückt.“",
            "„Mein Code läuft nicht, aber meine Hoffnung auch nicht.“",
            "„Ich hab gestern ‘cd ..’ gemacht und plötzlich war ich im Leben einen Schritt zurück.“",
            "„Sag nichts, aber ich hab grad zum ersten Mal ‘grep’ gehört und dachte an Chips.“",
            "„Wenn der Drucker heute wieder rumzickt, rufe ich einen Exorzisten.“",
            "„Ich bin nur hier wegen der Mensa. Alles andere ist Sidequest.“",
            "„Ich hab ‘ne Idee, aber sie ist noch im Beta‑Test.“",
            "„Kann man Schule eigentlich in den Papierkorb ziehen?“",
            "„Wenn ich ‘Projekt’ höre, bekomme ich automatisch Stress‑Buff.“",
            "„Ich mag Informatik… aber sie mag mich nicht immer zurück.“",
            "„Hast du auch manchmal das Gefühl, der Bildschirm guckt zurück?“",
            "„Heute ist Team ‘Kaffee’ gegen Team ‘Realität’.“"
          ];
          out += lines[Math.floor(Math.random()*lines.length)];
if(state.flags && state.flags.system_fixed && Math.random() < 0.20){
  out += `\n\n„Und ja: Drucker gehen wieder. Halleluja.“`;
}
        maybeAppendRumor();
        saveState();
        return { ok:true, out };
        }

        // === Nicht-Lehrkraft: Hausmeister (eigene Sprüche, kein Lehrer-Pool) ===
        if(id === "hausmeister"){
          const tmpPaths = [
            "/home/player/lager/kabel.tmp",
            "/home/player/lager/kiste.tmp",
            "/home/player/lager/defekt.tmp"
          ];
          const cleaned = tmpPaths.every(p=>!getNode(p));

          // Hidden Miniquest: Lager aufräumen (rm)
          if(!state.flags.hm_lager_done){
            if(cleaned){
              state.flags.hm_lager_done = true;
              out += "„Oh! Das Lager… sieht plötzlich… sauber aus? Respekt.“\n";
              out += "„Danke. Wenn ihr so weiter macht, muss ich euch ja irgendwann bezahlen.“\n";
              out += "\n(Hinweis: Du hast gerade nebenbei rm geübt. Nice.)";
              saveState();
              return { ok:true, out };
            } else {
              // Quest-Hinweis nicht jedes Mal, sonst nervt's
              if(!state.flags.hm_lager_hint || Math.random() < 0.55){
                state.flags.hm_lager_hint = true;
                out += "„Kurze Bitte: In deinem Lagerordner ~ liegt Müll rum.“\n";
                out += "„Alles mit .tmp kann weg. Aber lass lampenliste.txt in Ruhe, sonst such ich dich.“\n\n";
                out += "Tipp (ohne Spoiler):\n";
                out += "  cd ~/lager\n";
                out += "  ls\n";
                out += "  rm kabel.tmp   (und die anderen .tmp)\n";
                out += "Dann red nochmal mit mir.\n";
                saveState();
                return { ok:true, out };
              }
            }
          }

          const lines = [
            "„Wenn’s klappert, bin ich’s nicht. (Meistens.)“",
            "„Nicht auf die Kabel treten. Die sind älter als eure Passwörter.“",
            "„Der Schlüsselbund ist mein Inventory. Und das ist full.“",
            "„Ja, die Tür quietscht. Nein, ich hab’s nicht vergessen. Ich hab Prioritäten.“",
            "„Wenn ihr was kaputt macht: sagt’s. Heimlich ist’s doppelt Arbeit.“",
            "„Ich hab gerade 17 Stühle aus Raum 204 zurückgeholt. Das ist mein Bossfight.“",
            "„Das ist kein Lagerraum. Das ist mein Lebensraum.“",
            "„Wer hat den HDMI‑Adapter? Ich sehe euch alle.“",
            "„Wenn der Beamer nicht geht, liegt’s zu 80% am Kabel. Und zu 20% am Schicksal.“",
            "„Ich repariere Sachen. Gefühle leider nicht.“",
            "„Bitte keine Sticker auf die Geräte. Ich krieg die nie wieder ab.“",
            "„Wenn’s nach ‘Strom’ riecht: raus da. Sofort.“",
            "„Habt ihr versucht: aus‑ und wieder einschalten? Ja? Gut. Dann darf ich kommen.“",
            "„Ich bin nicht böse. Ich bin nur im Dauer‑Debug‑Modus.“",
            "„Kaffee ist mein Treibstoff. Ohne Kaffee: keine Reparatur.“"
          ];
          out += lines[Math.floor(Math.random()*lines.length)];
          maybeAppendRumor();
          saveState();
          return { ok:true, out };
        }

        // === Nicht-Lehrkraft: Sauer (Technikausleihe/Medien, eigene Sprüche) ===
        if(id === "sauer"){
          const codePath = "/home/player/sidequests/hdmi_code.txt";
          const cnode = getNode(codePath);
          const codeOk = cnode && cnode.type==="file" && String(cnode.content||"").includes("A17");

          // Hidden Miniquest: HDMI-Adapter-Code finden (cd/ls/cat/grep/echo)
          if(!state.flags.sauer_hdmi_done){
            if(codeOk){
              state.flags.sauer_hdmi_done = true;
              out += "„YES. A17. Genau DER Adapter, der immer verschwindet.“\n";
              out += "„Danke. Du hast dir gerade ein unsichtbares Technik-Plus verdient.“\n";
              out += "\n(Und jetzt: bitte wirklich zurückbringen. 😅)";
              saveState();
              return { ok:true, out };
            } else {
              if(!state.flags.sauer_hdmi_hint || Math.random() < 0.65){
                state.flags.sauer_hdmi_hint = true;
                out += "„Kurze Mission: Ich brauch den Code vom HDMI‑Adapter.“\n";
                out += "„Der steht irgendwo in der Kabelkiste. Such in /school/medienraum/kabelkiste.“\n\n";
                out += "Mini‑Hinweise:\n";
                out += "  cd /school/medienraum/kabelkiste\n";
                out += "  ls\n";
                out += "  cat inventar.txt\n";
                out += "  (oder: grep HDMI inventar.txt)\n\n";
                out += "Wenn du den Code hast, speicher ihn so:\n";
                out += "  echo A17 > ~/sidequests/hdmi_code.txt\n";
                out += "Dann: talk sauer\n";
                saveState();
                return { ok:true, out };
              }
            }
          }

          const lines = [
            "„Technikausleihe geht nur mit Liste. Ohne Liste: ohne mich.“",
            "„Kamera? Geht. Aber nur, wenn du sie auch wieder zurückbringst. (Bitte.)“",
            "„Ein HDMI‑Kabel ist kein Einhorn. Trotzdem: irgendwie immer weg.“",
            "„Mikrofon gibt’s — aber sag vorher, wofür. Ich hab schon ‘ne Karaoke‑Katastrophe erlebt.“",
            "„Laptop‑Wagen ist voll. Versuch’s nach der 3. Stunde nochmal.“",
            "„Wenn du sagst ‘es geht nicht’, sag bitte auch: WAS genau geht nicht.“",
            "„USB‑Sticks sind wie Geheimnisse: irgendwann verschwinden sie.“",
            "„Beamer‑Fernbedienung ist hier. Ja. Bei mir. Weil sonst niemand weiß, wo sie ist.“",
            "„Rückgabe bis Freitag. Sonst such ich dich. Und ich finde dich.“",
            "„Wenn du Ton willst: prüf erst Mute. Es ist immer Mute.“",
            "„Adapter nur gegen Pfand. Ich hab zu viel Vertrauen verloren.“",
            "„Headsets sind desinfiziert. Bitte behandel sie wie NPC‑Loot: vorsichtig.“",
            "„Kurzer Tipp: Kabel ordentlich aufrollen. Sonst verheddert sich die Realität.“",
            "„Wenn du was ausleihst, schreib deinen Namen lesbar. ‘Lara??’ hilft mir nicht.“",
            "„Ich mach Technik. Magie ist nebenan im Physikraum.“"
          ];
          out += lines[Math.floor(Math.random()*lines.length)];
          maybeAppendRumor();
          saveState();
          return { ok:true, out };
        }

        
        // === Hidden Miniquests: Schüler*innen (SV) ===
        if(id === "sv_schueler1"){ // Mika
          const src = "/school/sv_buero/rucksack/fach_a/tasche_2/innen/Heft_Mika.txt";
          const dst = "/home/player/sidequests/Heft_Mika.txt";
          const got = getNode(dst);
          const ok = got && got.type==="file" && String(got.content||"").includes("MIKA-HEFT-OK");

          if(!state.flags.mika_heft_done){
            if(ok){
              state.flags.mika_heft_done = true;
              out += "„NEIN. Du hast mein Heft wirklich gefunden?! Legend.“\n";
              out += "„Ich dachte, das ist in irgendeiner Tasche-in-der-Tasche-in-der-Tasche verschwunden.“\n";
              out += "„Danke! Ab jetzt: Backup. Immer.“";
              saveState();
              return { ok:true, out };
            }
            out += "„Ey… ich hab mein Heft verloren. SV‑Heft. Voll wichtig.“\n";
            out += "„Ich glaube, es ist in diesem Rucksack hier irgendwo drin… aber der hat… zu viele Taschen.“\n\n";
            out += "Hinweis:\n";
            out += "  Such im SV‑Büro im Ordner: /school/sv_buero/rucksack\n";
            out += "  Navigier mit cd + ls, bis du Heft_Mika.txt findest.\n";
            out += "  Wenn du’s hast: cp <pfad>/Heft_Mika.txt ~/sidequests/Heft_Mika.txt\n";
            out += "Dann: talk mika (also talk sv_schueler1)\n";
            saveState();
            return { ok:true, out };
          }

          out += "„Ich schreibe jetzt ‘Heft nicht verlieren’ auf die erste Seite. Ironie.“";
          maybeAppendRumor();
          saveState();
          return { ok:true, out };
        }

        if(id === "sv_schueler2"){ // Zoe
          const ipad = "/home/player/ipad_sync/zoe/wichtig.txt";
          const p = ensurePerm(ipad);
          const od = parseInt(String(p.mode||"000")[0]||"0",10);
          const readable = !Number.isNaN(od) && ((od & 4) !== 0);

          if(!state.flags.zoe_ipad_done){
            if(readable){
              state.flags.zoe_ipad_done = true;
              out += "„YES! Ich komm wieder an die Datei ran!“\n";
              out += "„Ich hab echt geschafft, mir selbst die Rechte wegzunehmen… cringe.“\n";
              out += "„Danke! Ich schulde dir ‘nen Snack.“";
              saveState();
              return { ok:true, out };
            }
            out += "„Ich hab Zugriff auf meine iPad‑Sync‑Datei verloren… da steht alles Wichtige drin.“\n";
            out += "„Ich krieg nur ‘Permission denied’. Kannst du das fixen?“\n\n";
            out += "Hinweis:\n";
            out += "  cd ~/ipad_sync/zoe\n";
            out += "  ls -l   (guck dir die Rechte an)\n";
            out += "  chmod 644 wichtig.txt\n";
            out += "  cat wichtig.txt\n";
            out += "Dann: talk zoe (talk sv_schueler2)\n";
            saveState();
            return { ok:true, out };
          }

          out += "„Ab jetzt: Ich fass Rechte nur noch an, wenn jemand daneben steht.“";
          maybeAppendRumor();
          saveState();
          return { ok:true, out };
        }

        // === Hidden Miniquests: Fachräume / Orga ===
        if(id === "kraemer"){
          const dst = "/home/player/sidequests/kraemer_sicherheit.txt";
          const ok = (getNode(dst)?.type==="file");
          if(!state.flags.kraemer_safe_done){
            if(ok){
              state.flags.kraemer_safe_done = true;
              out += "„Sehr gut. Sicherheitstext gesichert.“\n";
              out += "„Jetzt weißt du auch, wo die Augendusche ist. (Das ist wichtig.)“\n";
              out += "„Und ja: cp ist im echten Leben auch nützlich. Nur… ohne Terminal.“";
              saveState();
              return { ok:true, out };
            }
            out += "„Kannst du mir kurz was helfen?“\n";
            out += "„Ich brauch die Sicherheitsnotiz als Kopie in deinem Ordner, damit du sie nicht verlierst.“\n\n";
            out += "Hinweis:\n";
            out += "  cp /school/chemie/protokolle/sicherheit.txt ~/sidequests/kraemer_sicherheit.txt\n";
            out += "Optional (wenn du willst): grep AUGENDUSCHE ~/sidequests/kraemer_sicherheit.txt\n";
            out += "Dann: talk kraemer\n";
            saveState();
            return { ok:true, out };
          }
          out += "„Naturwissenschaften sind cool. Aber nur mit Regeln.“";
          saveState();
          return { ok:true, out };
        }

        if(id === "kroencke"){
          const dst = "/home/player/sidequests/kroencke_code.txt";
          const node = getNode(dst);
          const ok = node && node.type==="file" && String(node.content||"").includes("DNA42");
          if(!state.flags.kroencke_dna_done){
            if(ok){
              state.flags.kroencke_dna_done = true;
              out += "„DNA42… perfekt. Genau das.“\n";
              out += "„Du hast gerade sehr elegant navigiert. (Und niemand hat was verschüttet.)“";
              saveState();
              return { ok:true, out };
            }
            out += "„Ich habe eine Probe, die falsch beschriftet ist… irgendwo steht der Code.“\n";
            out += "„Kannst du ihn finden und mir notieren?“\n\n";
            out += "Hinweis:\n";
            out += "  grep DNA /school/biologie/proben/probe_*.txt\n";
            out += "  echo DNA42 > ~/sidequests/kroencke_code.txt\n";
            out += "Dann: talk kroencke\n";
            saveState();
            return { ok:true, out };
          }
          out += "„Biologie ist detektivisch. Du hast’s gemerkt.“";
          saveState();
          return { ok:true, out };
        }

        if(id === "semrau"){
          const base = "/home/player/sidequests/digitallab_bot";
          const need = [
            base,
            base + "/firmware",
            base + "/docs",
            base + "/README.txt",
            base + "/todo.txt"
          ];
          const ok = need.every(p=>getNode(p));

          if(!state.flags.semrau_build_done){
            if(ok){
              state.flags.semrau_build_done = true;
              out += "„Okay, das ist sauber strukturiert. Genau so.“\n";
              out += "„Ordner sind wie Werkbänke: Wenn alles rumliegt, findest du nix.“";
              saveState();
              return { ok:true, out };
            }
            out += "„Mini‑Challenge fürs DigitalLab: Bau dir eine Ordnerstruktur.“\n";
            out += "„Ich will sehen, ob du mkdir/touch drauf hast.“\n\n";
            out += "Ziel (unter ~):\n";
            out += "  ~/sidequests/digitallab_bot/\n";
            out += "    firmware/\n";
            out += "    docs/\n";
            out += "    README.txt\n";
            out += "    todo.txt\n\n";
            out += "Hinweis:\n";
            out += "  mkdir ~/sidequests/digitallab_bot\n";
            out += "  mkdir ~/sidequests/digitallab_bot/firmware\n";
            out += "  mkdir ~/sidequests/digitallab_bot/docs\n";
            out += "  touch ~/sidequests/digitallab_bot/README.txt\n";
            out += "  touch ~/sidequests/digitallab_bot/todo.txt\n";
            out += "Dann: talk semrau\n";
            saveState();
            return { ok:true, out };
          }
          out += "„Wenn du’s strukturierst, gewinnt dein Gehirn FPS.“";
          saveState();
          return { ok:true, out };
        }

        if(id === "remmers"){
          const dir = "/home/player/sidequests/remmers_abgabe";
          const a = dir + "/aufsatz.txt";
          const l = dir + "/literatur.txt";
          const ok = getNode(a)?.type==="file" && getNode(l)?.type==="file";

          if(!state.flags.remmers_abgabe_done){
            if(ok){
              state.flags.remmers_abgabe_done = true;
              out += "„YES. Aufsatz & Literatur sauber benannt. Ich liebe das.“\n";
              out += "„Dateinamen sind wie Überschriften: Wenn sie wild sind, leidet jeder.“";
              saveState();
              return { ok:true, out };
            }
            out += "„Kannst du kurz Ordnung in den Abgabe‑Ordner bringen?“\n";
            out += "„Da liegen zwei Dateien mit… sagen wir… kreativen Namen.“\n\n";
            out += "Hinweis:\n";
            out += "  mkdir ~/sidequests/remmers_abgabe\n";
            out += "  cp /school/bibliothek/abgabe/aufsatz_final_neu.txt ~/sidequests/remmers_abgabe/aufsatz.txt\n";
            out += "  cp /school/bibliothek/abgabe/literatur.txt ~/sidequests/remmers_abgabe/literatur.txt\n";
            out += "Dann: talk remmers\n";
            saveState();
            return { ok:true, out };
          }
          out += "„Und jetzt bitte nicht ‘final_final2’ nennen. Danke.“";
          saveState();
          return { ok:true, out };
        }

        if(id === "frech"){
          const dst = "/home/player/sidequests/skizze.txt";
          const ok = getNode(dst)?.type==="file";

          if(!state.flags.frech_skizze_done){
            if(ok){
              state.flags.frech_skizze_done = true;
              out += "„Du hast die Skizze gefunden? Nice.“\n";
              out += "„Kunst ist manchmal: Dinge sehen, die andere übersehen.“\n";
              out += "„Und manchmal ist es einfach nur eine Datei mit Punkt am Anfang.“";
              saveState();
              return { ok:true, out };
            }
            out += "„Ich hab im Kunstraum eine Skizze versteckt.“\n";
            out += "„Nicht weil ich fies bin — sondern weil Suchen ein Skill ist.“\n\n";
            out += "Hinweis:\n";
            out += "  Schau in /school/kunstraum/schrank/leinen\n";
            out += "  (Ja, da ist eine Datei mit Punkt am Anfang.)\n";
            out += "  cp /school/kunstraum/schrank/leinen/.skizze.txt ~/sidequests/skizze.txt\n";
            out += "Dann: talk frech\n";
            saveState();
            return { ok:true, out };
          }
          out += "„Wenn du fertig bist: mach was Eigenes draus.“";
          saveState();
          return { ok:true, out };
        }
// generische NPCs (keine Sidequestgeber, nicht Winkelmann) bekommen Mehrstufen-Dialoge
        const inSchool = String(state.cwd||"").startsWith("/school");
        const isTeacher = isTeacherNpc(id, npc, inSchool);

        if(!NPC_DIALOG_EXCLUDED.has(id) && !isTeacher){
          state.npcDialog = { active:true, npcId:id, nodeId:"start" };
          out = renderNpcDialogNode(id, npc);
          saveState();
          renderObjectives();
          return { ok:true, out };
        }

// fallback: if it's a teacher NPC, don't be boring 😄

if(isTeacher){
            out += getTeacherFlavorLine(npc, state.cwd);
          } else {
            const lines = [
              "„Yo. Was geht?“",
              "„Ich bin nur kurz AFK im Kopf.“",
              "„Same. Ich check’s auch nicht komplett.“",
              "„Wenn du einen Tipp hast: her damit.“",
              "„Ich glaub, ich hab’s gleich… maybe.“",
              "„Ich warte auf den Plot‑Twist.“",
              "„Kannst du kurz helfen? Ich bin lost.“",
              "„Ich versuche so zu tun, als wär ich produktiv.“",
              "„Heute ist mein Gehirn im Wartungsmodus.“",
              "„Ich hab grad Flashbacks an Hausaufgaben.“",
              "„Ok, aber warum fühlt sich das wie ein Escape‑Room an?“",
              "„Wenn das wieder glitcht, ich geh direkt Mensa.“",
              "„Ich hab ‘ne Theorie, aber sie klingt dumm.“",
              "„Sag nix, aber ich hab’s grad aus Versehen richtig gemacht.“",
              "„Ich hab 1% Akku und 100% Mut.“",
              "„Lass uns das wie ein Quest lösen: Schritt für Schritt.“",
              "„Wenn du’s rausfindest, bist du Legende.“",
              "„Ich brauch kurz einen Hint…“",
              "„Ich hab die Lösung… irgendwo. Bestimmt.“",
              "„Brain.exe reagiert nicht.“"
            ];
            out += lines[Math.floor(Math.random()*lines.length)];
          }
        }

        saveState();
        renderObjectives();
        maybeAppendRumor();
        saveState();
        return { ok:true, out };
      }

  // cmdChoose — Implementierung des choose-Befehls (aus cmdImpl extrahiert):
  // Auswahl in NPC-Dialogbäumen und in Winkelmanns Menüs (inkl. Ritual, choose 6).
  function cmdChoose(args){
        const pick = (args[0]||"").trim();
        if(!pick) return { ok:false, out:"Usage: choose <number> (z.B. choose 3)" };

        // ---- POC: Noah-Lag-Branch (echte Verzweigung mit unterschiedlicher Lerntiefe) ----
        // Jeder Pfad bringt zum gleichen mechanischen Ziel (kill 202), gibt aber je nach
        // Wahl mehr oder weniger Konzept-Hintergrund. state.flags.noah_path merkt sich
        // die Entscheidung — Folge-NPCs können später darauf reagieren.
        if(state.npcDialog && state.npcDialog.active
            && state.npcDialog.npcId === "noah"
            && state.npcDialog.nodeId === "lag_choices"){
          if(pick === "0"){
            resetNpcDialog();
            saveState();
            return { ok:true, out:"Noah: „Klar, nimm dir Zeit. Ich heul solange.“" };
          }
          state.flags = state.flags || {};
          if(pick === "1"){
            state.flags.noah_path = "fast";
            resetNpcDialog();
            saveState();
            return { ok:true, out:
`Du: „Egal — ich kill das Ding.“
Noah: „Bro Speedrun-Energy. Respect.“

Tipp: ps zeigt PIDs, dann kill <pid>.` };
          }
          if(pick === "2"){
            state.flags.noah_path = "top";
            resetNpcDialog();
            saveState();
            return { ok:true, out:
`Du: „Ich gucke erst mit top, was wirklich die CPU frisst.“
Noah: „Nice, methodisch. Lehrer-Mood.“

Konzept-Boost: top sortiert Prozesse nach CPU. Die Spalte CPU% zeigt dir den
Schuldigen sofort. Danach: kill <pid>. Bei Prozessen die SIGTERM ignorieren
brauchst du kill -9 <pid> (SIGKILL — hart).` };
          }
          if(pick === "3"){
            state.flags.noah_path = "daemon";
            resetNpcDialog();
            saveState();
            return { ok:true, out:
`Du: „Was ist eigentlich rgbd?“
Noah: „Lol gute Frage.“

Konzept-Boost: rgbd ist ein typischer Daemon-Name (das d am Ende = ‚daemon‘, ein
Hintergrund-Prozess). Klassiker auf Linux: sshd, systemd, cupsd, httpd.
Manchmal laufen die Amok und fressen CPU. Erkennen mit ps/top, beenden mit kill.` };
          }
          return { ok:false, out:"choose: gültig sind 0, 1, 2 oder 3." };
        }
        // ---- /Noah-Branch ----

        if(state.npcDialog && state.npcDialog.active){
          const npcId = state.npcDialog.npcId;
          const npc = NPCS[npcId];
          const speakerName = getDialogSpeakerName(npcId, npc);
          const tree = buildNpcDialogTree(npcId, npc);
          const node = tree.nodes[state.npcDialog.nodeId || "start"] || tree.nodes.start;
          const idx = Number(pick);
          if(idx===0){ resetNpcDialog(); saveState(); return { ok:true, out:`🗨️ ${speakerName}
„Alles klar, bis später.“` }; }
          if(!Number.isInteger(idx) || idx<1 || idx>node.choices.length) return { ok:false, out:`choose: In diesem Gespräch: choose 0-${node.choices.length}.` };
          const choice = node.choices[idx-1];
          let out = `Du: „${choice.label}“
${speakerName}: ${choice.response}`;
          if(choice.end){ resetNpcDialog(); saveState(); return { ok:true, out }; }
          state.npcDialog.nodeId = choice.next || "start";
          out += "\n\n" + renderNpcDialogNode(npcId, npc);
          saveState();
          return { ok:true, out };
        }
        if(!state.sidequest || !state.sidequest.unlocked) return { ok:false, out:"choose: erst Winkelmann finden." };
        if(state.sidequest.dialog !== "winkelmann") return { ok:false, out:"choose: Keine Auswahl aktiv. Tipp: talk winkelmann" };
        // Winkelmann: Kontext-Menüs (Netzwerk -> Befehle erklärt)
        const menu = state.sidequest.winkMenu || "main";

        // MAIN: choose 3 öffnet Submenü statt direkt Briefing
        if(menu==="main" && pick==="3"){
          state.sidequest.winkMenu = "net";
          saveState();
          return { ok:true, out:
`🧙‍♂️ Winkelmann — Netzwerk‑Mission (Hacknet‑Style)
Wähle:

(1) Mission‑Briefing (Ablauf Schritt für Schritt)
(2) Befehle/Tools erklärt (mit Beispielen)  [empfohlen zuerst]

(0) zurück` };
        }

        // NET MENU
        if(menu==="net"){
          if(pick==="0"){
            state.sidequest.winkMenu = "main";
            saveState();
            return { ok:true, out:"Zurück zum Hauptmenü. (choose 1-6)" };
          }
          if(pick==="1"){
            state.sidequest.winkMenu = "main";
            saveState();
            return { ok:true, out:
`🧙‍♂️ Winkelmann — Netzwerk‑Mission (Briefing)
„Wir gehen nicht rein wie ein Elefant im LAN.
Wir gehen rein wie ein Schatten im WLAN.“

Dein Ablauf:
1) connect superpc
2) netmap  (Ziele sehen)
3) ping <host> (prüfen ob lebt)
4) ssh <host>  (rein)
5) ls / cat hint.txt/memo.txt (Info finden)
6) scp <file> ~/workbench/… (Artefakt sichern)
7) logwipe  (Spuren weg!)
8) exit (raus)

Tipp: Wenn Trace 100% erreicht → Kick. Dann erst logwipe, sonst locked.` };
          }
          if(pick==="2"){
            state.sidequest.winkMenu = "net_cmds";
            saveState();
            return { ok:true, out:
`🧙‍♂️ Winkelmann — Befehle im Netzwerk (Erklär‑Modus)
Wähle einen Befehl:

(1) netmap   (Netzwerkübersicht)
(2) ping     (Host anpingen)
(3) ssh      (einloggen)
(4) ls       (Ordner anzeigen)
(5) cat      (Datei lesen)
(6) scp      (Datei kopieren)
(7) logwipe  (Spuren löschen)
(8) exit     (verlassen)

(0) zurück` };
          }
          return { ok:false, out:"choose: In diesem Menü: choose 0, 1 oder 2." };
        }

        // NET COMMANDS MENU
        if(menu==="net_cmds"){
          const explain = (title, body)=>`🧙‍♂️ Winkelmann — ${title}\n${body}\n\n(0) zurück`;
          if(pick==="0"){
            state.sidequest.winkMenu = "net";
            saveState();
            return { ok:true, out:
`Zurück. Netzwerk‑Menü:
(1) Mission‑Briefing
(2) Befehle erklärt
(0) zurück zum Hauptmenü` };
          }
          if(pick==="1") return { ok:true, out: explain("netmap",
`Wofür: zeigt dir, welche Ziele/Hosts im „Schul‑Netz“ existieren.
Was passiert: listet Hosts + Artefakt‑Hinweise + Trace/Spuren‑Status.

Syntax:
  netmap

Beispiel:
  netmap`) };
          if(pick==="2") return { ok:true, out: explain("ping",
`Wofür: checkt, ob ein Host erreichbar ist.
Was passiert: sendet kleine Pakete – Antwort = online.

Syntax:
  ping <host>

Beispiel:
  ping gym-ost-core`) };
          if(pick==="3") return { ok:true, out: explain("ssh",
`Wofür: Remote‑Login auf einen Host.
Was passiert: Session in /net/<host>/...

Syntax:
  ssh <host>

Beispiel:
  ssh igs-edu-lab`) };
          if(pick==="4") return { ok:true, out: explain("ls",
`Wofür: listet Dateien/Ordner.
Was passiert: zeigt „was liegt hier“.

Syntax:
  ls

Beispiel:
  ls`) };
          if(pick==="5") return { ok:true, out: explain("cat",
`Wofür: Datei lesen.
Was passiert: zeigt Inhalt (Hints/Notizen/Logs).

Syntax:
  cat <datei>

Beispiel:
  cat hint.txt`) };
          if(pick==="6") return { ok:true, out: explain("scp",
`Wofür: Remote‑Datei auf deinen PC kopieren.
Was passiert: lootet Artefakt ohne Delete.

Syntax:
  scp <remote_file> <local_path>

Beispiel:
  scp blueprint.dat ~/workbench/blueprint.dat
oder:
  scp blueprint.dat ~/workbench/`) };
          if(pick==="7") return { ok:true, out: explain("logwipe",
`Wofür: Spuren in Logs löschen (Stealth).
Was passiert: setzt Spuren/Trace zurück.

Syntax:
  logwipe

Beispiel:
  (in ssh) logwipe`) };
          if(pick==="8") return { ok:true, out: explain("exit",
`Wofür: Ebene verlassen.
Was passiert:
- ssh -> zurück zu /superpc
- superpc -> zurück in den Keller

Syntax:
  exit

Beispiel:
  exit`) };
          return { ok:false, out:"choose: In diesem Menü: choose 0-8." };
        }



        const p = state.sidequest.parts||{};
        const d = state.sidequest.net||{};
        const t = state.sidequest.traces||{};
        const haveAllParts = p.lens && p.coil && p.ups;
        const haveAllData = d.blueprint && d.shield;
        const clean = !t.gym && !t.igs;

        let out = "🧙‍♂️ Herr Dr. Winkelmann:\n";
        switch(pick){
          case "1":
            out += "„Die Maschine ist ein Resonanz‑Lehrfeld. Du lernst Physik, indem du Zusammenhänge spürst – nicht nur auswendig.“\n";
            out += "„Und sie schützt unser Schulnetz: Wissen als Schild. Physica potestas est.“";
            break;
          case "2":
            out += "„Drei Artefakte sind materiell.“\n";
            out += "„Das Auge des Lichts: dort, wo Bilder an Wände geworfen werden.“\n";
            out += "„Die Spirale der Ordnung: dort, wo Geräte im Schrank schlafen.“\n";
            out += "„Die Ruhe vor dem Stromsturm: dort, wo Ersatzteile wohnen.“\n";
            out += `\nStatus: Linse=${p.lens?"✅":"❌"} Spule=${p.coil?"✅":"❌"} USV=${p.ups?"✅":"❌"}`;
            break;
          case "3":
            out += "„Netzwerk‑Mission. Hacknet‑Regeln: leise rein, Daten raus, Logs weg.“\n";
            out += "„Sichere die Artefakte in DEINER Workbench.“\n";
            out += "„Pfad: ~/workbench/. Nur dort zählen sie.“\n";
            out += "„Erst: connect superpc. Ohne Zauberstab keine Resonanz.“\n\n";
            out += "Ablauf (Beispiel):\n";
            out += "  connect superpc\n";
            out += "  ping gym-ost-core\n";
            out += "  ssh gym-ost-core\n";
            out += "  ls · cat hint.txt\n";
            out += "  scp blueprint.dat ~/workbench/blueprint.dat\n";
            out += "  logwipe · exit\n\n";
            out += `Status Daten: Blueprint=${d.blueprint?"✅":"❌"} ShieldKey=${d.shield?"✅":"❌"}\n`;
            out += `Spuren: gym=${t.gym?"🔴":"🟢"} igs=${t.igs?"🔴":"🟢"}`;
            break;
          case "4":
            out += "„Statusbericht, Lehrling.“\n";
            out += `Teile: Linse=${p.lens?"✅":"❌"} Spule=${p.coil?"✅":"❌"} USV=${p.ups?"✅":"❌"}\n`;
            out += `Daten: Blueprint=${d.blueprint?"✅":"❌"} ShieldKey=${d.shield?"✅":"❌"}\n`;
            out += `Spuren: gym=${t.gym?"🔴":"🟢"} igs=${t.igs?"🔴":"🟢"}\n`;
            out += (haveAllParts && haveAllData && clean && !state.sidequest.badge)
              ? "\n„Du bist bereit. Wähle (6) für das Ritual.“"
              : "\n„Struktur. Ruhe. Kein hektisches Klicken.“";
            break;
          case "5":
            out += "„SUPER‑PC Bedienung:“\n";
            out += "„Du bist im Lab. Dann: connect superpc.“\n";
            out += "„Danach sind ping/ssh/scp/logwipe/exit freigeschaltet.“";
            break;
          case "6":
            if(!(haveAllParts && haveAllData && clean)){
              out += "„Noch nicht. Erst Teile + Daten + saubere Logs. Dann Ritual.“";
              break;
            }
            if(state.sidequest.badge){
              out += "„Das Ritual ist vollzogen. Die Maschine hält.“";
              break;
            }
            state.sidequest.badge = true;
            if(!state.badges) state.badges = [];
            if(!state.badges.includes("Physica potestas est")) state.badges.push("Physica potestas est");
            out += "„Dann… beginne.“\n";
            out += "*Die Maschine brummt. Spulen glühen. Formeln flackern wie Boss‑HUD. Dann… Stabilität.*\n\n";
            out += "✅ Maschine repariert.\n🏷️ Badge erhalten: Physica potestas est\n";
            out += "„Physica potestas est. Wissen ist Macht, Lehrling.“";
            saveState();
            break;
          default:
            out += "„Wähle 1–6. Ich bin Physiker, kein Orakel mit Autocomplete.“";
        }
        return { ok:true, out };
      }
