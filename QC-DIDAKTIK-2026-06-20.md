# Didaktik- & Abbildungs-Audit Lernwelt

**Stand:** 20.06.2026 · **Auftrag:** vollständiger Didaktik-/Methodik-Check der gesamten Website; alle Abbildungen darauf prüfen, ob sie an ihrer Stelle etwas vorzeitig verraten, ob sie passen und gut verständlich sind. · **Modus:** prüfen **und** klare Mängel beheben.

## 1. Umfang (vollständig, keine Stichprobe)

| geprüft | Menge |
|---|---|
| Lernbüro-Einstiegsfiguren gegen ihre POE-Vorhersage | **573 / 573** (zwei unabhängige Durchgänge) |
| Lernbüro-Figuren in „verstehen" (Schritte/Darstellungen) gegen Folge-Checks | **399** |
| Erklärseiten (Mathe/Physik/Informatik) inkl. aller Inline-SVG | **97 Seiten / 174 SVG** |
| Lernbüro-Kurse didaktisch (POE-Logik, Phasen, Tipps, Sprache) | **24 / 24** (368 Mathe- + 239 Physik/Info-Lektionen) |

Geprüft wurde mit automatischer Figur-Extraktion (Vorhersage ↔ figurAlt ↔ SVG-Beschriftungen), je sechs bzw. vier Fachgutachter-Subagenten und Headless-Browser-Rendering der reparierten Figuren.

## 2. Gesamturteil

