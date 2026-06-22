# Widget-Passungs-Audit — gesamtes Lernbüro (22.06.2026)

Geprüft wurde **jedes** Mini-Widget **jeder** Lektion (255 Widgets) einzeln gegen Thema + Lernziele
der Lektion und gegen das, was davor/danach kommt. Quelle: Kurs-JSONs + Widget-Quellcode.
**Ergebnis: ~201 passen, ~54 markiert.** Reihenfolge = Unterrichtsfolge (Blöcke).

Legende: **FEHLER** = falsche/inkonsistente Darstellung · **MISMATCH** = zeigt ein anderes Thema ·
**VORGRIFF** = zeigt Stoff einer späteren Lektion · **SCHWACH** = nur lose/teilweise passend ·
**SYMBOL** = Reglerbeschriftung ≠ angezeigte Formel.

---

## A. Echte Fehler (Darstellung falsch/inkonsistent) — unabhängig von Didaktik behebenswert

1. **ph-ef · l3 «Die gleichmäßig beschleunigte Bewegung»** — funktionsplotter. `form=quadratisch` ohne `fix` → Default b=1, gezeichnet wird `a·t² + t`, angezeigt `s = ½·a·t²`. Bei t=10 zeigt der Graph 110 statt 100 (falscher Linearterm). → **Vorschlag:** `"fix":{"b":0,"c":0}` ergänzen (wie l4/l10 schon korrekt).
2. **ph-ef · l5 «Anwendung: Der Anhalteweg»** — funktionsplotter, gleicher Bug: `a·v² + v` statt `(1/(2a))·v²` (v=10 → 15 statt 5 m). → **Vorschlag:** `"fix":{"b":0,"c":0}`.
3. **ma-09 · l13 «Die p-q-Formel»** — funktionsplotter. Trotz Formel `x²+p·x+q` gibt es einen Regler `a[-2..2]`; mit a≠1 weicht die Kurve von der Formel ab. (+ MISMATCH, s. B). → **Vorschlag:** `a` fixieren (`fix:{a:1}`), nur p,q.
4. **ma-09 · l14 «Lösungen sichtbar machen»** — funktionsplotter (Typ hier richtig), aber derselbe überzählige `a`-Regler widerspricht der Formel `x²+p·x+q`. → **Vorschlag:** `fix:{a:1}`, nur p,q.

---

## B. MISMATCH — Widget zeigt ein anderes Thema als die Lektion

