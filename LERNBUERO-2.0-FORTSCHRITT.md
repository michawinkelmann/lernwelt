# Lernbüro 2.0 — Physik-Ausbau · Fortschritt & Übergabe

**Stand: 2026-06-18.** Diese Datei ist die Übergabe für die nächste Session. Sie beschreibt
das neue Lektionsformat, die didaktischen Leitprinzipien, den genauen Stand und die nächsten
Schritte. Zuerst lesen, dann am Referenzbeispiel orientieren.

## 1. Was ist „Lernbüro 2.0"?
Ausbau der Lernbüro-Lektionen (`selbstlernen/`) von einer dünnen Verstehensphase zu einer
geführten Lerneinheit. Renderer ist abwärtskompatibel: neue Felder erscheinen nur, wenn sie
in der Kurs-JSON gesetzt sind; bestehende Lektionen ohne die Felder rendern unverändert.

- **Renderer:** `assets/js/selbstlernen/kurs.js` (`rendereLektion` + `bauePhase`).
- **CSS:** `assets/css/selbstlernen.css` (`.lb-kompetenzen .lb-schritte .lb-schritt .lb-merksatz .lb-erkunden .lb-selbstcheck .lb-minicheck`).

### Neue Felder je Lektion (in `daten/kurse/ph-XX.json`)
- `l.kompetenzen = [{bereich, text}]` — Bereiche (KC Physik Nds): **Fachwissen, Erkenntnisgewinnung, Kommunikation, Bewertung**.
- `l.phasen.verstehen.text` — führender Einstiegssatz.
- `l.phasen.verstehen.schritte = [{titel, html, check:{frage, antwort}}]` — geführte Schritte mit aufklappbarem Mini-Check.
- `l.phasen.verstehen.merksatz` — HTML, Kernaussage.
- `l.phasen.verstehen.erkunden = [{typ:"simulation"|"experiment", titel, pfad?, material?, vorhersage, auftraege:[]}]` — POE (Vorhersagen→Beobachten→Erklären); `pfad` nur reale Sims/Experimente.
- `l.phasen.verstehen.selbstcheck = [{frage, antwort}]`.
- Alte Felder `verstehen.beobachtung` und `verstehen.sim` werden **entfernt** (durch obige abgedeckt).

## 2. Didaktische Leitprinzipien (WICHTIG — aus Nutzer-Feedback, in dieser Rangfolge)
1. **Qualität/Didaktik vor Länge. 90 min ist KEIN Ziel.** Nicht aufblähen. `dauer` = realistische Summe der Phasen (oft 40–65 min).
2. **Scope-Treue:** Übung/Sichern einer Lektion dürfen NUR Stoff verlangen, der bis dahin gelehrt wurde (kumulativ aus `l.ziele` der Lektionen 1..N). `ankommen` darf früheren Stoff auffrischen.
3. **Keine Wiederholungen — auch keine indirekten/sinngemäßen:** Jede Übung prüft eine ANDERE Facette/Kompetenz. Gleicher Kern, nur anders formuliert/Kontext/Typ = Wiederholung → entfernen. (Das automatische Gate erkennt nur exakte/Stamm-/Inhalts-Doppel — sinngemäße muss man selbst ausschließen.)
4. **„Sichern"** konsolidiert die EIGENEN Lernziele der Lektion (Synthese), 1–2 Aufgaben.
5. **Übung = wenige (typ. 3–6) DISTINKTE, gestufte Aufgaben** (basis/standard/plus). Übungs-/Anwendungslektionen (z. B. l5b/l10b) dürfen 6–7.
6. **Realistische Zeiten:** MC/Zuordnung/Lücke ~2–3 min, numerisch/rechenweg ~4–6 min, freitext ~4–5 min, verstehen ~12–20, ankommen ~3.
7. **Stromrichtung in Schaltbildern = Elektronenrichtung (− → +).** Bei Lorentz/Motor: linke-Hand-Regel + kurzer Hinweis auf die technische Gegenrichtung.