Die Lernwelt ist **didaktisch-methodisch auf sehr hohem, konsistentem Niveau.** Die POE-Klammer (Einstieg mit Vorhersage → Erarbeitung → namentliche Auflösung im „sichern"-Rückbezug) ist über **alle ~600 Lektionen** vorbildlich durchgezogen; Stolpersteine treffen echte Fehlvorstellungen, gestufte Tipps verraten nicht die Lösung, das „Vier-Sichtweisen"-Schema ist konsequent. Erklärseiten folgen sauber „Hinführung → Erarbeitung → Merksatz → Verständnis-Check".

Die **einzige systematische Lücke** lag genau bei dem, was Sie an der Energie-Lektion bemerkt haben: Eine Reihe von **Einstiegs-Abbildungen nahm die Antwort der Vorhersage vorweg** — die projekteigene „Kein-Spoiler-im-Einstieg"-Regel (LERNBUERO-3.0-LEITFADEN) war für den Einstiegs-*Text* durchgesetzt, aber bei mehreren *Figuren* (und ihren Alt-Texten) nicht. Diese sind jetzt behoben.

## 3. Behobene Abbildungs-Spoiler (Einstieg) — Figur **und** Bildunterschrift entschärft

Jeweils: revealing Wert/Label durch „?" ersetzt bzw. Vergleich/Ergebnis entfernt, Szenario erhalten, Auflösung bleibt im „sichern"-Rückbezug. Alt-Texte angeglichen.

**Mathematik**
- `ma-05/l2` Massen (Mehl): Vergleichsbalken (1 kg höher als 900 g) → zwei gleich große Packungen mit Werten 1 kg / 900 g.
- `ma-05/l3` Zeit (Filmdauer): Brücken „20 min + 1 h + 10 min" entfernt → „?". **Zusätzlich Inhaltsfehler behoben:** Figur zeigte 9:40–11:10 = 1 h 30, die Lösung nennt aber 1 h 35 → Ende auf 21:15 korrigiert (passt zum Rückbezug 19:40–21:15).
- `ma-05/l4` Geld (Wechselgeld): Brücken „70 ct + 3 €" + Zwischenmarke 7,00 € entfernt → „?".
- `ma-05/l25` gleicher Umfang/Fläche: „3·3=9" / „5·1=5" → „3 · 3" / „5 · 1".
- `ma-06/l10` Bruch/Dezimal: „drei Viertel = 0,75" → „= ?".
- `ma-06/l20` Uhrzeiger-Winkel: „90°" → „?".
- `ma-06/l2` Erweitern/Kürzen, `ma-06/l29` Diagramm-Achsen: nur Alt-Text verriet die Antwort → neutralisiert.
- `ma-09/l7` Streckfaktor a: Labels „a=2"/„a=0,5" an den fertigen Parabeln entfernt.
- `ma-ef/l2` Sekante→Tangente: vorgezeichnete „Tangente" + Label entfernt (nur wandernde Sekanten bleiben).
- `ma-ef/l17` Lagemaße: hervorgehobener „Median"-Punkt entschärft.
- `ma-qa/l31` Abkühlung (Tee): „Grenze 20 Grad C" → „Grenze = ?".
- `ma-qs/l9` Sigma-Regeln: „68 %" → „?".
- `ma-qs/l12, l15, l16` Hypothesentests: Alt-Texte beschrieben einen (im SVG gar nicht vorhandenen) eingefärbten Ablehnungsbereich und verrieten die Seite → an die echte Grafik angeglichen.

**Physik / Informatik**
- `ph-07/l6` Energie (Riegel/Akku): Vergleichsbalken → neutrale Gegenstände mit echten Werten ≈ 1000 kJ / ≈ 12 Wh (Ihr Wunsch).
- `ph-ef/l4` freier Fall: „treffen gleichzeitig auf" → „Boden".
- `ph-ef/l14` Wurfweite: Labels „45°" / „30°/60°" entfernt (Kurven bleiben unbeschriftet).
- `ph-08/l8` t-s-Diagramm: Mittelstück „Pause" → „?".
- `ph-qk/l3` Zerfallsgesetz: fertige Zerfallskurve mit 50 %/25 %-Marken auf den steilen Anfang gekürzt + „? wie geht es weiter?".
- `in-09/l7` Binärzahl 1011: „8 + 0 + 2 + 1 = 11" → „= ?" (Stellenwert-Gerüst bleibt).
- `in-10/l13` Bubble Sort: kompletter ausgerechneter Durchlauf → nur Startreihe „5, 3, 8, 1 → ?".

**Insgesamt 21 Einstiegsfiguren entschärft, alle im Browser gegengeprüft.**

## 4. Weiterer behobener Mangel (Struktur)

- `physik/klasse-6/licht-und-schatten/index.html`: fehlendes `</details>` schloss die **Schattenwerfer-Simulation samt iframe in den Verständnis-Check ein** (nur sichtbar, wenn man den Check aufklappt). `</details>` korrekt gesetzt — die Simulation steht jetzt eigenständig unter dem Check. (`<details>`/`</details>` jetzt 4/4.)

## 5. Bewusst belassen (grenzwertig / didaktisch gewollt) — dokumentiert, nicht „verschlimmbessert"

- `ma-10/l14` x² vs. 2ˣ: beide Kurven sichtbar; zum klaren Beschriften der Kurven nötig — Grenzfall, belassen.
- `ph-06/l3` Brechung: Figur zeigt den geknickten Lichtstrahl, aber der **Lektionstitel „Licht knickt ab" nennt die Antwort ohnehin** — Figurfix brächte wenig.
- `ph-ef/l11` Überlagerungsprinzip: physikalische Standard-Überlagerungsfigur ohne explizites Antwort-Label — vertretbar.
- `ph-qk/l5` (Bindungsenergiekurve) und `ph-10/l1` (Rutherford, **kontrafaktische** Vorhersage): das Lesen der Standardfigur **ist** das Lernziel bzw. erzeugt bewusst den kognitiven Konflikt.
- `ma-qg/l2` Matrizen: selbstcheck fragt eine Matrix ab, die zwei Blöcke darüber im Beispiel steht — milde Wiedererkennung statt Transfer.

## 6. Didaktische Feinschliff-Punkte (zur Entscheidung — Inhaltsautorenarbeit, daher nicht eigenmächtig geändert)

**Erklärseiten**
- `mathematik/klasse-10/sinusfunktion`: Der Riesenrad-Verständnis-Check (Höhe nach 3 min = 14 m) ist die Rechnung, die **drei Zeilen darüber** im Beispiel komplett ausgeschrieben steht → kein Transfer. Vorschlag: Frage variieren („nach 6 min?" / „wann erstmals 11 m?").
- Drei Klasse-5-Erklärseiten **ohne interaktives Element** (Definition of Done: ≥ 1): `daten-erheben-und-darstellen`, `flaecheninhalt-und-umfang`, `koerper-und-figuren`. Vorschlag: je eine Mini-Interaktion oder einen Lernspiel-Link ergänzen (Vorbild: `groessen-und-einheiten` → Einheiten-Meister).

**Lernbüro-Kurse**
- `ma-08/l2` & `ma-08/l3`: minicheck und selbstcheck stellen teils **wortgleiche** Fragen → eine Variante entkoppeln.
- `ma-ef/l2` (Lagemaße): Median wird nur an **ungerader** Anzahl geübt; der Fall „gerade Anzahl → Mittel der beiden mittleren Werte" fehlt als Übung.
- `ma-ef/l19` (Boxplot): Beispiel-Datensatz in Schritt 1 ≠ Datensatz der Darstellungs-Tabelle → auf **einen** Datensatz vereinheitlichen.
- `ma-ef/l23`: Lernziel/Einstieg kündigen „Optimierung" an, die in „verstehen" nicht vorkommt → ergänzen oder ankündigung streichen.
- `ma-qg/l5` (Lagebeziehungen): Übungsspur „standard" zieht `vg-005` (reines Skalarprodukt), „sichern" `vg-001` (allg. Grundlagen) — beide treffen das Lernziel nicht; durch echte Lagebeziehungs-Aufgaben ersetzen.
- `ma-qg/l3` (Übergangsmatrizen): Übergangsgraph zeigt nur die Wechselpfeile; die **Selbstschleifen 0,8 / 0,7** (Diagonale) fehlen.
- `ma-10/l1`: plakative Aussage „B überholt A" wird im 6-Monats-Zahlenbeispiel nicht eindeutig eingelöst → Rückbezug schärfen.
- Querschnitt (niedrige Priorität): `sichern.transfer` wiederholt mancherorts 1:1 den Rückbezug; die Basis-Spur ist vereinzelt nur 1 Aufgabe. Optional andere Zahlen/Kontexte bzw. Basis ≥ 2 Aufgaben.

## 7. Was ausdrücklich sehr gut ist
- **POE durchgängig:** Vorhersage mit Optionen → Erarbeitung → namentliche Auflösung im Rückbezug, über alle Kurse.
- **Keine Spoiler in der „verstehen"-Phase:** Jede Schritt-Figur steht bei ihrem **eigenen** (eingeklappten) minicheck; kein Vorgriff auf spätere Checks.
- **Erklärseiten:** fachlich korrekte, sauber per `aria-label` beschriftete SVG; Verständnis-Checks klappen die Antwort erst nach Klick auf; Sprache altersgemäß und ermutigend; Fachbegriffe konsistent; gA/eA-Abgrenzung sauber.
- **Figuren-Barrierefreiheit:** Alt-Texte fast durchgängig stimmig (die wenigen Ausreißer in §3 wurden korrigiert).

*Alle in §3–§4 genannten Änderungen sind im Browser verifiziert; das Master-Gate `check-website.py` läuft grün. Geänderte Dateien: `daten/kurse/ma-05/06/09/ef/qa/qs.json`, `ph-07/ef/08/qk.json`, `in-09/10.json`, `physik/klasse-6/licht-und-schatten/index.html`.*

---

## 8. Nachtrag (20.06.2026): Didaktische Feinschliff-Punkte umgesetzt

Alle in §6 zur Entscheidung gestellten Punkte wurden auf Wunsch umgesetzt und im Browser verifiziert (Gates grün, 0 JS-Fehler, 0 „Aufgabe nicht gefunden").

**Erklärseiten**
- `klasse-10/sinusfunktion`: Verständnis-Check geändert von „Höhe nach 3 min" (= die Rechnung direkt darüber) auf **„nach 9 min"** → $h(9)=8+6\sin(270°)=2\,$m. Erfordert jetzt echtes Rechnen mit $\sin(270°)=-1$ statt Wiedererkennen.
- **Drei Klasse-5-Seiten erhielten ein echtes interaktives Element:**
  - `daten-erheben-und-darstellen`: eingebettete Simulation **Glücksrad – relative Häufigkeit**.
  - `koerper-und-figuren`: eingebettete Simulation **Quader füllen**.
  - `flaecheninhalt-und-umfang`: neues **Inline-Widget** „Umfang und Fläche am Rechteck" — zwei Schieberegler (a, b) zeichnen das Rechteck live und zeigen $U=2(a+b)$ und $A=a\cdot b$ (browser-getestet: a=10, b=8 → U=36 cm, A=80 cm²).

**Lernbüro-Kurse**
- `ma-08/l2`: selbstcheck 3 war wortgleich zum minicheck → auf eine neue Steilheits-/Vorzeichenfrage ($m=2$ vs. $m=-3$) umgestellt.
- `ma-ef` Lagemaße (`l17`): Selbstcheck für den **Median bei gerader Anzahl** ergänzt ($3,5,8,10\to 6{,}5$) — der zuvor nie geübte Fall.
- `ma-ef` Boxplot (`l19`): Beispiel-Datensatz an Graph **und** Tabelle angeglichen (jetzt $2,5,5,7,9,9,12$ mit $Q_1=5$, $Q_3=9$) — drei Sichtweisen, ein Datensatz.
- `ma-qg` Lagebeziehungen (`l5`): themenfremde Übungs-IDs ersetzt — standard nutzt jetzt `vg-010` (Lagebeziehung untersuchen) statt `vg-005` (reines Skalarprodukt), sichern `vg-011` (Lagebeziehung, AFB III) statt `vg-001` (allg. Grundlagen).
- `ma-qg` Übergangsmatrizen (`l23`): **Selbstschleifen 0,8 (A) und 0,7 (B)** im Übergangsgraphen ergänzt (+ Alt-Text) — der Graph passt jetzt zur Matrix-Diagonale.
- `ma-qg` Matrizen-Abbildungen (`l22`): selbstcheck 1 fragte eine im Beispiel gezeigte Matrix ab → auf **Transfer** umgestellt (zentrische Streckung $\begin{smallmatrix}2&0\\0&2\end{smallmatrix}$).
- `ma-10/l1`: Rückbezug geschärft — die plakative Aussage „B überholt" wird jetzt korrekt eingelöst (B überholt nach **einigen weiteren Monaten**, nicht „schon einem").

**Nach Prüfung NICHT geändert (kein Mangel):**
- `ma-ef/l10b` „kündigt Optimierung an, verstehen deckt sie nicht ab": Es ist eine reine **Üben-&-Anwenden-Lektion**; ihre Übungsaufgaben (`ablr-207` Gehege, `ablr-302` Draht) üben Optimierung sehr wohl — die Ankündigung ist also korrekt.
- `ma-08/l3` „Redundanz": minicheck- und selbstcheck-Fragen sind inhaltlich verschieden (b-Ablesen vs. proportional/linear) — keine echte Dopplung.
- Querschnitt (transfer wiederholt teils den Rückbezug; Basis-Spur vereinzelt nur 1 Aufgabe): bewusst als kursweite, optionale Politik belassen — betrifft viele Lektionen und ist eine redaktionelle Grundsatzentscheidung.
