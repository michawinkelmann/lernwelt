# Lernwebsite Mathematik · Physik · Informatik

Interaktive Übungs- und Erklärwebsite für Schülerinnen und Schüler einer KGS in Niedersachsen (Gymnasial- und Realschulzweig, Jg. 5–13). Rein statisch: HTML, CSS, Vanilla JS — kein Build-Schritt, keine externen Abhängigkeiten.

## Lokal starten

Die Seite nutzt ES6-Module und muss über einen Webserver laufen (nicht per Doppelklick / `file://`):

```
py -m http.server 8000
```

Dann im Browser: http://localhost:8000

## Bereiche

- **Themen** (`mathematik/`, `physik/`, `informatik/`) — Erklärseiten + Übungen je Stufe und Thema.
- **Simulationen** (`simulationen/`) und **Experimente** (`experimente/`) — interaktiv, mit Messpraxis.
- **Klassenarbeiten** (`klassenarbeiten/`) — komplette Arbeiten + Lernzettel als PDF.
- **Trainingsraum** (`lernspiele/`) inkl. **Tagesmischung** · **Pausenraum** (`pausenraum/`) · **CAS-Werkstatt** (`cas-werkstatt/`) · **Suche** (`suche/`).
- **Lernbüro** (`selbstlernen/`) — siehe unten.

## Lernbüro (Selbstlernbereich)

Geführtes Selbstlernen im Unterricht: ein Bereich, in dem Schülerinnen und Schüler eigenständig
arbeiten und die Lehrkraft moderiert. Einstieg über die Hauptnavigation **„Lernbüro"** bzw.
`selbstlernen/index.html`. Das Lernbüro deckt Mathematik, Physik und Informatik von Klasse 5 bis zum Abitur ab — jedes Website-Thema mit Erklärseite und Aufgaben ist als geführter Kurs verfügbar.