- **ma-09 · l9 «Quadratische Ergänzung»** — funktionsplotter (scheitel). Lektion = reine Term-Umformung (Normalform→Scheitelform); das Widget zeigt nur eine fertige Scheitelparabel, nicht die Umformung. *(Dein Beispiel.)* → kein Graph-Widget; term-orientiertes Element oder entfernen.
- **ma-09 · l30 «Zwei Merkmale, eine Tabelle»** — zweistufig (Baumdiagramm), obwohl die Lektion die **Vierfeldertafel** aufbaut. → auf `vierfeldertafel` umstellen (gibt es, in l31/l32 genutzt).
- **ma-ef · l1–l6, l9 (Analysis)** — überall der Parabel-funktionsplotter, der das jeweilige Konzept gar nicht zeigt: l1 Sekantensteigung (keine Sekante), l2 Sekante→Tangente (kein h-Grenzübergang), l3 Ableitung an einer Stelle (keine Tangente), l4 Ableitungsfunktion (kein f′-Graph), l5/l6 Ableitungsregeln (reine Termarbeit), l9 Krümmung/Wendepunkte (Parabel hat keinen Wendepunkt). → echte Sekanten-/Tangenten-/f′-Widgets nötig (Neubau) oder Widgets dort entfernen.
- **ma-qa · l12 e-Ableitung, l13 ln, l14 Kettenregel, l15 Kurvenuntersuchung** — funktionsplotter `exponentiell` zeigt immer nur `a·b^x` (die `formel`-Beschriftung ändert die Kurve nicht). ln wird gar nicht gezeichnet; Ableitung/Kettenregel/Extremstellen sind nicht darstellbar. → kein Widget bzw. Spezialwidget; Beschriftung nicht „ln/Kettenregel" vortäuschen.
- **ma-qs · l14 «Fehler 1. und 2. Art»** — hypothesentest zeigt nur den Ablehnungsbereich/α (Fehler 1. Art); Fehler 2. Art (β, Alternativverteilung) fehlt komplett. → erweitertes Widget mit zweiter Verteilung + β-Fläche, sonst entfernen.
- **ph-qq · l3, l7, l8, l9, l10** — welle zeigt nur generische Zwei-Wellen-Überlagerung (φ→Amplitude), aber: l7 braucht Doppelspalt-Geometrie (g·sinα=k·λ), l8 Schirm/λ-Messung, l9 Gitter-Schärfung, l10 dünne Schichten/Einzelspalt, l3 **Einzelphotonen-Statistik** (Widget zeigt sogar das Gegenteil – klassisches Wellenbild). → geometriespezifische Widgets oder entfernen; Titel nicht „Doppelspalt/Gangunterschied" nennen.
- **in-10 · l19 «Die Übergangstabelle»** — automat zeigt ein Zustandsdiagramm + Wortlauf (identisch zu l18), aber **keine Übergangstabelle**. → echte Übergangstabelle einbinden oder Widget erweitern; mindestens anderen Automaten als l18.

---

## C. VORGRIFF — Widget zeigt Stoff einer späteren Lektion

- **ma-07 · l11 «Terme mit Variablen»** — linear-Plotter mit a- UND b-Regler (`y=a·x+b`) nimmt die lineare Funktion (Klasse 8) vorweg; Lektion will nur Termwert durch Einsetzen. → b entfernen / Termwert-Rechner statt Graph.
- **ma-08 · l2 «Die Steigung m»** — m- und b-Regler; b (y-Achsenabschnitt) ist Thema der direkt folgenden l3. → b fixieren, nur m.
- **ph-07 · l2 «Stromstärke I», l3 «Spannung U», l4 «Reihen-/Parallelschaltung»** — stromkreis `ohm`/`reihe` zeigt Widerstand + ohmsches Gesetz / Rges=R1+R2; Widerstand/Ohm kommen erst in Klasse 8 (ph-08). l4 ist sogar ausdrücklich „ohne Rechnen". → auf `modus:"schalter"` umstellen oder Widget entfernen.
- **ma-qs · l6 «Von diskret zu stetig»** — glocke führt NV + 68/95 schon vollständig vor (Thema l7/l9). → Übergangs-Widget (Histogramm→Glocke) oder hier weglassen.
- **ma-qs · l11 «Hypothesen aufstellen»** — hypothesentest zeigt bereits den kritischen Bereich (Thema l12). → für l11 ohne markierten Bereich / Widget nach l12.
- **ma-qg · l2 «Rechnen mit Vektoren»** — vektor2d gibt zusätzlich Skalarprodukt + Winkel aus (Thema l3). → für l2 ohne Skalarprodukt/Winkel.

---

## D. SCHWACH / Teilabdeckung

