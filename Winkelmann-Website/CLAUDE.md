# CLAUDE.md — Lernwebsite Mathematik · Physik · Informatik

Interaktive Übungs- und Erklärwebsite für Schülerinnen und Schüler einer KGS in Niedersachsen (Gymnasial- und Realschulzweig, Jg. 5–13). Betreiber: Dr. Winkelmann. Hosting später auf GitHub Pages — **rein statisch**. Entwicklung läuft über Claude Cowork (Windows): **Diese Datei zu Beginn jeder Session vollständig lesen und strikt befolgen.** Der vollständige Plan steht in `UMSETZUNGSPLAN.md`; bei Detailfragen dort nachschlagen.

## Harte Regeln

1. **Nur HTML, CSS, Vanilla JS (ES6-Module).** Kein Build-Schritt, kein Framework, kein npm-Paket zur Laufzeit.
2. **Keine externen Requests.** Keine CDNs, keine Google Fonts, keine Tracker, keine Cookies. Bibliotheken (KaTeX, später ggf. JSXGraph) liegen vollständig in `assets/lib/`, Schriften als woff2 in `assets/fonts/`.
3. **Ausschließlich relative Pfade** (`../../assets/...`). Niemals mit `/` beginnende Pfade — die Seite liegt live unter `/<repo>/`.
4. **Dateinamen:** kebab-case, klein, keine Umlaute (ae/oe/ue/ss), keine Leerzeichen. Strikt einhalten: Das Windows-Dateisystem verschleiert Groß-/Kleinschreibungsfehler, GitHub Pages bricht daran.
5. **Sprache:** Inhalte und UI auf Deutsch, Code-Kommentare auf Deutsch, Variablen-/Funktionsnamen deutsch oder englisch — aber konsistent.
6. **Urheberrecht:** keine Schulbuchinhalte, keine fremden Bilder/Texte. Alles wird selbst erstellt (SVG bevorzugt).
7. **Datenhaltung:** Aufgaben und Themen-Metadaten ausschließlich als JSON in `daten/` (Schema: `UMSETZUNGSPLAN.md` §7.2 und §11.2). HTML-Seiten enthalten keine fest verdrahteten Aufgaben.
8. **localStorage statt Server:** Fortschritt, Zweig-Wahl (Gym/RS) und Dark-Mode nur lokal speichern; Export/Import als JSON-Download anbieten.

## Struktur (Auszug)

```
index.html · 404.html · impressum.html · datenschutz.html · .nojekyll
assets/css/   design-tokens.css, main.css, print.css
assets/js/    komponenten.js, aufgaben-engine.js, fortschritt.js, mathe-render.js, sim/ (engine.js, welt.js, ui.js, mess.js)
assets/lib/   katex/ …        assets/fonts/ …        assets/img/ …
daten/        themen.json, aufgaben/<fach-stufe-thema>.json
mathematik/ physik/ informatik/   → <stufe>/<thema>/index.html + uebungen.html
simulationen/ index.html + validierung.html + <fach>/<name>/index.html + sim.js (gemeinsame Engine)
kc-quellen/   KC-PDFs (in .gitignore, nicht veröffentlichen)
```

Stufen-Ordnernamen: `klasse-5` … `klasse-10`, `einfuehrungsphase`, `qualifikationsphase`.

## Mathematik-Notation (KaTeX)

`$...$` inline, `$$...$$` abgesetzt. Deutsche Dezimalzahlen als `{,}` (z. B. `3{,}5`). Kein `\tfrac` (→ `\frac`), kein `\mathbb`, nur KaTeX-Standardumfang. Nach jedem dynamischen DOM-Update KaTeX-Auto-Render über die neuen Knoten laufen lassen.

## Didaktische Konventionen

- Jede Aufgabe: Zweig-Tag (`gym`/`rs`), Niveau 1–3, AFB I–III, gestufte Tipps (3 Stufen), vollständiger Lösungsweg.
- Numerische Eingaben: Komma und Punkt als Dezimaltrennzeichen akzeptieren, sinnvolle Toleranzen, Einheiten anzeigen.
- Zuordnungen per Dropdown statt Drag & Drop (Touch & Tastatur).
- Simulationen ausschließlich über die gemeinsame Engine (`assets/js/sim/`), niemals als Einzel-App: Modell rechnet in SI-Einheiten/Weltkoordinaten, fester Zeitschritt, Darstellung strikt getrennt. Pro Sim nur Manifest + `update()` + `zeichne()` in `sim.js`. Drei Modi: kontinuierlich, schrittweise, statisch-interaktiv (Details: `UMSETZUNGSPLAN.md` §8).
- Jede Sim: Parameter-Slider mit Live-Wert + Einheit, Presets, ablesbare Messgrößen/Diagramme mit CSV-Export, POE-Vorhersagefrage vor dem Start, 2–4 „Beobachtungsaufträge“, Beamer-Modus, Zustand im URL-Hash, Hinweis auf Modellgrenzen, `prefers-reduced-motion` respektieren.
- Pflicht vor `status: online`: 2–3 Prüffälle mit analytisch bekannter Lösung in `sim.js`; `simulationen/validierung.html` muss alle Fälle ✓ zeigen.
- Feedback nie nur über Farbe (zusätzlich ✓/✗ + Text). Keine Noten, kein Druck — Formulierungen ermutigend.

