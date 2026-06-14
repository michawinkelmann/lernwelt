# Vorschlagsliste: neue Simulationen & Experimente

_Stand: Juni 2026. Grundlage: Abgleich aller 97 Themen in `daten/themen.json` gegen die 27 vorhandenen Simulationen (`simulationen/`) und 26 virtuellen Experimente (`daten/experimente.json`). Priorisiert nach didaktischem Mehrwert, mit Schwerpunkt auf praktisch-handelnden Themen (Elektrik, Magnetismus), wie gewünscht._

> **✅ VOLLSTÄNDIG UMGESETZT (Juni 2026):** Alle 17 vorgeschlagenen Simulationen sind gebaut, physikalisch/mathematisch geprüft (analytische Prüffälle, `validierung.html` 372/372 grün, Browser- und Mobiltest) und in die Website integriert: im **Sim-Katalog** (nach Fach gegliedert, mit Stufe-Badges — wie bei den Experimenten), per **iframe in den 17 Erklärseiten** und als **Simulations-Link in den zugehörigen Lernbüro-Lektionen**. Die gemeinsame Engine bekam dafür einen optionalen, abwärtskompatiblen Zeiger-Hook (`sim.zeiger`) für Bau-Sims (Stromkreis, Logik-Gatter, Magnetfeld). Verbleibend: nur noch die „zweite Welle" weiter unten.

## Zwei Produkttypen (zur Einordnung)

- **Simulation** — interaktives Modell über die gemeinsame Engine (`assets/js/sim/`, je Sim `sim.js` mit Manifest + `update()` + `zeichne()`): Parameter erkunden, Modellverhalten beobachten. Drei Modi: kontinuierlich, schrittweise, statisch-interaktiv.
- **Experiment (virtuelles Labor)** — nachgebildete Messapparatur (`experimente/<fach>/<name>/`): eigene Messreihe aufnehmen, mit Messunsicherheit/Statistik umgehen, ein Gesetz aus den **eigenen** Daten belegen. Betont ausdrücklich, dass es das reale Experiment nicht ersetzt.

Beides ist sinnvoll dort, wo im Unterricht real etwas aufgebaut/gemessen wird. Nicht jedes Thema braucht eine Sim — rein prozedurale oder reine Überblicksthemen (z. B. `ma-qp-q1/q2/q3`, Terme-Umformen) sind bewusst **nicht** in der Liste.

---

## Tier 1 — Elektrik & Magnetismus, Sek I (höchste Priorität, „selbst zusammenbauen")

### 1. ✅ Stromkreis-Baukasten · `ph-05-stromkreise` · Simulation (statisch-interaktiv) ★★★
Bauteile (Batterie, Schalter, Lämpchen, Kabel, Motor, Summer) auf ein Brett ziehen und verdrahten; Schalter schließen → Lämpchen leuchtet / Motor dreht. Erkennt **offenen Stromkreis** und **Kurzschluss**. Reihen- vs. Parallelschaltung sichtbar machen (zwei Lämpchen: parallel beide hell, in Reihe beide dunkel; eins herausdrehen → in Reihe alles aus, parallel leuchtet das andere weiter). Leiter/Nichtleiter-Test. **Genau der gewünschte „Schaltkreise selbst bauen und testen"-Kern.**

### 2. Magnetismus-Experimentierfeld · `ph-05-dauermagnete` · Simulation (statisch-interaktiv + kontinuierlich) ★★★
Stabmagnete frei verschieben/drehen; Feldlinien bzw. Eisenfeilspäne einblenden; Kompassnadel richtet sich dynamisch aus; Pole ziehen sich an/stoßen sich ab; Materialtest (Eisen, Holz, Alu) auf Magnetisierbarkeit; Erdmagnetfeld + Kompass. Konfigurationen selbst zusammenstellen.

### 3. Messen im Stromkreis · `ph-07-stromstaerke-und-spannung` · Experiment (virtuelles Labor) ★★★
Virtuelles Ampere- und Voltmeter richtig anschließen (A in Reihe, V parallel — der klassische Schülerfehler!). I und U in Reihen- und Parallelschaltung ablesen, Messreihe in Tabelle: I überall gleich vs. U teilt sich auf (Vorstufe Knoten-/Maschenregel). Schult die Labor-Grundfertigkeit „wo kommt welches Messgerät hin".

---

## Tier 2 — Elektrik/Elektromagnetismus, Mittel-/Oberstufe