- **ma-05 · l8 «Vergleichen, ordnen, runden»** — zahlenstrahl bis 1000/Schritt 50 deckt das Runden auf Tausender nicht ab. → Bereich erweitern (z. B. bis 5000, Schritt 1000).
- **ma-07 · l10 «Proportional, antiproportional oder keins?»** — zeigt nur den proportionalen Fall (Kontrast fehlt); negatives k verwirrt im Sachkontext. → k≥0; idealerweise beide Kurventypen.
- **ma-08 · l5 «Nullstelle und Schnittpunkt zweier Geraden»** — nur eine Gerade; Schnittpunkt **zweier** Geraden nicht darstellbar. → Zwei-Geraden-Widget oder Widget weglassen (Nullstelle bleibt).
- **ma-09 · l11 «Was ist eine quadratische Gleichung?»** — 3-Regler-Graph, lose (Thema ist die Gleichung/Diskriminante, nicht der Graph). → Fokus auf x-Achsen-Schnitte/Diskriminante oder weglassen.
- **ma-ef · l7 Tangente (Gerade ohne Kurve), l8/l11/l13 (Konzeptlücke + SYMBOL).** → s. E / Konzept.
- **ma-qa · l17 «Wachstumsgeschwindigkeit N′», l19 «Modell wählen»** — exponentiell-Plotter zeigt nur N(t) bzw. nur das exponentielle Modell (begrenzt/logistisch fehlt). → Vergleichs-/N′-Widget oder weglassen.
- **ma-qs · l2 Bernoulli (Baum ohne Binomialkoeffizient), l8 normCDf (kein freies Intervall), l10 Normalnäherung (kein Histogramm-Bezug).** → s. Vorschläge je Fall (Intervall-/Histogramm-Widget).
- **ma-qs · l12 «Kritischen Bereich bestimmen»** — Lektion nennt rechtsseitigen Test (P(X≥c)), Widget steht auf `modus:"links"`. → `modus:"rechts"`.
- **ph-08 · l15 «Gemischte Schaltungen»** — nur reine Reihenschaltung statt gemischt. → nachrangig.
- **ph-qsw · l4 «Harmonische Schwingung»** — Regler „Perioden" statt physikalischem ω (Achse „ωt in Grad"). → Regler ω (rad/s), Achse t in s.
- **ph-qq · l6 «Youngs Experiment»** — welle inhaltlich vertretbar (Superpositionsprinzip), aber Titel „Doppelspalt" irreführend. → Titel entschärfen.
- **in-10 · l16 «Automaten im Alltag»** — Beispielwort endet „abgelehnt ✗", was beim Einstieg irritiert. → Beispielwort wählen, das akzeptiert endet.

---

## E. SYMBOL-Mismatch (Regler-Symbol ≠ angezeigte Formel) — kleiner JSON-Fix, hohe Klarheit

Der dritte/letzte Regler heißt anders als in der Formel — Schüler sehen z. B. „c"-Regler unter „+ d"-Formel:
- **ma-10 · l22, l23, l24, l25** (Sinus): Regler `c` ↔ Formel `d`. Besonders l24 «Die Parameter a, b und **d**» widerspricht dem Regler „c" direkt. → `sym:"c"` → `"d"`.
- **ma-10 · l14** (Potenz): Exponenten-Regler `b` ↔ Formel `n`. → `sym:"n"`.
- **ma-ef · l13** (Potenz): `b` ↔ `n`. **l8** (Scheitel): `b,c` ↔ `d,e`. **l7/l11** (linear): `a` ↔ `m`. → Symbole angleichen.

---

## F. Kleinigkeiten
- **ma-ef · l9**: Widget-Titel „Krummung" → „Krümmung".
- **ph-qq welle-Titel** (l6–l10): versprechen Geometrie, die das Widget nicht zeigt → auf „Zwei Wellen überlagern" zurücknehmen.

---

## Schwerpunkte (woran man am meisten gewinnt)
1. **Analysis ma-ef l1–l6/l9 und ma-qa l12–l15**: Der generische funktionsplotter trägt das Ableitungs-/e-Funktions-Thema nicht — hier bräuchte es echte Sekanten-/Tangenten-/f′- bzw. ln-Widgets, sonst besser kein Widget.
2. **ph-qq Interferenz (welle 5×)**: braucht geometriespezifische Widgets.
3. **4 echte Fehler (A)** + **Symbol-Mismatch (E)**: schnell behebbar, klar.
4. **VORGRIFFE (C)**: meist 1-Zeilen-Fix (Modus/`fix`/Regler entfernen).