## Qualität & Test

- Lokaler Test: statischer Webserver aus dem Projektroot (in der Sandbox `python3 -m http.server 8000`; der Betreiber testet auf dem Windows-Host mit `py -m http.server 8000`). Jede neue/geänderte Seite dort prüfen, zusätzlich bei 380 px Breite (Handy). Kein Test über `file://` — ES6-Module laden dort nicht.
- **Wiederholungs-Gate (Lernbüro):** `werkzeuge/check-wiederholungen.py` findet doppelte Aufgaben (gleiche ID, gleiche Frage-Stammzeile oder gleicher Inhalt) in derselben/benachbarten Lektion; es läuft automatisch in `check-website.py` und muss 0 sichtbare Verstöße zeigen. Bereinigung über `werkzeuge/fix-wiederholungen.py` (Backup nach `0Ablage/_wdh_backup/`).
- Semantisches HTML, sichtbarer Tastaturfokus, Kontraste WCAG AA in Hell- und Dunkelmodus.
- **Definition of Done pro Thema:** Erklärseite mit ≥ 1 interaktivem Element · ≥ 8 Übungs- + ≥ 2 Zusatzaufgaben (AFB gemischt, Tags gesetzt) · Tipps + Lösungswege vollständig · Formeln rendern · mobil getestet · Fortschritt speichert · Druckansicht sauber · `themen.json` aktualisiert. Fachliche Endprüfung macht der Betreiber.
- Nach jedem abgeschlossenen Arbeitspaket: kompakte Änderungsliste ausgeben (neue/geänderte Dateien + Kurzbeschreibung) — sie dient dem Betreiber als Commit-Grundlage in GitHub Desktop.

## Arbeitsweise

Aufträge vollständig und eigenständig abschließen (keine halben Gerüste hinterlassen). Bei fachlich-inhaltlichen Entscheidungen (Themenauswahl, Schwerpunkte, Lösungswege) im Zweifel Annahme treffen, klar dokumentieren und am Ende der Session auflisten.

## Klassenarbeiten — Konventionen (ab Welle 2)

Beim Erstellen von Klassenarbeiten mit dem `klassenarbeit`-Skill gilt für dieses Projekt:
- **Nur Version A** je Arbeit (die Website zeigt pro Thema genau eine Version; keine A/B-Doppelung).
- **Arbeitszeit:** Klassen 5–7 = 60 Minuten; ab Klasse 8 (inkl. Oberstufe) = 90 Minuten.
- **Realschulzweig (R):** insgesamt etwas einfacher als Gymnasialzweig — kleinschrittiger, mehr AFB I/II und weniger AFB III, einfachere Kontexte/Zahlen, klarere Sprache.
- **Layout (Pflicht, Lehren aus Welle 1):** vor dem Speichern `repariere_layout(doc)` aus `werkzeuge/kab_layout_fix.py` aufrufen — bindet Abschnittsüberschriften (Verwendete Operatoren / Erwartungshorizont / Benotung) per keep-with-next an ihre Tabelle, verhindert das Aufspalten von Operatoren- und Benotungstabelle über Seitenumbrüche, hält das Kontrollergebnis bei seiner Teilaufgabe, stellt alle BE-Angaben einheitlich rechtsbündig.
- **Ablage:** Entwürfe nach `0Ablage/` (gitignored), zur Sichtung durch den Betreiber.

## Lernzirkel (Trainingsraum)

Frei wählbare Stationen mit Laufzettel (localStorage). Eigener Bereich; Übersicht `lernspiele/lernzirkel/index.html` (`data-seite="lernzirkel-uebersicht"`), gegliedert nach Fach → Stufe. Vom Trainingsraum aus verlinkt.