## 3. Referenz-Lektion (als Vorlage nehmen)
`daten/kurse/ph-07.json`, Lektion **`l1`** („Der Stromkreis als Kreislauf") — vollständig korrekt:
Verstehen 2.0 + 4 distinkte Übungen (geschlossener Kreis · Bauteile · Wasserkreislauf-Modell ·
„Strom nicht verbraucht") + 1 Sichern-Synthese + dauer 45 mit realistischen Zeiten.

## 4. Stand (Physik)
| Bereich | Stand |
|---|---|
| **ph-05, ph-06, ph-07** (36 Lekt.) | ✅ VOLLFORMAT FERTIG: Verstehen 2.0 + scope-kohärente, nicht-repetitive Übung + realistische Zeiten + Sichern. Geprüft (Gate 0, Refs intakt, check-website grün). |
| **ph-08, ph-09, ph-10** (54 Lekt.) | ✅ VOLLFORMAT FERTIG (2026-06-18): Verstehen 2.0 + Übung quality-kuratiert — Scope-Treue hergestellt, alle Lektion-übergreifenden Übungs-/Sichern-Wiederholungen entfernt, jede Hauptlektion ≥ 4 distinkte Übungen, Sichern-Synthesen. 60 neue lernbuero-Aufgaben (ph-08: 25, ph-09: 11, ph-10: 24). Schaltbilder Diode + Motor/Lorentz konvertiert. Gate 0 (in-Lektion/benachbart/fehlend), Refs intakt, check-website grün. |
| **Oberstufe** ph-ef, ph-qe, ph-qi, ph-qk, ph-qq, ph-qsw (89 Lekt.) | ✅ VERSTEHEN 2.0 FERTIG (2026-06-18): kompetenzen + verstehen (text, schritte mit Mini-Check, merksatz, erkunden/POE, selbstcheck) für alle 89 Lektionen, nach Referenz ph-07/l1; gA/eA beachtet. Übung war bereits nicht dünn. Gate 0, JSON valide, check-website grün. (Schaltbild magnetfelder-und-lorentzkraft noch offen, s. u.) |

### Schaltbilder auf Elektronenrichtung (− → +)
- ✅ `physik/klasse-5/stromkreise/`, `physik/klasse-7/stromstaerke-und-spannung/`, `physik/klasse-8/widerstand-und-schaltungen/`, `physik/klasse-9/halbleiter-und-elektronik/` (Diode/LED: Strompfeile im Durchlass-Stromkreis auf Elektronenrichtung gespiegelt, Caption + aria-label angepasst), `physik/klasse-10/motor-generator-energieversorgung/` (Motorprinzip: ⊙/⊗ jetzt Elektronenrichtung, Legende + aria-label + Prosa angepasst, Linke-Hand-Regel-Hinweis + Konventions-Hinweis ergänzt; Kräfte unverändert korrekt).
- ✅ `physik/qualifikationsphase/magnetfelder-und-lorentzkraft/` (2026-06-18): keine SVGs vorhanden → rein textliche Umstellung. Dreifingerregel auf **linke Hand** (Daumen = Elektronenbewegung − → +) umgestellt, Konventions-Hinweis (technische Stromrichtung + → − → rechte Hand) ergänzt; Lorentzkraft-Regel analog (Elektron: linke Hand, positive Ladung: rechte Hand); Aufgabe `ph-qp-mf-003` entsprechend angepasst. Physik/Kraftrichtung unverändert korrekt.
- ✅ Damit sind **alle** Strom-/Lorentz-Schaltbilder der Website auf Elektronenrichtung konsistent.

## 4b. Stand (Mathematik & Informatik) — Verstehen 2.0 (2026-06-18)
Site-weiter Ausbau mit parallelen Agenten (ein Agent je Kurs), nach Referenz ph-07/l1.
- **Mathematik** ✅ alle 10 Kurse fertig: ma-05 (36), ma-06 (35), ma-07 (34), ma-08 (36), ma-09 (41), ma-10 (36), ma-ef (24), ma-qa (37), ma-qg (30), ma-qs (25) — je Lektion `kompetenzen` (allgemeine math. Kompetenzen) + `verstehen` (text, schritte mit Mini-Check, merksatz, erkunden/POE, selbstcheck). Reine Übungslektionen: kompetenzen (+ knappe Synthese-Verstehensphase).
- **Informatik** ✅ beide Kurse fertig: in-09 (24), in-10 (36) — kompetenzen aus den prozessbezogenen KC-Informatik-Bereichen.
- **Umlaut-Konsistenz** ✅: ASCII-Transliterationen (fuer→für, loesung→Lösung, groesse→Größe …) in allen Verstehen-2.0/kompetenzen-Feldern site-weit korrigiert (nur Inhaltsfelder, keine Keys/Pfade/IDs; ~750 Stellen). Wenige seltene Resttreffer und korrekte Wörter (Koeffizient, Kongruenz, Caesar) unverändert.
- **Verifikation gesamt:** alle 24 Kurse JSON valide, `kompetenzen` auf jeder Lektion, kein `\tfrac`/`\mathbb`, Wiederholungs-Gate 0 (in-Lektion/benachbart/fehlend), `check-website.py` grün.
- **Offen / für die fachliche Endprüfung:** Die Verstehen-2.0-Inhalte der Oberstufen- und Mathe/Info-Kurse stammen aus Agenten-Läufen — bitte stichprobenhaft fachlich gegenlesen. In `ma-qg` sind l6–l20 (Agenten-Block) inhaltlich korrekt, aber teils knapper im Stil als l1–l5/l21–l25.

## 5. Werkzeuge / Pipeline
- **Wiederholungs-Gate:** `werkzeuge/check-wiederholungen.py` (läuft auch in `check-website.py`). Muss `in-Lektion=0, benachbart=0, fehlend=0` zeigen. Erkennt exakte ID-, Frage-Stamm- und Inhalts-Doppel.
- **Bereinigung Wiederholungen:** `werkzeuge/fix-wiederholungen.py` (Backup nach `0Ablage/_wdh_backup/`).
- **Gesamtcheck:** `werkzeuge/check-website.py` (Links/Pfade + Wiederholungs-Gate).
- **Aufgaben-Pools:** `daten/aufgaben/<thema>.json` und `daten/aufgaben/lernbuero/<thema>.json`. Referenz in Kursen: `{"quelle":"<thema>" oder "lernbuero/<thema>", "ids":[...]}`. Aufgaben-Schema: `id, typ (multiple-choice/luecke/zuordnung/numerisch/rechenweg/freitext), zweig, niveau (1–3), afb (1–3), frage, optionen|schritte|luecken|paare|eingaben, tipps[3], loesungsweg, kc`.
- **Sims:** `simulationen/physik/<name>/` · **Experimente:** `experimente/physik/<name>/`.

## 6. Gotchas (WICHTIG)
- **Write/Edit-Tools können große Dateien still abschneiden / Mount-Sync verzögern.** → Kurs-/Pool-JSON IMMER per Python (`json.load` → bearbeiten → `json.dump`) über die Shell schreiben, danach `json.load` + `check-wiederholungen.py` prüfen.
- Nach Aufgaben-Änderungen **Referenz-Integrität prüfen** (jede referenzierte id muss im Pool existieren).
- **Browser-Cache:** Änderungen an Erklärseiten erst nach Hard-Refresh (Strg+F5) sichtbar.
- Entfernte Aufgaben aus einer Lektion **nicht aus dem Pool löschen** (gehören evtl. in eine andere Lektion).

## 7. Nächste Schritte (Reihenfolge)
1. ✅ **ERLEDIGT (2026-06-18)**: ph-08/09/10 Übung quality-kuratiert (Scope, keine Wiederholungen, dünne Lektionen auf ≥ 4 distinkte Übungen angehoben, Sichern-Synthesen) + Schaltbilder Diode (ph-09) und Motor/Lorentz (ph-10).
2. **Oberstufe** (6 Kurse, 89 Lekt.) im Vollformat — das große verbleibende Paket. **Wichtig:** Die Übung ist dort NICHT dünn (Ø ~3,8/Lekt.), es fehlt vor allem **Verstehen 2.0** (0/89). Pro Lektion zu bauen: `kompetenzen`, `verstehen.text`, `verstehen.schritte` (mit Mini-Check), `verstehen.merksatz`, `verstehen.erkunden` (POE), `verstehen.selbstcheck` — nach Referenz `ph-07/l1`. Zusätzlich Übung-Feinschliff (Scope/Wiederholungen prüfen) und Schaltbild `magnetfelder-und-lorentzkraft`. Empfehlung: kurs­weise vorgehen (z. B. ph-qe → ph-qi → … → ph-ef), jede Lektion vollständig abschließen.
3. Abschluss-QA: `check-website.py` grün, Gate 0, Stichprobe rendern.

### Session-Log 2026-06-18 (Commit-Grundlage)
- **Geänderte Pools** (`daten/aufgaben/lernbuero/`): `ph-08-masse-und-kraft`, `ph-08-bewegung-und-diagramme`, `ph-08-widerstand-und-schaltungen`, `ph-09-energie-quantitativ`, `ph-09-halbleiter-und-elektronik`, `ph-10-atom-und-kernphysik`, `ph-10-motor-generator-energieversorgung`, `ph-10-thermodynamik-und-kreisprozesse`, `ph-10-beschleunigte-bewegung` (+60 neue Aufgaben).
- **Geänderte Kurse** (`daten/kurse/`): `ph-08.json`, `ph-09.json`, `ph-10.json` (Referenzen scope-/wiederholungsbereinigt; ph-09-Energieblock l1–l5 neu zugeordnet; ph-10 td-009 von l13→l14 verschoben).
- **Geänderte Erklärseiten**: `physik/klasse-9/halbleiter-und-elektronik/index.html` (Diode-Schaltbild), `physik/klasse-10/motor-generator-energieversorgung/index.html` (Motorprinzip-Schaltbild).
- **Verstehen 2.0 site-weit** (`daten/kurse/`): alle 6 Physik-Oberstufenkurse (ph-ef, ph-qe, ph-qi, ph-qk, ph-qq, ph-qsw), alle 10 Mathematik-Kurse (ma-05…ma-10, ma-ef, ma-qa, ma-qg, ma-qs) und beide Informatik-Kurse (in-09, in-10) erhielten `kompetenzen` + `verstehen` für jede Lektion. Anschließend site-weite Umlaut-Korrektur in allen Verstehen-2.0/kompetenzen-Feldern.
- **Hinweis Methodik:** Oberstufe + Mathe/Info via parallele Sub-Agenten erstellt (ein Agent je Kurs). Zwei Agenten brachen mit Netzwerkfehler ab (ma-08, ma-qg) und wurden gezielt fertiggestellt. Fachliche Endprüfung durch den Betreiber empfohlen.

### Aufgaben-Ausbau (Kompetenzbreite) — 2026-06-18
Auf Basis des `KC-PRUEFBERICHT-2026-06-18.md` (Hauptbefund: zu wenig Argumentieren/Bewerten) wurden site-weit **~382 neue Übungsaufgaben** ergänzt (parallele Agenten, ein Kurs je Agent, je Kurs nur die eigenen Themen-Pools → konfliktfrei):
- Pro Thema 1–2 **Begründungs-/Bewertungsaufgaben** (freitext/argumentative MC) + 1–2 Aufgaben eines je Lektion **unterrepräsentierten Typs** (zuordnung/reihenfolge/lücke/rechenweg/Modellieren); **b-Lektionen großzügiger**.
- Wirkung: Freitext-Anteil der referenzierten Aufgaben **~5 % → 7,4 %** (Worst Case ph-06: 1 % → 8 %); Themen ohne Argumentationsaufgabe **12 → 0** (real). Pool-Aufgaben gesamt jetzt **3320**.
- Verifiziert: Wiederholungs-Gate site-weit 0/0/0, `check-website.py` grün, kein `\tfrac`/`\mathbb`, neue Aufgaben transliterations-frei (echte Umlaute), `zuordnung`-Dropdowns ohne KaTeX.
- **Neue Pools** je Thema unter `daten/aufgaben/lernbuero/` (IDs ab 301/401); **alle 24 Kurs-JSON** mit neuen Referenzen.

### Offene Hygiene-Punkte (vorbestehend, niedrige Priorität)
- **`thema`-Feld uneinheitlich** (ASCII vs. Umlaut, z. B. `ph-07-stromstaerke` vs. `…stromstärke`; `ma-05-koerper`/`…körper`). Betrifft nur die Lernlandkarten-Gruppierung, keine Pfade/Referenzen (check-website grün). Sollte einmal auf die `themen.json`-Schreibweise (mit Umlaut) normalisiert werden.
- Fachliche Endprüfung der agenten-erstellten Verstehen- und Aufgaben-Inhalte (Stichprobe) steht beim Betreiber aus.

## 8. Sonstiges (in dieser Session ebenfalls abgeschlossen)
- 16 RS-Klassenarbeiten (Informatik 9/10 + Physik) gebaut & in `daten/klassenarbeiten.json` registriert (PDFs in `klassenarbeiten/pdf/`).
- Wiederholungs-System: `check-wiederholungen.py` + `fix-wiederholungen.py` gebaut, site-weite Bereinigung (sichtbare Wiederholungen 0), Gate in `check-website.py`.
- Spiele: Touch/PC-Eignung bewertet + Badges (`daten/spiele.json`, `daten/lernspiele.json`); zwei neue Pausenraum-Spiele „Kreide-Invasion" und „Papierflieger-Pilot".
