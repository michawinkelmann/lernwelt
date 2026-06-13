// experiment.js — Interaktives Experiment: Höhenmessung mit dem Försterdreieck (Klasse 9).
// Realitätsnahe Messpraxis: erst das eigene Schrittmaß auf der 20-m-Strecke
// kalibrieren, dann rückwärts wandern, bis die Peillinie über die Hypotenuse
// des 45°-Dreiecks GENAU die Spitze trifft. Dort gilt (gleichschenklig-
// rechtwinkliges Peildreieck): Höhe über Augenhöhe = Entfernung, also
// h = Entfernung + Augenhöhe. Die wahren Höhen bleiben bis zur Auswertung
// geheim. Alle Streuungen sind deterministisch geseedet (helfer.streuung) —
// dadurch laufen die TESTS DOM-frei in Node (Modulebene browserfrei).

import {
  streuung, parseDezimal, komma, ablesungOk, esc, mittel,
  farbe, reduzierteBewegung, bauePhasen, csvHerunterladen
} from "../../../assets/js/experiment/helfer.js";

// ---------- Konstanten ----------
export const AUGENHOEHE = 1.60;        // m — feste Augenhöhe der Figur
export const KALIBRIER_STRECKE = 20.0; // m — abgemessene Strecke auf dem Schulhof
export const KALIBRIER_MAX = 3;        // Durchgänge; Mittel = bessere Kalibrierung
export const PEIL_TOLERANZ = 0.3;      // m — genauer lässt sich von Hand nicht peilen
export const TOL_SCHRITTLAENGE = 0.01; // m — Eingabe 20 ÷ Schrittzahl
export const TOL_ENTFERNUNG = 0.5;     // m — Eingabe Schritte × Schrittlänge
export const TOL_HOEHE = 0.6;          // m — Eingabe Entfernung + Augenhöhe

// Die wahren Höhen sind das Geheimnis des Experiments — sie erscheinen vor
// der Aufdeckung nirgends im UI. start = Anfangsabstand (Peilstrahl zu tief,
// also rückwärts wandern!), bewusst auf dem 0,5-m-Raster der Geh-Knöpfe.
export const OBJEKTE = [
  { id: "eiche",     name: "Alte Eiche", zielwort: "Baumspitze", hoehe: 18.4, start: 8.5 },
  { id: "kirchturm", name: "Kirchturm",  zielwort: "Turmspitze", hoehe: 31.7, start: 15.0 },
  { id: "windrad",   name: "Windrad",    zielwort: "Nabe",       hoehe: 64.2, start: 31.5 }
];

// ---------- reine Mess-/Auswertelogik (Node-testbar) ----------
// Wahre Schrittlänge der Figur — deterministisch geseedet, dem Lernenden unbekannt.
export function schrittWahr() { return 0.78 + streuung("schritt", 0.06); }

// 45°-Geometrie: Der Peilstrahl trifft die Spitze genau bei d = h − Augenhöhe.
export function peilDistanz(objekt) { return objekt.hoehe - AUGENHOEHE; }

// Wo liegt der 45°-Peilstrahl in der Objektebene? delta > 0: über dem Ziel.
export function peilung(objekt, distanz) {
  const delta = AUGENHOEHE + distanz - objekt.hoehe;
  if (Math.abs(delta) <= PEIL_TOLERANZ) return { status: "treffer", delta };
  return { status: delta > 0 ? "hoch" : "tief", delta };
}

// Kalibrierung: gezählte Schritte auf 20,00 m. Pro Durchgang leicht anders
// (Zählstreuung ±0,6 Schritt vor dem Runden) — darum lohnt das Mittel.
export function kalibrierSchritte(durchgang) {
  return Math.round(KALIBRIER_STRECKE / schrittWahr() + streuung("kalib:" + durchgang, 1.2));
}
export function schrittlaengeAus(strecke, schritte) {
  return schritte > 0 ? strecke / schritte : NaN;
}

// Messung am ✓-Punkt: Die wahre Distanz ist dort h − Augenhöhe (45°!).
// Gezählt wird mit der wahren Schrittlänge plus Zählstreuung, ganze Schritte.
export function zaehlSchritte(objekt) {
  return Math.round(peilDistanz(objekt) / schrittWahr() + streuung("zaehl:" + objekt.id, 1.2));
}
export function entfernungAus(schritte, schrittlaenge) { return schritte * schrittlaenge; }
export function hoeheAus(entfernung, augenhoehe = AUGENHOEHE) { return entfernung + augenhoehe; }
export function abweichungProzent(gemessen, wahr) { return (gemessen - wahr) / wahr * 100; }

