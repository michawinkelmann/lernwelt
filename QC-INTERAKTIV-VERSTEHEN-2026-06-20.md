# Interaktive Elemente direkt im „verstehen"-Block — Machbarkeit & Plan

**Stand:** 20.06.2026 · **Auftrag:** prüfen, ob interaktive Elemente (falls vorhanden) **zusätzlich** direkt im verstehen-Block erscheinen können (Erklärseite bleibt unverändert). **Nur Bericht, nichts geändert.**

## Kurzantwort

Ja — technisch sauber machbar und didaktisch sinnvoll, aber **mit Maß**. Wichtige Einschränkung vorab: Es gibt aktuell **genau ein** echtes interaktives JS-Widget auf allen 118 Erklärseiten (der Rechteck-Schieberegler in *ma-05 flaecheninhalt-und-umfang*). Der eigentliche Wert der Aufgabe liegt also weniger im „die vielen Widgets zurückholen", sondern darin, **die Mechanik einmal sauber zu bauen**, damit eingebettete Widgets ab jetzt automatisch im verstehen-Block erscheinen.

## Was „interaktive Elemente" hier konkret sind (Bestandsaufnahme)

Beim Durchsehen aller Erklärseiten zerfallen die „interaktiven" Inhalte in drei Klassen:

1. **Aufklapp-Checks (`<details>`) und SVG-Skizzen** — auf vielen Seiten. Das sind die häufigsten „interaktiven" Elemente. **Sie sind im verstehen-Block bereits vorhanden** (als `minicheck`/`selbstcheck` bzw. als `figur`/`darstellungen`). Hier fehlt also nichts.
2. **Vollständige Simulationen** (eigene Engine, eigene Seiten unter `simulationen/`). Aus dem verstehen-Block sind sie über die **„erkunden"-Karten verlinkt** (≈ 65 Karten zeigen auf echte, existierende Sims) — und auch von den Erklärseiten. Sie sind also **nicht** „nur auf der Erklärseite", aber sie werden **verlinkt, nicht eingebettet**.
3. **Inline-JS-Widgets auf der Erklärseite** (Schieberegler + Live-SVG): **genau 1 Stück** — `mathematik/klasse-5/flaecheninhalt-und-umfang` („Selbst ausprobieren: Umfang und Fläche am Rechteck"). **Das** ist das, was der verstehen-Block heute nicht zeigt.

Der verstehen-Block hat unten den Knopf *„Ausführliche Erklärseite mit interaktiven Elementen öffnen ↗"* — dieser Satz erweckt den Eindruck, alle interaktiven Dinge lägen drüben. Tatsächlich ist es das oben beschriebene Bild.

## Technische Machbarkeit

**Knackpunkt:** Der verstehen-Block wird aus dem Kurs-JSON per `innerHTML` aufgebaut. **In `innerHTML` eingefügte `<script>` laufen nicht** — man kann Widget-HTML also nicht einfach in ein JSON-Feld kippen. Das ist der Grund, warum das Widget bisher nur auf der (statischen) Erklärseite funktioniert.

**Aber:** `kurs.js` baut interaktive DOM bereits **programmatisch** (die Vorhersage-Knöpfe im Einstieg, die Ampel). Genau dieser Weg trägt auch hier. Sauberer Plan ohne Doppelpflege:

- **Kleines Widget-Register** anlegen: `assets/js/interaktiv/` mit je einem ES-Modul pro Widget, das eine Funktion `mount(container)` exportiert (baut Regler + SVG, hängt die Event-Listener selbst an).
- **Eine Quelle für beide Orte:** Die Erklärseite importiert dieses Modul und ruft `mount(...)`; `kurs.js` importiert dasselbe Modul im verstehen-Block. Kein doppelter Code, keine Divergenz.
- **Neues JSON-Feld** im verstehen, z. B. `"interaktiv": "flaeche-rechteck"` (oder die vorhandene `erkunden`-Karte um ein optionales `einbetten` ergänzen). `kurs.js` rendert daraufhin eine Karte **„🔬 Selbst ausprobieren"** und mountet das Widget hinein.
- **Widget instanz-fähig machen:** Die aktuelle Version nutzt globale IDs (`fu-a`, `fu-svg` …). Für Mehrfach-Einbettung muss `mount` seine Elemente lokal im Container suchen/erzeugen (kein `getElementById`). Kleiner, klarer Refactor.

Passt vollständig zu den harten Projektregeln: nur HTML/CSS/Vanilla-JS-Module, **kein Build**, **relative Pfade**, **keine externen Requests**, datengetrieben über JSON.

Bewusst **nicht** empfohlen:
- **`<iframe>` der Erklärseite** — funktioniert, ist aber klobig (Höhe/Resize, Theming, Extra-Request, Dark-Mode) und bricht die schlanke Optik.
- **Volle Simulationen inline in verstehen** — schwergewichtig (Engine + Canvas + Bedienleiste + Validierung). Die bestehende Verlinkung über „erkunden" ist hier didaktisch völlig in Ordnung; eine Inline-Einbettung könnte man später optional ergänzen, gehört aber nicht in diesen ersten Schritt.

## Didaktisch / methodisch

**Dafür:** Der verstehen-Block ist der Ort der Begriffsbildung. Ein kompaktes „Selbst ausprobieren" (Variieren → Beobachten → Schließen) gehört genau dorthin und spart den Kontextwechsel/Absprung auf eine zweite Seite. Es fügt sich nahtlos in die schon vorhandene POE-Logik („erst schätzen" im Einstieg, „erkunden"-Karten) ein.

**Mit Maß:** Der ganze Umbau zielte auf einen **schlanken** verstehen-Block. Deshalb:
- nur das **kompakte** Widget einbetten, **nicht** die ganze Erklärseite spiegeln,
- standardmäßig **einklappbar** (`<details>`-Karte „🔬 Selbst ausprobieren"), damit der Lesefluss schlank bleibt,
- den **Erklärseite-Knopf behalten** — er bleibt der Ort für die ausführliche Fassung.

Fazit: sinnvoll, solange es ein fokussiertes Mini-Werkzeug bleibt und den Block nicht wieder zutextet.

## Wo es zutrifft

- **Heute real: 1 Lektion.** Das Rechteck-Widget gehört in den verstehen-Block von **ma-05 / L22 „Der Flächeninhalt"** (optional auch L21 „Umfang", da U und A dort gemeinsam auftreten). Die übrigen Lektionen dieses Themas (L23–L25) brauchen es nicht.
- **Alles andere** ist entweder schon im verstehen (Checks/SVG) oder bewusst verlinkt (Sims). Es gibt also nichts „Verstecktes" zurückzuholen außer diesem einen Widget.
- **Künftig:** Sobald das Register steht, erscheint **jedes neue** eingebettete Widget automatisch im verstehen-Block (nur `"interaktiv": "<id>"` im JSON setzen). Lohnende Kandidaten, falls du später Widgets bauen willst: Parameter $a,b,d$ der Sinusfunktion, Steigung/Achsenabschnitt der Geraden, Quadrate am Pythagoras, Baumdiagramm-Wahrscheinlichkeiten. **Das wäre aber neue Inhaltsarbeit** und nicht Teil dieses Umbaus.

## Geplante Umsetzung (wenn du grünes Licht gibst)

1. `assets/js/interaktiv/flaeche-rechteck.js` — Widget als `mount(container)`-Modul, instanz-gescoped (keine globalen IDs).
2. Erklärseite *flaecheninhalt-und-umfang*: Inline-IIFE durch `import { mount } … ; mount(figureEl)` ersetzen — **gleiche Optik, eine Quelle** (Erklärseite bleibt sonst unverändert, wie gewünscht).
3. `kurs.js`: im verstehen-Zweig bei `daten.interaktiv` das Register dynamisch importieren und in eine einklappbare „🔬 Selbst ausprobieren"-Karte mounten; Erklärseite-Knopf bleibt.
4. `daten/kurse/ma-05.json`: `"interaktiv": "flaeche-rechteck"` im verstehen von L22 (ggf. L21).
5. **Verifikation:** `check-website.py` grün; Browser-Render des verstehen-Blocks (Widget mountet, Regler verändern SVG live, keine Konsolenfehler); Test bei 380 px (Handy).

**Aufwand:** klein (überschaubarer Refactor + Mechanik). **Risiko:** gering, isoliert auf eine neue, optionale Code-Bahn; bestehende Lektionen ohne `interaktiv`-Feld bleiben unberührt. **Erweiterbar:** die Mechanik trägt beliebig viele künftige Widgets.
