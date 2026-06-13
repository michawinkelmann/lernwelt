# Umsetzungsplan: Interaktive Lernwebsite Mathematik · Physik · Informatik

**Projekt:** Übungs- und Erklärwebsite für Schülerinnen und Schüler von Dr. Winkelmann (KGS, Niedersachsen)
**Hosting-Ziel:** GitHub Pages (rein statisch: HTML, CSS, JS)
**Entwicklung:** lokal mit Claude Cowork (Claude-Desktop-App für Windows), Upload ins GitHub-Repo erfolgt manuell durch dich
**Stand:** Juni 2026

---

## 1. Ziel und Rahmenbedingungen

Die Website soll drei Dinge leisten:

1. **Üben:** Übungs- und Zusatzaufgaben mit Selbstkontrolle (Lösungen, gestufte Tipps, Sofort-Feedback), differenziert nach Zweig (Gymnasial-/Realschulzweig) und Niveau.
2. **Verstehen:** Anschauliche, interaktive Erklärungen zentraler Konzepte — vor allem über Simulationen und Animationen (Schwerpunkt Physik, aber auch Mathematik und Informatik).
3. **Strukturieren:** Klare Gliederung nach Fach → Klassenstufe → Thema, wobei die Themenauswahl aus den jeweils gültigen Kerncurricula Niedersachsens abgeleitet wird.

**Harte Randbedingungen:**

- Kein Backend, keine Datenbank, kein Server-Code → alles muss client-seitig laufen.
- Keine Nutzerkonten. Fortschritt wird ausschließlich lokal im Browser gespeichert (`localStorage`).
- Keine externen CDN-Abhängigkeiten (Datenschutz, Offline-Fähigkeit, Stabilität): alle Bibliotheken und Schriften liegen im Repo.
- Zielgeräte: vor allem Smartphones der Schüler, daneben Tablets (iPads), Schul-PCs, dein Desktop. Mobile-first ist Pflicht.
- Inhalte müssen urheberrechtlich sauber sein: **keine Schulbuchscans, keine Buchaufgaben im Wortlaut, keine fremden Abbildungen.** Alle Aufgaben, Texte und Grafiken werden selbst erstellt (bzw. von Claude generiert und von dir geprüft).

---

## 2. Werkzeug: Claude Cowork (Claude-Desktop-App, Windows)

Das Projekt wird mit **Claude Cowork** auf deinem Windows-Rechner umgesetzt. Cowork ist der agentische Modus der Claude-Desktop-App: Du verbindest einen Ordner, beschreibst das Ziel, und Claude liest, schreibt und organisiert die Dateien direkt dort — mit derselben Agent-Architektur, die auch Claude Code antreibt, nur ohne Terminal. Code-Ausführung (Skripte, Tests, PDF-Auswertung der KCs) läuft dabei in einer isolierten VM auf deinem Rechner, nicht direkt auf deinem Windows-System. Alle Projektdateien bleiben toolneutral; die Desktop-App enthält neben Chat und Cowork inzwischen auch einen Claude-Code-Tab, ein Wechsel wäre also jederzeit ohne Umbau möglich.

### 2.1 Voraussetzungen (einmalig prüfen)

