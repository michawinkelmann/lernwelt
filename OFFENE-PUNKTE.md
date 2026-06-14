# Offene Punkte & nächste Schritte

_Übergabedokument für die nächste Session. Aktueller Detailstand immer in `STATUS.md`; KC-Abgleich in `KC-ABGLEICH.md`; Aufgaben-Standard in `LERNBUERO-AUFGABEN.md`._

## Projektstand (Juni 2026)

- **Lernbüro vollständig** im Sinne der vorhandenen Website-Inhalte: alle 93 Online-Themen sind als geführte Kurse aufbereitet — 24 Kurse, 97 Themenblöcke, 481 Lektionen.
- Jede Lektion folgt dem Phasen-Schema Ankommen · Verstehen (eingebetteter Erklärabschnitt) · Üben (Basis/Standard/Plus) · Sichern · Extra. Kanonische Vorlage: `daten/kurse/ph-09.json`.
- **Zweig-Logik:** Realschüler sehen nur RS-relevante Inhalte. Mechanismen: (a) ganze Oberstufenkurse sind gym-only, (b) gym-only Aufgaben erscheinen für RS als „Ausblick Gymnasium", (c) NEU: ganze Themenblöcke mit `"zweig":["gym"]` werden für RS ausgeblendet (Block-Zweigfilter in `assets/js/selbstlernen/kurs.js`).
- **Noch offen (fachlich, Betreiber):** Alle neu erzeugten Lernbüro-Ergänzungsaufgaben tragen den Marker `ergaenzung:"lernbuero"` (in `daten/aufgaben/lernbuero/`). Sie brauchen die fachliche Endprüfung. So findet man sie: `grep -rl ergaenzung daten/aufgaben/lernbuero`.
- **Lehrkraft-Bereich:** je Kurs eine `lehrkraft.html` (Passwort `1337`, clientseitiger Sichtschutz; Druckausgabe als A4-Handzettel vorhanden).

## TODO 1 — Schüler-Feedback zur Lernumgebung einsammeln

> **Stand 13.06.2026 (Runde 46): umgesetzt.** Dezentes Aufklapp-Feedback am Lektionsende + JSON-Export (lernwelt-feedback-<Datum>.json). OFFEN nur: optionale Lehrkraft-Auswertung mehrerer importierter Feedback-Dateien.

**Ziel:** Rückmeldungen der Schülerinnen und Schüler erfassen, damit die Lernumgebung gezielt verbessert, differenziert und angepasst werden kann.

**Randbedingung:** Die Seite ist statisch (GitHub Pages) — es gibt keinen Server, der Daten entgegennimmt. Außerdem: Minderjährige, also datensparsam und ohne personenbezogene Daten.

**Empfohlener Weg (passt zur bestehenden Architektur): lokales Feedback + Export, Auswertung über die Lehrerseite.**

1. **Mini-Feedback je Lektion** (am Lektionsende, nach „Sichern"): drei kurze, freiwillige Fragen — Verständlichkeit (Ampel grün/gelb/rot), Schwierigkeit (zu leicht / genau richtig / zu schwer) und ein optionales Freitextfeld („Wo hast du gehakt?"). Ton ermutigend, kein Zwang, keine Note.
2. **Speicherung** wie schon Ampel und Lerntagebuch in `localStorage` (neuer Zweig `feedback` in `assets/js/fortschritt.js`). Datensatz-Vorschlag pro Eintrag: `{ kurs, lektion, verstaendlich, schwierigkeit, freitext, ts }`. Anonym, kein Name.
3. **Export** als JSON-Download (die bestehende Export-Funktion in der Fußzeile erweitern). Schülerinnen und Schüler exportieren am Stundenende und geben die Datei über den üblichen Schulkanal ab (z. B. IServ-Abgabe).
4. **Auswertung auf der Lehrerseite:** kleines Werkzeug „Feedback importieren & auswerten" — mehrere Export-Dateien einlesen und je Lektion aggregieren (Anteil rot/gelb/grün, Anteil „zu schwer/zu leicht", häufige Stichworte aus den Freitexten). Daraus kann eine spätere Session konkret ableiten: zu schwere Lektionen entschärfen, fehlende Basis-Aufgaben ergänzen, unklare Erklärabschnitte umschreiben, Tipps nachschärfen.

**Datenschutz:** Daten bleiben lokal auf dem Gerät, bis sie aktiv exportiert werden; keine Namen, Hinweis „bitte keine persönlichen Daten eingeben"; die Lehrkraft sammelt bewusst ein. Damit DSGVO-freundlich und ohne Drittanbieter.

**Schnellere Alternative (falls gewünscht):** Statt Eigenbau eine Umfrage im schuleigenen System (IServ-Umfrage, Moodle-Feedback, MS Forms) anlegen und von der Lernbüro-Seite nur *verlinken* (nicht einbetten — sonst externer Request). Vorteil: automatische Aggregation. Nachteil: Verarbeitung außerhalb der Seite, daher schulische Freigabe nötig. Empfehlung: schuleigenes Tool bevorzugen, keine externen US-Dienste.