### 4. Generator & Motor · `ph-10-motor-generator-energieversorgung` · Simulation ★★★
Drehbare Leiterschleife im Magnetfeld → induzierte Wechselspannung (von Hand drehen = schrittweise, oder angetrieben = kontinuierlich); U(t) als Sinus mitlaufen lassen. Umkehrung: Strom einspeisen → Schleife dreht (Motorprinzip). Optional Transformator (Windungsverhältnis → Spannungsverhältnis). Sehr häufig reale Demo im Unterricht.

### 5. Bauteil-Kennlinien & einfache Elektronik · `ph-09-halbleiter-und-elektronik` · Simulation/Experiment ★★
LED/Diode: I-U-Kennlinie (Durchlass/Sperrrichtung), mit Vorwiderstand → Helligkeit; NTC/LDR (temperatur-/lichtabhängig) schaltet einen Stromkreis. Brücke zu `in-10-steuern-und-regeln`.

---

## Tier 3 — Energie & Mechanik (praktische Demos)

### 6. Energiewandler mit Energiebalken · `ph-ep-energieerhaltung` · Simulation ★★
Achterbahn/Pendel/fallender Ball mit Live-Balken für kinetische/potenzielle/Gesamtenergie; Reibung zuschaltbar (Energie → Wärmebalken). POE: Wo ist v maximal?

### 7. Energiefluss & Wirkungsgrad · `ph-09-energie-quantitativ` · Simulation ★
Sankey-artige Energieflussdiagramme (Kraftwerk, Lampe), Wirkungsgrad ablesbar. Alternativ Energiebalken aus (6) wiederverwenden.

---

## Tier 4 — Mathematik mit hohem Visualisierungswert

### 8. ✅ Riemann-Summen · `ma-qp-integralanwendungen` · Simulation ★★★
Rechtecke unter der Kurve, Schieberegler n → Konvergenz gegen das Integral; Unter-/Obersumme. Klassiker, sehr anschaulich.

### 9. Normalverteilung interaktiv · `ma-qp-normalverteilung` · Simulation ★★★
μ/σ-Schieberegler verformen die Glockenkurve; P(a≤X≤b) schraffieren; σ-Regeln (68/95/99,7 %).

### 10. Matrix als Abbildung · `ma-qp-matrizen` · Simulation ★★★
2×2-Matrix auf Figur/Gitter anwenden → Drehung, Streckung, Scherung, Projektion sichtbar; Determinante = Flächenfaktor. Macht ein abstraktes Thema greifbar.

### 11. Transversalen im Dreieck · `ma-08-besondere-linien-im-dreieck` · Simulation ★★
Eckpunkte ziehen; Umkreis-/Inkreismittelpunkt, Schwerpunkt, Höhenschnittpunkt, Euler-Gerade live.

### 12. Bruch-Werkstatt · `ma-06-brueche` · Simulation ★★
Bruchstreifen/-kreise; gleichwertige Brüche, Addition/Subtraktion mit Hauptnenner visuell, Vergleich. Sehr visuell für Kl. 6.

### 13. Symmetrie-Werkstatt · `ma-05-symmetrien` · Simulation ★
Spiegelachsen & Drehsymmetrie; man zeichnet, die Spiegelung wird ergänzt; Symmetrietest.

### 14. 3D-Geometrie-Betrachter · `ma-qp-vektoren-und-geraden` / `ma-qp-ebenen-im-raum` · Simulation ★★ (höherer Aufwand)
Drehbare 3D-Ansicht von Vektoren, Geraden, Ebenen + Schnittlagen. Hoher Wert (Raumvorstellung), aber 3D-Rendering = mehr Aufwand.

---

## Tier 5 — Informatik (das „Bauen & Testen" als CS-Pendant)

### 15. Logik-Gatter-Baukasten · `in-09-computersysteme` · Simulation (statisch-interaktiv) ★★
Schaltungen aus UND/ODER/NICHT/XOR + Schaltern + Lampen bauen; Wahrheitstabelle füllt sich automatisch; Halbaddierer zusammenbauen. Direktes Pendant zum Stromkreis-Baukasten.

### 16. Regelkreis-Simulation · `in-10-steuern-und-regeln` · Simulation ★★
Thermostat/Linienfolger: Sensor → Steuerung → Aktor als Schleife; Zweipunktregler, Temperatur pendelt um den Sollwert. Passt zum Calliope-Lernfeld.

### 17. Entscheidungsbaum / Perzeptron · `in-10-automatisierung-und-ki` · Simulation ★
Punkte setzen, einfachen Klassifikator „trainieren" (Trennlinie) oder Entscheidungsbaum durchlaufen. Entmystifiziert ML.

---

