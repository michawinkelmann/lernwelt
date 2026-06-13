# LERNBUERO-AUFGABEN.md — Lücken füllen statt nur markieren

Damit das Lernbüro **vollständig und nicht zu dünn** ist, werden dünne Übungsspuren
(Basis/Standard/Plus einer Lektion ohne passende Aufgabe) mit **neu erstellten Aufgaben**
gefüllt – nicht nur mit einem ehrlichen Lücken-Hinweis. Diese Datei ist der verbindliche
Standard dafür (auch für künftige Kurse: **gar nicht erst Lücken entstehen lassen**).

## Grundprinzip

- **Beim Bau jeder Lektion gilt:** Basis- und Standard-Spur **müssen** eine Aufgabe haben.
  Reicht der Themenbestand nicht, wird **sofort** eine passende Aufgabe erstellt. Plus-Spur
  möglichst auch füllen (AFB III); nur wenn fachlich keine sinnvolle AFB-III-Aufgabe möglich
  ist, bleibt ausnahmsweise ein `plusLuecke`-Hinweis.

## Wo die neuen Aufgaben liegen (bewusst getrennt)

- Neue Aufgaben kommen in **`daten/aufgaben/lernbuero/<themaId>.json`** – NICHT in die
  bestehende `daten/aufgaben/<themaId>.json`.
- **Warum getrennt:** die regulären Übungsseiten sind bereits freigegeben und getestet
  (Invariante „13 Aufgaben/Thema" in der Browser-Suite t3). Die Trennung lässt sie
  unangetastet, isoliert die Ergänzungen zur **fachlichen Stapel-Prüfung** und erlaubt es,
  gute Aufgaben später bei Bedarf in die Themen-Datei zu übernehmen (dann auch auf der
  Übungsseite sichtbar).
- Dateiformat: `{ "thema": "<themaId>", "hinweis": "Lernbüro-Ergänzungsaufgaben …", "aufgaben": [ … ] }`.
- **IDs:** Themen-Präfix fortsetzen ab **101** (z. B. `ma-08-lf-101`, `-102`, …) – global eindeutig, kein Konflikt mit `-001…-013`.
- Jede neue Aufgabe trägt das Feld `"ergaenzung": "lernbuero"` (Marker für die Prüfung; Engine ignoriert unbekannte Felder).

## Verdrahtung im Kurs

In `daten/kurse/<kurs>.json` zeigt die Spur auf die neue Quelle und der Lücken-Hinweis entfällt:
```
"ueben": {
  "basis": [{ "quelle": "lernbuero/<themaId>", "ids": ["<themaId-kurz>-101"] }],
  ...   // KEIN "basisLuecke" mehr
}
```
Der Player lädt jede `quelle` als `daten/aufgaben/<quelle>.json` – ein Schrägstrich in der
quelle (`lernbuero/…`) ist erlaubt und lädt aus dem Unterordner.

## Aufgaben-Schema (identisch zu regulären Aufgaben, §7.2 / UMSETZUNGSPLAN)

Pflichtfelder: `id, typ, zweig:["gym","rs"], niveau(1|2|3), afb(1|2|3), frage, tipps:[3 Stufen], loesungsweg, kc:[…]`, plus `ergaenzung:"lernbuero"`.
Typ-spezifisch:
- `numerisch`: `eingaben:[{label, antwort(Zahl), toleranz, einheit?}]`
- `multiple-choice`: `optionen:[{text, richtig(bool), erklaerung?}]`
- `luecke`: `text` mit `___`, `luecken:[{art:"eingabe"|"dropdown", antwort, optionen?}]`
- `zuordnung`: `paare:[{links, rechts}]`
- `reihenfolge`: `elemente:[…in KORREKTER Reihenfolge…]` (Engine mischt für die Anzeige)
- `rechenweg`: `schritte:[{frage, eingaben:[…], tipps?:[…]}]`
- `freitext`: `musterloesung`

**Niveau ↔ Spur:** Basis = niveau 1 (AFB I), Standard = niveau 2 (AFB II), Plus = niveau 3 (AFB III).

## KaTeX-/Stil-Regeln (hart)

- `$…$` inline, `$$…$$` abgesetzt. Deutsche Dezimalzahlen als `{,}` (z. B. `3{,}5`).
- **KEIN** `\tfrac`, **KEIN** `\mathbb`. Nur KaTeX-Standard. In JSON Backslashes doppelt (`\\frac`, `\\cdot`, `\\sqrt`, `\\,`).
- Dropdown-/Zuordnungs-Optionen IMMER Klartext/Unicode (kein KaTeX in `<option>`).
- Ermutigender Ton, 3 gestufte Tipps, vollständiger Lösungsweg.

## Pflicht-Verifikation

1. JSON gültig (`python3 -m json.tool`), 0 Nullbytes.
2. **Jeden numerischen Antwortwert per Skript nachrechnen** (assert).
3. Neue IDs eindeutig, Präfix korrekt, `ergaenzung`-Marker gesetzt.
4. Kurs rewired: betroffene `*Luecke`-Felder entfernt, Spur referenziert die neue Quelle, keine Intra-Lektions-Doppel-ID.
5. Kein `\tfrac`/`\mathbb`.

## Referenz-Exemplar

`daten/aufgaben/lernbuero/ma-07-prozent-und-zinsrechnung.json` (4 Aufgaben: Reihenfolge AFB III,
zwei Basis-Numerisch, ein Standard-Numerisch) + Verdrahtung in `daten/kurse/ma-07.json`
(L1 Plus, L3 Basis, L4 Basis+Standard). Genau diesem Muster folgen.
