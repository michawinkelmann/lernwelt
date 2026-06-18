# Der Algorithmus — Lernspiel zu Social Media & Filterblasen

Ein interaktives, webbasiertes Lernspiel zum Thema **Algorithmen, Filterblasen und Radikalisierung**. Zielgruppe: 12. Klasse. Einsatz: 3-tägige Projektwoche „Demokratiebildung".

Die SuS übernehmen einen Account auf der fiktiven Plattform **Streem** in der fiktiven Stadt **Greifshafen** und spielen ein simuliertes Halbjahr (27 Spielwochen). Über die Wochen schaltet sich Mechanik nach Mechanik frei: Anzeigen, Bot-Accounts, Gilden, Wahlkampf, Wrapped-Jahresrückblick, eigener Sandbox-Algorithmus.

## Schnellstart

**Einfachste Variante:** Doppelklick auf `index.html`. Fertig. Die App läuft direkt im Browser, ohne Server.

Das funktioniert, weil alle JSON-Daten und der JS-Code in zwei gebündelten Dateien (`data/data.bundle.js`, `js/app.bundle.js`) vorliegen — keine `fetch()`-Requests, die Chrome/Edge auf `file://` blockieren würden.

> **iPad (Safari):** Dateien in die **Dateien-App** legen, `index.html` öffnen. **Keine privaten Tabs** — der Spielstand im `localStorage` würde sonst beim Schließen verloren gehen.

### Alternative: Server (für Dev / iPad-Klassensatz)

```
cd der-algorithmus
python -m http.server 8080
```
Dann `http://localhost:8080` im Browser. Vom iPad: die IP des Laptops, z.B. `http://192.168.1.42:8080`.

### Bundle neu bauen (nur wenn du Code änderst)

```
python tools/make_bundle.py
```

## Lehrkraft-Checkliste

Bevor du mit der Klasse loslegst:
- Auf dem Start-Bildschirm: **„Vor dem Klassen-Einsatz"** klicken — die App prüft localStorage, Privatmodus, Browser-Kompatibilität und WebAudio automatisch.
- **„3-Tage-Stundenplan exportieren"** (in Settings → Lehrkraft-Werkzeuge) gibt dir ein fertiges HTML mit Phasen-Tabelle pro Tag.
- Mit `?day=1`, `?day=2` oder `?day=3` in der URL erscheint ein **Lehrer-Banner** mit den Schwerpunkten des Tages.

## Was im Spiel passiert

### Tag 1 — Onboarding & erste Wochen (W0–W8)
SuS legen einen fiktiven Account an (3 Protagonist:innen zur Auswahl: Alex / Jamal / Ronja, plus Name / Bio / Avatar / Interessen) und spielen die ersten 9 In-Game-Wochen. Inhalte bleiben weitgehend harmlos. Nach W4 gibt es eine **erste Zwischenreflexion** in der App.

Pre-Quiz (5 Selbsteinschätzungs-Skalen) läuft direkt nach dem Onboarding. Vergleich kommt am Ende.

### Tag 2 — Komplexität & Verschärfung (W9–W18)
Neue Mechaniken schalten sich frei:
- **Anzeigen** (politische + kommerzielle, gekennzeichnet, inkl. Dark-Pattern-Beispiele)
- **Bots** und Fake-Accounts
- **Gilden** — Gaming Nord, Leserunde 2028, Echte Werte (rechts, mit Inhaltswarnung), Spurensuche Greifshafen (verschwörungsideologisch, W15, mit Inhaltswarnung) — zwei unterschiedliche Rabbit-Hole-Pfade, plus Hate-Incident
- **Algorithmus-Panel** (🔍) — zeigt, was das System über dich „weiß"
- **Mini-Game „Bot oder Mensch?"** in W12 (Konzept-Karte vorab)
- **Marc Stay-Based-DM** in W11 (Anwerbungs-Mechanik, Inhaltswarnung, Mikro-Reflexion danach)
- **Shitstorm-Check** (W14)
- **Deepfake-Episode** (W16)
- **Zwischenreflexion** (W18)

Bei jedem Unlock erscheint eine kurze **Konzept-Karte** (Bots, Anzeigen, Algorithmus-Panel, Dark Patterns, Empfehlungssysteme).

