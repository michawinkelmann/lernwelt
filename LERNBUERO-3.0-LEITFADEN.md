# Lernbüro 3.0 — Leitfaden für den Format-Umbau (verbindlich)

Ziel: Jede Lektion wird **problemorientiert, anschaulich und kognitiv entlastet** —
nach dem Vorbild der bereits fertigen Referenz **ma-08, Block „Lineare Funktionen"
(Lektionen `l1`–`l5b` in `daten/kurse/ma-08.json`)**. Diese sechs Lektionen sind der
**Gold-Standard** — vor dem Umbau eines Kurses immer dort hineinschauen.

Renderer (`assets/js/selbstlernen/kurs.js`) und CSS (`assets/css/selbstlernen.css`)
sind **bereits angepasst** und abwärtskompatibel. Du änderst also **nur Daten**:
`daten/kurse/<kurs>.json` und die zugehörigen Aufgaben-Pools
`daten/aufgaben/<thema>.json` (Basis) bzw. `daten/aufgaben/lernbuero/<thema>.json`.

---

## 1 · Das neue Lektions-Schema (genaue Feldnamen)

Erhalte je Lektion unverändert: `id, nr, titel, dauer, status, thema, themaPfad, ziele, kompetenzen`.
Baue die `phasen` so um:

```jsonc
"ankommen": {
  "zeit": 3,
  "hinweis": "Kurze Auffrischung aus der Vorlektion (BLEIBT!).",
  "aufgaben": [{ "quelle": "<thema>", "ids": ["..."] }],   // Auffrischungs-Aufgabe(n) BLEIBEN
  "einstieg": {
    "problem": "<p>Konkretes Problem/Phänomen, NEUTRAL formuliert.</p>",
    "figur": "<svg …>",            // anschauliche Mini-Grafik (figbau), wo sinnvoll
    "figurAlt": "Bildbeschreibung für Screenreader.",
    "vorhersage": "Eine echte Schätzfrage, deren Antwort NICHT im problem steht.",
    "optionen": ["Variante A", "Variante B", "kommt drauf an"]
  }
},
"verstehen": {
  "zeit": 14,
  "anker": "#ue-…",          // Anker auf der Erklärseite (falls vorhanden)
  "erklaerseite": true,       // zeigt Link „Ausführliche Erklärseite öffnen"
  "schritte": [
    {
      "titel": "Kurzer Schritt-Titel",
      "kern": "Ein bis zwei Sätze — der sichtbare Kern (HTML+KaTeX erlaubt).",
      "figur": "<svg …>", "figurAlt": "…",         // optional
      "beispiel": {                                 // optional: Musterbeispiel
        "aufgabe": "Aufgabenstellung.",
        "schritte": ["Rechenschritt 1", "Rechenschritt 2", "Ergebnis"],
        "selbst": { "frage": "Jetzt du: …", "loesung": "<p>Lösung zum Aufdecken.</p>" }
      },
      "details": "<p>Ausführliche Erklärung — einklappbar unter „Mehr dazu".</p>",  // optional
      "minicheck": { "frage": "Aktivierungsfrage", "antwort": "Antwort zum Aufdecken." } // optional
    }
  ],
  "stolperstein": "Typische Fehlervorstellung benennen und richtigstellen.",   // PFLICHT je Lektion
  "darstellungen": {                                  // mind. EINMAL pro Thema sinnvoll einsetzen
    "titel": "Dieselbe Sache in mehreren Sichtweisen:",
    "eintraege": [
      { "art": "Situation", "text": "…" },
      { "art": "Tabelle", "html": "<table class='lb-mini-tab'>…</table>" },
      { "art": "Graph", "figur": "<svg …>", "figurAlt": "…" },
      { "art": "Gleichung", "text": "$…$" }
    ]
  },
  "selbsterklaerung": "Metakognition: „Erkläre in einem Satz …\".",   // kurz, je Lektion
  "merksatz": "Knapper Merksatz (HTML+KaTeX).",
  "selbstcheck": [{ "frage": "…", "antwort": "…" }],
  "erkunden": [{                                       // optional: Hands-on (POE), s. Regel 7
    "typ": "experiment",
    "titel": "…",
    "material": "…",
    "auftraege": ["Schritt 1", "Schritt 2", "…"]
  }]
},
"ueben":   { "zeit": 18, "basis": [...], "standard": [...], "plus": [...], "partner": "…" },  // Refs s. Regel 8
"sichern": {
  "zeit": 7,
  "rueckbezug": "Greift die Einstiegsfrage auf und löst sie — schließt den roten Faden.",  // PFLICHT
  "aufgaben": [{ "quelle": "<thema>", "ids": ["..."] }],
  "transfer": "Optionale Transferfrage."
},
"extra": { … }   // unverändert lassen
```

