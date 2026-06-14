# RS-Klassenarbeiten — Fortschritt & offene Punkte

Ziel: Für **jede** Sek-I-Gym-Klassenarbeit eine gleichwertige **Realschul-Variante** (zweig `["rs"]`)
erzeugen und auf der Website einbinden. Stand siehe unten.

## Stand (Pause)
**Fertig & eingebunden (29 RS-Arbeiten Mathematik, inkl. Pilot):**
- Pilot: Mathe Kl. 6 Bruchrechnung
- Mathe Klasse 5 (6): natuerliche-zahlen, groessen-und-einheiten, koerper-und-figuren, symmetrien, flaecheninhalt-und-umfang, daten-erheben-und-darstellen
- Mathe Klasse 6 (6): brueche(=Pilot), dezimalzahlen, koerper-und-volumen, kreis-und-winkel, statistische-kennwerte, teilbarkeit-und-primzahlen
- Mathe Klasse 7 (6): dreiecke-und-konstruktionen, prozent-und-zinsrechnung, rationale-zahlen, terme-und-umformungen, zufall-und-wahrscheinlichkeit, zuordnungen

Alle in `daten/klassenarbeiten.json` registriert (zweig `["rs"]`), PDFs in `klassenarbeiten/pdf/ma-0X-rs-*.pdf`,
ODT-Quellen + Generator-Skripte in `0Ablage/`. check-website grün. (Physik hatte schon 10 RS-Arbeiten.)

## NOCH ZU BAUEN — 35 RS-Arbeiten
Vorgehen je Arbeit: Gym-Eintrag spiegeln (fach/stufe/titel/nr/thema EXAKT übernehmen), id/datei `-gym-`→`-rs-`,
zweig `["rs"]`. Arbeitszeit: Kl. 5–7 = 60 min, **ab Kl. 8 = 90 min**.