## TODO 2 — Druckversionen der Schüler-Inhalte (Lehrerseite)

> **Stand 13.06.2026 (Runde 46): umgesetzt.** selbstlernen/druck.html (Arbeitsblatt/Lösungsblatt, Spurenauswahl), Link auf allen Lehrkraft-Seiten. OFFEN nur: optional Ausweitung auf reguläre Übungsseiten/Erklärseiten.

**Ziel:** Die Lehrkraft soll aus dem Lernbüro druckbare Schüler-Materialien erzeugen können, falls es einmal nicht digital geht. Zunächst nur fürs Lernbüro.

**Gute Ausgangslage:** Für die regulären Übungsseiten existiert in `assets/css/print.css` bereits ein „Aufgabenblatt"-Druckmodus (Aufgaben ohne Lösungen, mit Namens-/Datumszeile). Diese Bausteine lassen sich wiederverwenden.

**Vorschlag:** Auf der Lehrerseite ein Abschnitt „Druckmaterial erstellen":
- Auswahl: Kurs, einzelner Block oder ganze Lektion, Spur (Basis/Standard/Plus), Optionen „mit Lösungen" und „mit Tipps", Kopf mit Name/Datum.
- Erzeugt zwei Dokumenttypen: (a) **Schüler-Arbeitsblatt** — Aufgaben plus Schreibplatz, ohne Lösungen; (b) **Lehrer-Lösungsblatt** — dieselben Aufgaben mit vollständigem Lösungsweg.

**Technische Skizze:**
- Neue Druckseite `selbstlernen/druck.html` + `assets/js/selbstlernen/druck.js`, gesteuert über URL-Parameter (z. B. `?kurs=ma-07&bloecke=1,2&loesung=0&spur=basis,standard`).
- `druck.js` lädt `daten/kurse/<id>.json` und die referenzierten Aufgaben-JSON, rendert ein statisches, nicht-interaktives Arbeitsblatt (optional der kurze Verstehen-Text je Lektion) und ruft danach `window.print()`.
- KaTeX vor dem Druck einmal über die neuen Knoten laufen lassen (Formeln müssen gerendert sein).
- `print.css` um ein Arbeitsblatt-Layout für `body[data-seite="druck"]` ergänzen (Seitenumbrüche je Aufgabe, Lösungsblock optional ein-/ausblenden).
- Von jeder `lehrkraft.html` ein Link „Druckmaterial erstellen" auf die Druckseite des Kurses.

**Umfang:** zuerst Lernbüro-Aufgaben (liegen als JSON vor, leicht statisch zu rendern). Später erweiterbar auf die regulären Übungsseiten und die Erklärseiten.

## TODO 3 — Alle KC-Lücken schließen (ohne Informatik-Oberstufe)

> **Stand 13.06.2026 (Runde 45): weitgehend erledigt.** Neu gebaut: Sinus für RS geöffnet; ph-10-beschleunigte-bewegung (RS); ph-ep-atom-und-kernphysik (das gewählte EF-Wahlmodul); in-10-steuern-und-regeln (Calliope-Lernfeld); ma-qp-matrizen (eA); Rotationskörper-Abschnitt. Bereits vorher abgedeckt: uneigentliche Integrale, Hypothesentests. Informatik-Oberstufe bleibt ignoriert (Nutzerwunsch). OFFEN: fachliche Endprüfung aller neuen Inhalte (Erklärtexte + Aufgaben mit Marker kc-neu bzw. lernbuero); weitere Physik-EF-Wahlmodule nur bei Bedarf.

Aus `KC-ABGLEICH.md`: echte Curriculum-Lücken sind Inhalte, für die es noch KEINE Erklärseite gibt. Diese sind aufwändiger als die bisherige „Verpackung", weil je Lücke neu entsteht: **Erklärseite (HTML) + reguläre Aufgaben (13 je Thema, JSON) + Eintrag in `daten/themen.json` + Lernbüro-Block**. Informatik-Oberstufe wird auf Wunsch ignoriert.

Zu schließen:

- **Mathematik RS, Sek I — Sinusfunktion / periodische Vorgänge.** Entweder das vorhandene Gym-Thema `ma-10-sinusfunktion` für RS öffnen (Zweig erweitern + RS-taugliche Aufgaben ergänzen) oder ein eigenes RS-Sek-I-Thema anlegen. (Fachlich prüfen, ob im RS-KC Sek I tatsächlich gefordert.)
- **Mathematik Oberstufe (erhöhtes Niveau eA):** uneigentliche Integrale; Rotationskörper (Volumen per Integral); Abbildungs-/Projektionsmatrizen; vollständiges Hypothesentest-Konzept (Signifikanzniveau, Fehler 1./2. Art, ein-/zweiseitig — das Thema `ma-qp-hypothesentests` existiert, Tiefe prüfen/ergänzen).
- **Physik RS, Sek I — gleichmäßig beschleunigte Bewegung quantitativ** inkl. Brems-/Reaktions-/Anhalteweg (Jg. 9/10). Neues Thema, z. B. `ph-09-beschleunigte-bewegung`.
- **Physik EF — ein Wahlmodul.** OFFENE ENTSCHEIDUNG des Betreibers: welches der vier Module aufgenommen wird — Akustik / Optische Abbildungen / Strahlungsphysik / Atom- und Kernphysik (EF). Erst nach Festlegung bauen.
- **Informatik Sek I:** Verwaltung von Daten (Tabellenkalkulation, Datenbanken, einfache SQL-Abfragen) — höchste Priorität; Textverarbeitung; Präsentation; Bildbearbeitung (RGB/CMYK, Urheberrecht); technische Realisierung automatisierter Prozesse (Sensoren/Aktoren als reguläres Thema mit Erklärseite — die Calliope-Projektkarten existieren bereits, aber kein Lernfeld-Thema).

**Arbeitsweise-Hinweis für die Umsetzung:** Jede neue Erklärseite den bestehenden folgen lassen (Aufbau, Anker-IDs, eingebettete interaktive Elemente, eigene SVG statt fremder Bilder). Danach reguläre Aufgaben (Standard „13 je Thema" wahren, damit die Browser-Testsuite konsistent bleibt) und erst zum Schluss den Lernbüro-Block (ein Agent pro Kurs, kollisionsfrei). Zentrale Verifikation wie gehabt: generischer Validator (Anker/IDs/Dubletten/Zweig), `werkzeuge/check-website.py`, Server-Smoke.

## TODO (vorgemerkt, Juni 2026) — nach Bestätigung des Lernbüro-Piloten

### A) Lernbüro: „Üben & Anwenden"-Blöcke vollständig ausrollen
- **Pilot fertig** in `daten/kurse/ma-07.json`: drei Konsolidierungs-Lektionen `l10b` (Zuordnungen), `l15b` (Terme & Gleichungen), `l20b` (Rationale Zahlen) — je am Blockende, ohne Verstehen-Phase, mit verschränktem Übungs-Mix (vorhandene Aufgaben quer durch den Block), Anwendungsteil (Sachaufgaben aus `daten/aufgaben/lernbuero/`) und Sim/Lernspiel-Link in „Extra". Renderer-Anpassung: `kurs.js` zählt `phasenGesamt` jetzt nur vorhandene Phasen.
- **Nach Freigabe durch den Betreiber:** dasselbe Muster auf alle Kurse/Blöcke ausweiten, die noch keine Festigungslektion haben (Blöcke, die NICHT schon mit „Vermischtes/Klassenarbeitstraining" enden). **Wichtig (Lehre aus dem Pilot):** Der Aufgabenpool je Thema ist von den regulären Lektionen meist KOMPLETT aufgebraucht — die Festigungslektion braucht daher **eigene, frische Aufgaben** (neue Zahlen/Kontexte, verschränkt + Anwendung) in `daten/aufgaben/lernbuero/`, NICHT bloß ein Remix der schon bearbeiteten Aufgaben (das fällt den Schülern auf). Im Pilot ma-07 sind dafür je 8 neue Aufgaben (IDs 201–208) entstanden, Überschneidung mit den Vorlektionen = 0.

### B) Fehlende RS-Klassenarbeiten ergänzen (vom Betreiber ausdrücklich gewünscht)
- **Befund:** Im RS-Filter erscheinen kaum/keine Arbeiten, weil die meisten Sek-I-KAs nur mit `zweig:["gym"]` getaggt sind. Stand: Mathematik Sek I 37× gym / **0× rs**; Informatik Sek I 10× gym / **0× rs**; Physik Sek I 12× gym / 10× rs (Lücken). Oberstufe ist korrekt gym-only.
- **Auftrag:** Für **alle** RS-relevanten Sek-I-Themen RS-Versionen (Version A, gemäß CLAUDE.md „insgesamt etwas einfacher": kleinschrittiger, mehr AFB I/II, einfachere Zahlen/Kontexte, klarere Sprache) mit dem `klassenarbeit`-Skill erzeugen — Mathematik (Schwerpunkt), Informatik, plus Physik-Lücken auffüllen. Ablauf wie gehabt: `repariere_layout(doc)`, Ablage in `0Ablage/`, dann Eintrag in `daten/klassenarbeiten.json` (zweig `["rs"]`). Wellenweise mit zentraler QA.

## Wiedereinstieg in einer neuen Session

1. `STATUS.md` lesen (oberster Eintrag = neuester Stand).
2. Diese Datei (`OFFENE-PUNKTE.md`) für die nächsten Aufgaben.
3. Lokal testen: aus dem Projektroot `py -m http.server 8000`, dann im Browser öffnen.
4. Schreibvorgänge bevorzugt direkt im Projektordner ausführen; nach größeren Wellen zentral verifizieren.
