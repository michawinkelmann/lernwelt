# SELBSTLERNEN-KONZEPT.md — „Lernbüro": Unterricht als moderiertes Selbstlernen

Entwurf 12.06.2026 (Runde 26), Status: **zur Entscheidung beim Betreiber.**
Ziel: Ein eigener Bereich, in dem Schülerinnen und Schüler Mathematik und Physik
(Kl. 5–13) sowie Informatik (Kl. 9 Scratch, Kl. 10 Calliope) **im Unterricht auf dem
iPad selbst lernen** — die Lehrkraft moderiert und hilft individuell. Leitfrage bei
jeder Designentscheidung: *Was hilft möglichst vielen Schülern zu erfolgreichem Lernen?*

## 1. Kurzantwort: Ist das möglich?

**Ja.** Die Website enthält bereits fast alle INHALTE (93 Themen mit Erklärseiten +
1230 Aufgaben mit gestuften Tipps, 27 Simulationen, 26 Experimente, Klassenarbeiten +
Lernzettel, Vorwissens-Checks, Tagesmischung, CAS-Werkstatt, Fortschritt je Gerät).
Was fehlt, ist die **Unterrichts-Schicht**: die Bündelung in Stundenlektionen mit
Zeitstruktur, Lernzielen, Pflicht-Checkpoints, Differenzierungspfaden und
Moderations-Werkzeugen für die Lehrkraft. Genau die wird gebaut.

**Ehrliche Grenzen (rein statische Seite, bewusst ohne Server):**
- Kein Live-Dashboard „welcher Schüler ist wo" — Fortschritt liegt nur auf dem
  jeweiligen iPad (Datenschutz-Vorteil: keine Konten, keine Übertragung). Ersatz:
  Hilfe-Signal, Stand-Karte, Export/Import des Fortschritts (existiert schon).
- Keine automatische Leistungsbewertung — gewollt (Seite bleibt notenfrei);
  Leistungsmessung läuft weiter über normale Arbeiten (Bereich existiert).
- Selbstlernen trägt nicht jede Stunde: Das Konzept plant bewusst gemeinsame
  Anker (Einstieg/Abschluss, Stopp-Punkte, Partner-Phasen) gegen Vereinzelung,
  und enge Taktung für Schwächere statt „völlig freiem" Lernen.

## 2. Architektur: Kurse → Lektionen → Phasen