### Tag 3 — Analyse & Gestaltung (W19–W26 + Sandbox)
- **Wahlkampf** in Greifshafen, vier fiktive Parteien
- **Wahlomat-Quiz** mit Vergleich Feed-Bias vs. eigene Antworten
- **Wahltag** (W22) — objektives Ergebnis vs. Feed-Wahrnehmung
- **Hate-Incident in der Gilde** (W24, mit Mikro-Reflexion)
- **Schluss-Reflexion** vor dem Jahresrückblick
- **Post-Quiz** (gleiche Fragen wie zu Beginn)
- **Jahresrückblick** (Wrapped): Top-Wort, Echokammer-Score, Pathway, Beat-Map, „Was du nicht gesehen hast", verpasste Stories, „Hätte ich anders entschieden?", NPC-Reflexionen, eines von 10 Endings mit Quellen-Anhang
- **Sandbox**: SuS bauen ihren eigenen Algorithmus per Slider. Mit eigenen Presets, Algorithmus-Battle, Pseudo-Code-Export
- **Medien-Manifest**: 5 eigene Leitsätze, exportierbar
- **Share-Card**: PNG-Export im Instagram-Story-Format

## Mini-Games (4)

In den Einstellungen → Spiel & Inhalte jederzeit spielbar:
- **Bot oder Mensch?** — Profile mit Account-Alter, Posting-Frequenz, Bio erkennen
- **Faktencheck-Sprint** — Aussagen als echt / falsch / teilweise markieren
- **Schlagzeile zur Studie** — welche von 3 Schlagzeilen gibt die Studie fair wieder
- **Begriff zur Erklärung** — Glossar-Quiz mit 4 Optionen

## Inhaltliche Schwerpunkte

### Was im Spiel vorkommt (mit Warnhinweis)
- Rechtsextreme und verschwörungsideologische Rhetorik
- Antifeministische / Incel-nahe Rhetorik
- Hate Speech als fiktive Zitate
- Graduelle Radikalisierung in der fiktiven Gilde „Echte Werte"
- Marc-DM-Anwerbung mit Discord-Link-Mechanik

### Was nicht vorkommt
- Explizite Gewalt, Selbstverletzung, Suizid
- Darstellungen Minderjähriger in irgendeiner Form
- Echte Personen oder Logos

Alle Accounts, Parteien, Städte und Influencer sind fiktiv. **Greifshafen, Streem**, die Parteien und alle Personen sind erfunden.

## DM-System (13 Threads mit Story-Arcs)

- **Lea** (Café Hafen) — 6 Nachrichten, 3 Antwort-Slots (W2, W14, W20). W14-Antwort „Der Feed macht was mit mir" zählt für das Selbstbewusst-Ending.
- **Finn** (Gaming) — 6 Nachrichten, 4 Antwort-Slots (W8, W17, W21 Verschwörungs-Fund, W24 Hate-Beichte). Radikalisierungs-Pfad oder Rettung — je nach Antworten. Zählt für Finn-Lost / Finn-Saved-Endings.
- **Marc Stay-Based** — Anwerbung W11, Nachhak in W14 und W18 (bedingt durch W11-Wahl), inkl. Ausstiegs-Option in W18, die die Anwerbe-Tricks benennt.
- **Mira** (Klima-Aktivistin) — Reality-Check nach Hate-Welle. Mira-Close-Wert zählt für Allyship-Ending.
- **Lara Weiss** — DM nach W24-Hate-Incident.
- **Tariq, Sophia, Sara, Noah** — kürzere Arcs mit Faktencheck-, Schul-Reihe-, Modding-Gilde-, Reflexions-Themen.
- **Jule, Ana, Moritz** — Musik-Empfehlungen, Berlin-Pendeln, Schulhof-Stille.
- **Streem** — fiktive Push-Notifications mit didaktischem Disclaimer.

## Lehrer-Werkzeuge in der App

