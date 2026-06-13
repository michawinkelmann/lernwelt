# PyWinkelix

> Browserbasiertes Python-Lernspiel für die Schule. Kein Setup, keine Server, keine Cookies — Python läuft direkt im Browser (Skulpt).

**Live-Version:** öffne `index.html` lokal, oder hoste die Dateien auf einem Web-Server / GitHub Pages.

## Was ist drin

12 Level mit insgesamt **67 Aufgaben** (36 Original + 31 Bonus), aufgebaut nach Lehrplan-typischer Reihenfolge:

| Level | Thema | Konzepte |
|------:|-------|----------|
| 1 | Hello Python | `print()`, Variablen, Datentypen |
| 2 | Entscheidungen | `if` / `elif` / `else`, Vergleichs- und Logik-Operatoren |
| 3 | Schleifen | `while`, `for`, `range()`, Verschachtelung |
| 4 | Funktionen | `def`, `return`, Parameter, Default-Werte |
| 5 | Listen | Erstellen, Modifizieren, Slicing |
| 6 | Dictionaries | Key-Value, Iterieren, Verschachtelung |
| 7 | Strings | Methoden, `ord` / `chr`, Caesar-Verschlüsselung |
| 8 | OOP | Klassen, `__init__`, Methoden, `__str__` |
| 9 | Vererbung | `super()`, Methoden überschreiben |
| 10 | 2D-Listen | Raster, Koordinaten, Karten |
| 11 | Advanced | Comprehensions, `try/except`, `lambda` |
| 12 | Abschluss | Mini-Rechner, RPG-Kampf, Highscore-Tabelle |

Jedes Level endet mit einem **Boss-Battle** (letzte Aufgabe, goldener Banner).

## Vier Aufgabentypen

- 💻 **Code-Aufgaben** — klassisch Python schreiben & prüfen lassen
- 🐛 **Bug-Hunt** — fertigen Code mit einem Fehler reparieren
- 🧩 **Parsons-Puzzles** — Code-Zeilen per Klick/Drag in richtige Reihenfolge
- ❓ **Output-Quiz** — Code lesen, Ausgabe per Multiple-Choice vorhersagen

## Features für Schüler:innen

### Lernen
- 🎯 **Lernziele** pro Aufgabe ("Was du danach kannst")
- 💡 **3-stufige Hinweise** pro Aufgabe — und **adaptiv**: nach 3 Fehlversuchen wird der nächste Hinweis automatisch enthüllt
- 🌳 **Freundliche Fehlermeldungen** — Skulpt-Tracebacks werden in verständliche Sprache übersetzt
- 📖 **Quick-Reference** wächst mit dem Level
- 📝 **Notizen pro Aufgabe** — eigene Gedanken festhalten

### Verstehen
- 🔍 **Variablen-Inspector** nach jedem Run mit visuellen Diagrammen:
  - Listen als boxed Cells mit Index
  - Dicts als Key→Value-Zeilen
  - Klassen-Instanzen als Object-Cards
- 👣 **Step-Debugger** — Code Schritt für Schritt durchgehen, inklusive **Schleifen-Iterationen** (für `for X in range(N):` und `for X in [a, b, c]:`). **Variablen-Diff** zeigt pro Schritt, was sich geändert hat
- 🔍 **Lösungsvergleich** nach Erfolg ("Yours works — here's *one* example")
- 🐢 **Turtle-Grafik** — `import turtle` zeichnet in einen separaten Output-Tab

### Motivation
- ⭐ **31 Achievements** für verschiedene Meilensteine
- 🔥 **Streak** für tägliches Üben
- 🎯 **Tagesaufgabe** (deterministisch — alle Schüler:innen weltweit bekommen dieselbe Aufgabe)
- 🏃 **Speedrun-Modus** (5/10/25/50 zufällige Aufgaben mit Timer) — inklusive **Daily-5-Sprint**
- 🍅 **Pomodoro-Timer** (25/5 Arbeit/Pause)
- 🎉 Konfetti, Sounds (abschaltbar), Achievement-Toasts
- 📚 **Story-Cutscenes** zwischen ausgewählten Levels (Pythonia-Erzählung)
- 🎮 Konami-Code Easter Egg

### Werkzeuge
- 📋 **Code-Snippets** — 14 vordefinierte Templates + eigene Snippets persistent
- 🔗 **Share-URL + QR-Code** — Code & Snippets per Link teilen (Schul-Whiteboard-tauglich)
- 🧪 **Sandbox-Modus** mit **mehreren Tabs** (Multi-File)
- 🔎 **Find / Replace** im Editor (`Ctrl/Cmd+F`)

### Statistik
- 📊 **„Meine Statistik"** — XP, Streak, Achievements, Bestmarken
- 🧠 **Konzept-Tracker** — 15 Python-Konzepte mit Mastery-Status (untouched / seen / mastered)
- 📈 **14-Tage-Sparkline** pro Konzept

## Features für Lehrkräfte

🔒 **Lehrer-Modus** (Passwort, klicken Sie unten rechts auf `🔒`):

