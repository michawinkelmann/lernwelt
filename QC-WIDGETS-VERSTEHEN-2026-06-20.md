# Interaktive Widgets im verstehen-Block — Rollout über das gesamte Lernbüro

**Stand:** 20.06.2026 · **Auftrag:** in allen Lektionen interaktive Mini-Widgets direkt im verstehen-Block einbauen (vorhandene nutzen oder neue bauen, je nachdem was passt). Erklärseiten bleiben unverändert.

## Ergebnis in Zahlen
- **211 von 481 Konzept-Lektionen** haben jetzt ein interaktives Widget direkt im verstehen-Block (≈ 44 %).
- **18 wiederverwendbare Widgets** (eine Bibliothek unter `assets/js/interaktiv/`), parametrisierbar über das Kurs-JSON.
- Gate grün (Links/Wiederholungen/Aufgaben), **alle Parametersätze** browser-getestet (0 Fehler), 12 echte Lektionen je Widget-Typ im Lernbüro-Kontext geprüft.

## Wie es funktioniert
Im Kurs-JSON trägt eine Lektion das Feld `verstehen.interaktiv = {"id": <widget>, "titel": …, "params": {…}}`. `kurs.js` lädt das passende Modul dynamisch und mountet es in eine Karte „🔬 <titel>" im verstehen-Block. Ein Widget-Modul (`mount(container, params)`) ist die **einzige Quelle** und kann genauso auf einer Erklärseite eingebunden werden. Reines Vanilla-JS, kein Build, relative Pfade, keine externen Requests, kein KaTeX nötig.

## Widget-Bibliothek (18) und Nutzung
| Widget | Einsatz | × genutzt |
|---|---|---|
| funktionsplotter | lineare/quadrat./exp./Potenz-/Wurzel-/Sinus-Funktionen **und** physikal. Gesetze (Achsen umbenannt) | 111 |
| datenbalken | Mittelwert/Median/Spannweite | 10 |
| dreieck | Pythagoras (+ Trigonometrie) | 10 |
| groessen | Größen-Umrechner (Länge/Fläche/Volumen/Zeit/Speicher) | 9 |
| zweistufig | Baumdiagramm, Pfadregel, Ziehen mit/ohne | 9 |
| zahlenstrahl | negative/rationale/Dezimalzahlen | 8 |
| koerper | Volumen/Oberfläche (Quader…Kugel/Kegel/Pyramide) | 8 |
| glocke | Normalverteilung μ/σ, 68/95-Regel | 6 |
| energiekette | Energieumwandlungsketten | 6 |
| wurfparabel | schiefer/waagerechter Wurf, Teilchen im Querfeld | 6 |
| rechteck | Umfang & Fläche | 5 |
| bruchbalken | Bruch ↔ Dezimalzahl ↔ Prozent | 5 |
| binaer | Dezimal ↔ Binär (Bits klicken) | 4 |
| automat | endlicher Automat Schritt für Schritt | 4 |
| kreis | Radius → Umfang & Fläche | 4 |
| flaeche | Dreieck/Parallelogramm/Trapez-Fläche | 3 |
| caesar | Caesar-Verschlüsselung | 2 |
| einheitskreis | sin/cos am Einheitskreis | 1 |

## Abdeckung je Kurs (Widget / Konzept-Lektionen)
```
ma-05 15/30   ma-06 15/29   ma-07  9/30   ma-08 14/30   ma-09 24/34   ma-10 20/30
ma-ef 18/20   ma-qa 13/33   ma-qg  0/25   ma-qs  7/21
ph-05  0/10   ph-06  0/10   ph-07  1/10   ph-08  7/15   ph-09  5/10   ph-10 11/20
ph-ef 18/24   ph-qe  7/10   ph-qi  5/10   ph-qk  2/10   ph-qq  3/10   ph-qsw 5/10
in-09  6/20   in-10  6/30
```