- **Registry** `daten/lernzirkel.json`: je Eintrag `id, fach, stufe` („Klasse 5"…„Klasse 10" · „Einführungsphase" · „Qualifikationsphase"), `titel` (ohne „Lernzirkel:"-Präfix), `kurz`, `ordner`.
- **Je Zirkel:** `daten/lernzirkel/<id>.json` + Seite `selbstlernen/lernzirkel-<id>/index.html` (`data-seite="lernzirkel" data-zirkel="<id>"`, Pfade `../../assets`).
- **Stationstypen:** `widget` (interaktiv-Widget `id`+`params` — nur erprobte Params 1:1 aus bestehenden Lektionen kopieren, **nie erfinden**) · `link` (root-relativer Pfad zu Experiment/Sim/Spiel, **muss existieren**) · `knobel` (HTML endet mit `<details><summary>Lösung anzeigen</summary><div>…</div></details>`) · `aufgaben` (`quelle` = `daten/aufgaben`-Schlüssel + **echte** `ids`). Pflicht je Zirkel: ≥1 Erkunden (widget/link) + 1 knobel + 1 aufgaben.
- **Ziel:** je Klasse × Fach × Themenblock mindestens ein Zirkel (außer reinen „Vermischt/Überblick"-Blöcken). Gate: `werkzeuge/check-lernzirkel.py`.

## Lektionstyp „Lernaufgabe"

Eine Lernaufgabe ist eine reguläre Lektion, deren `verstehen`-Block vier zusätzliche Felder trägt (bestehende Inhalte bleiben):

1. `vorueberlegung` — Hypothese im Stil „Bevor wir … überlegen wir: … Vermutung: … erwarten wir …".
2. `erkundenZuerst: true` — erst erkunden, dann erklären (Erkunden rendert vor den Schritten).
3. `erkunden: [ … ]` — **genau ein** Experiment/Simulations-Objekt.
4. `lehrkraft` — vier Absätze: Voraussetzungen · Angesprochene Kompetenzen · Erwartung · Modellgrenzen.

**erkunden-Objekt:** `typ:"experiment"` (auch bei Simulationen!), `titel`, `vorhersage` (POE-Frage), `auftraege` (2–4), `pfad`, `linkLabel`, `hinweis`, optional `material`, optional `interaktiv` (eingebettetes Mess-Widget). Standardtexte (verbindlich):
- **Experiment:** `linkLabel` = „Digitales Experiment öffnen"; `hinweis` = „Kein Material zur Hand? Öffne das **digitale Experiment** — die Auswertung läuft genauso."
- **Simulation:** `linkLabel` = „Simulation öffnen"; `hinweis` = „Kein Material zur Hand? Nutze die **Simulation** — die Auswertung läuft genauso."
- **Nur Mess-Widget (kein externer Link):** `hinweis` = „Kein Material zur Hand? Trag deine Werte direkt unten ins **Messlabor** ein — die Auswertung läuft genauso."

**Regel:** Zu **jedem** digitalen Experiment und **jeder** Simulation gehört (mindestens) eine Lernaufgabe. Gate: `werkzeuge/check-lernaufgaben.py`. (KaTeX: kein `\tfrac`, nur `\frac`.)

## Experimente (digitale Nachbau-Experimente)

Je Experiment: `experimente/<fach>/<name>/index.html` (`data-seite="experiment"`) + eigenes `experiment.js` (exportiert `starteExperiment()`, mountet in `#experiment-wurzel`). Gemeinsame Bausteine: `assets/js/experiment/helfer.js`. Prinzip: realitätsnahe Messpraxis (selbst ablesen, protokollieren, auswerten), deterministische Mess-Streuung, reine Logik + `TESTS`/`pruefFaelle` (Node-testbar). Registry `daten/experimente.json` (`id, fach, stufe, status, titel, kurz, pfad, themen`).

## Einstellungen / Fortschritt

Seite `einstellungen/index.html` (`data-seite="einstellungen"`, Renderer `assets/js/einstellungen.js`), erreichbar über das **⚙-Symbol in der Kopfzeile** (kein Menüwort in der Hauptnav). Fortschritt **sichern / laden / zurücksetzen** — geräteübergreifend per JSON-Datei; Import führt zusammen („gelöst" gewinnt). Funktionen in `fortschritt.js`: `exportiereFortschritt`, `importiereFortschritt`, `setzeFortschrittZurueck`, `holeFortschrittUebersicht`. Schnellzugriff Export/Import zusätzlich in der Fußzeile. Alles bleibt lokal (kein Server, keine Konten).

## Automatische Gates (`werkzeuge/check-website.py`)

Ein Lauf prüft nacheinander: Links/Pfade/keine externen Requests · Wiederholungen (`check-wiederholungen.py`) · Aufgaben-Render-Fallen (`check-aufgaben.py`) · **Lernzirkel-Konsistenz (`check-lernzirkel.py`)** · **Lernaufgaben-Abdeckung (`check-lernaufgaben.py`)**. Muss mit „ALLES OK" enden. **Datenpflege-Konvention:** Änderungen in `daten/` per Skript vornehmen und mit Roundtrip absichern (`neu=json.dumps(d,ensure_ascii=False,indent=1); assert json.loads(neu)==d`), keine abschließende Leerzeile; danach immer das Gate laufen lassen.

## Evidenzbasierte Lernelemente (Didaktik-Welle 2026-06)

Belege/Begründung: `Material/_Lernwebsite-Auswertung/Forschungsbericht_Fachdidaktik-Selbstlernen_2026-06.md`. Schema-Ergänzungen sind optional und rückwärtskompatibel:

- **Refutationaler Stolperstein** (Schroeder & Kucera 2022, g≈0,41): `verstehen.stolperstein` (HTML-String). Je Themenblock trägt die inhaltlich führende Lektion einen Stolperstein in der 4-Teil-Form „**Häufiger Irrtum:** … **Warum das naheliegt:** … **Gegenbeispiel:** … **Richtig ist:** …". Fehlvorstellung ernst nehmen/umdeuten, nicht nur „falsch".
- **Grundwissen-Kernblock** (LEIFI-Prinzip): optionales `verstehen.grundwissen` (kurzer HTML-String, Kernformeln/-sätze); rendert als abgesetzter Kasten oben im Verstehen.
- **Teilziel-Überschriften / Subgoal-Labels** (Morrison/Margulieux): in `beispiel.schritte` darf ein Eintrag das Objekt `{ "teilziel": "…" }` sein (Zwischenüberschrift); Strings bleiben normale Schritte.
- **Selbstcheck als Abruf** (Testing-Effekt, Dunlosky): `verstehen.selbstcheck` (`[{frage, antwort}]`) rendert „erst selbst beantworten (Eingabefeld), dann Musterantwort aufdecken" — kein Spickeln.
- **Distraktor-/Fehler-Feedback** (Hattie & Timperley): MC-Optionen tragen `erklaerung` (je falscher Option, benennt die Fehlvorstellung); numerische Eingaben optional `fehler: [{wert, hinweis, toleranz?}]`.
- **Bedingte Wahrscheinlichkeit über natürliche Häufigkeiten** (Gigerenzer & Hoffrage): absolute Anzahlen (z. B. „von 1000 …") vor Prozenten/Formel.
- **Parsons-Aufgaben** (Ericson): Aufgabentyp `reihenfolge` für Code-/Algorithmus-Schritte (Informatik).
- **Lerntipp** auf der Lernbüro-Startseite: testen statt lesen, Üben verteilen/mischen (Spacing/Interleaving stecken in der Tagesmischung), Stolpersteine bewusst lesen. Bewusst NICHT umgesetzt (widerlegt/schwach): Lernstil-Pfade, reines Entdecken ohne Anleitung, kompetitive Punkte/Bestenlisten.
- **Gemischt üben / Interleaving** (Rohrer & Taylor 2007; Brunmair & Richter 2019): Die Üben-Phase jeder Lektion zeigt zusätzlich ein einklappbares „🔀 Gemischt üben" (`baueGemischtUeben` in `kurs.js`). Es zieht die Aufgaben **des ganzen Themenblocks** (alle `quelle`-Dateien der Spuren) gemischt, schließt die in der Lektion bereits gezeigten IDs aus (sonst Kollision des MC-Radionamens `mc-<id>`), filtert nach Zweig, mischt deterministisch (pro Lektion stabil) und rendert max. 8. Kein neues Schemafeld nötig — wirkt automatisch in allen Lektionen mit Üben-Aufgaben.
- **Begriffs-Querverlinkung** (Serlo-Prinzip): optionales `verstehen.begriffe` = `[{ "wort", "lektion" }]` rendert am Ende des Verstehen-Blocks eine Zeile „🔗 Verwandte Begriffe" mit Sprung-Links zur einführenden Lektion **desselben Kurses** (`#lektion-<id>`; `hashchange` → `route()` wechselt die Lektion). `lektion` muss eine existierende Lektions-ID im selben Kurs sein und in der Lektionsreihenfolge **vor** der annotierten Lektion stehen (kein Vorwärts-/Selbstverweis, keine `…b`-Wiederhol-Lektion als Ziel). **Flächendeckend umgesetzt:** alle 24 Kurse, 457 Links (max. 3 je Lektion, je Ziel nur ein Link). Erzeugt per Subagenten (Voraussetzungs-Graph aus Lektionstiteln), zentral injiziert + validiert. Fachliche Endprüfung der Begriffs-Labels macht der Betreiber.