### Mathematik Klasse 8 (6) — 90 min
- ka-ma-08-gym-besondere-linien-im-dreieck
- ka-ma-08-gym-flaechen-und-rauminhalte
- ka-ma-08-gym-lineare-funktionen
- ka-ma-08-gym-lineare-gleichungssysteme
- ka-ma-08-gym-mehrstufige-zufallsexperimente
- ka-ma-08-gym-terme-und-binome
### Mathematik Klasse 9 (7) — 90 min
- ka-ma-09-gym-aehnlichkeit
- ka-ma-09-gym-pythagoras
- ka-ma-09-gym-quadratische-funktionen
- ka-ma-09-gym-quadratische-gleichungen
- ka-ma-09-gym-quadratwurzeln
- ka-ma-09-gym-trigonometrie
- ka-ma-09-gym-vierfeldertafeln
### Mathematik Klasse 10 (6) — 90 min
- ka-ma-10-gym-exponentielle-zusammenhaenge
- ka-ma-10-gym-koerperberechnungen
- ka-ma-10-gym-kreisberechnungen
- ka-ma-10-gym-periodische-vorgaenge
- ka-ma-10-gym-potenzen
- ka-ma-10-gym-zahlbereiche-grenzprozesse
### Informatik Klasse 9 (4) — 90 min
- ka-in-09-gym-computersysteme
- ka-in-09-gym-daten-und-codierung
- ka-in-09-gym-internet-und-datenschutz
- ka-in-09-gym-scratch  (titel „Programmieren mit Scratch")
### Informatik Klasse 10 (6) — 90 min
- ka-in-10-gym-automatisierung-und-ki
- ka-in-10-gym-calliope-binaer-netzwerke
- ka-in-10-gym-endliche-automaten
- ka-in-10-gym-steuern-und-regeln
- ka-in-10-gym-suchen-und-sortieren
- ka-in-10-gym-verschluesselung
### Physik (6)
- ka-ph-06-gym-licht-und-schatten  (Kl. 6 → 60 min)
- ka-ph-08-gym-elektrischer-strom  (90 min)
- ka-ph-09-gym-druck  (90 min; Gym-Eintrag hat thema=id, einfach spiegeln)
- ka-ph-09-gym-halbleiter  (90 min)
- ka-ph-10-gym-kreisprozesse  (90 min)
- ka-ph-10-gym-radioaktivitaet  (90 min)

## ERPROBTE PIPELINE (so wurden die 18 Mathe-Arbeiten gebaut)
1. **Vorlage:** `0Ablage/_gen_rs_brueche.py` (Pilot) als Strukturvorlage kopieren, nur Inhalt ersetzen.
   Skill: `.claude/skills/klassenarbeit/SKILL.md` + `references/` (odt_helpers.py, verify_solutions.py,
   document-structure.md, math-formatting.md, sketch-generation.md, kompetenz-matrix.md).
2. **Konventionen (CLAUDE.md):** NUR Version A; RS-Niveau (AFB I/II/III ≈ 30–40/45–55/10–15 %);
   50 BE; Noten 1–6; Eisbrecher; ein fett gesetzter Operator je Teilaufgabe + BE + AFB; kein Operator >2×;
   keine Aufgabe >25 % BE; ≥40–50 % Aufgaben mit Abbildung (Abbildung verrät nie die Lösung; EH zeigt Lösung).
   Frische Kontexte/Zahlen — NICHTS aus Gym-Arbeit oder Aufgaben-JSON kopieren.
3. **Rechenkontrolle Pflicht:** verify_solutions.SolutionVerifier (jedes EH-Ergebnis), check_be_sum=50,
   check_max_task_share≤25 %, check_time_budget≤85 % der Arbeitszeit → nur bei PASS finalisieren.
4. **Reihenfolge am Skriptende:** Inhalt → `repariere_layout(doc)` → `finalize_styles(doc)` → `doc.save(odt)`.
5. **PDF (eigenes soffice-Profil gegen Lock!):**
   `soffice --headless -env:UserInstallation=file:///tmp/lo_<id> --convert-to pdf --outdir /tmp/conv_<id> "<odt>"`
   dann `mv` nach `klassenarbeiten/pdf/<...-rs-...>.pdf`. Aufgabenteil ≤ 2 Seiten.
6. **Registry-Sidecar statt Direkt-Edit** (parallele Agenten!): jede Arbeit schreibt
   `0Ablage/_ka_reg/<rs-id>.json` mit dem vollständigen Eintrag. Zentrales Merge danach:
   ```
   python3 - <<'PY'
   import json,glob,os
   reg=json.load(open("daten/klassenarbeiten.json",encoding="utf-8")); arb=reg["arbeiten"]; ids={a["id"] for a in arb}
   for sc in sorted(glob.glob("0Ablage/_ka_reg/*.json")):
       e=json.load(open(sc,encoding="utf-8"))
       if e["id"] in ids or not os.path.exists(e["datei"]): continue
       gym=e["id"].replace("-rs-","-gym-"); idx=next((i for i,a in enumerate(arb) if a["id"]==gym),None)
       arb.insert(idx+1,e) if idx is not None else arb.append(e); ids.add(e["id"])
   reg["arbeiten"]=arb; open("daten/klassenarbeiten.json","w",encoding="utf-8").write(json.dumps(reg,ensure_ascii=False,indent=2))
   PY
   ```
   Danach `python3 werkzeuge/check-website.py` (muss „ALLES OK" zeigen).

## Lehren / Stolpersteine (für die nächsten Wellen)
- Pakete sind installiert: `odfpy`, `matplotlib`.
- matplotlib-mathtext kann **kein** `\rule`, `\square`, `\underline`, `\hphantom` → Lückenfelder als Klartext „________".
- Operator-Keys im Dict MIT Umlaut (`begründen`, `erklären`), sonst leere Operatorbeschreibung.
- Kein `\tfrac` (nur `\frac`/`\dfrac`), echte Umlaute ä ö ü ß überall im sichtbaren Text.
- Kopf zeigt „… Nr. 1A" (Versions-Suffix des Helpers) — bei allen bisherigen RS-Arbeiten so; EH-Titel ohne A.
  Falls einheitlich „Nr. 1" gewünscht: im Generator das Versions-Suffix entfernen (offene Designfrage).
- Minor: bei „ma-06-rs-teilbarkeit" trägt der Operator „Bestimme" 4× (statt ≤2×) — fachlich vertretbar,
  bei Bedarf nachschärfen.

## Optionaler weiterer Cleanup (nicht RS-KA, aber notiert)
- Einige ALTE Lernbüro-Aufgaben (-1xx) in Oberstufe (z. B. ph-qp-quantenobjekte) haben noch ASCII-Umlaute
  im sichtbaren Text (Altbestand, nicht vom aktuellen Ausbau berührt). Bei Gelegenheit site-weit nachziehen.