Neuer Bereich **`selbstlernen/`** (Arbeitstitel „Lernbüro"). Registry-getrieben wie
alles auf der Seite:

- **Kurs** = Fach + Stufe (z. B. „Mathematik Klasse 7"), Datei `daten/kurse/ma-07.json`.
  Enthält Stoffverteilung (Reihenfolge der Themen mit Wochen-Richtwerten, KC-Bezug)
  und die Lektionsliste. Zweig-Tags (gym/rs) wie überall.
- **Lektion** = eine Unterrichtseinheit (45 oder 90 min), referenziert NUR vorhandene
  Inhalte (Erklär-Abschnitte per Anker, Aufgaben per ID, Sims/Experimente per Link).
  Keine Inhalte doppeln — eine Quelle, viele Verwendungen.
- **Phasen einer Lektion** (Standard-Stundenbild, Zeiten = Richtwerte am Bildschirm):

| Phase | Zeit (45′) | Inhalt | Pflicht? |
|---|---|---|---|
| Ankommen | 3′ | Lernziel(e) als „Ich kann …"-Sätze + Mini-Vorwissens-Check (1–2 Aufgaben) | ja |
| Verstehen | 12′ | Erklär-Abschnitt(e) lesen + interaktives Element / Sim mit Beobachtungsauftrag | ja |
| Üben | 18′ | Aufgaben-Set in drei Spuren: **Basis** (Pflicht) · **Standard** · **Plus** (AFB III) | Basis ja |
| Sichern | 7′ | Abschluss-Check (2–3 Aufgaben, automatisch geprüft) + Ampel-Selbsteinschätzung | ja |
| Extra | 5′ | Lernspiel-Häppchen, Knobelei, Lernzettel lesen, Helfer-Rolle | nein |

- **Checkpoint-Logik:** „Sichern" bestanden (✓ aus eigener Bearbeitung, keine Note)
  schaltet die nächste Lektion im Gerät frei — sanfte Taktung statt Durchklicken.
  Lehrkraft kann jeden Checkpoint mündlich „überschreiben" (Knopf „Lehrkraft hat
  freigegeben" — bewusst ohne Passwort, Vertrauensmodell).
- **Stopp-Punkte:** Im Kursplan markierte Lektionen, nach denen die Lehrkraft ein
  gemeinsames Gespräch/Experiment einplant (z. B. echtes Demo-Experiment vor der
  Simulations-Lektion). Der Plan weist sie aus — der Unterricht bleibt rhythmisiert.

## 3. Der Lektions-Player (Schüleransicht)

Eine Seite je Kurs (`selbstlernen/<fach>-<stufe>/index.html` = Kursübersicht als
Lernlandkarte; Lektion öffnet als geführte Checkliste):

- Fortschritts-Checkliste der Phasen, Häkchen speichert localStorage (wie überall).
- **„Ich kann …"-Ziele** oben; am Ende dieselben Sätze als Selbsteinschätzung mit
  **Ampel** (🟢 sicher / 🟡 unsicher / 🔴 brauche Hilfe) + Konsequenz-Hinweis
  (🟡 → markierte Zusatzübung; 🔴 → „Hol die Lehrkraft" + Eintrag in Hilfe-Liste).
- **Hilfe-Signal:** großer Knopf „Ich brauche Hilfe" → Vollbild-Farbsignal (iPad
  hochkant aufstellen = sichtbares Handzeichen 2.0; abwählbar). Zusätzlich stilles
  Sammeln: „Frage notieren" (Lerntagebuch), damit Fragen nicht verloren gehen.
- **Stand-Karte:** ein Bildschirm „Mein Stand" (Kurs-Fortschritt, letzte Ampeln,
  offene Fragen) — Schüler zeigt ihn der Lehrkraft im Vorbeigehen; ersetzt das
  fehlende Dashboard pragmatisch und datensparsam.
- **Zeit-Richtwerte** je Phase dezent sichtbar; optionaler sanfter Wecker.
  `prefers-reduced-motion` und Beamer-Modus wie gewohnt.
- **Partner-Phasen:** Lektionen können Phasen als „zu zweit" markieren
  (Erklär-Tandems: „Erkläre deinem Nachbarn …") — kooperatives Lernen bleibt drin.

## 4. Differenzierung (Kern des Ganzen)

- **Drei Spuren je Übungsphase** aus dem vorhandenen Niveau-/AFB-Tagging:
  Basis = Niveau 1 (Pflichtsockel für alle), Standard = Niveau 2, Plus = Niveau 3 /
  AFB III / Zusatzaufgaben. Schnelle laufen nie leer (Plus + Extra + Helfer-Rolle),
  Langsame schaffen den Basis-Sockel in der Zeit.
- **Zweig-Schalter** (gym/rs) wirkt wie überall; RS- und Gym-Pfade einer Lektion
  können verschiedene Aufgaben-Sets referenzieren.
- **Tempo-Freiheit mit Geländer:** Wochenplan statt starrem Stundenplan — der Kurs
  zeigt „Diese Woche: Lektionen 12–14". Wer schneller ist, zieht vor; wer langsamer
  ist, hat klare Mindestmarke (Basis-Sockel je Woche). Lehrkraft sieht am Stand
  sofort, wer unter der Marke liegt.
- **Vorwissens-Netz:** Ampel 🔴 im Ankommens-Check verlinkt direkt die
  Vorwissens-Themen (existierende Mini-Checks) — Lücken aus Vorjahren werden im
  Unterricht sichtbar UND bearbeitbar (das leistet kaum ein klassisches Setting).

## 5. Zeitpläne (KC-orientiert)

Je Kurs eine **Stoffverteilung** aus den KCs (`kc-quellen/` liegt vor und wird beim
Bau ausgewertet), als Tabelle Woche → Lektionen → KC-Kompetenzbezug. Beispiel-Gerüst
**Mathematik Klasse 7 (Gym, 4 Wochenstunden, 1. Halbjahr ≈ 18 Wochen):**

| Wochen | Thema | Lektionen (45′) | KC-Schwerpunkt |
|---|---|---|---|
| 1–4 | Rationale Zahlen | 12 (inkl. 2 Puffer) | Zahlen/Operationen: Q, Rechengesetze |
| 5–8 | Zuordnungen | 11 | Funktionaler Zusammenhang, Dreisatz |
| 9–13 | Prozent- und Zinsrechnung | 14 | Zahlen/Operationen, Modellieren |
| 14–17 | Terme und Umformungen | 11 | Terme/Gleichungen, Variablenbegriff |
| 18 | Wiederholung + Klassenarbeitstraining | 3 | (Arbeiten-Bereich + Tagesmischung) |

Puffer-Lektionen, Klassenarbeits-Wochen und Stopp-Punkte sind eingeplant; echte
Stundenzahlen kalibriert der Betreiber (Stundentafel der Schule). Pro Thema gilt
als Faustregel: 5 Erklär-Abschnitte → 4–6 Lern-Lektionen + 1–2 Übungs-/
Sicherungslektionen + 1 Vertiefung (Plus).

## 6. Beispiel-Lektion (ausgearbeitet)

**Kurs Mathe 7 · Lektion 21: „Prozentwert berechnen" (45′)**
- Ich-kann-Ziele: *Ich kann den Prozentwert mit Operator und Dreisatz berechnen.*
  *Ich kann entscheiden, welche Größe gesucht ist.*
- Ankommen (3′): 2 Aufgaben Bruch↔Prozent (aus ma-06-brueche / ma-07-prozent Basis).
- Verstehen (12′): Abschnitt 2 der Erklärseite (Anker `#prozentwert`) + interaktives
  Element; Beobachtungsauftrag: „Stelle 25 % von 80 auf zwei Wegen dar."
- Üben (18′): Basis ma-07-pz-002, -003 · Standard -005, -006 · Plus -011 (AFB III,
  Sachkontext). Partner-Auftrag nach Basis: „Erkläre den Operator-Weg."
- Sichern (7′): Abschluss-Check -004 + 1 Transferfrage; Ampel-Selbsteinschätzung.
- Extra (5′): Lernspiel Prozent-Sprint ODER Plus-Aufgabe fertig rechnen.
- Hausaufgaben-Hinweis (optional, schulkonform): Lernzettel Prozent ansehen.

## 7. Informatik-Sonderweg (projektbasiert)

Informatik lernt man hier durch MACHEN — der Kurs ist eine **Projektkarten-Folge**,
die Website liefert Auftrag, Hilfen, Checkliste; programmiert wird im Werkzeug:

- **Klasse 9 — Scratch:** 10–12 Projektkarten von „Erste Animation" bis
  „eigenes Spiel" (KC: Algorithmen, Variablen, Verzweigung/Schleife, Ereignisse).
  Jede Karte: Ziel-GIF-Beschreibung, Pflicht-Bausteine, gestufte Hilfekarten,
  „Zeig es"-Checkliste (Partner-Abnahme!), Plus-Erweiterungen. Die bestehenden
  Themen (in-09-algorithmen-grundlagen …) sind die Theorie-Anker dazwischen.
- **Klasse 10 — Calliope:** Projektkarten analog (MakeCode): Ampel, Würfel,
  Temperatur-Logger, Funk-Nachrichten, Abschlussprojekt. Hardware-Hinweise
  (Batterie, Pins) auf der Karte; Theorie-Anker: in-10-programmieren,
  in-09-daten-und-codierung (Binär), in-10-suchen-und-sortieren wo passend.
- Scratch/MakeCode laufen als eigene Apps/Editoren auf dem iPad — die Website
  bindet sie NICHT ein (Regel: keine externen Ressourcen), sie führt nur hindurch.

## 8. Was die Lehrkraft bekommt

Je Kurs eine **Moderations-Seite** (`lehrkraft.html`, unverlinkt im Schüler-Flow):
Stoffverteilung kompakt, je Lektion: typische Fehler/Fragen (aus den Tipps der
Aufgaben destilliert), Material-Hinweise (wo ein echtes Experiment die Sim ersetzen
sollte — Stopp-Punkte), Differenzierungs-Hinweise, Druckansicht. Dazu ein kurzer
**Praxis-Leitfaden Selbstlern-Moderation** (Rituale: gemeinsamer Stundenstart 3′,
Hilfe-Regeln „Erst Tipp, dann Partner, dann Lehrkraft", Stand-Karten-Runde,
gemeinsamer Abschluss 3′).

## 9. Rollout-Vorschlag (Runden)

1. **Pilot (1 Runde):** Gerüst (Registry, Player, Kursübersicht) + EIN Kurs
   komplett: Mathe 7 (24 Themenwochen ≈ 60–70 Lektionen) — am eigenen Unterricht
   testen. Plus Praxis-Leitfaden.
2. **Welle Sek I:** Mathe 5–10, Physik 5–10 (Skelett-Generierung aus den
   Themenstrukturen + Fable-Agenten zur Verfeinerung je Stufe; KC-PDF-Abgleich).
3. **Welle Oberstufe:** EP/QP (Klausur-Rhythmus, eA/gA-Spuren, Semesterpläne
   passend zu den vorhandenen Semesterübersichten).
4. **Informatik-Projektkurse** 9 + 10 (eigenes Kartenformat).
5. Feinschliff aus der Praxis (deine Beobachtungen aus dem Pilot steuern alles).

Aufwand ehrlich: Inhaltlich ist es vor allem kuratierende Arbeit über vorhandenem
Material — gut automatisierbar + agentenfähig; die Qualität entsteht in der
fachlichen Endprüfung durch dich (wie bei den Themen).

## 10. Offene Entscheidungen (siehe Fragen an den Betreiber)

Pilotumfang · Wochenplan vs. starre Stundenfolge · Bereichsname · Hilfe-Signal &
Lerntagebuch ja/nein · Checkpoint-Strenge (Freischalten vs. nur Empfehlung).
