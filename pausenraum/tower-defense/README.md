# 🎓 Zeugnis-Verteidigung

Schul-Tower-Defense im Stil klassischer Warcraft-III-TD-Maps. Verteidige dein Abschlusszeugnis durch 13 Schuljahre (26 Wellen) gegen Hausaufgaben, Klassenarbeiten und schlecht gelaunte Lehrer – danach geht's im Endlosmodus („Studium") mit Elite-Gegnern weiter.

## Starten

`index.html` per Doppelklick im Browser öffnen. Keine Installation nötig. Der Spielstand wird automatisch zwischen den Wellen gespeichert – im Menü kannst du weiterspielen. Erfolge 🏆 und Rekorde bleiben erhalten.

## Spielprinzip (Mazing)

Gegner laufen von den 🚪 Schultoren zum 🎓 Zeugnis und suchen immer den kürzesten Weg. Baue ihnen ein möglichst langes Labyrinth – der Weg darf nie komplett blockiert werden. Gestrichelte Linien zeigen die aktuellen Laufwege.

## Karten

🏫 **Pausenhof** (Klassiker) · 🚪 **Doppeltor** (zwei Spawns!) · 🛣️ **Schulweg** (diagonal) · 🪑 **Klassenzimmer** (Möbel als Hindernisse)

## Tower (Tasten 1–9, 0)

| Tower | Rolle |
|---|---|
| 📇 Karteikarten | Günstig & schnell – ideal als Labyrinth-Wand |
| ☕ Lerncrunch | Solider Dauerschaden, das Arbeitstier |
| 👥 Lerngruppe | Flächenschaden gegen Schwärme |
| 📋 Fristverlängerung | Verlangsamt Gegner |
| 🎤 Zusatzreferat | Sniper: große Reichweite, hoher Schaden |
| 📡 WLAN-Störer | Kettenblitz springt auf bis zu 5 Gegner |
| 🥤 Energydrink-Kiosk | Aura: +Angriffstempo für Nachbartower |
| 📣 Schulsprecher | Aura: senkt Gegner-Panzerung |
| 🧑‍🏫 Nachhilfe-Session | Ignoriert Panzerung, stark gegen Bosse |
| 💼 Nebenjob | Einkommen: 💪 Motivation pro Welle |

Jeder Tower hat 3 Ausbaustufen und eine umschaltbare Zielpriorität (P): Erster / Stärkster / Boss zuerst.

## Fähigkeiten (Q/W/E)

🥵 **Hitzefrei!** friert alle Gegner 5 s ein · ⚡ **Energydrink exen** +50 % Angriffstempo für 10 s · 🥪 **Pausenbrot** +2 Zeugnis-Integrität

## Steuerung

- **1–9, 0**: Tower wählen · **Klick**: bauen · **Rechtsklick/Esc**: abbrechen
- **Doppelklick/Doppel-Tipp auf Tower**: alle gleicher Art auswählen (Sammel-Upgrade/-Verkauf)
- **U**: Upgrade · **V**: Verkaufen (70 %) · **P**: Zielpriorität · **N/Enter**: Welle früh starten (Bonus!)
- **Leertaste**: Pause · **1×/2×/3×**: Tempo · 🎵 Musik · 🔊 Sound · Lautstärkeregler · 🏆 Erfolge
- Touch wird unterstützt (Tippen = Klick, Doppel-Tipp = Mehrfachauswahl)

## Endlosmodus & Eliten

Nach dem Abi zählt jedes Semester. Elite-Gegner: ♻️ regenerierend · 🛡️ Schildwache (schirmt Nachbarn ab) · 💨 Tempomacher (beschleunigt Nachbarn).

## Dateien

`index.html` · `style.css` · `config.js` (Spieldaten/Balancing) · `logic.js` (Pathfinding) · `game.js` (Engine)