### Einstellungen → Lehrkraft-Werkzeuge
- **„Zu Woche springen …"** — beliebige Woche, schaltet alle Unlocks bis dahin frei
- **„Klassen-Vergleich"** — alle SuS-JSONs hochladen, bekommt:
  - Übersicht (Ø-Lean, Verteilung, Rabbit-Hole-Anteil)
  - **Rabbit-Hole-Tiefen-Balken** pro SuS (Index 0–100 aus Interessen, Gilden, Finn-Pfad, Marc-Wahl)
  - **Ausreißer-Markierung** (⚠ z.B. bei sehr hohem Empörungs-Anteil oder komplett passivem Spiel)
  - **Entscheidungs-Drill-Down**: Antwort-Option anklicken → Tabelle filtert auf die SuS mit dieser Wahl
  - Tabelle pro Spieler:in (mit Greifshafen-Codenamen wie „Möwe", „Anker", „Fähre" wenn anonymisiert), inkl. **Spielzeit** und **Meldungen**
  - **Entscheidungs-Diffs** an 6 Wendepunkten (Marc, Finn-W8/W17, Lara, Mira, Lea-W14)
  - **Vergleich nach Spielfigur** (Alex vs. Jamal vs. Ronja)
  - **Geteilte Lesezeichen** (Posts, die mehrere SuS markiert haben)
  - **Selbsteinschätzung der Klasse** (Pre/Post-Aggregat)
  - **Klassen-Manifest** (alle Manifest-Sätze + Wort-Häufigkeit für gemeinsamen Konsens)
- **„Lehr-Bericht exportieren (HTML)"** — pro SuS, druckbar
- **„Stats als CSV"** — 35+ Spalten für Excel/Sheets
- **„3-Tage-Stundenplan exportieren"** — fertige Workshop-Planung als HTML/PDF
- **„Save-Inspector"** — KB-Verbrauch und Felder-Stats des aktuellen Spielstands

### Sicherheit
- **Auto-Backup mit Rotation (2 Slots)** vor jedem Reset / Import — ein zweiter Reset überschreibt das letzte gute Backup nicht mehr; Wiederherstellung im Settings
- **Spielstand-Import** für SuS-Wechsel zwischen Geräten; Exporte enthalten Versions-Metadaten
- **Privatmodus-Warnung beim Start**: kann localStorage nicht schreiben, warnt die App sofort sichtbar (vorher stand das nur im README)
- **Save-Größen-Warnung**, bevor der Spielstand das localStorage-Limit erreicht

## Accessibility

Settings → Darstellung & Sound:
- **Schriftgröße-Slider** (85–135 %)
- **High-Contrast-Modus** (zusätzlich zu Dark / Light)
- **Sound-Lautstärke** (0–100 %)
- **Vorlesen-Toggle** (Stories und Reflexionen, sofern der Browser TTS unterstützt)
- **Tastenkürzel-Übersicht** im Settings

`prefers-reduced-motion` wird systemweit respektiert.

## Pädagogische Hilfen

- **Glossar** mit 19 Begriffen, suchbar
- **Konzept-Karten-Übersicht** mit 6 erklärenden Karten
- **Hilfe & Tipps**-Modal mit 8 FAQ-Einträgen
- **Tutorial** beim ersten Reinkommen (replay-bar)
- **Kontext-spezifische Diskussionsfragen** im Lehr-Bericht (passen sich an Ending, NPC-Arcs, Marc-Wahl etc. an)

## Feedback-Schleife & Moderation (im Feed sichtbar)

- **Feed-Shift-Banner** (ab W6): benennt einmal pro Woche die stärkste Profil-Verschiebung („mehr X — weil du letzte Woche …").
- **Filterblasen-Beobachtung** (ab W13): wenn ein Thema ≥ 50 % des Wochen-Feeds stellt, sagt die App das mitten im Feed.
- **„Warum trendet das?"** — Fragezeichen-Button an der Trending-Bar, zeigt Post-Zahlen und Ø-Empörung pro Hashtag.
- **Melden & Blockieren** (⚑ an jedem Post): mit didaktisch ehrlicher Moderations-Antwort — klare Verstöße werden entfernt, Grenzfälle bekommen das typische „kein Verstoß", inklusive Erklärung, warum.
- **Personalisierte Viral-Momente**: der W14-Shitstorm-Ausgang hängt von eigener Aktivität und Empörungs-Anteil des Auslöser-Posts ab und erklärt das.
- **„Letzte Woche nochmal spielen"** (Settings → Spiel & Inhalte): Was-wäre-wenn-Replay der zuletzt abgeschlossenen Woche (Profil + Feed-Interaktionen werden zurückgesetzt, DMs/Gilden bleiben).

## Achievements (19)

Im Profil-Modal als ausklappbare Liste mit Fortschritts-Balken („noch 2 für Sammler:in"). Beispiele:
- 🏅 Early Adopter, Flammenwerfer, Stiller Beobachter, Netzwerker
- 🏅 Türsteher:in, Selbstschutz, Hinschauen, Stimme, Sticker-Bro
- 🏅 Sammler:in, Antworter:in, Spurensucher:in
- 🏅 Beste Freundin (Lea), Wachposten (Finn), Verbündete:r (Mira)
- 🏅 Tief im Loch (Rabbit Hole), Bücherwurm (Leserunde), Melder:in (Meldungen)

Im Profil gibt es außerdem eine **„Mögliche Enden"-Übersicht**: alle 10 Endings als „???" mit vagen Hinweisen — SuS wissen, dass ihr Spielstil zählt, ohne dass die Bedingungen gespoilert werden.

## Endings (10)

Datengetrieben aus dem Spielverlauf:
- 🕳️ Tief im Loch
- 🕳️ Finn ist abgerutscht
- 🪢 Du hast Finn gehalten
- 🪞 Selbstbewusst durch den Feed
- 🤝 Verbündete:r
- ⚔️ Empörte:r Engagierte:r
- 🛡️ Achtsame:r Beobachter:in
- 📣 Mikro-Influencer:in
- 📚 Quelle vor Meinung
- 🌊 Mitgetrieben

Jedes Ending mit Quellen-Anhang (bpb, klicksafe, hateaid, exit-deutschland, algorithmwatch).

## Technisches

- **Pures HTML + CSS + Vanilla-JavaScript (ES-Modules).** Kein Build, kein npm.
- Spielstand in `localStorage` unter `algo_save_v1`.
- Auto-Backup in `algo_save_backup_v1`.
- Daten in `data/*.json`, Code in `js/*.js`, Stile in `css/*.css`.
- Keine externen CDN-Aufrufe zur Laufzeit.
- Autosave nach jeder Aktion (mit debouncedem Indikator).

## Troubleshooting

**Spielstand ist weg.** Vermutlich Privat-Modus oder Browser-Cache gelöscht. Settings → „Letztes Backup wiederherstellen" probieren. Im Normalmodus funktioniert es. Über „Spielstand exportieren (JSON)" kann gespeichert werden.

**iPad zeigt leeren Bildschirm.** Vermutlich können die JSONs nicht geladen werden. Lösung: Server vom Lehrer-Laptop nutzen (siehe oben), oder die SuS unter Chrome auf dem Windows-PC spielen lassen.

**Dev-Check:** Öffne `tools/validate_data.html` — zeigt an, ob alle JSON-Dateien korrekt geladen werden können.

## Tests & Daten-Validierung (für Entwickler:innen)

```
node tools/test_algorithm.mjs   # Unit-Tests der Empfehlungs-Engine (Scoring, Feed-Bau, Diversity)
node tools/test_state.mjs       # Save/Load, Migration, Backups, Profil-Drift
node tools/test_tutorial.mjs    # Tutorial-Flow
node tools/check_data.mjs       # Daten-Integrität: IDs, Autoren-Referenzen, Score-Bereiche, DM-/Gilden-Verweise
```

`check_data.mjs` nach jeder Änderung an `data/*.json` laufen lassen; danach `python tools/make_bundle.py` nicht vergessen.

## Hilfreiche Anlaufstellen (in-Spiel verlinkt)

- **bpb.de** — Bundeszentrale für politische Bildung
- **klicksafe.de** — Infos für sichere Mediennutzung
- **hateaid.org** — Hilfe bei digitaler Gewalt
- **beratung-gegen-rechtsextremismus.de**
- **exit-deutschland.de** — Ausstiegshilfe
- **algorithmwatch.org** — algorithmische Macht
- **Telefonseelsorge: 0800 111 0 111** (kostenlos, 24/7)

## Lizenz / Wiederverwendung

Das Spiel entstand im Rahmen der Projektwoche-Vorbereitung. Nicht kommerziell nutzen, Quelle angeben.