- **Kurs = Fach + Stufe** (z. B. „Mathematik · Klasse 7"). Jeder Kurs enthält einen oder mehrere
  **Themenblöcke** mit je ~5 **Lektionen** (Phasen: Ankommen · Verstehen · Üben · Sichern · Extra).
  In „Verstehen" wird der passende Abschnitt der Erklärseite direkt eingebettet (eine Quelle, keine Dopplung).
- **Projektkarten** (Informatik): eigener Kartentyp zum Programmieren durch Machen —
  **Scratch (Kl. 9)** und **Calliope mini (Kl. 10)**. Programmiert wird im externen Editor
  (nur verlinkt), die Karte gibt Ziel, Bausteine, Schritte, gestufte Hilfen und Partner-Abnahme.
- **Zweig-Filter (Gym/RS, oben rechts):** Realschüler sehen nur RS-relevante Inhalte —
  Oberstufenkurse (Einführungs-/Qualifikationsphase, Jg. 11–13) sind für RS ausgeblendet, und
  Gym-spezifische Zusatzaufgaben erscheinen für RS unten als freiwilliger **„Ausblick Gymnasium"**.
- **Fortschritt** (erledigte Phasen, Checkpoints, Ampel, Lerntagebuch, Projektkarten) wird nur lokal
  im Browser gespeichert — keine Konten, keine Übertragung; Export/Import über die Fußzeile.
- **Rückmeldung (optional):** am Ende jeder Lektion ein dezentes, standardmäßig zugeklapptes
  Feedback-Feld (Verständlichkeit, Schwierigkeit, Freitext). Anonym und lokal; Schülerinnen und
  Schüler exportieren ihre Rückmeldungen als JSON-Datei (`lernwelt-feedback-<Datum>.json`) und
  geben sie der Lehrkraft.

Registries: `daten/kurse.json` (Lektionskurse) und `daten/projekte.json` (Projektkarten);
Inhalte in `daten/kurse/<id>.json` bzw. `daten/projekte/<id>.json`.

### Lehrkraft-Bereich (Moderationsseiten)

Zu jedem Kurs gibt es eine **Moderationsseite** für die Lehrkraft (Stoffverteilung, typische Fehler,
Differenzierung, Praxis-Leitfaden).

- **So kommst du hin:** in jedem Kurs ganz unten auf der Lernlandkarte der Link **„🔒 Lehrkraft-Bereich"**,
  oder direkt über die URL `selbstlernen/<kurs-ordner>/lehrkraft.html`
  (z. B. `selbstlernen/mathematik-klasse-7/lehrkraft.html`).
- **Passwort:** `1337`. Nach der Eingabe bleibt der Bereich für die laufende Browser-Sitzung frei.
- **Wichtig (ehrlich):** Das ist ein **clientseitiger Sichtschutz**, kein echter Passwortschutz.
  Auf einer statischen Seite stehen die Inhalte im Quelltext — der Schutz hält Schülerinnen und
  Schüler im Alltag fern, ist aber technisch umgehbar. Für interne Unterrichtsnotizen ist das
  ausreichend; **keine sensiblen Daten** auf diese Seiten stellen. (Das Passwort steht in
  `assets/js/komponenten.js`, Funktion `zeigeLehrkraftSperre` — dort bei Bedarf ändern.)
- **Druckmaterial erstellen:** Link **„🖨 Druckmaterial erstellen"** auf jeder Lehrkraft-Seite
  (→ `selbstlernen/druck.html?kurs=<id>`). Erzeugt aus einem Kurs druckbare Arbeitsblätter —
  wahlweise Schüler-Blatt (ohne Lösungen) oder Lehrer-Exemplar (mit Lösungen), Spuren wählbar.
  Für den Fall, dass es einmal nicht digital geht.

## Struktur (Auszug)

- `daten/themen.json` — zentrale Themenlandkarte (Bauplan, Navigation, KC-Bezug)
- `daten/aufgaben/` — Übungsaufgaben als JSON; `daten/aufgaben/lernbuero/` — Ergänzungsaufgaben fürs
  Lernbüro (Marker `ergaenzung:"lernbuero"`). Neu erstellte reguläre Aufgaben tragen den Marker
  `ergaenzung:"kc-neu"`. Beide kennzeichnen Inhalte, deren fachliche Endprüfung durch die Lehrkraft noch aussteht
- `daten/kurse.json`, `daten/kurse/` · `daten/projekte.json`, `daten/projekte/` — Lernbüro
- `assets/css/` — `design-tokens.css`, `main.css`, `selbstlernen.css`, `print.css`
- `assets/js/` — `komponenten.js` (Header/Nav/Fußzeile, Dunkelmodus, Zweig, **Lehrkraft-Schutz**),
  `aufgaben-engine.js`, `fortschritt.js`, `mathe-render.js`, `selbstlernen/` (`kurs.js`, `projekte.js`, `uebersicht.js`, `druck.js`), `sim/`
- `assets/lib/` (KaTeX), `assets/fonts/` (woff2)
- `mathematik/`, `physik/`, `informatik/` — Inhaltsseiten · `simulationen/`, `experimente/`,
  `klassenarbeiten/`, `lernspiele/`, `pausenraum/`, `cas-werkstatt/`, `suche/`, `selbstlernen/`
- `kc-quellen/` — Kerncurricula-PDFs (nur lokal, nicht im Repo)
- Begleitdokumente: `LERNBUERO-AUFGABEN.md` (Standard fürs Aufgaben-Ergänzen), `INFORMATIK-VORSCHLAG.md`, `KC-ABGLEICH.md` (Abgleich mit den Kerncurricula), `OFFENE-PUNKTE.md` (offene Aufgaben & nächste Schritte)

Konventionen und Regeln: siehe `CLAUDE.md`. Vollständiger Plan: `UMSETZUNGSPLAN.md`. **Aktueller Projektstand und Arbeitsmuster: `STATUS.md`** (zu Beginn jeder Arbeitssession lesen).

**Ausnahme Dateinamen:** Die KaTeX-Fontdateien unter `assets/lib/katex/fonts/` behalten ihre Original-Namen mit Großbuchstaben (z. B. `KaTeX_Main-Regular.woff2`), weil `katex.min.css` sie intern exakt so referenziert. Da Referenz und Dateiname aus derselben Quelle stammen, besteht kein Case-Sensitivity-Risiko auf GitHub Pages. Eigene Dateien folgen strikt der kebab-case-Konvention.

## Deployment

GitHub Pages, Branch `main`, Ordner `/ (root)`. Details: `UMSETZUNGSPLAN.md` Abschnitt 13, Phase 7.

## Lizenz

Code: MIT · Eigene Inhalte (Texte, Aufgaben, Grafiken, Klassenarbeiten, Spiele):
[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.de) ·
Drittanbieter behalten ihre Lizenzen — Details in [LICENSE.md](LICENSE.md) und
[DRITTANBIETER.md](DRITTANBIETER.md).