- ✅ **Lösung** pro Aufgabe + Validierungslogik + Hinweise einsehen
- 📋 **Übersicht** aller 67 Aufgaben mit Status, XP, Schwierigkeitsgrad
- 🎓 **Didaktik** pro Level: häufige Fehler, Differenzierungsideen
- 📝 **Notizen** (browser-lokal gespeichert)
- 👨‍👩‍👧‍👦 **Klassen-Modus**: Schüler-Saves importieren (Drag & Drop), Roster mit aggregierter Statistik, CSV-Export, Schüler-Notizen aggregiert ansehen
- ✏️ **Eigene Aufgaben erstellen** — erscheinen als Level 13 für die Schüler:innen
- 🔗 **Klassen-Link** mit Aufgabenauswahl bauen (Schüler:innen sehen einen „Klassen-Aufgabe"-Banner)

**Empfohlener Unterrichts-Workflow:**

1. Eigene Aufgaben für die Stunde im Lehrer-Modus anlegen
2. Klassen-Link mit Aufgabenauswahl bauen → QR an den Beamer
3. Schüler:innen arbeiten, exportieren am Ende ihren Save als JSON
4. Saves im Klassen-Modus importieren → Übersicht + CSV für Notenerfassung

## Accessibility

- 🌙 **Light / Dark / Auto** (System-Präferenz)
- 🔠 **Schriftgrößen** S / M / L
- 🅰️ **Dyslexia-friendly Font** (Atkinson Hyperlegible)
- ⚫ **High-Contrast-Modus** kombinierbar mit allem
- 🎬 **Reduced Motion** (respektiert auch `prefers-reduced-motion`)
- 🔊 **Voice-Reader** für Aufgabenstellungen + optionaler Achievement-Announce, mit einstellbarem Sprechtempo und Stimme
- ⌨️ Vollständige **Keyboard-Shortcuts** (Hilfe via `?`-Taste)
- 🏷️ ARIA-Labels und sichtbare Focus-Outlines

## Datenschutz

- **Alles bleibt im Browser** — keine Server-Anfragen außer CDN-Loads für CodeMirror, Atkinson-Font und QR-Library
- **Kein Tracking, keine Cookies**
- localStorage-Keys: `pyforge_save`, `pyforge_lang`, `pyforge_user_snippets`, `pyforge_custom_challenges`, `pyforge_teacher_notes`, `pyforge_note_<id>`, `pyforge_notes_index`, `pyforge_cutscenes_seen`, `pyforge_first_visit`
- **Save-Export/-Import** als JSON, also robust gegen Browser-Cache-Löschungen in Schul-PCs
- Siehe [PRIVACY.md](PRIVACY.md) für eine Schul-/Eltern-taugliche Kurz-Erklärung

## PWA

Funktioniert **offline** nach dem ersten Laden:

- `manifest.webmanifest` für Installation auf Tablets
- `sw.js` Service Worker mit Cache-First-Strategie

## Browser-Kompatibilität

- Chrome / Edge / Firefox / Safari — aktuelle Versionen
- CodeMirror, Atkinson-Font und QR-Library lassen sich graceful ohne Internet überspringen (textarea-Fallback, System-Font, URL-only Share)

## Setup

```bash
# Variante A: lokal öffnen
open index.html       # macOS
xdg-open index.html   # Linux
start index.html      # Windows

# Variante B: lokaler Web-Server (für PWA-Features)
python3 -m http.server 8000
# dann http://localhost:8000 im Browser

# Variante C: GitHub Pages
# Push auf main, Pages-Branch konfigurieren
```

## Tastatur-Shortcuts

| Shortcut | Wirkung |
|----------|---------|
| `Ctrl/Cmd + Enter` | Code ausführen |
| `Ctrl/Cmd + F` | Im Editor suchen |
| `Shift + Ctrl/Cmd + F` | Suchen & ersetzen |
| `Alt + G` | Zur Zeile springen |
| `Tab` | 4 Leerzeichen einrücken |
| `Alt + →` / `Alt + ←` | Nächste / vorherige Aufgabe |
| `?` | Shortcut-Hilfe öffnen |
| `↑↑↓↓←→←→BA` | … überrasch dich selbst |

## Code-Struktur

```
index.html               UI-Layout + Modals + Script-Tags
pyforge.css              CSS (~2200 Zeilen, alle UI-Komponenten)
pyforge-levels.js        Die 12 Level mit allen 36 Original-Aufgaben
pyforge-data.js          Achievements, Story, Solutions, Didactics,
                         Bonus-Aufgaben (alle 3 Wellen), Cutscenes
pyforge-i18n.js          Deutsch / Englisch UI-Strings
pyforge.js               App-Logik: Editor, Renderer, Speedrun,
                         Step-Debugger, Stats, Voice, etc.
sw.js                    Service Worker (cache-first)
manifest.webmanifest     PWA-Manifest
skulpt.min.js            Python-Interpreter (in-browser)
skulpt-stdlib.js         Skulpt-Standardbibliothek (inkl. turtle)
```

## Erweiterungen für Lehrkräfte

**Eigene Aufgaben** lassen sich im Lehrer-Modus erstellen (Tab „Eigene") und als JSON exportieren — Sie können also Aufgaben­pakete zwischen Kursen teilen, sichern oder über die Schul-Cloud verteilen.

**Eigene Snippets** werden ebenfalls in localStorage gespeichert und können per Share-URL/QR direkt mit der Klasse geteilt werden.

## Lizenz / Credits

Erstellt von **Dr. Michael Winkelmann**. Skulpt von skulpt.org. CodeMirror 5 von codemirror.net. Atkinson Hyperlegible vom Braille Institute. qrcodejs von davidshimjs.

Über ein PR oder Issue freue ich mich.
