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
- Semantisches HTML, sichtbarer Tastaturfokus, Kontraste WCAG AA in Hell- und Dunkelmodus.
- **Definition of Done pro Thema:** Erklärseite mit ≥ 1 interaktivem Element · ≥ 8 Übungs- + ≥ 2 Zusatzaufgaben (AFB gemischt, Tags gesetzt) · Tipps + Lösungswege vollständig · Formeln rendern · mobil getestet · Fortschritt speichert · Druckansicht sauber · `themen.json` aktualisiert. Fachliche Endprüfung macht der Betreiber.
- Nach jedem abgeschlossenen Arbeitspaket: kompakte Änderungsliste ausgeben (neue/geänderte Dateien + Kurzbeschreibung) — sie dient dem Betreiber als Commit-Grundlage in GitHub Desktop.

## Arbeitsweise

Aufträge vollständig und eigenständig abschließen (keine halben Gerüste hinterlassen). Bei fachlich-inhaltlichen Entscheidungen (Themenauswahl, Schwerpunkte, Lösungswege) im Zweifel Annahme treffen, klar dokumentieren und am Ende der Session auflisten.