## Weitere sinnvolle Kandidaten (zweite Welle)
`ma-08-lineare-gleichungen-und-systeme` (grafischer Schnittpunkt zweier Geraden) · `ma-08-binomische-formeln` ((a+b)² als Flächenpuzzle) · `ma-06-statistische-kennwerte` (Daten ziehen → Mittelwert/Median wandern) · `ma-06-kreis-und-winkel` (virtuelles Geodreieck) · `ma-09-vierfeldertafel-und-baumdiagramme` (interaktiver Wahrscheinlichkeitsbaum) · `ma-qp-wachstumsmodelle` (exponentiell vs. logistisch) · `ph-qp-atomhuelle` (Energieniveaus & Spektrallinien — ergänzt das vorhandene Franck-Hertz-Experiment).

---

# Einschätzung: Opus 4.8 vs. Fable 5 — gleich gutes Ergebnis?

**Kurzantwort: Für die allermeisten der oben vorgeschlagenen Sims/Experimente: ja, gleichwertig.** Der entscheidende Qualitätstreiber ist hier weniger das Modell als der bereits etablierte Rahmen — und der bleibt gleich.

### Warum gleichwertig erreichbar ist
- **Die schwere Architekturarbeit ist erledigt.** Gemeinsame Engine (771 Zeilen), das Muster Manifest + `update()` + `zeichne()`, Beamer-Modus, CSV-Export, URL-Hash-Zustand, `prefers-reduced-motion` — neue Sims folgen einer klaren Vorlage. Genau solche gut spezifizierten, schablonierten Aufgaben liegen Opus 4.8 sehr gut.
- **Korrektheit ist überprüfbar, nicht Geschmackssache.** Jede der 27 vorhandenen Sims hat analytische Prüffälle (`pruefFaelle`), und `simulationen/validierung.html` muss alle ✓ zeigen. Dazu die Browser-Testsuite (`werkzeuge/browser-tests/`). Damit lässt sich „ist die Physik richtig" objektiv prüfen — unabhängig vom Modell. Opus kann gegen diese Fälle selbst testen und nachbessern.
- **Die Fachinhalte sind Standard-Curriculum.** Harmonischer Oszillator, Kinematik, Stromkreise, Optik, Felder, Riemann-Summen, Normalverteilung — das beherrscht Opus 4.8 zuverlässig. Die didaktischen Texte (POE-Frage, Beobachtungsaufträge, Modellgrenzen) verlangen gutes deutsches Fachschreiben; auch das ist eine Stärke.

### Wo unabhängig vom Modell mehr Iteration nötig ist (ehrliche Vorbehalte)
- **Offene „Bau"-Oberflächen** (Stromkreis-Baukasten, Logik-Gatter, 3D-Betrachter) sind weniger Physik- als Interaktionsdesign-Aufgaben: Verdrahtungslogik, Treffer-Erkennung, Kurzschluss-/Schleifen-Erkennung, Touch-Bedienung. Das braucht mehr Test-Durchläufe und visuelle Kontrolle — bei jedem Modell.
- **3D-Darstellung** (Vektoren/Ebenen) und **numerisch heikle Systeme** brauchen sorgfältigere Validierung.
- **„Gleich gut" entsteht im Prozess, nicht per Knopfdruck.** Der Unterschied zwischen ordentlich und exzellent liegt im Loop aus Prüffällen + Screenshot-Sichtung + Mobil-/Beamer-Test. Dieser Loop ist hier eingerichtet — er muss konsequent gefahren werden.

### Was ich nicht seriös behaupten kann
Einen direkten Kopf-an-Kopf-Vergleich Fable 5 vs. Opus 4.8 an *genau dieser* Codebasis habe ich nicht gemessen. Die belastbare Aussage ist: Die bestehenden (mit Fable 5 erstellten) Sims setzen einen hohen, klar definierten Standard, und dieser Standard ist mit Opus 4.8 + vorhandener Validierung reproduzierbar.

### Empfehlung
**Pilot bauen statt diskutieren.** Ich setze 1–2 Stück mit Opus 4.8 um — Vorschlag: **Stromkreis-Baukasten** (Tier 1, die anspruchsvolle Bau-Oberfläche) plus eine Mathe-Sim wie **Riemann-Summen** oder **Normalverteilung** (saubere Analytik-Prüffälle). Dann vergleichst du direkt mit deinen bisherigen Sims. Fällt der Pilot überzeugend aus, arbeite ich die Liste Tier für Tier ab — jeweils mit Prüffällen, `validierung.html`-Eintrag und Mobil-Test als Definition of Done.
