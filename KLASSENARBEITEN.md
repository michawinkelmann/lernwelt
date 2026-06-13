# KLASSENARBEITEN.md — Workflow „Klassenarbeiten zum Üben"

Klassenarbeiten aus echten Durchgängen werden anonymisiert als PDF veröffentlicht
(`klassenarbeiten/` auf der Website). Der Betreiber legt neue Arbeiten als .docx/.odt
in **`Klassenarbeiten/0Ablage/`** ab und sagt Claude Bescheid (z. B. „Ich habe neue
Klassenarbeiten abgelegt"). Dann läuft folgender Ablauf:

## Ablauf je Datei

1. **Sichten:** Datei aus `Klassenarbeiten/0Ablage/` öffnen (python-docx), Fach/Jahrgang/
   Zweig/Thema aus Dateiname und Kopftabelle bestimmen. Dateinamensschema der Ablage ist
   frei (z. B. `Klassenarbeit_Physik_ElektrischerStrom_8G1.docx`).
2. **Anonymisieren + kürzen** (Skript `Klassenarbeiten/werkzeuge/verarbeite.py`):
   - Klassenbezeichnung kürzen: `8G1`/`9R2` → `8G`/`9R` (nur Jahrgang + Schulzweig bleiben)
   - eingetragene Datumsangaben (`tt.mm.jjjj`) entfernen; leere „Datum:"-Felder bleiben
   - **B-Version samt ihrem Erwartungshorizont entfernen** (Beschluss 06/2026: B bleibt
     für Nachschreiber unveröffentlicht). Erkennung: zweite Kopftabelle „…arbeit Nr. xB".
   - **Erwartungshorizont der A-Version bleibt enthalten** (Selbstkontrolle, Beschluss 06/2026)
3. **Konvertieren:** LibreOffice headless (im Temp-Verzeichnis! nie direkt in den Mount,
   sonst bleiben Lock-/Tmp-Dateien liegen), PDF nach `klassenarbeiten/pdf/`.
   Zielname: `<fach>-<jg>-<zweig>-<thema-slug>.pdf` (kebab-case, keine Umlaute),
   z. B. `ma-08-gym-mehrstufige-zufallsexperimente.pdf`. Bei mehreren Arbeiten zum
   gleichen Thema `-2`, `-3` anhängen.
4. **Prüfen (Pflicht):** PDF-Text extrahieren (pypdf) und sicherstellen:
   keine Klassenbezeichnung mit Klassennummer (Regex `\d{1,2}\s*[GR]\s*\d`), kein
   Datum, kein „…arbeit Nr. xB", Erwartungshorizont vorhanden, Seitenzahl plausibel.
5. **Registrieren:** Eintrag in `daten/klassenarbeiten.json` (Schema: id `ka-…`, fach,
   stufe `klasse-5…qualifikationsphase`, zweig-Liste, titel, nr, datei, seiten,
   optional thema = passende Themen-id aus themen.json → wird auf der Seite verlinkt,
   sobald das Thema in-arbeit/online ist).
   Seit Runde 21 hat die Registry zusätzlich ein Array `lernzettel` (gleiches Schema
   ohne nr, id `lz-…`, Datei `klassenarbeiten/pdf/lz-….pdf`) — beim Ergänzen von
   Arbeiten unangetastet lassen bzw. passende Lernzettel dort eintragen. Oberstufen-
   Klausuren: Zweig-Token im Dateinamen `ea`/`ga`, im JSON zweig ["gym"] + Niveau im Titel.
6. **Original verschieben:** aus `0Ablage/` nach `Klassenarbeiten/1Verarbeitet/`
   (macht das Skript automatisch).
7. **Testen:** Übersichtsseite `klassenarbeiten/index.html` rendert den neuen Eintrag,
   PDF-Link liefert HTTP 200, 380-px-Check, Stufenseiten-Hinweis erscheint.
8. **Änderungsliste** für den Commit ausgeben (neue PDF + klassenarbeiten.json).

## Aufruf des Skripts

```
cd Klassenarbeiten/werkzeuge
python3 verarbeite.py ../0Ablage/<datei>.docx <zielname-ohne-endung>
```
Vorher in frischer Sandbox: `pip install python-docx pypdf --break-system-packages`.
LibreOffice (`soffice`) ist in der Sandbox vorhanden.

## Wichtige Punkte

- **`Klassenarbeiten/` steht in `.gitignore`** — Originale mit Klassen-/Datumsbezug
  dürfen nie ins Repo/auf GitHub Pages. Veröffentlicht wird nur `klassenarbeiten/pdf/`.
- Löschen von Dateien im Mount erfordert ggf. einmalig die Freigabe über das
  Cowork-Tool `allow_cowork_file_delete` („Operation not permitted" beim rm).
- `pkill -f soffice` niemals wörtlich verwenden (matcht die eigene Shell) —
  stattdessen `pkill -f '[s]office'`.
- Website-Verweise: Hauptnavigation („Klassenarbeiten"), Startseiten-Knopf,
  automatischer Hinweis-Kasten auf passenden Stufenseiten (uebersicht.js),
  Übersichtsseite mit Anker `#<fach>-<stufe>` je Stufe.