## Bewusst ohne Widget (kein sinnvolles generisches Mini-Widget)
Diese Themen brauchen entweder Zeichen-/Konstruktions-Interaktion oder ein spezialisiertes Werkzeug; ein generisches Widget wäre dort Füllwerk:
- **ma-qg (0/25):** Vektoren, Geraden/Ebenen im Raum, Matrizen — bräuchte ein 3D-/Matrix-Widget.
- **Physik qualitativ:** Optik-Strahlengänge (ph-06), Stromkreis-Aufbau & Schaltungen (ph-05/07/08), Magnetfelder/Feldlinien, Atom-/Kernmodelle & Strahlungsarten, Linienspektren, Wellen/Interferenz/Doppelspalt.
- **Informatik:** Programmieren, Netzwerke/Protokolle, Suchen/Sortieren, KI/Modellgüte.
- **Mathe:** Konstruktionen & Symmetrie, Beweise/Rechengesetze, Teilbarkeit, Kreissektor/Strahlensätze, Sinus-/Kosinussatz, Steckbrief-/Integralverfahren.

## Mögliche nächste Widgets (falls weitere Abdeckung gewünscht)
Aus dem gesammelten Fehlbedarf, nach Hebel sortiert: **stromkreis** (Reihe/Parallel, deckt viele ph-05/07/08-Lektionen), **optik** (Reflexion/Brechung/Linse), **wellen/interferenz**, **vektor3d** + **matrix-abbildung** (ma-qg), **kreissektor**, **vierfeldertafel**, **binomial-histogramm** + **hypothesentest** (ma-qs), **suche-sortier-visualisierung** & **logikgatter** (Informatik), **termschema/spektrum** (Atomphysik).

## Geänderte/neue Dateien
- **Neu:** `assets/js/interaktiv/` — 18 Widget-Module + (Energiekette aus dem Vortest).
- **Geändert:** `assets/js/selbstlernen/kurs.js` (Mount-Mechanik mit Parametern).
- **Geändert:** 22 Kurs-JSONs in `daten/kurse/` (Feld `verstehen.interaktiv` in 211 Lektionen).
- Erklärseiten: **unverändert**.

