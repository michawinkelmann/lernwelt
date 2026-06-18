# INFORMATIK-VORSCHLAG.md — Projektkarten fürs Lernbüro (Scratch Kl. 9 · Calliope Kl. 10)

Stand 13.06.2026 · **zur Entscheidung beim Betreiber.** Du hast „Beides" gewählt: die
vorhandenen Theorie-Lektionskurse behalten **und** ein projektbasiertes Format ergänzen.
Hier ein konkreter Vorschlag, den wir vor dem Bau gemeinsam durchgehen.

## 1. Was schon da ist
- **in-09 „Algorithmen-Grundlagen"** und **in-10 „Programmieren"** — als reguläre Lektionskurse
  (gym+rs, lückenfrei, 5 Lektionen, mit Erklär-Einbettung). Das ist die **Theorie-Schiene**.
- Konzept §7 will Informatik vor allem durchs **Machen**: Scratch (Kl. 9), Calliope/MakeCode (Kl. 10).
  Die Website führt durch (Auftrag, Hilfen, Checkliste); **programmiert wird im externen Editor**;
  externe Tools werden **nicht eingebettet** (Regel: keine externen Ressourcen) — nur als Link geöffnet.

## 2. Kernvorschlag: ein eigenes, schlankes Format „Projektkarten"
Projektarbeit ist anders getaktet als eine 45-Minuten-Lektion (eine Karte = ein Mini-Projekt,
oft 1–2 Stunden). Darum **nicht** in den Lektions-Player pressen, sondern ein eigenes leichtes
Format — gleiche Designsprache, gleiche Infrastruktur (Registry, localStorage-Fortschritt,
Zweig-Filter, keine externen Requests).

### Aufbau einer Projektkarte (aus Konzept §7)
1. **Titel + Ziel** — „Das soll am Ende passieren." (kurze Beschreibung + ggf. eigenes SVG-Mockup; keine fremden GIFs/Bilder).
2. **Pflicht-Bausteine** — welche Blöcke/Befehle vorkommen müssen (z. B. Scratch: *wenn grüne Flagge*, *wiederhole*, *falls … dann*).
3. **Auftrag** — 3–5 Schritte.
4. **Gestufte Hilfekarten** — 3 Stufen, aufklappbar (wie die Tipps in den Aufgaben).
5. **„Zeig es"-Checkliste** — Selbst-/Partner-Abnahme mit Häkchen (localStorage): „Erkläre deinem Partner, wie deine Schleife funktioniert."
6. **Plus-Erweiterungen** — für Schnelle.
7. **Theorie-Anker** — Link zur passenden Lektion/Erklärseite (in-09/in-10).
8. **Werkzeug-Hinweis** — „Öffne den Scratch- bzw. MakeCode-Editor" als externer Link (neuer Tab), nicht eingebettet.

### Wo es lebt (Datenmodell)
- Registry: `daten/projekte/in-09-scratch.json`, `daten/projekte/in-10-calliope.json`.
- Renderer: `assets/js/selbstlernen/projekte.js` (Karten-Galerie + Kartenansicht über Hash, analog zum Kurs-Player).
- Seiten: `selbstlernen/informatik-klasse-9-scratch/index.html` usw. — **oder** als zweite „Spur" in den bestehenden Informatik-Kursen (Theorie + Projekte).
- Schema-Skizze:
  ```
  { version, fach:"informatik", stufe:"klasse-9", werkzeug:"Scratch", werkzeugUrl:"…",
    karten:[ { id, nr, titel, status, ziel, pflichtbausteine:[…], schritte:[…],
               hilfen:[3 Stufen], zeigEs:[Punkte], plus:[…], theorieAnker:{label,href} } ] }
  ```
- Fortschritt: je Karte „erledigt" + Zeig-es-Häkchen (localStorage, im selben Export/Import).
- Zweig: Kl. 9/10 = **gym+rs** (keine Oberstufe) → Karten gym+rs.

## 3. Konkrete Projektfolgen (Entwurf)
**Scratch · Klasse 9 (10–12 Karten):** (1) Erste Animation – Sequenz · (2) Figur steuern – Ereignisse ·
(3) Verfolgungsspiel – Schleife + Bedingung · (4) Quiz – Variablen + Verzweigung · (5) Punktezähler ·
(6) Labyrinth – Kollision · (7) Zufall/Würfel · (8) Klon-Technik · (9) eigenes Spiel – Projekt ·
(10) Abschluss + Präsentation. *(KC: Algorithmen, Variablen, Verzweigung/Schleife, Ereignisse.)*

**Calliope mini · Klasse 10 (MakeCode, 7 Karten):** (1) Ampel – LED + Pause · (2) Würfel – Schütteln + Zufall ·
(3) Thermometer – Sensor · (4) Schrittzähler · (5) Funk-Nachrichten · (6) Mini-Spiel · (7) Abschlussprojekt.
Hardware-Hinweise (Batterie, Pins) auf der Karte. *Theorie-Anker: in-10-programmieren, in-09-daten-und-codierung (Binär), in-10-suchen-und-sortieren wo passend.*

## 4. Vorgehen (wenn du zustimmst)
1. **Pilot:** Format + Renderer + EINE Referenzkarte (Scratch „Erste Animation") — am eigenen Unterricht testen.
2. **Welle Scratch:** restliche Karten parallel via Agenten.
3. **Welle Calliope** analog.
Inhaltlich kuratierende Arbeit über bekanntem KC-Stoff; fachliche Endprüfung durch dich.

## 5. Entscheidungen, die ich von dir brauche
1. **Format:** eigenes „Projektkarten"-Format (wie oben) — einverstanden? Oder doch im Lektions-Player abbilden?
2. **Platzierung:** eigene Kacheln „Informatik 9 — Scratch-Projekte" **oder** Theorie + Projekte in einem Kurs (zwei Spuren)?
3. **Scratch:** online (scratch.mit.edu) oder offline-App? (bestimmt den Werkzeug-Hinweis)
4. **Calliope:** habt ihr Calliope-minis im Einsatz? Wenn nein, bauen wir Kl. 10 zunächst nur als Scratch/Theorie und Calliope später.
5. **Externe Editor-Links** (neuer Tab) sind ok? Das ist ein Link, **kein** Embed — verstößt nicht gegen „keine externen Ressourcen", ich will es aber bestätigt haben.