---

## 2 · Didaktische Pflichtregeln (NICHT verhandelbar)

1. **Auffrischung bleibt.** `ankommen.hinweis` + `ankommen.aufgaben` (kurze Vorwissen-Aktivierung)
   bleiben ganz am Anfang erhalten. Danach erst der Einstieg.
2. **Kein Spoiler im Einstieg.** Der `problem`-Text beschreibt die Situation **neutral** und
   verrät die Antwort der `vorhersage` NICHT. (Negativbeispiel früher: „Wer wenig telefoniert,
   fährt mit dem einen besser …" — das gab die Lösung „es dreht sich um" preis. Stattdessen nur
   die beiden Tarife sachlich beschreiben.)
3. **Konkret → abstrakt.** Erst Bild/Situation, dann Formel.
4. **Text komprimieren.** Sichtbar nur der `kern` (1–2 Sätze); ausführliche Prosa in `details`
   (einklappbar). Faustregel: sichtbarer Text grob halbiert, Inhalt vollständig erhalten.
5. **Stolperstein** je Lektion: eine typische Fehlervorstellung benennen und richtigstellen.
6. **Aktivierung:** nach Schritten `minicheck`; pro Lektion eine `selbsterklaerung`. Musterbeispiele
   mit ausgeblendeter Hilfe (`beispiel.selbst`) bei rechnerischen Themen.