---
## Nachbesserung (20.06.2026) — Qualitätsmängel behoben
Nach Rückmeldung (Beispiel ph-08 L7) gründlich überarbeitet:
- **Funktionsplotter neu geschrieben:** y-Achse skaliert sich jetzt **automatisch und stabil** passend zur Funktion (keine abgeschnittene Waagerechte mehr bei großen Werten); **Achsen sind beschriftet** (Zahlen + Einheiten an beiden Achsen); die Kurve wird sauber auf den Zeichenbereich **beschnitten**; Formel und aktuelle Werte stehen auf **getrennten Zeilen** (kein als „×" missverständlicher Trenn-Punkt mehr); „−0"-Anzeige und unnötiger Raum unter der Nulllinie entfernt.
- **„Wackeln" beim Schieben behoben (alle Widgets):** zentrale CSS-Regeln für `.lb-interaktiv` (feste Ziffernbreite, feste Mindestbreite der Wertanzeige, reservierte Höhe der Ergebniszeile). Messung: **0,0 px Layout-Versatz** beim Schieben (Funktionsplotter, Rechteck, Dreieck, Glocke).
- **zweistufig:** Schutz gegen `NaN`/leere Urne (Mindestanzahl Kugeln).
- **automat:** „Start"-Beschriftung überlappt nicht mehr die Selbstschleife.
- **Verifiziert:** Gate grün; alle 210 Parametersätze rendern fehlerfrei; Funktionsplotter über alle Formen (proportional/linear/quadratisch/Sinus/exponentiell …) visuell geprüft; Galerie aller Widgets kontrolliert.
- Geänderte Dateien: `assets/js/interaktiv/{funktionsplotter,zweistufig,automat}.js`, `assets/css/main.css`.

---
## Welle C (20.06.2026) — Spezial-Widgets gebaut & ausgerollt
**9 neue Spezial-Widgets**, jedes einzeln gegen Sollwerte geprüft, visuell kontrolliert und auf Extremwerte/Layout getestet:
- **stromkreis** (Ohm/Reihe/Parallel/Schalter), **optik** (Reflexion/Brechung/Linse), **welle** (Interferenz), **spektrum** (Wasserstoff-Linien/Balmer), **vektor2d**, **matrixabb** (Determinante), **vierfeldertafel**, **kreissektor**, **histogramm** (Binomial).
- Dabei einen **Vorzeichenfehler in der Linse** gefunden und behoben (reelles Bild zeigte aufrecht statt umgekehrt; virtueller „Lupe"-Fall jetzt mit divergierenden Strahlen + gestrichelter Rückverlängerung).
- **+38 Lektionen** → jetzt **249 Lektionen** mit Widget, **27 Widget-Typen**.
- Verifiziert: Gate grün; **alle 248 Parametersätze** rendern fehlerfrei (0 Konsolenfehler); 12 Spezial-Widget-Lektionen im echten Lernbüro geprüft (0 Fehler).

### Sichtungs-Stellen je Widget-Typ (Lernbüro → Kurs → Block → Lektion)
- **funktionsplotter** (111x): Physik · Klasse 8 -> Block „Masse und Kraft“ -> Lektion 2: „Masse und Gewichtskraft“ [proportional]
- **stromkreis** *(neu)* (13x): Physik · Klasse 8 -> Block „Widerstand und Schaltungen“ -> Lektion 2: „Die Reihenschaltung berechnen“ [reihe]
- **datenbalken** (10x): Mathematik · Klasse 6 -> Block „Statistische Kennwerte“ -> Lektion 1: „Daten sammeln und das arithmetische Mittel“
- **dreieck** (10x): Mathematik · Klasse 9 -> Block „Satz des Pythagoras“ -> Lektion 1: „Rechtwinklige Dreiecke kennen“
- **groessen** (9x): Mathematik · Klasse 5 -> Block „Größen und Einheiten“ -> Lektion 1: „Längen messen und umrechnen“
- **zweistufig** (9x): Mathematik · Klasse 8 -> Block „Mehrstufige Zufallsversuche“ -> Lektion 1: „Baumdiagramme für mehrstufige Versuche“
- **welle** *(neu)* (9x): Physik · Qualifikationsphase — Quantenobjekte -> Block „Quantenobjekte“ -> Lektion 3: „Photonen einzeln durch den Doppelspalt“
- **zahlenstrahl** (8x): Mathematik · Klasse 7 -> Block „Rationale Zahlen“ -> Lektion 1: „Negative Zahlen kennenlernen“
- **koerper** (8x): Mathematik · Klasse 10 -> Block „Körperberechnungen“ -> Lektion 1: „Prisma und Zylinder“ [zylinder]
- **glocke** (6x): Mathematik · Qualifikationsphase — Stochastik -> Block „Normalverteilung“ -> Lektion 1: „Von diskret zu stetig“
- **wurfparabel** (6x): Physik · Einführungsphase -> Block „Wurfbewegungen“ -> Lektion 1: „Das Überlagerungsprinzip“
- **rechteck** (5x): Mathematik · Klasse 5 -> Block „Körper und Figuren“ -> Lektion 4: „Rechteck und Quadrat“
- **bruchbalken** (5x): Mathematik · Klasse 6 -> Block „Bruchrechnung“ -> Lektion 1: „Was ein Bruch bedeutet“
- **energiekette** (5x): Physik · Klasse 9 -> Block „Energie quantitativ“ -> Lektion 4: „Energieerhaltung beim Umwandeln“
- **binaer** (4x): Informatik · Klasse 9 -> Block „Daten und Codierung“ -> Lektion 1: „Alles ist 0 und 1: das Bit“
- **automat** (4x): Informatik · Klasse 10 -> Block „Endliche Automaten“ -> Lektion 1: „Automaten im Alltag“
- **kreis** (4x): Mathematik · Klasse 9 -> Block „Kreisberechnungen“ -> Lektion 1: „Die Kreiszahl Pi und der Umfang“
- **optik** *(neu)* (4x): Physik · Klasse 6 -> Block „Spiegel, Linsen und Farben“ -> Lektion 1: „Reflexion: Licht wird zurückgeworfen“ [reflexion]
- **spektrum** *(neu)* (4x): Physik · Qualifikationsphase — Atomkern -> Block „Atomhülle“ -> Lektion 1: „Linienspektren — Fingerabdrücke der Elemente“
- **flaeche** (3x): Mathematik · Klasse 8 -> Block „Flächen- und Rauminhalte“ -> Lektion 1: „Das Parallelogramm – Fläche mit Höhe“ [parallelogramm]
- **caesar** (2x): Informatik · Klasse 10 -> Block „Verschlüsselung“ -> Lektion 7: „Die Caesar-Verschlüsselung“
- **vierfeldertafel** *(neu)* (2x): Mathematik · Klasse 9 -> Block „Vierfeldertafel und Baumdiagramme“ -> Lektion 2: „Tafel ausfüllen wie ein Profi“
- **vektor2d** *(neu)* (2x): Mathematik · Qualifikationsphase — Geometrie -> Block „Vektoren und Geraden“ -> Lektion 2: „Rechnen mit Vektoren“
- **histogramm** *(neu)* (2x): Mathematik · Qualifikationsphase — Stochastik -> Block „Binomialverteilung“ -> Lektion 4: „Erwartungswert und Standardabweichung“
- **kreissektor** *(neu)* (1x): Mathematik · Klasse 9 -> Block „Kreisberechnungen“ -> Lektion 4: „Kreisbogen und Kreisausschnitt“
- **einheitskreis** (1x): Mathematik · Klasse 10 -> Block „Sinusfunktion und periodische Vorgänge“ -> Lektion 1: „Vom Dreieck zum Einheitskreis“
- **matrixabb** *(neu)* (1x): Mathematik · Qualifikationsphase — Geometrie -> Block „Matrizen: Abbildungen und Prozesse“ -> Lektion 2: „Matrizen als Abbildungen der Ebene“
---
## Nachbesserung 2 (20.06.2026) — Trenner-Punkt + Abdeckung
- **„·"-Trenner zwischen Formel und Ergebnis entfernt** (alle Widgets): Formel und Ergebnis stehen jetzt auf getrennten Zeilen; „·" erscheint nur noch als Multiplikation in Formeln. (Betraf neue wie alte Widgets: stromkreis, optik, vektor2d, vierfeldertafel, kreissektor, histogramm, matrixabb, welle, datenbalken, dreieck, automat, caesar u. a.)
- **4 übersehene Treffer nachgetragen:** ph-07 Energieformen/-entwertung/-übertragung → Energiekette; ph-08 „Kräfte zusammensetzen" → Vektoren.
- **2 neue Spezial-Widgets** (auf Wunsch nur die saubersten): **strahlensatz** (zentrische Streckung; ma-09 l20–l24) und **hypothesentest** (Binomial mit Ablehnungsbereich + α; ma-qs l11–l15). Beide gegen Sollwerte geprüft (Streckung 4×/2,25×; α=0,021 etc.).
- **Stand jetzt: 263 Lektionen mit Widget, 29 Widget-Typen.** Gate grün; alle 262 Parametersätze rendern fehlerfrei.
- **Sichtungs-Stellen neu:** strahlensatz → Mathematik Klasse 9 → Block „Ähnlichkeit und Strahlensätze" → Lektion 1 „Zentrische Streckung". hypothesentest → Mathematik Q-Stochastik → Block „Hypothesentests" → Lektion 2 „Kritischen Bereich bestimmen".
- **Ehrliche Einordnung Abdeckung:** Die frühere Schätzung „~220" war eine zu großzügige Stichwort-Obergrenze; realistischer Deckel ~260–280. Der verbleibende Rest (ma-qg 3D-Geometrie, Halbleiter, Kernphysik-qualitativ, Hand-Konstruktionen, reine Rechenverfahren, Programmieren/Netzwerke/KI) bekommt bewusst kein Mini-Widget.

---
## Nachtrag: markov-Widget (20.06.2026)
- **markov** — Übergangsgraph (Markow-Kette): spaltenstochastische Matrix als Zustandsgraph (Kreise + Übergangspfeile mit Wahrscheinlichkeiten + Selbstschleifen), Verteilung schrittweise iterieren (v′ = M·v) mit Balken, gestrichelte Grenzverteilung (Fixvektor). 2 und 3 Zustände.
- Geprüft gegen Sollwerte: Fixvektor [[0,8;0,2],[0,3;0,7]] = (0,6; 0,4); 3-Zustand-Beispiel = (0,3; 0,5; 0,2) — nach 20 Schritten exakt erreicht.
- Zugeordnet: **ma-qg** Block „Matrizen" → l23 Übergangs-/stochastische Matrizen, l24 Mehrstufige Prozesse (Potenzen), l25 Fixvektor & Grenzverhalten.
- **Stand jetzt: 266 Lektionen mit Widget, 30 Widget-Typen.** ma-qg nun 6/25 (vektor2d, matrixabb, markov). Gate grün; alle 265 Parametersätze rendern fehlerfrei.
- Sichtungs-Stelle: Mathematik Q-Geometrie → Block „Matrizen: Abbildungen und Prozesse" → Lektion „Fixvektor und Grenzverhalten".