- **Bezahlter Claude-Plan** (Pro, Max, Team oder Enterprise) und die **aktuelle Claude-Desktop-App für Windows** von https://claude.com/download.
- **Windows-Edition:** Cowork braucht für seine Sandbox-VM vollständiges Hyper-V — das gibt es nur in Windows **Pro, Education oder Enterprise**; Windows **Home reicht nicht**. Außerdem: 64-bit (x64, kein ARM), Windows 10 ab Version 2004/Build 19041 bzw. Windows 11, S-Modus deaktiviert.
- **Hardware-Virtualisierung** (Intel VT-x / AMD-V) muss im BIOS/UEFI aktiviert sein.
- **Administratorrechte** bei der Installation (ohne Adminrechte installiert die App ohne Cowork).
- Internetverbindung während der gesamten Session; die App muss geöffnet bleiben, solange ein Task läuft. Beim ersten Cowork-Start wird die Sandbox (~2 GB) einmalig heruntergeladen.
- Anthropic bietet auf der Cowork-Hilfeseite (https://support.claude.com → „Getting started with Cowork“) ein kleines **Bereitschaftsprüfungs-Programm** an — einmal laufen lassen, dann ist die Frage „läuft das bei mir?“ vorab geklärt.

### 2.2 Einrichtung und Arbeitsmodus

1. Projektordner anlegen, z. B. `C:\Projekte\lernwebsite\`, und `CLAUDE.md` + `UMSETZUNGSPLAN.md` hineinlegen.
2. In der Desktop-App den Cowork-Modus öffnen und diesen Ordner verbinden. In den **Ordner-Anweisungen** (Folder Instructions) hinterlegen: *„Lies zu Beginn jeder Aufgabe die Datei CLAUDE.md vollständig und halte dich strikt daran.“* Damit gelten die Projektregeln in jedem Task automatisch — zusätzlich beginnt sicherheitshalber jeder Auftrag in Abschnitt 13 trotzdem mit diesem Satz.
3. Pro Arbeitspaket (Phasenplan, Abschnitt 13) **ein Cowork-Task** mit dem jeweiligen Auftrag. Plan kurz prüfen, laufen lassen, Ergebnis abnehmen.
4. **Sichttest auf deinem Rechner:** Einmalig Python für Windows installieren (https://www.python.org, Haken bei „Add to PATH“). Dann im Projektordner PowerShell öffnen: `py -m http.server 8000` → `http://localhost:8000` im Browser. Der Webserver ist nötig, weil die Seite ES6-Module nutzt, die per Doppelklick auf eine HTML-Datei (`file://`) nicht laden. Fürs Handy-Layout: Browser-Devtools, Gerätesimulation 380 px.
5. **Versionierung mit GitHub Desktop** (https://desktop.github.com): einmalig „Add local repository“ auf den Projektordner, dann nach jedem abgenommenen Arbeitspaket ein Commit per Klick. Das ersetzt Terminal-Git komplett — und der spätere Upload (Phase 7) ist mit „Publish repository“ ebenfalls nur ein Klick.
6. *Optional, aber stark:* die **Claude-in-Chrome-Erweiterung**. Cowork kann sie als Werkzeug nutzen, die lokal laufende Seite (`http://localhost:8000`) selbst im Browser öffnen, ansehen und visuell nachbessern — gerade für Design-Iterationen und Simulationen wertvoll.

### 2.3 Eine Eigenheit, die du kennen musst

Cowork arbeitet in einer Sandbox; deine Inhalte liegen aber ganz normal im verbundenen Windows-Ordner. **Windows unterscheidet bei Dateinamen keine Groß-/Kleinschreibung, GitHub Pages schon.** Ein Verweis auf `Bild.SVG` funktioniert lokal also auch dann, wenn die Datei `bild.svg` heißt — live bricht er. Deshalb ist die Kleinschreibungs-Konvention (CLAUDE.md, Regel 4) unter Windows nicht Kosmetik, sondern Pflicht, und Phase 6 enthält einen automatischen Check dafür.

---

## 3. Technologie-Entscheidung

**Empfehlung: Vanilla HTML/CSS/JS ohne Build-Schritt.**

Begründung:

- **Direkt GitHub-Pages-tauglich:** Repo-Inhalt = Website. Kein Build, keine CI, kein `npm run build` vor jedem Upload. Du lädst hoch, fertig.
- **Langlebig und wartbar:** In fünf Jahren noch ohne Toolchain-Archäologie editierbar — wichtig für ein Projekt, das du nebenbei pflegst.
- **Jede Datei einzeln testbar:** Themenseiten und Simulationen laufen einzeln im Browser, ideal für inkrementelle Entwicklung mit Cowork.
- Das Problem duplizierter Header/Footer/Navigation lösen wir nicht mit einem Static-Site-Generator, sondern mit einer **kleinen JS-Komponenten-Injektion** (Abschnitt 6) und einer **zentralen Themen-Datenbank als JSON** (Abschnitt 5/11), aus der Navigation und Übersichtsseiten dynamisch gebaut werden. Neue Inhalte = neue Inhaltsdatei + ein Eintrag in `themen.json`.

*Geprüfte Alternative (bewusst verworfen):* Ein Static-Site-Generator wie Eleventy (Markdown → HTML, Templates) wäre bei sehr vielen reinen Textseiten komfortabler, erzwingt aber einen Node-Build vor jedem Deployment und macht das Repo komplexer. Da der Kern der Seite ohnehin interaktiv ist (Aufgaben-Engine, Simulationen) und die Inhalte stark JSON-getrieben sind, bringt ein Generator hier wenig. Falls die Seite später auf viele hundert Themen wächst, ist eine Migration zu Eleventy möglich, ohne Inhalte wegzuwerfen (JSON und Sim-HTML bleiben nutzbar).

**Bibliotheken (alle lokal im Repo unter `assets/lib/`, keine CDN-Einbindung):**

| Bibliothek | Zweck | Lizenz | Pflicht/Optional |
|---|---|---|---|
| KaTeX | LaTeX-Formelrendering (`$...$`, `$$...$$`) | MIT | Pflicht ab Phase 1 |
| JSXGraph | Interaktive Mathematik (Geometrie, Funktionsgraphen, Schieberegler) | LGPL/MIT | Optional ab Phase 4 |
| Blockly | Blockbasiertes Programmieren (Informatik Sek I) | Apache 2.0 | Optional, späte Phase |

Alles andere (Simulationen, Aufgaben-Engine, Navigation, Fortschritt) wird in Vanilla JS (ES6+, Module) selbst geschrieben — das hält die Seite schlank und du verstehst jede Zeile.

---

## 4. Informationsarchitektur

### 4.1 Hierarchie

```
Startseite
├── Mathematik
│   ├── Klasse 5 … Klasse 10        (Sek I, Zweig-Filter Gym/RS)
│   ├── Einführungsphase (Jg. 11)
│   └── Qualifikationsphase (Jg. 12/13, gA/eA-Kennzeichnung)
├── Physik
│   ├── Klasse 5 … Klasse 10
│   ├── Einführungsphase
│   └── Qualifikationsphase (gA/eA)
├── Informatik
│   ├── Klasse 9 / Klasse 10        (Pflichtfach, je 1 Wochenstunde)
│   ├── Wahlpflicht / AG (optional, falls relevant)
│   └── Sek II (falls an eurer Schule angeboten)
└── Simulationen                     (fachübergreifende Galerie aller Sims)
```

Jede Stufe enthält **Themen** (z. B. „Quadratische Funktionen“, „Elektrische Felder“, „Sortieralgorithmen“). Ein Thema bündelt: Erklärseite(n), eingebettete Simulationen, Übungsaufgaben, Zusatzaufgaben.

### 4.2 Umgang mit den Zweigen der KGS

Gymnasial- und Realschulzweig behandeln in Mathematik und Physik große Themenüberschneidungen in unterschiedlicher Tiefe. Statt Inhalte zu duplizieren:

- **Ein Thema existiert genau einmal**, getaggt mit `zweig: ["gym", "rs"]` (oder nur einem von beiden).
- **Aufgaben tragen Zweig- und Niveau-Tags:** `zweig` plus `niveau` (1 = Basis, 2 = Standard, 3 = Zusatz/Knobelei). Realschulzweig sieht standardmäßig Niveau 1–2, Gymnasialzweig 2–3 — aber jeder kann den Filter umstellen (Differenzierung nach oben und unten ist ausdrücklich erwünscht).
- **Ein globaler Zweig-Umschalter** in der Kopfzeile (Gym/RS), gespeichert in `localStorage`, filtert Themenlisten und Aufgaben. Kein Zwang: ohne Auswahl wird alles gezeigt.
- Wo sich Erklärtiefe unterscheidet, gibt es auf der Themenseite aufklappbare Abschnitte „Vertiefung (Gymnasialzweig)“.

### 4.3 URL-Schema (= Ordnerschema)

Sprechende, stabile, **durchgehend kleingeschriebene** Pfade ohne Umlaute (ä→ae usw.), da GitHub Pages case-sensitiv ist:

```
/index.html
/mathematik/index.html
/mathematik/klasse-9/index.html
/mathematik/klasse-9/quadratische-funktionen/index.html      ← Erklärseite
/mathematik/klasse-9/quadratische-funktionen/uebungen.html   ← Aufgabenseite
/physik/qualifikationsphase/elektrische-felder/index.html
/informatik/klasse-10/algorithmen/index.html
/simulationen/index.html
/simulationen/physik/plattenkondensator/index.html
```

---

## 5. Ordner- und Dateistruktur

```
lernwebsite/
├── CLAUDE.md                  ← Projektkonventionen, in jeder Cowork-Session zu lesen (liegt bei)
├── README.md                  ← Kurzbeschreibung, lokaler Start, Deployment
├── .nojekyll                  ← verhindert Jekyll-Verarbeitung auf GitHub Pages
├── index.html                 ← Startseite
├── 404.html
├── impressum.html
├── datenschutz.html
├── assets/
│   ├── css/
│   │   ├── design-tokens.css  ← Farben, Typo, Abstände (CSS Custom Properties)
│   │   ├── main.css           ← Layout, Komponenten
│   │   └── print.css          ← Druckansicht (Aufgabenblätter ohne Lösungen)
│   ├── js/
│   │   ├── komponenten.js     ← injiziert Header/Footer/Navigation/Breadcrumbs
│   │   ├── aufgaben-engine.js ← rendert & prüft Aufgaben aus JSON
│   │   ├── fortschritt.js     ← localStorage-Verwaltung, Export/Import
│   │   ├── mathe-render.js    ← KaTeX-Initialisierung (auto-render)
│   │   └── sim/               ← Simulations-Engine: engine.js, welt.js, ui.js, mess.js (§8)
│   ├── lib/
│   │   ├── katex/             ← KaTeX komplett lokal (css, js, fonts)
│   │   └── jsxgraph/          ← ab Phase 4
│   ├── fonts/                 ← lokal gehostete Webfonts (keine Google-Fonts-CDN!)
│   └── img/                   ← eigene Grafiken, Icons (SVG bevorzugt)
├── daten/
│   ├── themen.json            ← zentrale Themenlandkarte (siehe 11.2)
│   └── aufgaben/
│       ├── ma-09-quadratische-funktionen.json
│       ├── ph-qp-elektrische-felder.json
│       └── …
├── mathematik/ …              ← Inhaltsseiten gemäß URL-Schema
├── physik/ …
├── informatik/ …
└── simulationen/
    ├── index.html             ← Galerie mit Vorschaukacheln
    ├── validierung.html       ← Prüffall-Check aller Sims (§8.4)
    └── physik/ mathematik/ informatik/
        └── <name>/index.html + sim.js   (nutzt die gemeinsame Engine)
```

**Grundprinzip:** Inhalte (Aufgaben, Themenmetadaten) leben als **Daten** in `daten/`, Darstellung lebt als **Code** in `assets/`. Themenseiten selbst sind schlanke HTML-Dateien, die Engine und Daten zusammenstecken. Das macht spätere Massenänderungen (Design, Aufgabenformat) trivial.

---

## 6. Seitentypen und gemeinsame Komponenten

### 6.1 Komponenten-Injektion statt Copy-Paste

Jede HTML-Seite enthält nur ihren eigentlichen Inhalt plus einen einzigen Skript-Einbund:

```html
<script type="module" src="../../assets/js/komponenten.js"></script>
```

`komponenten.js` injiziert beim Laden: Kopfzeile mit Logo/Titel, Hauptnavigation (Fächer), Breadcrumb (aus `themen.json` + aktueller URL abgeleitet), Zweig-Umschalter, Dark-Mode-Toggle, Fußzeile (Impressum/Datenschutz/Kontakt). Ändert sich die Navigation, wird genau eine Datei angepasst.

*Bewusster Trade-off:* Ohne JavaScript sieht man nur den Seiteninhalt ohne Navigation. Für eine interaktive Lernseite (die ohnehin JS braucht) ist das akzeptabel; ein `<noscript>`-Hinweis mit Link zur Startseite fängt den Randfall ab.

### 6.2 Die vier Seitentypen

1. **Übersichtsseite** (Startseite, Fach-, Stufenübersicht): wird komplett aus `themen.json` generiert — Kacheln mit Titel, Kurzbeschreibung, Icons für „enthält Simulation“ / „Aufgaben verfügbar“, Fortschrittsanzeige pro Thema (aus `localStorage`).
2. **Themenseite (Erklärseite):** strukturierter Erklärtext mit KaTeX-Formeln, Merkkästen, eingebetteten Simulationen (`<iframe>` mit Vollbild-Link), kleinen Verständnis-Checks zwischendurch (1–2 Schnellfragen), am Ende Verweis auf die Übungsseite. Aufklappbare „Vertiefung“-Abschnitte für den Gymnasialzweig.
3. **Übungsseite:** lädt die zugehörige Aufgaben-JSON und übergibt sie der Aufgaben-Engine. Filterleiste (Niveau, AFB, nur ungelöste), Fortschrittsbalken, Druck-Button (Print-CSS erzeugt ein sauberes Aufgabenblatt ohne Lösungen).
4. **Simulationsseite:** eigene Seite mit eigener URL auf Basis der gemeinsamen Simulations-Engine (siehe Abschnitt 8) — direkt aufrufbar (Galerie, Beamer im Unterricht!) und per `<iframe>` in Themenseiten eingebettet; der Parameterzustand steckt im URL-Hash und ist damit verlinkbar.

---

## 7. Aufgaben-Engine

Herzstück der Übungsfunktion: ein Renderer (`aufgaben-engine.js`), der Aufgaben aus JSON-Dateien darstellt, Eingaben prüft und Feedback gibt. **Keine Noten, kein Tracking — reines Selbstlern-Feedback.**

### 7.1 Aufgabentypen (Startumfang)

| Typ | Beschreibung | Prüfung |
|---|---|---|
| `multiple-choice` | eine oder mehrere richtige Optionen, Distraktoren mit Erklärungen | automatisch |
| `numerisch` | Zahleneingabe mit Toleranz und optionaler Einheit; Komma **und** Punkt als Dezimaltrennzeichen akzeptieren | automatisch |
| `luecke` | Lückentext mit Eingabefeldern oder Dropdowns | automatisch |
| `zuordnung` | Paare zuordnen (per Dropdown — touch- und tastaturfreundlicher als Drag & Drop) | automatisch |
| `reihenfolge` | Schritte/Elemente sortieren | automatisch |
| `freitext` | Begründungs-/Beschreibungsaufgaben: aufklappbare Musterlösung + ehrliche Selbsteinschätzung („richtig / teilweise / nochmal üben“) | Selbstkontrolle |
| `rechenweg` | mehrschrittige Aufgabe; jeder Schritt einzeln prüfbar, gestufte Tipps pro Schritt | automatisch |
| `parametrisiert` | Generator-Aufgabe mit Zufallswerten (seeded RNG) → Button „Neue Aufgabe“ erzeugt beliebig viele Varianten | automatisch |

Jede Aufgabe hat zusätzlich: **gestufte Tipps** (Tipp 1 = Denkanstoß, Tipp 2 = Ansatz, Tipp 3 = fast Lösung), einen vollständigen **Lösungsweg** (aufklappbar nach Abgabe oder auf Wunsch) und **AFB-Kennzeichnung** (I/II/III) — dieselbe Systematik wie in deinen Klassenarbeiten, was Schülern den Anforderungsbegriff vertraut macht.

### 7.2 JSON-Schema (Beispiel)

```json
{
  "thema": "quadratische-funktionen",
  "fach": "mathematik",
  "stufe": "klasse-9",
  "aufgaben": [
    {
      "id": "ma-09-qf-007",
      "typ": "numerisch",
      "zweig": ["gym", "rs"],
      "niveau": 2,
      "afb": 2,
      "frage": "Bestimme den Scheitelpunkt der Parabel $f(x) = x^2 - 4x + 1$.",
      "eingaben": [
        { "label": "$x_S$", "antwort": 2, "toleranz": 0 },
        { "label": "$y_S$", "antwort": -3, "toleranz": 0 }
      ],
      "tipps": [
        "Bringe den Funktionsterm in die Scheitelpunktform.",
        "Quadratische Ergänzung: $x^2 - 4x + 1 = (x-2)^2 + \\,?$",
        "$(x-2)^2 - 4 + 1 = (x-2)^2 - 3$"
      ],
      "loesungsweg": "Quadratische Ergänzung: $f(x) = (x-2)^2 - 3$, also $S(2\\,|\\,{-3})$.",
      "kc": ["funktionaler-zusammenhang"]
    }
  ]
}
```

Für `parametrisiert` enthält das JSON statt fester Werte Parameterbereiche und eine Formel-Schablone; ein kleiner Generator in der Engine setzt Werte ein und berechnet die Lösung (Funktionen dafür werden pro Aufgabentyp-Familie einmal in JS hinterlegt, z. B. „lineare Gleichung lösen“, „Scheitelpunkt bestimmen“, „Binär ↔ Dezimal“).

**Ehrlicher Hinweis zur Architektur:** Da alles client-seitig läuft, stehen die Lösungen im JSON und sind für technisch versierte Schüler einsehbar. Das ist für ein freiwilliges Übungsangebot ohne Benotung unkritisch (wer die Lösung nachschlägt, betrügt nur sich selbst) — es darf nur nie für bewertete Leistungen genutzt werden.

### 7.3 Fortschritt (localStorage)

`fortschritt.js` speichert pro Aufgaben-ID den Status (gelöst / versucht / offen) und Zeitstempel, aggregiert daraus Themen-Fortschritt für die Übersichtsseiten. Dazu: **Export/Import als JSON-Datei** (Button in der Fußzeile), damit Schüler den Stand zwischen Handy und PC mitnehmen können. Keine Cookies, keine Übertragung an irgendeinen Server — das ist zugleich das stärkste Datenschutzargument der ganzen Seite.

---

## 8. Simulations-Framework (Neukonzeption)

Das Framework wird für diese Website von Grund auf neu entworfen. Leitgedanke: Eine Simulation ist ein **Messinstrument mit didaktischem Auftrag**, keine Animation zum Zuschauen. Die folgenden Prinzipien sind bewusst als Gegenentwurf zu den typischen Schwächen einzeln generierter Ad-hoc-Simulationen formuliert (jedes Mal neu erfundener Wegwerf-Code, uneinheitliche Bedienung, nur qualitativ plausibles statt quantitativ korrektes Verhalten, nichts Ablesbares, keine Verzahnung mit Aufgaben).

### 8.1 Designprinzipien

1. **Quantitativ korrekt statt nur plausibel.** Jede Simulation rechnet intern in SI-Einheiten und Weltkoordinaten (Meter, Sekunden, Volt …); eine Viewport-Schicht bildet die Welt erst ganz am Ende auf den Bildschirm ab. Physikmodell und Darstellung sind strikt getrennt. Ergebnis: Angezeigte Werte stimmen mit der Schulbuchformel überein — Schüler können nachrechnen, und die Simulation taugt als Datenquelle für Aufgaben.
2. **Stabile, deterministische Numerik.** Fester Zeitschritt (fixed timestep mit Akkumulator, entkoppelt von der Framerate), semi-implizites Euler-Verfahren als Standard, RK4 wo nötig (z. B. Schwingungen). Einzelschritt und Zeitlupe sind dadurch exakt; gleiche Parameter liefern auf jedem Gerät identische Verläufe.
3. **Messbarkeit als Kernfunktion.** Jede Simulation bietet ablesbare Größen: Digitalanzeigen mit Einheit, zuschaltbare Messwerkzeuge (Lineal, Winkelmesser, Stoppuhr) und mitlaufende Diagramme (z. B. t-s und t-v gekoppelt). Messreihen lassen sich als Tabelle einblenden und als CSV exportieren — damit werden Aufgaben vom Typ „Miss in der Simulation … und berechne …“ möglich, und im Unterricht entstehen echte Auswertungsphasen.
4. **Eine Engine, deklarative Simulationen.** Aller wiederkehrende Code (Zeitschleife, Bedienelemente, Koordinaten, Messwerkzeuge, Diagramme) lebt einmal in `assets/js/sim/`. Eine konkrete Simulation besteht nur noch aus einem **Manifest** (Parameter mit Bereich/Einheit/Startwert, Anzeigegrößen, Presets, Beobachtungsaufträge) plus zwei kleinen Funktionen: `update()` (Modell) und `zeichne()` (Darstellung). Die Engine baut daraus automatisch eine überall identische Oberfläche. Neue Simulation ≈ 100–250 Zeilen Fachcode statt jedes Mal einer kompletten App — konsistent, wartbar, schnell erweiterbar.
5. **Unterrichtstauglichkeit eingebaut.** Presets für typische Szenarien („Elektron“, „Proton“, „Mond: g = 1,62 m/s²“), Beamer-Modus (große Schrift, kräftige Linien), Vollbild, Bedienung per Touch und Tastatur, `prefers-reduced-motion` respektiert. Der komplette Parameterzustand wird im URL-Hash kodiert — du kannst eine fertig eingestellte Simulation als Link verschicken oder direkt in einer Aufgabe verlinken („Öffne die Simulation mit diesen Einstellungen …“).

### 8.2 Architektur

```
assets/js/sim/
├── engine.js   ← Zeitschleife (fixed timestep), Zustands- und Preset-Verwaltung, URL-Hash
├── welt.js     ← Weltkoordinaten ↔ Canvas, Einheiten- und Zahlformatierung (3,5 m/s)
├── ui.js       ← baut aus dem Manifest: Slider, Steuerleiste, Anzeigen, Preset-Menü
└── mess.js     ← Messwerkzeuge, Live-Diagramme, Messtabelle, CSV-Export

simulationen/
├── index.html                      ← Galerie mit Vorschaukacheln (aus themen.json)
├── validierung.html                ← rechnet alle Prüffälle durch, zeigt ✓/✗ (siehe 8.4)
└── physik/schiefer-wurf/
    ├── index.html                  ← dünne Hülle: lädt Engine + sim.js
    └── sim.js                      ← Manifest, update(), zeichne(), Prüffälle
```

Die Engine unterstützt **drei Modi**, damit alle drei Fächer dasselbe System nutzen: *kontinuierlich* (Zeitschritt-Physik: Wurf, Felder, Schwingungen), *schrittweise* (diskrete Abläufe mit Vor/Zurück: Sortieralgorithmen, Automaten, Verschlüsselung) und *statisch-interaktiv* (Parameter ändern → sofort neu zeichnen: Funktionsplotter, Bildkonstruktion an Linsen).

Auszug eines Manifests, damit das Format greifbar wird:

```js
export const manifest = {
  titel: "Schiefer Wurf",
  modus: "kontinuierlich",
  parameter: [
    { id: "v0",    label: "Startgeschwindigkeit", einheit: "m/s",  min: 1, max: 30, schritt: 0.5, start: 12 },
    { id: "alpha", label: "Abwurfwinkel",         einheit: "°",    min: 0, max: 90, schritt: 1,   start: 45 },
    { id: "g",     label: "Ortsfaktor",           einheit: "m/s²", min: 1, max: 25, schritt: 0.01, start: 9.81 }
  ],
  anzeigen: ["t", "x", "y", "v"],
  diagramme: [{ x: "t", y: "y", titel: "Höhe über Zeit" }],
  presets: [{ name: "Mond", werte: { g: 1.62 } }],
  beobachtung: [
    "Bei welchem Winkel wird die Wurfweite maximal?",
    "Verdopple die Startgeschwindigkeit — was passiert mit der Wurfweite?"
  ]
};
```

### 8.3 Didaktisches Nutzungsmuster: Vorhersagen → Beobachten → Erklären

Jede Simulationsseite folgt dem bewährten POE-Muster, statt nur Regler hinzustellen:

1. **Vorhersagen:** Vor dem Start eine kurze Vorhersage-Frage (über die Aufgaben-Engine, gleiche Optik wie alle Aufgaben): „Was passiert mit der Wurfweite, wenn der Winkel von 45° auf 60° steigt?“ — erzeugt einen kognitiven Konflikt und einen Grund, genau hinzusehen.
2. **Beobachten/Untersuchen:** Freies Experimentieren, geleitet durch die 2–4 Beobachtungsaufträge aus dem Manifest; Messwerkzeuge und Diagramme liefern die Daten.
3. **Erklären/Anwenden:** Verlinkte Übungsaufgaben greifen die Simulation auf, teils mit konkreten Einstellungen per URL-Hash („Stelle v₀ = 15 m/s ein, miss die Wurfweite und vergleiche mit deiner Rechnung“).

So sind Simulationen und Aufgaben-Engine verzahnt statt zwei getrennte Welten — und dieselbe Seite funktioniert für Selbstlerner zu Hause wie am Beamer in deinem Unterricht.

### 8.4 Qualitätssicherung der Physik

Das Hauptrisiko generierter Simulationen ist „sieht gut aus, rechnet falsch“. Dagegen zwei feste Mechanismen:

- **Prüffälle pro Simulation:** Jede `sim.js` enthält 2–3 Validierungsfälle mit analytisch bekannter Lösung (z. B. „v₀ = 10 m/s, α = 45°, g = 9,81 m/s² → Wurfweite 10,19 m ± 0,5 %“). Die Seite `simulationen/validierung.html` rechnet alle Fälle aller Simulationen ohne Darstellung durch und zeigt ✓/✗ — Pflichtcheck vor jedem `status: online`.
- **Sichtbare Modellgrenzen:** Parameterbereiche werden so gewählt, dass das Modell gültig bleibt; wo eine Idealisierung wesentlich ist (kein Luftwiderstand, Punktladung, ideale Bauteile), steht das als kurzer Hinweis direkt in der Simulation. Das ist zugleich Physikdidaktik: Modellcharakter explizit machen.

### 8.5 Ideenkatalog (KC-orientiert, priorisiert)

**Physik Sek I:** einfache Stromkreise (Reihen-/Parallelschaltung mit Messgeräten), Reflexion & Brechung (Strahlengang, Totalreflexion), ebene Spiegel/Linsen-Bildkonstruktion, Bewegungsdiagramme (t-s/t-v gekoppelt an animiertes Fahrzeug), Energieumwandlungsketten, Magnetfeld & Kompass, Wärmeleitung.
**Physik Sek II (dein Q-Phasen-Kanon):** Plattenkondensator (Feldstärke, Ladung, Energie), Ladung im E-Feld (Ablenkung, Braunsche Röhre), Bewegung geladener Teilchen im Magnetfeld (Kreisbahn, $e/m$), Induktion (bewegter Leiter, Flussänderung), Schwingkreis, mechanische Wellen & Überlagerung, Doppelspalt/Interferenz, Fotoeffekt (Gegenfeldmethode).
**Mathematik:** Funktionsplotter mit Parameter-Schiebereglern (linear → quadratisch → Potenz/Exponential, je nach Stufe), Steigungsdreieck interaktiv, Scheitelpunktform-Erkundung, Einheitskreis & Sinus/Kosinus-Entstehung, Sekante→Tangente (Ableitungsbegriff), Unter-/Obersumme (Integralbegriff), Galton-Brett & Würfelsimulation (Stochastik), Körpernetze falten (Klasse 5/6, Geometrie).
**Informatik:** Sortieralgorithmen-Visualisierer (Bubble/Selection/Insertion im Vergleich, Schrittmodus), Binär-/Hexadezimal-Trainer, Logikgatter-Baukasten (UND/ODER/NICHT zusammenstecken), endlicher Automat (Zustandsdiagramm durchlaufen), Caesar- & Vigenère-Verschlüsselung interaktiv, Pixelgrafik & RGB-Mischer, Paketvermittlung im Netz (vereinfachtes Routing).

**Referenz-Simulation zuerst:** Als erste Simulation wird der **schiefe Wurf** gebaut — analytisch vollständig prüfbar und deshalb ideal, um Engine und Validierungssystem zu härten. Danach pro Fach 2–3 Piloten (Phase 3); der Rest wächst themengetrieben.

---

## 9. Formel-Rendering

KaTeX wird vollständig lokal eingebunden (`assets/lib/katex/`), initialisiert über `mathe-render.js` mit Auto-Render für `$...$` (inline) und `$$...$$` (abgesetzt). KaTeX rendert synchron und sehr schnell — wichtig auf älteren Schülerhandys. Konventionen wie in deinen anderen Projekten: deutsche Dezimalzahlen als `{,}`, kein `\tfrac` (stattdessen `\frac`), keine exotischen Pakete. Die Aufgaben-Engine jagt nach jedem dynamischen Rendern (neue Aufgabe, aufgeklappter Lösungsweg) den KaTeX-Renderer über die neuen DOM-Knoten.

---

## 10. Design-System

Ziel: eine eigenständige, ruhige Identität — erkennbar „deine“ Seite, kein Template-Look, aber mit klarer Priorität auf Lesbarkeit und Bedienbarkeit für 10- bis 19-Jährige.

- **Grundidee / Signatur-Element:** dezentes **Karopapier-Raster** als Hintergrundtextur (Schulheft-Anmutung — fachnah für Mathe/Physik, sofort wiedererkennbar), Merkkästen im Stil sauber gerahmter Heftkästen.
- **Fachfarben** als Akzent (Navigation, Kacheln, Überschriften-Unterstreichung): Mathematik Blau, Physik Bernstein/Orange, Informatik Violett — jeweils mit geprüftem Kontrast (WCAG AA) auf Hell und Dunkel.
- **Typografie:** eine gut lesbare, lokal gehostete offene Schrift (z. B. „Inter“ oder „Source Sans 3“ für Fließtext, dazu eine charaktervolle Display-Schrift sparsam für Seitentitel). Keine Google-Fonts-CDN-Einbindung — Fonts liegen als `woff2` im Repo.
- **Dark Mode:** automatisch via `prefers-color-scheme`, zusätzlich manueller Toggle (persistiert). Alle Farben ausschließlich über CSS Custom Properties in `design-tokens.css` — auch die Simulationen lesen diese Tokens, damit alles aus einem Guss ist.
- **Mobile-first:** Navigation als aufklappbares Menü, Aufgaben einspaltig, Touch-Ziele ≥ 44 px, Simulationen mit Vollbild-Modus.
- **Barrierefreiheit als Quality-Floor:** sichtbarer Tastaturfokus, semantisches HTML (echte `<button>`, `<fieldset>` für Aufgaben), Farbinformation nie als einziger Träger (richtig/falsch zusätzlich mit Symbol ✓/✗), `prefers-reduced-motion` respektiert.
- **Print-CSS:** Übungsseiten drucken als sauberes Arbeitsblatt (Aufgaben ohne Lösungen, mit Namensfeld) — praktisch für deinen Unterricht.

Die konkrete Design-Exploration (Farbnuancen, Schriftpaarung, Startseiten-Hero) ist ein eigenes Arbeitspaket in Phase 1: Cowork soll dort erst 2–3 Varianten als Stilmuster-Seite bauen, du wählst aus, dann wird das Token-Set eingefroren.

---

## 11. Anbindung an die Kerncurricula (Niedersachsen)

### 11.1 Quellen

Alle Kerncurricula liegen als PDF in der Datenbank **Curriculare Vorgaben Online**: https://cuvo.nibis.de (Filter nach Schulform und Fach). Relevant für dieses Projekt:

- **Mathematik:** KC Sek I Gymnasium (Jg. 5–10), KC Sek I Realschule, KC gymnasiale Oberstufe
- **Physik:** KC Naturwissenschaften Sek I Gymnasium bzw. Realschule (Teil Physik), KC Physik gymnasiale Oberstufe (gA/eA — das kennst du bereits aus deinem `xournal-physik`-Workflow)
- **Informatik:** KC für die Schulformen des Sekundarbereichs I, Jg. 5–10 (Grundlage des Pflichtfachs in Jg. 9 und 10, je eine Wochenstunde; Lernfelder u. a. „Daten und ihre Spuren“, „Computerkompetenz“, „Algorithmisches Problemlösen“, „Automatisierte Prozesse“) sowie KC Informatik gymnasiale Oberstufe, falls Sek-II-Inhalte aufgenommen werden

### 11.2 Themenlandkarte als zentrale Datei

In **Phase 0** lädt Cowork die relevanten KC-PDFs herunter und extrahiert daraus eine strukturierte Themenlandkarte → `daten/themen.json`. Pro Thema:

```json
{
  "id": "ph-qp-elektrische-felder",
  "fach": "physik",
  "stufe": "qualifikationsphase",
  "zweig": ["gym"],
  "niveau_kc": ["gA", "eA"],
  "titel": "Elektrische Felder",
  "kurz": "Feldbegriff, Feldstärke, Plattenkondensator, Energie",
  "kc_bezug": ["Bewertungskompetenz …", "Fachwissen: E-Feld …"],
  "status": "geplant",
  "hat_simulation": true,
  "pfad": "physik/qualifikationsphase/elektrische-felder/"
}
```

Diese Datei ist gleichzeitig **Bauplan** (was fehlt noch? `status: geplant/in-arbeit/online`), **Navigationsquelle** (Übersichtsseiten werden daraus generiert) und **KC-Nachweis** (jedes Thema dokumentiert seinen Curriculumsbezug). **Wichtig:** Die automatisch extrahierte Erstfassung prüfst du fachlich — du kennst die schuleigenen Arbeitspläne deiner KGS, die das KC konkretisieren, und entscheidest über Reihenfolge und Schwerpunkte.

---

## 12. Recht und Datenschutz (pragmatisch, kein Rechtsrat)

- **Urheberrecht:** ausschließlich selbst erstellte Aufgaben, Texte, Grafiken und Simulationen. Keine Buchseiten, keine Verlagsabbildungen, keine 1:1 übernommenen Buchaufgaben — die Seite ist öffentlich, anders als deine internen Unterrichtsdateien. KC-Texte werden paraphrasiert, nicht abgedruckt.
- **Datenschutz by Design:** keine Cookies, keine Analytics, keine externen Einbindungen, Fortschritt nur in `localStorage`. Das macht die Datenschutzerklärung kurz und ehrlich.
- **Impressum & Datenschutzerklärung** als eigene Seiten einplanen. Für ein öffentliches Lernangebot ist ein Impressum nach deutschem Recht in aller Regel erforderlich; in der Datenschutzerklärung gehört der Hinweis hinein, dass das Hosting über GitHub Pages läuft (GitHub/Fastly verarbeiten beim Abruf technisch bedingt IP-Adressen, Serverstandorte auch außerhalb der EU). Formulierungen dafür gibt es etabliert — bei Unsicherheit lohnt ein kurzer Blick in die Hinweise deines Landesdatenschutzbeauftragten oder eine Rückfrage bei der Schulleitung, wenn die Seite offiziell im Unterricht eingesetzt wird.
- **Abgrenzung:** Die Seite ist ein freiwilliges Zusatzangebot ohne Leistungsbewertung und ohne personenbezogene Daten von Schülern — das bewusst so benennen (auf der Startseite und in der Datenschutzerklärung).

---

## 13. Umsetzungsphasen mit Cowork-Arbeitspaketen

Jede Phase ist als ein oder wenige Cowork-Tasks geschnitten. Die kursiven Blöcke sind direkt verwendbare Aufträge — jeweils als neuen Task im verbundenen Projektordner starten.

### Phase 0 — Projekt-Setup und Themenlandkarte (1 Session)

Ordnerstruktur, `.nojekyll`, `README.md`, `.gitignore`, leere Token-Datei; Download der KC-PDFs von cuvo.nibis.de; Extraktion der Themenlandkarte. (Das Git-Repository legst du parallel einmalig in GitHub Desktop an: „Add local repository“.)

> *„Lies zuerst CLAUDE.md vollständig. Lege die dort beschriebene Ordnerstruktur an. Lade dann von https://cuvo.nibis.de die aktuellen Kerncurricula für Mathematik (Gymnasium Sek I, Realschule Sek I, gymnasiale Oberstufe), Physik/Naturwissenschaften (Sek I Gym + RS, Oberstufe) und Informatik (Sek I) als PDF in einen Ordner kc-quellen/ (der kommt in .gitignore). Extrahiere daraus eine Themenlandkarte nach dem Schema in UMSETZUNGSPLAN.md Abschnitt 11.2 und schreibe sie nach daten/themen.json. Markiere alle Themen mit status: geplant. Erstelle mir abschließend eine Übersicht: Themenanzahl pro Fach und Stufe.“*

**Dein Part danach:** `themen.json` fachlich durchsehen, an eure schuleigenen Arbeitspläne anpassen, Prioritäten setzen (welche 3 Themen zuerst — sinnvoll: das, was du gerade unterrichtest).

### Phase 1 — Grundgerüst und Design (1–2 Sessions)

Design-Tokens, `main.css`, Komponenten-Injektion (Header/Nav/Breadcrumb/Footer, Zweig-Umschalter, Dark-Mode), KaTeX lokal integrieren, Startseite + generierte Fach-/Stufenübersichten aus `themen.json`, Impressum/Datenschutz-Platzhalter, `404.html`.

> *„Lies CLAUDE.md und daten/themen.json. Baue zuerst eine Stilmuster-Seite (stilmuster.html) mit 3 Designvarianten gemäß UMSETZUNGSPLAN.md Abschnitt 10 — ich wähle eine aus. Setze danach das Grundgerüst um: design-tokens.css, main.css, komponenten.js, Startseite und automatisch generierte Übersichtsseiten für alle Fächer und Stufen. KaTeX lokal einbinden und auf einer Testseite mit 10 typischen Schulformeln verifizieren. Alles muss über einen lokalen statischen Webserver fehlerfrei laufen und auf 380 px Breite gut aussehen.“*

### Phase 2 — Aufgaben-Engine (1–2 Sessions)

Alle Aufgabentypen aus 7.1, Tipp-System, Lösungswege, AFB-Badges, Filterleiste, `fortschritt.js` inkl. Export/Import, Print-CSS. Abnahme über eine Demo-Übungsseite mit je einem Exemplar jedes Aufgabentyps.

### Phase 3 — Simulations-Engine + Piloten (2 Sessions)

**Session 3a — Engine und Referenz-Simulation:** `assets/js/sim/` (alle vier Module, drei Modi) plus Referenz-Sim „Schiefer Wurf“ und `validierung.html`. Die Engine gilt erst als fertig, wenn alle Prüffälle grün sind und die Referenz-Sim auf dem Handy flüssig läuft.

> *„Lies CLAUDE.md und UMSETZUNGSPLAN.md Abschnitt 8 vollständig. Baue die Simulations-Engine exakt nach diesem Konzept: SI-Einheiten und Weltkoordinaten, fester Zeitschritt, Manifest-getriebene UI, Messwerkzeuge mit Diagrammen und CSV-Export, URL-Hash-Zustand, Beamer-Modus. Setze damit die Referenz-Simulation ‚Schiefer Wurf‘ um (inkl. POE-Vorhersagefrage und drei Prüffällen) sowie simulationen/validierung.html. Abnahmekriterium: alle Prüffälle ✓, flüssig bei 380 px Breite.“*

**Session 3b — Fach-Piloten und Galerie:** je Fach eine Pilot-Sim auf der Engine — *Plattenkondensator* (kontinuierlich), *Funktionsplotter mit Parameter-Schiebereglern* (statisch-interaktiv), *Sortier-Visualisierer* (schrittweise) — dazu die Galerie-Seite. Damit ist nachgewiesen, dass alle drei Modi und alle drei Fächer tragen.

### Phase 4 — Pilot-Themen end-to-end (je Thema ca. 1 Session)

Pro Fach ein komplettes Thema: Erklärseite + eingebettete Sim + 8–12 Übungsaufgaben + 2–3 Zusatzaufgaben. Vorschlag passend zu deinem aktuellen Unterricht: **Mathe Klasse 9 „Quadratische Funktionen“, Physik Q-Phase „Elektrische Felder“, Informatik Klasse 10 „Algorithmen & Sortieren“.** Danach: **Praxistest mit einer echten Lerngruppe** (15 Minuten am Handy) — das Feedback fließt vor dem Massenausbau ein.

Standard-Auftrag für jedes weitere Thema (wiederverwendbar, das ist dein Pflege-Workflow):

> *„Lies CLAUDE.md. Erstelle das Thema ‚‹Titel›‘ (‹Fach›, ‹Stufe›) vollständig gemäß Definition of Done in CLAUDE.md: Erklärseite, ggf. Simulation, Übungs-JSON mit 10 Aufgaben (Niveau- und AFB-Mischung laut themen.json-Eintrag, Zweige: ‹gym/rs›), Zusatzaufgaben, Eintrag in themen.json auf status: in-arbeit. Halte dich an den KC-Bezug aus themen.json.“*

### Phase 5 — Systematischer Inhaltsausbau

Thema für Thema nach Priorität aus `themen.json`. Realistisches Tempo: 1–2 Themen pro Woche nebenbei → nach einem Halbjahr stehen 20–40 Themen. Nicht auf Vollständigkeit über alle Stufen zielen, sondern dem eigenen Unterricht folgen — dann nutzt die Seite sofort jemand.

### Phase 6 — Qualität und Feinschliff (1 Session + laufend)

Link-Check über alle Seiten (Skript), Pfad-Check auf Groß-/Kleinschreibung und Umlaute (Windows verschleiert solche Fehler lokal, GitHub Pages nicht — siehe 2.3), KaTeX-Renderprüfung, Lighthouse-Durchlauf (Performance/A11y), Tastaturbedienung stichprobenartig, Druckansicht testen, optionale client-seitige Themensuche (einfaches Filtern über `themen.json`, keine externe Lib nötig).

### Phase 7 — Veröffentlichung (machst du, ~15 Minuten)

1. In GitHub Desktop: „Publish repository“ (öffentlich) — damit ist das lokale Repo auf GitHub.
2. Auf github.com: Repo → Settings → Pages → Source: „Deploy from a branch“, Branch `main`, Ordner `/ (root)`.
3. Nach 1–2 Minuten ist die Seite unter `https://<benutzername>.github.io/<repo>/` erreichbar.
4. Gegencheck der Live-Seite auf dem Handy (gerade die relativen Pfade und die Groß-/Kleinschreibung der Dateinamen — siehe 2.3).
5. Spätere Updates: in GitHub Desktop committen und „Push“ — die Seite aktualisiert sich automatisch. Optional irgendwann: eigene Domain (CNAME), ohne dass sich am Projekt etwas ändert.

---

## 14. Qualitätssicherung — Definition of Done pro Thema

Ein Thema gilt erst als „online“, wenn:

1. Erklärseite vorhanden, mindestens ein interaktives Element (Sim, Verständnis-Check oder interaktive Grafik)
2. ≥ 8 Übungsaufgaben + ≥ 2 Zusatzaufgaben, AFB I–III vertreten, Zweig-/Niveau-Tags gesetzt
3. Jede Aufgabe hat Tipps und vollständigen Lösungsweg; alle Formeln rendern fehlerfrei
4. **Fachliche Prüfung durch dich** — jede Lösung nachgerechnet bzw. geprüft. KI-generierte Aufgaben sind gut, aber nicht fehlerfrei; auf einer öffentlichen Seite mit deinem Namen ist das der wichtigste Schritt
5. Mobil getestet (380 px), Fortschritt speichert, Druckansicht sauber
6. `themen.json`-Eintrag auf `status: online`, KC-Bezug ausgefüllt

## 15. Typische GitHub-Pages-Stolperfallen (vorab eingebaut)

- **Nur relative Pfade!** Die Seite liegt unter `/<repo>/`, absolute Pfade wie `/assets/…` brechen live, obwohl sie lokal funktionieren. (Harte Regel in CLAUDE.md; lokaler Test mit `http.server` aus dem Projektroot verhält sich identisch.)
- **Case-Sensitivity:** GitHub Pages unterscheidet Groß-/Kleinschreibung, Windows nicht — Fehler fallen lokal also nicht auf. Alles konsequent klein, keine Umlaute in Dateinamen; automatischer Check in Phase 6.
- **`.nojekyll`** im Root, damit GitHub nichts durch Jekyll schickt.
- **Browser-Cache nach Updates:** Versions-Query an zentrale Assets (`main.css?v=12`) oder schlict wissen, dass Schüler ggf. neu laden müssen.
- KaTeX-Fonts lokal = kein CORS-/CDN-Thema.

---

## 16. Was du jetzt konkret tust

1. Voraussetzungen prüfen (Abschnitt 2.1): Windows-Edition, Virtualisierung, Bereitschaftsprüfung; aktuelle Claude-Desktop-App installieren. Einmalig dazu: Python für Windows und GitHub Desktop.
2. Projektordner anlegen, `CLAUDE.md` und diese `UMSETZUNGSPLAN.md` hineinlegen, Ordner in Cowork verbinden, Ordner-Anweisung setzen (Abschnitt 2.2), Repo in GitHub Desktop anlegen.
3. Phase 0 als ersten Cowork-Task beauftragen (Prompt oben).
4. `themen.json` fachlich prüfen, drei Pilot-Themen festlegen.
5. Phasen 1–4 abarbeiten, dann Schülertest, dann ausbauen.

## 17. Lernbüro (Selbstlernbereich) — Datenschema

Neuer Bereich `selbstlernen/` (Konzept: `SELBSTLERNEN-KONZEPT.md`). Registry-getrieben wie der Rest der Seite. Lektionen **referenzieren nur vorhandene Inhalte** (Erklär-Anker, Aufgaben-IDs, Lernspiel-/Sim-Links) — keine Inhalte doppeln.

### 17.1 Kurs-Index `daten/kurse.json`

```
{ version, stand, hinweis, kurse: [
  { id, fach, stufe, titel, kurz, zweig:[…], status, pfad, lektionenOnline } ] }
```

`status` wie bei Themen: `geplant` (nicht verlinkt) → `in-arbeit` (Badge) → `online`.

### 17.2 Kurs `daten/kurse/<kurs>.json`

```
{ version, kurs, fach, stufe, titel, untertitel, zweig:[…], stand,
  taktung:"wochenplan"|"starr",            // Pilot: wochenplan
  checkpoints:"freischalten"|"empfehlung", // Pilot: freischalten + Lehrkraft-Override
  werkzeuge:["ampel","lerntagebuch", …],   // aktive Selbstlern-Werkzeuge
  hinweis,
  stoffverteilung:[ { wochen, thema, lektionen, kc, status } ],
  wochen:[ { nr, spanne, lektionen:[lektionId…], mindestmarke } ],
  lektionen:[ Lektion … ] }
```

### 17.3 Lektion

```
{ id, nr, titel, dauer(45|90), status, thema(themaId), themaPfad, anker(#…),
  ziele:[ "Ich kann …" ],
  stopppunkt: null | { text },        // gemeinsamer Anker vor der Lektion
  phasen:{
    ankommen:  { zeit, hinweis, aufgaben:[Gruppe…] },
    verstehen: { zeit, anker, text, beobachtung, interaktiv:{label,href}, sim?:{pfad,hash,titel} },
    ueben:     { zeit, basis:[Gruppe…], standard:[Gruppe…], plus:[Gruppe…],
                 basisLuecke?, plusLuecke?,   // ehrlicher Hinweis, wenn eine Spur (noch) keine Aufgabe hat
                 partner? },
    sichern:   { zeit, aufgaben:[Gruppe…], transfer? },   // bestanden ⇒ nächste Lektion frei
    extra:     { zeit, text, links:[{label,href}] }
  } }
```

**Gruppe** = `{ quelle:<themaId der Aufgabendatei>, ids:[<aufgabenId>…] }`. Der Player lädt je `quelle` einmal `daten/aufgaben/<quelle>.json` und rendert die `ids` über `baueAufgabe()` (Aufgaben-Engine wiederverwenden). `href`-Werte sind **relativ zur Projektwurzel** (z. B. `lernspiele/prozent-blitz/index.html`); der Player macht daraus absolute URLs über `WURZEL`.

### 17.4 Fortschritt (localStorage)

Im bestehenden Objekt `lernwelt-fortschritt` neuer Zweig `lernbuero` (so deckt der vorhandene Export/Import auch den Lernbüro-Fortschritt ab):

```
lernbuero: {
  kurse: { <kursId>: { <lektionId>: {
    phasen:{ ankommen,verstehen,ueben,sichern,extra : bool },
    checkpoint: bool,            // „Sichern“ bestanden
    freigabe: bool,              // Lehrkraft hat manuell freigegeben
    ampel:{ <zielIndex>: "gruen"|"gelb"|"rot" }
  } } },
  tagebuch:[ { id, text, kurs, lektion, datum } ]    // Lerntagebuch („Frage notieren“)
}
```

Freischalt-Logik: Lektion frei ⇔ erste Lektion **oder** Vorgänger-`checkpoint` **oder** eigene `freigabe`.

### 17.5 Seiten & Code

- `selbstlernen/index.html` (`data-seite="selbstlernen"`) → `assets/js/selbstlernen/uebersicht.js` (`rendereKursliste`).
- `selbstlernen/<fach>-<stufe>/index.html` (`data-seite="lernbuero" data-kurs="<id>"`) → `assets/js/selbstlernen/kurs.js` (`starteKurs`): rendert die **Lernlandkarte** (ohne Hash) bzw. den **Lektions-Player** (Hash `#lektion-<id>`).
- `selbstlernen/<fach>-<stufe>/lehrkraft.html` — Moderationsseite, **unverlinkt** im Schüler-Flow.
- Styles isoliert in `assets/css/selbstlernen.css` (kein Eingriff in die große `main.css`).