// ---------- TESTS (laufen DOM-frei in Node) ----------
export const TESTS = [
  { name: "45°-Geometrie: Treffer exakt bei d = h − Augenhöhe", ok: () =>
    OBJEKTE.every(o => { const p = peilung(o, peilDistanz(o)); return p.status === "treffer" && Math.abs(p.delta) < 1e-9; }) },
  { name: "Peilstatus: davor zu tief, dahinter zu hoch, ✓-Fenster ±0,3 m", ok: () =>
    OBJEKTE.every(o => peilung(o, peilDistanz(o) - 1).status === "tief"
      && peilung(o, peilDistanz(o) + 1).status === "hoch"
      && peilung(o, peilDistanz(o) + PEIL_TOLERANZ * 0.9).status === "treffer"
      && peilung(o, peilDistanz(o) + PEIL_TOLERANZ * 1.4).status === "hoch") },
  { name: "Wahre Peil-Distanzen: 16,8 / 30,1 / 62,6 m", ok: () =>
    Math.abs(peilDistanz(OBJEKTE[0]) - 16.8) < 1e-9
    && Math.abs(peilDistanz(OBJEKTE[1]) - 30.1) < 1e-9
    && Math.abs(peilDistanz(OBJEKTE[2]) - 62.6) < 1e-9 },
  { name: "Kalibrier-Pipeline: perfekte Schrittzahl → Schrittlänge exakt", ok: () =>
    Math.abs(schrittlaengeAus(20, 20 / 0.78) - 0.78) < 1e-12
    && Math.abs(schrittlaengeAus(20, 26) - 0.76923) < 1e-4
    && Number.isNaN(schrittlaengeAus(20, 0)) },
  { name: "Schrittzahlen sind ganze Zahlen (gerundet gezählt)", ok: () =>
    [1, 2, 3].every(d => Number.isInteger(kalibrierSchritte(d)))
    && OBJEKTE.every(o => Number.isInteger(zaehlSchritte(o))) },
  { name: "Streugrenzen: Schrittlänge ±3 cm, Zählungen ±1,1 Schritte", ok: () =>
    Math.abs(schrittWahr() - 0.78) <= 0.03
    && [1, 2, 3].every(d => Math.abs(kalibrierSchritte(d) - KALIBRIER_STRECKE / schrittWahr()) <= 1.1)
    && OBJEKTE.every(o => Math.abs(zaehlSchritte(o) - peilDistanz(o) / schrittWahr()) <= 1.1) },
  { name: "h-Pipeline aus perfekten Werten exakt", ok: () =>
    OBJEKTE.every(o => Math.abs(hoeheAus(entfernungAus(peilDistanz(o) / 0.78, 0.78)) - o.hoehe) < 1e-9)
    && Math.abs(hoeheAus(16.8) - 18.4) < 1e-12 },
  { name: "Fehlerfortpflanzung: 1 cm Schrittfehler → ≈ 0,215 m (Eiche), ≈ 0,80 m (Windrad)", ok: () => {
    const n = peilDistanz(OBJEKTE[0]) / 0.78;       // ≈ 21,5 Schritte
    const dh = hoeheAus(entfernungAus(n, 0.79)) - hoeheAus(entfernungAus(n, 0.78));
    const nW = peilDistanz(OBJEKTE[2]) / 0.78;      // ≈ 80,3 Schritte
    const dhW = entfernungAus(nW, 0.79) - entfernungAus(nW, 0.78);
    return Math.abs(dh - 0.215) <= 0.01 && Math.abs(dhW - 0.80) <= 0.01; } },
  { name: "Determinismus: gleiche Seeds → gleiche Werte", ok: () =>
    schrittWahr() === schrittWahr()
    && kalibrierSchritte(2) === kalibrierSchritte(2)
    && OBJEKTE.every(o => zaehlSchritte(o) === zaehlSchritte(o)) },
  { name: "Toleranzen und parseDezimal greifen", ok: () =>
    ablesungOk(0.77, schrittlaengeAus(20, 26), TOL_SCHRITTLAENGE)
    && !ablesungOk(0.79, schrittlaengeAus(20, 26), TOL_SCHRITTLAENGE)
    && ablesungOk(16.6, 16.8, TOL_ENTFERNUNG) && !ablesungOk(15.9, 16.8, TOL_ENTFERNUNG)
    && ablesungOk(18.0, 18.4, TOL_HOEHE) && !ablesungOk(17.7, 18.4, TOL_HOEHE)
    && parseDezimal("0,77") === 0.77 && Number.isNaN(parseDezimal("x")) },
  { name: "Startpositionen: Peilstrahl zu tief → rückwärts wandern", ok: () =>
    OBJEKTE.every(o => o.start < peilDistanz(o) && peilung(o, o.start).status === "tief") },
  { name: "Abweichung in Prozent korrekt", ok: () =>
    abweichungProzent(18.4, 18.4) === 0 && Math.abs(abweichungProzent(19.32, 18.4) - 5) < 1e-9 }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;
  const reduziert = reduzierteBewegung();

  const zustand = {
    phase: "aufbau",
    kalibLaeuft: false,   // Durchgang gestartet, Schrittlängen-Eingabe offen
    kalibWerte: [],       // akzeptierte Schrittlängen je Durchgang
    objekt: null,         // aktuell angepeiltes Objekt
    distanz: NaN,         // logischer Abstand Figur–Objekt in m
    zeichenD: NaN,        // gezeichneter Abstand (Animation)
    animVon: NaN, animStart: 0,
    gezaehlt: NaN,        // Schrittzahl am ✓-Punkt nach „Schritte zählen"
    messungen: [],        // {id, name, schritte, schrittlaenge, entfernung}
    hoehen: {},           // id → bestätigte Höhe des Lernenden
    begruendet: false,
    meldung: ""
  };
  const meineSchrittlaenge = () => mittel(zustand.kalibWerte);
  const kalibriert = () => zustand.kalibWerte.length > 0;
  const fertig = id => zustand.messungen.some(m => m.id === id);

  const wechslePhase = bauePhasen(wurzel, [
    { id: "aufbau", label: "Aufbau" },
    { id: "messen", label: "Durchführung" },
    { id: "auswerten", label: "Auswertung" }
  ], zeigePhase);

  const flaeche = document.createElement("div");
  flaeche.className = "exp-flaeche";
  flaeche.innerHTML = `
    <div class="exp-links">
      <canvas id="exp-canvas" width="360" height="440" aria-label="Seitenansicht: Links die Figur mit Peildreieck am Auge, rechts das Messobjekt. Ein 45-Grad-Peilstrahl zeigt an, ob die Spitze getroffen ist. Während der Kalibrierung: 20-Meter-Strecke mit Markierungspfosten."></canvas>
    </div>
    <div class="exp-rechts" id="exp-panel"></div>`;
  wurzel.appendChild(flaeche);

  const canvas = flaeche.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = flaeche.querySelector("#exp-panel");
  const W = canvas.width, H = canvas.height, BODEN = H - 50;

  // Geometrie je Objekt: einheitlicher Maßstab für x und y, damit 45° auch
  // auf dem Bildschirm 45° sind. kopfraum = Platz über dem Ziel (Rotor!).
  function geo(o) {
    const dMax = Math.ceil(peilDistanz(o)) + 12;
    const kopfraum = o.id === "windrad" ? 13 : 2;
    const s = Math.min((W - 92) / dMax, (BODEN - 30) / (o.hoehe + kopfraum));
    return { dMax, s, xObj: W - 46 };
  }

  // ---------- Bewegung (vor/zurück) ----------
  function geheZu(ziel) {
    const o = zustand.objekt;
    if (!o) return;
    const g = geo(o);
    zustand.distanz = Math.min(g.dMax, Math.max(4, Math.round(ziel * 10) / 10));
    zustand.gezaehlt = NaN; // Bewegung verwirft eine schon gezählte Strecke
    zustand.animVon = zustand.zeichenD;
    zustand.animStart = performance.now();
    if (reduziert || !Number.isFinite(zustand.animVon)) { zustand.zeichenD = zustand.distanz; zeichne(); }
    else requestAnimationFrame(laufAnim);
    panelMessen();
  }
  function laufAnim() {
    const t = Math.min(1, (performance.now() - zustand.animStart) / 350);
    const e = 1 - Math.pow(1 - t, 3);
    zustand.zeichenD = zustand.animVon + (zustand.distanz - zustand.animVon) * e;
    zeichne();
    if (t < 1) requestAnimationFrame(laufAnim);
  }

  // ---------- Zeichnung ----------
  function zeichne() {
    if (zustand.objekt) zeichneGelaende(); else zeichneStrecke();
  }

  function malBoden(cText, cHauch) {
    ctx.clearRect(0, 0, W, H);
    ctx.lineJoin = "round";
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillStyle = cHauch; ctx.fillRect(0, BODEN, W, H - BODEN);
    ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, BODEN); ctx.lineTo(W, BODEN); ctx.stroke();
  }

  // Figur maßstabsgetreu (1,74 m groß, Augen auf 1,60 m) — beim Windrad
  // wird sie winzig: So klein ist ein Mensch neben 60 Metern wirklich!
  function maleFigur(x, s, cText) {
    const hFig = 1.74 * s;
    const yAuge = BODEN - AUGENHOEHE * s;
    ctx.strokeStyle = cText; ctx.fillStyle = cText; ctx.lineWidth = 2;
    if (hFig >= 20) {
      const r = hFig * 0.11;
      ctx.beginPath(); ctx.arc(x, BODEN - hFig + r, r, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, BODEN - hFig + 2 * r); ctx.lineTo(x, BODEN - hFig * 0.38); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, BODEN - hFig * 0.38); ctx.lineTo(x - hFig * 0.14, BODEN);
      ctx.moveTo(x, BODEN - hFig * 0.38); ctx.lineTo(x + hFig * 0.14, BODEN);
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, BODEN - hFig * 0.62); ctx.lineTo(x + hFig * 0.2, yAuge); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(x, BODEN); ctx.lineTo(x, BODEN - hFig); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, BODEN - hFig, 2.5, 0, 7); ctx.fill();
    }
    ctx.textAlign = "center"; ctx.fillText("du", x, BODEN + 16); ctx.textAlign = "start";
  }

  // Peildreieck als festes Symbol (in echt nur handtellergroß)
  function maleDreieck(xe, ye, cAkzent, cHauch) {
    const L = 16;
    ctx.beginPath(); ctx.moveTo(xe, ye); ctx.lineTo(xe + L, ye); ctx.lineTo(xe + L, ye - L); ctx.closePath();
    ctx.fillStyle = cHauch; ctx.fill();
    ctx.strokeStyle = cAkzent; ctx.lineWidth = 2; ctx.stroke();
  }

  function maleEiche(o, x, s, cText, cFlaeche) {
    const h = o.hoehe * s;
    const stammB = Math.max(4, 1.0 * s);
    ctx.fillStyle = cText;
    ctx.fillRect(x - stammB / 2, BODEN - h * 0.5, stammB, h * 0.5);
    const rx = Math.min(h * 0.30, W - x - 4);
    ctx.beginPath(); ctx.ellipse(x, BODEN - h * 0.65, rx, h * 0.35, 0, 0, 7);
    ctx.fillStyle = cFlaeche; ctx.fill();
    ctx.strokeStyle = cText; ctx.lineWidth = 2; ctx.stroke();
  }
  function maleKirchturm(o, x, s, cText, cFlaeche) {
    const h = o.hoehe * s;
    const bw = Math.max(12, 6 * s);
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.rect(x - bw / 2, BODEN - h * 0.62, bw, h * 0.62); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - bw / 2, BODEN - h * 0.62); ctx.lineTo(x, BODEN - h); ctx.lineTo(x + bw / 2, BODEN - h * 0.62); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, BODEN - h * 0.52, bw * 0.22, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, BODEN - h * 0.52); ctx.lineTo(x, BODEN - h * 0.52 - bw * 0.14);
    ctx.moveTo(x, BODEN - h * 0.52); ctx.lineTo(x + bw * 0.1, BODEN - h * 0.52); ctx.stroke();
    ctx.beginPath(); ctx.rect(x - bw * 0.14, BODEN - bw * 0.5, bw * 0.28, bw * 0.5); ctx.stroke();
  }
  function maleWindrad(o, x, s, cText, cFlaeche, cLeise) {
    const yNabe = BODEN - o.hoehe * s;
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - Math.max(3, 1.6 * s), BODEN);
    ctx.lineTo(x - Math.max(1.5, 0.5 * s), yNabe);
    ctx.lineTo(x + Math.max(1.5, 0.5 * s), yNabe);
    ctx.lineTo(x + Math.max(3, 1.6 * s), BODEN);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    const len = 11 * s;
    ctx.strokeStyle = cLeise; ctx.lineWidth = 3;
    for (const a of [-Math.PI / 2, Math.PI / 6, Math.PI * 5 / 6]) {
      ctx.beginPath(); ctx.moveTo(x, yNabe);
      ctx.lineTo(x + Math.cos(a) * len, yNabe + Math.sin(a) * len); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(x, yNabe, Math.max(3.5, 1.3 * s), 0, 7);
    ctx.fillStyle = cFlaeche; ctx.fill();
    ctx.strokeStyle = cText; ctx.lineWidth = 2; ctx.stroke();
  }

  function zeichneGelaende() {
    const o = zustand.objekt;
    const { s, xObj } = geo(o);
    const cText = farbe("--text"), cLeise = farbe("--text-leise", "#767676"),
          cAkzent = farbe("--akzent", "#1762a8"), cFlaeche = farbe("--flaeche", "#fff"),
          cHauch = farbe("--hauch", "#eee");
    malBoden(cText, cHauch);

    if (o.id === "eiche") maleEiche(o, xObj, s, cText, cFlaeche);
    else if (o.id === "kirchturm") maleKirchturm(o, xObj, s, cText, cFlaeche);
    else maleWindrad(o, xObj, s, cText, cFlaeche, cLeise);

    // Zielmarke (Spitze bzw. Nabe) — ohne Zahlenangabe, die Höhe ist geheim!
    const yZiel = BODEN - o.hoehe * s;
    ctx.beginPath(); ctx.arc(xObj, yZiel, 5, 0, 7);
    ctx.strokeStyle = cAkzent; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = cText; ctx.textAlign = "center";
    ctx.fillText(o.name, xObj - 14, BODEN + 16); ctx.textAlign = "start";

    // Figur + Dreieck + Peilstrahl (am gezeichneten Abstand)
    const d = zustand.zeichenD;
    const xFig = xObj - d * s;
    const yAuge = BODEN - AUGENHOEHE * s;
    maleFigur(xFig, s, cText);

    ctx.setLineDash([3, 4]); ctx.strokeStyle = cLeise; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(xFig, yAuge); ctx.lineTo(xObj, yAuge); ctx.stroke(); // Augenhöhen-Hilfslinie

    const yStrahl = yAuge - (xObj - xFig); // 45° — gleicher Maßstab in x und y
    ctx.setLineDash([7, 5]); ctx.strokeStyle = cAkzent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(xFig, yAuge); ctx.lineTo(xObj, yStrahl); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(xObj - 9, yStrahl - 5); ctx.lineTo(xObj - 9, yStrahl + 5); ctx.lineTo(xObj - 1, yStrahl); ctx.closePath();
    ctx.fillStyle = cAkzent; ctx.fill();

    maleDreieck(xFig, yAuge, cAkzent, cHauch);

    // Statuszeile (Text + Symbol, nie nur Farbe)
    const p = peilung(o, zustand.distanz);
    const titel = p.status === "treffer" ? "✓ " + o.zielwort + " anvisiert!"
      : p.status === "hoch" ? "▲ zu hoch — geh vor" : "▼ zu tief — geh zurück";
    ctx.fillStyle = p.status === "treffer" ? cAkzent : cText;
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillText(titel, 12, 22);
    ctx.font = "12px system-ui, sans-serif";
  }

  function zeichneStrecke() {
    const cText = farbe("--text"), cLeise = farbe("--text-leise", "#767676"),
          cAkzent = farbe("--akzent", "#1762a8"), cHauch = farbe("--hauch", "#eee");
    malBoden(cText, cHauch);
    const sStr = 12;                       // px pro Meter, nur fürs Bild
    const x0 = (W - KALIBRIER_STRECKE * sStr) / 2, x1 = x0 + KALIBRIER_STRECKE * sStr;
    ctx.fillStyle = cText; ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillText("Kalibrier-Strecke: genau 20,00 m", 12, 22);
    ctx.font = "12px system-ui, sans-serif";
    // Maßband mit Meter-Marken
    ctx.strokeStyle = cAkzent; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x0, BODEN - 2); ctx.lineTo(x1, BODEN - 2); ctx.stroke();
    ctx.lineWidth = 1.5; ctx.strokeStyle = cLeise;
    for (let m = 0; m <= KALIBRIER_STRECKE; m++) {
      const x = x0 + m * sStr;
      ctx.beginPath(); ctx.moveTo(x, BODEN - 2); ctx.lineTo(x, BODEN - (m % 5 === 0 ? 12 : 7)); ctx.stroke();
    }
    // Pfosten + Beschriftung
    ctx.strokeStyle = cText; ctx.lineWidth = 3;
    for (const [x, txt] of [[x0, "0 m"], [x1, "20 m"]]) {
      ctx.beginPath(); ctx.moveTo(x, BODEN); ctx.lineTo(x, BODEN - 34); ctx.stroke();
      ctx.fillStyle = cText; ctx.textAlign = "center"; ctx.fillText(txt, x, BODEN - 42); ctx.textAlign = "start";
    }
    // Figur mittendrin, dahinter Fußspuren
    const xFig = x0 + 7.4 * sStr;
    ctx.fillStyle = cLeise;
    for (let x = x0 + 6; x < xFig - 8; x += 11) { ctx.beginPath(); ctx.arc(x, BODEN - 5, 1.6, 0, 7); ctx.fill(); }
    maleFigur(xFig, sStr, cText);
    ctx.fillStyle = cLeise;
    ctx.fillText("Schritte zählen: 1, 2, 3, …", x0 + 30, BODEN - 60);
  }

  // Skizze der Idee im Aufbau-Panel (45°: beide Katheten gleich lang)
  function zeichneSkizze() {
    const c = panel.querySelector("#exp-skizze");
    if (!c) return;
    const k = c.getContext("2d");
    const cText = farbe("--text"), cLeise = farbe("--text-leise", "#767676"),
          cAkzent = farbe("--akzent", "#1762a8"), cHauch = farbe("--hauch", "#eee");
    const Wb = c.width, Hb = c.height, boden = Hb - 26;
    k.clearRect(0, 0, Wb, Hb);
    k.lineJoin = "round"; k.font = "12px system-ui, sans-serif";
    k.strokeStyle = cText; k.lineWidth = 2;
    k.beginPath(); k.moveTo(8, boden); k.lineTo(Wb - 8, boden); k.stroke();
    const xe = 64, ye = boden - 26;             // Auge auf 1,60 m (nicht maßstäblich)
    const xB = 244, yS = ye - (xB - xe);        // Spitze so, dass exakt 45° entstehen
    // Baum
    const hB = boden - yS;
    k.fillStyle = cText; k.fillRect(xB - 3, boden - hB * 0.5, 6, hB * 0.5);
    k.beginPath(); k.ellipse(xB, yS + hB * 0.35, 34, hB * 0.35, 0, 0, 7);
    k.fillStyle = cHauch; k.fill(); k.strokeStyle = cText; k.stroke();
    // Figur
    k.beginPath(); k.arc(xe, ye - 2, 5, 0, 7); k.stroke();
    k.beginPath(); k.moveTo(xe, ye + 3); k.lineTo(xe, boden - 8); k.stroke();
    k.beginPath(); k.moveTo(xe, boden - 8); k.lineTo(xe - 6, boden); k.moveTo(xe, boden - 8); k.lineTo(xe + 6, boden); k.stroke();
    // Augenhöhen-Linie und senkrechte Fangstrecke
    k.setLineDash([3, 4]); k.strokeStyle = cLeise; k.lineWidth = 1.5;
    k.beginPath(); k.moveTo(xe, ye); k.lineTo(xB, ye); k.stroke();
    k.setLineDash([]);
    k.strokeStyle = cAkzent; k.lineWidth = 2;
    k.beginPath(); k.moveTo(xB, ye); k.lineTo(xB, yS); k.stroke();
    // Peilstrahl
    k.setLineDash([7, 5]);
    k.beginPath(); k.moveTo(xe, ye); k.lineTo(xB, yS); k.stroke();
    k.setLineDash([]);
    // Dreieck am Auge (vergrößert)
    const L = 30;
    k.beginPath(); k.moveTo(xe, ye); k.lineTo(xe + L, ye); k.lineTo(xe + L, ye - L); k.closePath();
    k.fillStyle = cHauch; k.fill(); k.strokeStyle = cText; k.lineWidth = 2; k.stroke();
    // Beschriftungen
    k.fillStyle = cText;
    k.textAlign = "center"; k.fillText("Entfernung e", (xe + xB) / 2, ye + 16); k.textAlign = "start";
    k.fillText("e", xB + 8, (ye + yS) / 2 + 4);
    k.fillText("45°", xe + 36, ye - 4);
    k.textAlign = "right"; k.fillText("1,60 m", xe - 10, (ye + boden) / 2 + 4); k.textAlign = "start";
  }

  // ---------- Meldungen ----------
  function melde(text) {
    zustand.meldung = text;
    const el = panel.querySelector("#exp-meldung");
    if (el) el.textContent = text;
  }

  // ---------- Panels ----------
  function panelAufbau() {
    panel.innerHTML = `
      <h2>Aufbau und Idee</h2>
      <p>Dein Messgerät ist verblüffend einfach: ein <strong>gleichschenklig-rechtwinkliges Dreieck</strong> („Försterdreieck"). Halte es vors Auge — die untere Kathete <strong>waagerecht</strong>, dann steigt die Hypotenuse unter genau <strong>45°</strong> an. Nun wanderst du rückwärts, bis die Peillinie über die Hypotenuse <strong>genau</strong> die Spitze trifft.</p>
      <canvas id="exp-skizze" class="exp-diagramm" width="340" height="250" aria-label="Skizze: Auge mit 45-Grad-Dreieck, Peilstrahl zur Baumspitze. Entfernung e und Höhe über Augenhöhe sind gleich lang."></canvas>
      <p>Dann gilt: <strong>Höhe über Augenhöhe = Entfernung e</strong> — warum, klärst du in der Auswertung. Also nur noch addieren: <strong>h = e + Augenhöhe</strong>. Die Augenhöhe deiner Figur ist fest <strong>1,60 m</strong>. (Im Versuchsbild ist das Dreieck stark vergrößert — in echt ist es handtellergroß.)</p>
      <p><strong>Dein Plan:</strong></p>
      <ol>
        <li><strong>Schrittmaß kalibrieren:</strong> die 20,00-m-Strecke abgehen, Schritte zählen → Schrittlänge berechnen.</li>
        <li><strong>Peilen:</strong> rückwärts wandern, bis ✓ „Spitze anvisiert" erscheint.</li>
        <li><strong>Schritte zählen</strong> bis zum Fußpunkt → Entfernung = Schritte × Schrittlänge.</li>
        <li><strong>Rechnen:</strong> h = Entfernung + 1,60 m.</li>
      </ol>
      <p class="exp-hinweis">Drei Objekte warten: eine <strong>alte Eiche</strong>, der <strong>Kirchturm</strong> und ein <strong>Windrad</strong> — dort peilst du die <strong>Nabe</strong> an, die Mitte des Rotors. Wie hoch alle drei wirklich sind, deckt erst die Auswertung auf!</p>
      <button class="knopf" id="exp-weiter1">Zur Durchführung</button>`;
    zeichneSkizze();
    panel.querySelector("#exp-weiter1").addEventListener("click", () => wechslePhase("messen"));
  }

  function panelMessen() {
    const o = zustand.objekt;
    const n = zustand.messungen.length;
    const sl = meineSchrittlaenge();

    let kalib = `<h3>Schritt 1: Schrittmaß kalibrieren</h3>`;
    if (zustand.kalibLaeuft) {
      const N = kalibrierSchritte(zustand.kalibWerte.length + 1);
      kalib += `
        <p>Du gehst die 20,00-m-Strecke ab und zählst: <strong>${N} Schritte</strong>.</p>
        <form id="exp-kalib" class="exp-ablesen">
          <label for="exp-sl">Deine Schrittlänge: 20,00 m ÷ ${N} =</label>
          <input id="exp-sl" inputmode="decimal" autocomplete="off" size="7"> m
          <button class="knopf">Notieren</button>
        </form>
        <p>Runde auf 3 Stellen nach dem Komma (Taschenrechner erlaubt).</p>`;
    } else if (!kalibriert()) {
      kalib += `
        <p>Entfernungen misst du gleich mit deinen <strong>Schritten</strong> — dafür musst du wissen, wie lang einer ist. Auf dem Schulhof ist eine Strecke von <strong>genau 20,00 m</strong> abgemessen. Geh sie in normalem Tempo ab und zähle mit!</p>
        <button class="knopf" id="exp-gehen">Strecke abgehen (1. Durchgang)</button>`;
    } else {
      kalib += `
        <p>Deine Schrittlänge: <strong>${komma(sl, 3)} m</strong> — Mittel aus ${zustand.kalibWerte.length === 1 ? "1 Durchgang" : zustand.kalibWerte.length + " Durchgängen"} (${zustand.kalibWerte.map(w => komma(w, 3)).join(" · ")}).</p>
        ${zustand.kalibWerte.length < KALIBRIER_MAX ? '<button class="knopf zweitrangig" id="exp-gehen">Noch ein Durchgang — das Mittel wird genauer</button>' : ""}`;
    }

    let obj = "";
    if (kalibriert() && !zustand.kalibLaeuft) {
      obj = `<h3>Schritt 2: Peilen und Schritte zählen</h3>`;
      if (!o) {
        obj += `
          <p>Wähle dein Messobjekt:</p>
          <div class="exp-knopfzeile" aria-label="Messobjekt wählen">
            ${OBJEKTE.map(x => `<button class="knopf zweitrangig" data-objekt="${x.id}" ${fertig(x.id) ? "disabled" : ""}>${esc(x.name)}${fertig(x.id) ? " ✓" : ""}</button>`).join("")}
          </div>`;
      } else {
        const p = peilung(o, zustand.distanz);
        const status = p.status === "treffer"
          ? `✓ ${o.zielwort} genau anvisiert!`
          : p.status === "hoch"
            ? `▲ Zu hoch — der Peilstrahl geht über die ${o.zielwort} hinweg. Geh ein Stück vor.`
            : `▼ Zu tief — der Peilstrahl trifft unterhalb der ${o.zielwort}. Geh weiter zurück.`;
        obj += `
          <p><strong>${esc(o.name)}:</strong> Wandere, bis die Peillinie genau die ${o.zielwort} trifft.</p>
          <div class="exp-knopfzeile" role="group" aria-label="Figur bewegen">
            <button class="knopf zweitrangig" data-geh="5">◀◀ 5 m zurück</button>
            <button class="knopf zweitrangig" data-geh="0.5">◀ 0,5 m zurück</button>
            <button class="knopf zweitrangig" data-geh="-0.5">0,5 m vor ▶</button>
            <button class="knopf zweitrangig" data-geh="-5">5 m vor ▶▶</button>
          </div>
          <p class="exp-meldung" id="exp-peil" aria-live="polite">${status}</p>`;
        if (p.status === "treffer" && !Number.isFinite(zustand.gezaehlt)) {
          obj += `<button class="knopf" id="exp-zaehlen">Schritte bis zum Fußpunkt zählen</button>`;
        }
        if (Number.isFinite(zustand.gezaehlt)) {
          obj += `
            <p>Du gehst los und zählst bis zum Fußpunkt: <strong>${zustand.gezaehlt} Schritte</strong>.</p>
            <form id="exp-entfernung" class="exp-ablesen">
              <label for="exp-ent">Entfernung = ${zustand.gezaehlt} Schritte × ${komma(sl, 3)} m =</label>
              <input id="exp-ent" inputmode="decimal" autocomplete="off" size="7"> m
              <button class="knopf">In die Tabelle</button>
            </form>
            <p>Eine Stelle nach dem Komma genügt.</p>`;
        }
        obj += `<p><button class="knopf zweitrangig" id="exp-abbruch">Anderes Objekt wählen</button></p>`;
      }
    }

    panel.innerHTML = `
      <h2>Durchführung</h2>
      ${kalib}
      ${obj}
      <p id="exp-meldung" class="exp-meldung" aria-live="polite">${esc(zustand.meldung)}</p>
      <h3>Messtabelle</h3>
      <table class="exp-tabelle">
        <thead><tr><th>Objekt</th><th>Schritte</th><th>Schrittlänge in m</th><th>Entfernung in m</th></tr></thead>
        <tbody>${zustand.messungen.map(m => `<tr><td>${esc(m.name)}</td><td>${m.schritte}</td><td>${komma(m.schrittlaenge, 3)}</td><td>${komma(m.entfernung, 1)}</td></tr>`).join("") || '<tr><td colspan="4">noch leer</td></tr>'}</tbody>
      </table>
      <p>${n} von ${OBJEKTE.length} Objekten gemessen.${n >= 1 && n < OBJEKTE.length ? " Auswerten geht schon — aber alle drei lohnen sich!" : ""}</p>
      <button class="knopf" id="exp-weiter2" ${n >= 1 ? "" : "disabled"}>Zur Auswertung</button>`;

    panel.querySelector("#exp-gehen")?.addEventListener("click", () => {
      zustand.kalibLaeuft = true; zustand.objekt = null; zustand.gezaehlt = NaN; zustand.meldung = "";
      zeichne(); panelMessen();
    });
    panel.querySelector("#exp-kalib")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const N = kalibrierSchritte(zustand.kalibWerte.length + 1);
      const eingabe = parseDezimal(panel.querySelector("#exp-sl").value);
      if (!ablesungOk(eingabe, schrittlaengeAus(KALIBRIER_STRECKE, N), TOL_SCHRITTLAENGE)) {
        melde(`✗ Prüf deine Rechnung: 20,00 ÷ ${N}, auf 3 Stellen gerundet. Du schaffst das!`);
        return;
      }
      zustand.kalibWerte.push(eingabe);
      zustand.kalibLaeuft = false;
      zustand.meldung = "✓ Notiert! " + (zustand.kalibWerte.length < KALIBRIER_MAX
        ? "Noch ein Durchgang macht dein Mittel genauer — oder geh direkt ins Gelände."
        : "Dreimal gegangen, gemittelt — bessere Kalibrierung geht kaum.");
      panelMessen();
    });
    panel.querySelectorAll("[data-objekt]").forEach(b => b.addEventListener("click", () => {
      const gewaehlt = OBJEKTE.find(x => x.id === b.dataset.objekt);
      zustand.objekt = gewaehlt;
      zustand.distanz = gewaehlt.start; zustand.zeichenD = gewaehlt.start;
      zustand.gezaehlt = NaN; zustand.meldung = "";
      zeichne(); panelMessen();
    }));
    panel.querySelectorAll("[data-geh]").forEach(b => b.addEventListener("click", () =>
      geheZu(zustand.distanz + Number(b.dataset.geh))));
    panel.querySelector("#exp-zaehlen")?.addEventListener("click", () => {
      zustand.gezaehlt = zaehlSchritte(zustand.objekt); zustand.meldung = "";
      panelMessen();
    });
    panel.querySelector("#exp-entfernung")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const obj2 = zustand.objekt, sl2 = meineSchrittlaenge();
      const eingabe = parseDezimal(panel.querySelector("#exp-ent").value);
      if (!ablesungOk(eingabe, entfernungAus(zustand.gezaehlt, sl2), TOL_ENTFERNUNG)) {
        melde(`✗ Rechne nach: ${zustand.gezaehlt} × ${komma(sl2, 3)} m. Eine Stelle nach dem Komma genügt.`);
        return;
      }
      zustand.messungen.push({ id: obj2.id, name: obj2.name, schritte: zustand.gezaehlt, schrittlaenge: sl2, entfernung: eingabe });
      zustand.objekt = null; zustand.gezaehlt = NaN;
      zustand.meldung = `✓ ${obj2.name} vermessen!` + (zustand.messungen.length < OBJEKTE.length
        ? " Wähle das nächste Objekt." : " Alle drei geschafft — ab zur Auswertung!");
      zeichne(); panelMessen();
    });
    panel.querySelector("#exp-abbruch")?.addEventListener("click", () => {
      zustand.objekt = null; zustand.gezaehlt = NaN; zustand.meldung = "";
      zeichne(); panelMessen();
    });
    panel.querySelector("#exp-weiter2")?.addEventListener("click", () => wechslePhase("auswerten"));
  }

  const ERKLAERUNG = `✓ Genau! Dein kleines Pappdreieck und das große Geländedreieck (Auge → Punkt auf Augenhöhe am Objekt → Spitze) haben dieselben Winkel — sie sind <strong>ähnlich</strong>. Bei 45° sind Gegenkathete und Ankathete <strong>gleich lang</strong>, das Verhältnis ist 1 : 1. Der Peilstrahl streckt das kleine Dreieck nur auf das große (Strahlensatz!) — Verhältnisse bleiben dabei gleich. Also: Höhe über Augenhöhe = Entfernung.`;

  function panelAuswerten() {
    const zeilen = zustand.messungen;
    if (!zeilen.length) {
      panel.innerHTML = `<h2>Auswertung</h2><p>Noch keine Messwerte! Geh zu „2 · Durchführung", kalibriere dein Schrittmaß und vermiss mindestens ein Objekt.</p>`;
      return;
    }
    panel.innerHTML = `
      <h2>Auswertung</h2>
      <p>Am ✓-Punkt gilt: <strong>Höhe über Augenhöhe = Entfernung</strong>. Es bleibt eine Addition: <strong>h = Entfernung + 1,60 m</strong>. Rechne und trag ein:</p>
      <table class="exp-tabelle">
        <thead><tr><th>Objekt</th><th>Entfernung in m</th><th>h = Entfernung + 1,60 m</th><th></th></tr></thead>
        <tbody>${zeilen.map((m, i) => `<tr><td>${esc(m.name)}</td><td>${komma(m.entfernung, 1)}</td><td><input class="exp-eingabe" data-zeile="${i}" inputmode="decimal" autocomplete="off" aria-label="Höhe ${esc(m.name)} in Metern"> m</td><td data-status="${i}"></td></tr>`).join("")}</tbody>
      </table>
      <p id="exp-meldung" class="exp-meldung" aria-live="polite"></p>
      <div id="exp-aufdeckung"></div>
      <h3>Warum funktioniert das?</h3>
      <label for="exp-warum">Warum gilt am ✓-Punkt „Höhe über Augenhöhe = Entfernung"?</label>
      <select id="exp-warum" class="exp-wahl">
        <option value="">— wähle eine Begründung —</option>
        <option value="parallel">Weil Strahlen parallel verlaufen.</option>
        <option value="dreieck">Weil das Peildreieck bei 45° gleichschenklig ist: Gegenkathete = Ankathete.</option>
        <option value="zufall">Zufall — die Methode passt nur ungefähr.</option>
      </select>
      <p id="exp-warum-feedback" class="exp-meldung" aria-live="polite"></p>
      <details class="exp-fehler"><summary>Fehlerbetrachtung — wie genau ist Schritte-Zählen?</summary>
        <p><strong>Schrittlängen-Fehler wirken proportional:</strong> Beim Windrad zählst du rund 80 Schritte. Liegt deine Schrittlänge nur 1 cm daneben, macht das 80 · 1 cm = <strong>0,8 m</strong> Fehler in der Höhe — bei der Eiche (≈ 22 Schritte) nur gut 0,2 m. Je weiter weg, desto wichtiger die Kalibrierung: drei Durchgänge, Mittelwert!</p>
        <p><strong>Ganze Schritte:</strong> Du zählst nur ganze Schritte — allein das Runden kann gut einen halben Schritt (± 0,4 m) ausmachen.</p>
        <p><strong>Gelände:</strong> Die 45°-Idee setzt ebenen Boden voraus. Am Hang stimmen weder die waagerechte Entfernung noch die Augenhöhe über dem Fußpunkt.</p>
        <p><strong>Augenhöhe:</strong> Hier fest 1,60 m — draußen misst du deine eigene, sonst wandert der Fehler direkt in h.</p>
      </details>
      <p><strong>Quervergleich — die Schattenmethode:</strong> Es geht auch ohne Dreieck: Miss den Schatten des Baums und gleichzeitig den eines Stabs bekannter Höhe. Weil die Sonnenstrahlen parallel sind, gilt nach dem Strahlensatz Baumhöhe : Baumschatten = Stabhöhe : Stabschatten. Beide Methoden steckst du im Thema <a href="../../../mathematik/klasse-9/aehnlichkeit-und-strahlensaetze/index.html">Ähnlichkeit und Strahlensätze</a> in die gleiche Schublade: ähnliche Dreiecke.</p>
      <div class="exp-knopfzeile">
        <button class="knopf zweitrangig" id="exp-zurueck">Mehr messen</button>
        <button class="knopf zweitrangig" id="exp-csv">Messwerte als CSV speichern</button>
        <button class="knopf" id="exp-neustart">Neues Experiment</button>
      </div>`;

    const markiere = (i, ok) => {
      const zelle = panel.querySelector(`[data-status="${i}"]`);
      if (zelle) zelle.textContent = ok ? "✓" : "✗";
    };
    panel.querySelectorAll("input[data-zeile]").forEach(inp => {
      const i = Number(inp.dataset.zeile), m = zeilen[i];
      if (zustand.hoehen[m.id] !== undefined) { inp.value = komma(zustand.hoehen[m.id], 1); markiere(i, true); }
      inp.addEventListener("change", () => {
        const wert = parseDezimal(inp.value);
        if (!Number.isFinite(wert)) {
          delete zustand.hoehen[m.id]; markiere(i, false);
          melde("Gib eine Zahl ein — Komma oder Punkt, beides geht.");
        } else if (ablesungOk(wert, hoeheAus(m.entfernung), TOL_HOEHE)) {
          zustand.hoehen[m.id] = wert; markiere(i, true);
          melde(`✓ ${m.name}: h ≈ ${komma(wert, 1)} m — richtig gerechnet!`);
        } else {
          delete zustand.hoehen[m.id]; markiere(i, false);
          melde(`✗ Prüf deine Rechnung: h = ${komma(m.entfernung, 1)} m + 1,60 m. Du schaffst das!`);
        }
        zeigeAufdeckung();
      });
    });

    const warum = panel.querySelector("#exp-warum");
    const fb = panel.querySelector("#exp-warum-feedback");
    if (zustand.begruendet) { warum.value = "dreieck"; fb.innerHTML = ERKLAERUNG; }
    warum.addEventListener("change", () => {
      const w = warum.value;
      if (w === "dreieck") { zustand.begruendet = true; fb.innerHTML = ERKLAERUNG; }
      else if (w === "parallel") fb.textContent = "✗ Parallele (Sonnen-)Strahlen sind die Idee der Schattenmethode. Hier peilst du selbst — entscheidend ist die Form des 45°-Dreiecks. Schau es dir noch einmal an!";
      else if (w === "zufall") fb.textContent = "✗ Kein Zufall! Die Geometrie steckt im 45°-Winkel. Tipp: Wie lang sind die beiden Katheten eines gleichschenklig-rechtwinkligen Dreiecks im Vergleich?";
      else fb.textContent = "";
    });

    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      csvHerunterladen("hoehenmessung-messwerte.csv",
        ["Objekt", "Schritte", "Schrittlänge in m", "Entfernung in m", "h gemessen in m", "wahre Höhe in m", "Abweichung in %"],
        zustand.messungen.map(m => {
          const o = OBJEKTE.find(x => x.id === m.id), h = zustand.hoehen[m.id];
          return [m.name, String(m.schritte), m.schrittlaenge, m.entfernung,
            h !== undefined ? h : "", h !== undefined ? o.hoehe : "",
            h !== undefined ? abweichungProzent(h, o.hoehe) : ""];
        }));
    });
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      zustand.kalibLaeuft = false; zustand.kalibWerte = [];
      zustand.objekt = null; zustand.distanz = NaN; zustand.zeichenD = NaN;
      zustand.gezaehlt = NaN; zustand.messungen = []; zustand.hoehen = {};
      zustand.begruendet = false; zustand.meldung = "";
      zeichne(); wechslePhase("aufbau");
    });
    zeigeAufdeckung();
  }

  function zeigeAufdeckung() {
    const box = panel.querySelector("#exp-aufdeckung");
    if (!box) return;
    const fertige = zustand.messungen.filter(m => zustand.hoehen[m.id] !== undefined);
    if (!fertige.length) { box.innerHTML = ""; return; }
    box.innerHTML = "<h3>Aufdeckung: die wahren Höhen</h3>" + fertige.map(m => {
      const o = OBJEKTE.find(x => x.id === m.id);
      const abw = abweichungProzent(zustand.hoehen[m.id], o.hoehe);
      const lob = Math.abs(abw) <= 3 ? "Stark — fast auf den Meter genau!"
        : Math.abs(abw) <= 6 ? "Gut! Für Schritte als Maßband ist das richtig ordentlich."
        : "Schau in die Fehlerbetrachtung: Wo könnte die Abweichung herkommen?";
      return `<p class="exp-hinweis"><strong>${esc(m.name)}:</strong> wahre Höhe <strong>${komma(o.hoehe, 1)} m</strong> — du hast ${komma(zustand.hoehen[m.id], 1)} m gemessen, Abweichung ${(abw >= 0 ? "+" : "") + komma(abw, 1)} %. ${lob}</p>`;
    }).join("");
  }

  function zeigePhase(id) {
    zustand.phase = id;
    if (id === "aufbau") panelAufbau();
    else if (id === "messen") panelMessen();
    else panelAuswerten();
  }

  zeichne();
  wechslePhase("aufbau");
}