7. **Hands-on (`erkunden`) nur lösbar mit AKTUELLEM Wissen.** Wo ein kleines Real-/Denk-Experiment
   passt, gern aufnehmen — aber **keine Dopplung** mit der Einstiegs-Vorhersage (die Vorhersage
   steht nur einmal, im Einstieg) und **kein Vorgriff** auf späteres Wissen (z. B. „Schnittpunkt
   genau berechnen" gehört nicht in eine Lektion vor Einführung des Gleichsetzens — dort nur
   „zeichnen und ungefähr ablesen").
8. **Aufgaben-Niveau-Audit (sehr wichtig, proaktiv!).** Jede Aufgabe in `ueben.basis/standard/plus`
   und `sichern.aufgaben` darf **nur Wissen der aktuellen und früherer Lektionen** verlangen.
   Prüfe jede referenzierte Aufgabe gegen den Wissensstand der Lektion. Aufgaben, die **späteres**
   Wissen brauchen, NICHT verwenden — verschiebe sie in die passende spätere Lektion **oder**
   ersetze sie durch eine passende vorhandene **oder** lege eine neue niveaugerechte Aufgabe an
   (Regel 9). Frühere Inhalte zu wiederholen ist erlaubt und erwünscht.
9. **Roter Faden:** ein wiederkehrender Kontext/Beispielstrang pro Thema (Einstieg → Schritte →
   Sichern-Rückbezug).
10. **Zieltransparenz & Soll-Ist:** `ziele` als „Ich kann …" (Renderer setzt das Präfix); der
    `sichern.rueckbezug` prüft genau die Einstiegsfrage/das Ziel.

---

## 3 · Figuren mit `werkzeuge/figbau.py`

Importiere die Bibliothek und erzeuge **SVG-Strings** (siehe Kopf von `figbau.py` und die
Figuren in `ma-08` `l1`–`l5b` als Muster). Für Koordinatensysteme/Graphen ist `figbau` ideal.
Für einfache Schemata (Strecken, Rechtecke, Pfeile, Schaltbild-Andeutungen) kannst du eigene
schlichte SVG mit denselben CSS-Klassen schreiben. **Lieber keine Figur als eine schlechte/
unklare Figur.** In SVG-Text **kein KaTeX**; Multiplikation `·`, Hochzahlen als Unicode (`x²`).
Die `viewBox` muss den gesamten Inhalt + Rand umfassen (figbau macht das automatisch).

Render-Klassen (vom CSS bereitgestellt, Dark-Mode automatisch): `.achse .pfeil .raster
.beschriftung .achsentitel .gerade .gerade-a .gerade-b .hilfslinie .dreieck .punkt .marke
.label-a .label-b`.

---

## 4 · KaTeX-Konventionen

`$…$` inline, `$$…$$` abgesetzt. Deutsche Dezimalzahlen als `{,}` (z. B. `3{,}5`).
Multiplikation `\cdot`. Brüche `\frac` — **niemals** `\tfrac`, `\dfrac`, `\mathbb`. Nur
KaTeX-Standardumfang. (SVG-Text enthält kein KaTeX.)

**Echte Umlaute (PFLICHT).** Schreibe überall `ä ö ü ß` — **niemals** ASCII-Transliterationen
wie `ae oe ue ss` (also „für" statt „fuer", „Größe" statt „Groesse", „Würfel" statt „Wuerfel",
„Bäckerei" statt „Baeckerei", „groß" statt „gross"). Das gilt für ALLE Texte: Lektionsfelder,
SVG-Textlabels und neu angelegte Aufgaben. (Echte Ausnahmen behalten ihr Doppel-s/oe: „dass",
„Klasse", „Ergebnisse", „Koeffizient", „zuerst" — hier ist `ss`/`oe`/`ue` korrekt.)

---

## 5 · Neue Aufgaben anlegen (für Regel 8)

Neue Aufgaben kommen in den **Lernbüro-Pool** `daten/aufgaben/lernbuero/<thema>.json`
(Array `aufgaben`), mit `"ergaenzung": "lernbuero"`. IDs in der bestehenden Systematik
fortführen (z. B. `<präfix>-1xx` Basis/Standard-Ergänzungen, `-3xx` weitere). Schema an
vorhandenen Aufgaben desselben Pools orientieren. Typen: `numerisch`
(`eingaben:[{label,antwort,toleranz,einheit?}]`, `loesungsweg`), `freitext`
(`musterloesung`), `multiple-choice`, `zuordnung`, `luecke`, `rechenweg`, `reihenfolge`.
Immer `zweig`, `niveau`, `afb`, `tipps` (gestuft, 3 Stufen), `kc` setzen. Bei `zuordnung`:
`rechts`-Werte eindeutig und als Klartext (kein KaTeX in `rechts`).

---

## 6 · Selbstprüfung VOR Abschluss (im Sandbox-Pfad ausführen)

```bash
cd /sessions/<…>/mnt/Winkelmann-Website
python3 -c "import json,glob; [json.load(open(f,encoding='utf-8')) for f in glob.glob('daten/**/*.json',recursive=True)]; print('JSON ok')"
python3 werkzeuge/check-website.py | tail -5        # muss grün + Gate in-Lektion/benachbart/fehlend = 0
```

Zusätzlich selbst prüfen: (a) keine `\tfrac/\dfrac/\mathbb`; (a2) **keine ASCII-Umlaute** —
`grep -oE "fuer|ueber|moecht|koenn|groess|hoeh|wuerf|faell|haeng|zaehl|broetchen|baeck|loesung|moeglich" <deine-dateien>`
muss leer sein (echte Umlaute ä/ö/ü/ß verwendet); (b) ausgewogene `$`-Paare;
(c) jede referenzierte Aufgaben-ID existiert im Pool; (d) jede Lektion hat Einstieg(+Vorhersage),
mind. 1 Stolperstein, Selbsterklärung, Sichern-Rückbezug; (e) Aufgaben-Niveau-Audit bestanden.

---

## 7 · Was du NICHT anfasst

Renderer (`kurs.js`), CSS, `figbau.py`, andere Kurse, die Referenz `ma-08`-Block
„Lineare Funktionen" (`l1`–`l5b`). Keine Pfade mit `/` beginnen. Dateinamen kebab-case ASCII.
Bei inhaltlichen Entscheidungen sinnvoll annehmen, knapp dokumentieren und am Ende auflisten.
