// experiment.js — Interaktives Experiment: Wellenlängenmessung am Gitter (Qualifikationsphase).
// Realitätsnahe Messpraxis statt idealer Simulation: Schirmabstand mit dem
// Maßband ablesen, jedes Beugungsmaximum LINKS UND RECHTS am mm-Lineal
// ausmessen (Lupe), mitteln, λ = g·sin(arctan(ā/e))/k selbst rechnen — bis
// zum unbekannten Laser X. Eingebaute Tücken wie im echten Praktikum:
// Die Lineal-Null sitzt 2 mm neben der Strahlachse (das Mitteln über beide
// Seiten hebt den Versatz exakt auf), und beim feinen 600er-Gitter führt
// die Kleinwinkel-Näherung (sin ≈ tan) rund 8 % in die Irre.
// Alle Streuungen sind deterministisch geseedet — die TESTS laufen in Node.

import {
  streuung, parseDezimal, komma, ablesungOk, esc, mittel,
  farbe, bauePhasen, csvHerunterladen
} from "../../../assets/js/experiment/helfer.js";

// ---------- Geräte ----------
export const LASER = [
  { id: "rot",   kurz: "rot",  name: "Laser rot",  lambdaNm: 632.8, aufdruck: "632,8 nm" },
  { id: "gruen", kurz: "grün", name: "Laser grün", lambdaNm: 532.0, aufdruck: "532,0 nm" },
  { id: "x",     kurz: "X",    name: "Laser X",    lambdaNm: 405.0, geheim: true }
];
export const GITTER = [100, 300, 600];   // Striche pro mm
export const SCHIRM_HALB_MM = 300;       // Lineal reicht von −300 mm bis +300 mm
export const MITTEN_VERSATZ_MM = 2;      // Lineal-Null sitzt 2 mm neben der Strahlachse (systematischer Fehler!)
export const ABLESE_TOLERANZ_MM = 2;     // Toleranz für die Lineal-Ablesung in der Lupe
export const E_TOLERANZ_M = 0.01;        // Toleranz für den notierten Schirmabstand
export const LAMBDA_TOLERANZ_NM = 4;     // Toleranz für die selbst gerechnete Wellenlänge
export const X_AUSWAHL_NM = [405, 445, 473]; // Auswahl für die Laser-X-Bestimmung

// ---------- Modell (rein, Node-testbar) ----------
// Gitterkonstante in m: g = 1 mm / Strichzahl
export function gitterkonstanteM(strichProMm) { return 1e-3 / strichProMm; }

// höchste Ordnung mit sin α = k·λ/g ≤ 1
export function maxOrdnung(lambdaNm, strichProMm) {
  return Math.floor(gitterkonstanteM(strichProMm) / (lambdaNm * 1e-9));
}

// wahre Lage des k-ten Maximums auf dem Schirm (m, ab Strahlachse): a = e·tan(arcsin(k·λ/g))
export function positionAkM(lambdaNm, strichProMm, eM, k) {
  const s = k * lambdaNm * 1e-9 / gitterkonstanteM(strichProMm);
  if (!(s < 1)) return NaN; // diese Ordnung existiert nicht (bzw. läuft parallel zum Schirm)
  return eM * Math.tan(Math.asin(s));
}

// Lineal-Ablesung in mm: physikalische Lage plus Mittenversatz; seite = +1 (rechts) / −1 (links)
export function ablesungWahrMm(aM, seite) {
  return seite * aM * 1000 + MITTEN_VERSATZ_MM;
}
// … plus deterministische Ablese-/Justagestreuung (±0,75 mm)
export function ablesungAnzeigeMm(aM, k, seite) {
  return ablesungWahrMm(aM, seite) + streuung("a:" + k + ":" + (seite > 0 ? "rechts" : "links"), 1.5);
}

// Mittelung beider Seiten: ā = (|links| + |rechts|) / 2 — kürzt den Mittenversatz exakt heraus
export function mittelLinksRechts(linksMm, rechtsMm) {
  return (Math.abs(linksMm) + Math.abs(rechtsMm)) / 2;
}

// Auswertung: λ in nm aus ā (mm), e (m) und k — exakt, OHNE Kleinwinkel-Näherung
export function lambdaAusMessungNm(strichProMm, aQuerMm, eM, k) {
  if (!(k >= 1) || !(eM > 0) || !(aQuerMm > 0)) return NaN;
  return gitterkonstanteM(strichProMm) * Math.sin(Math.atan(aQuerMm / 1000 / eM)) / k * 1e9;
}
// bewusst FALSCHE Kleinwinkel-Näherung λ ≈ g·ā/(e·k) — nur für den sin-≠-tan-Hinweis
export function lambdaKleinwinkelNm(strichProMm, aQuerMm, eM, k) {
  return gitterkonstanteM(strichProMm) * (aQuerMm / 1000 / eM) / k * 1e9;
}

// Maßband zeigt den wahren Abstand plus deterministische Streuung (±2,5 mm)
export function massbandAnzeigeM(eWahrM) {
  return eWahrM + streuung("e:" + eWahrM.toFixed(2), 0.005);
}

// alle Maxima, deren Lineal-Ablesung auf den Schirm fällt (inkl. 0. Ordnung)
export function sichtbareMaxima(lambdaNm, strichProMm, eM) {
  const liste = [{ k: 0, seite: 1, ableseMm: MITTEN_VERSATZ_MM }];
  const kmax = maxOrdnung(lambdaNm, strichProMm);
  for (let k = 1; k <= kmax; k++) {
    const a = positionAkM(lambdaNm, strichProMm, eM, k);
    if (!Number.isFinite(a)) continue;
    for (const seite of [-1, 1]) {
      const ab = ablesungAnzeigeMm(a, k, seite);
      if (Math.abs(ab) <= SCHIRM_HALB_MM) liste.push({ k, seite, ableseMm: ab });
    }
  }
  return liste.sort((p, q) => p.ableseMm - q.ableseMm);
}

// Mindestprotokoll. Hinweis: Beim 600er liegt k = 2 (rot) für jedes e ≥ 0,5 m
// jenseits des Lineals (a₂ ≥ 0,58 m) — die 2. Ordnung wird darum am gröberen
// Gitter verlangt. Genau diese Erfahrung sollen die Schüler machen.
export function protokollStatus(zeilen) {
  return [
    { text: "Roter Laser am 600er-Gitter: 1. Ordnung (k = 1)", ok: zeilen.some(z => z.laserId === "rot" && z.gitter === 600 && z.k === 1) },
    { text: "Roter Laser: 2. Ordnung (k = 2) — am 100er oder 300er; das 600er wirft sie am Lineal vorbei", ok: zeilen.some(z => z.laserId === "rot" && z.k === 2) },
    { text: "Eine weitere Kombination: grüner Laser, beliebiges Gitter", ok: zeilen.some(z => z.laserId === "gruen") },
    { text: "Laser X: mindestens eine Ordnung ausmessen", ok: zeilen.some(z => z.laserId === "x") }
  ];
}

// Einordnung des Laser-Mittelwerts gegen den Aufdruck (nur Rückmeldung, keine Note)
export function bewertungLambda(gemessenNm, wahrNm) {
  const abw = Math.abs(gemessenNm - wahrNm) / wahrNm * 100;
  if (abw <= 1) return { stufe: "sehr gut", abw };
  if (abw <= 2.5) return { stufe: "gut", abw };
  return { stufe: "nochmal prüfen", abw };
}

// ---------- Prüffälle (analytisch bekannte Sollwerte) ----------
export const pruefFaelle = [
  { was: "a1 (632,8 nm, 600er, e = 1,5 m)", soll: 0.61562, tol: 2e-4, ist: () => positionAkM(632.8, 600, 1.5, 1) },
  { was: "a2 (632,8 nm, 300er, e = 0,5 m)", soll: 0.20521, tol: 2e-4, ist: () => positionAkM(632.8, 300, 0.5, 2) },
  { was: "a1 (405,0 nm, 600er, e = 0,5 m)", soll: 0.12525, tol: 2e-4, ist: () => positionAkM(405, 600, 0.5, 1) },
  { was: "a1 (532,0 nm, 300er, e = 2,0 m)", soll: 0.32334, tol: 2e-4, ist: () => positionAkM(532, 300, 2.0, 1) },
  { was: "k_max (632,8 nm, 600er)",         soll: 2,       tol: 0,    ist: () => maxOrdnung(632.8, 600) }
];

export const TESTS = [
  { name: "Prüffälle: a_k-Kontrollwerte und k_max",
    ok: () => pruefFaelle.every(p => Math.abs(p.ist() - p.soll) <= p.tol) },
  { name: "k_max über alle Kombinationen (600er+rot → 2 Ordnungen)",
    ok: () => maxOrdnung(632.8, 600) === 2 && maxOrdnung(532, 600) === 3 && maxOrdnung(405, 600) === 4 &&
              maxOrdnung(632.8, 300) === 5 && maxOrdnung(632.8, 100) === 15 },
  { name: "k über k_max existiert nicht (sin größer 1)",
    ok: () => !Number.isFinite(positionAkM(632.8, 600, 1.5, 3)) && Number.isFinite(positionAkM(632.8, 600, 1.5, 2)) },
  { name: "λ-Pipeline aus perfekten Werten exakt (alle Laser/Gitter/e)",
    ok: () => LASER.every(l => GITTER.every(g => [0.5, 1.2, 2.0].every(e => {
      const kmax = Math.min(3, maxOrdnung(l.lambdaNm, g));
      for (let k = 1; k <= kmax; k++) {
        const a = positionAkM(l.lambdaNm, g, e, k);
        if (!Number.isFinite(a)) continue;
        const aq = mittelLinksRechts(ablesungWahrMm(a, -1), ablesungWahrMm(a, 1));
        if (Math.abs(lambdaAusMessungNm(g, aq, e, k) - l.lambdaNm) > 1e-6) return false;
      }
      return true;
    }))) },
  { name: "Mittenversatz: links/rechts asymmetrisch, Mittel exakt",
    ok: () => {
      const a = positionAkM(632.8, 600, 0.5, 1);
      const l = ablesungWahrMm(a, -1), r = ablesungWahrMm(a, 1);
      return Math.abs(Math.abs(l) - Math.abs(r)) > 3.9 &&
             Math.abs(mittelLinksRechts(l, r) - a * 1000) < 1e-9;
    } },
  { name: "Ablese-Streuung innerhalb ±0,75 mm, deterministisch, seitenabhängig",
    ok: () => {
      for (let k = 1; k <= 4; k++) for (const s of [-1, 1]) {
        if (Math.abs(ablesungAnzeigeMm(0.1, k, s) - ablesungWahrMm(0.1, s)) > 0.75) return false;
        if (ablesungAnzeigeMm(0.1, k, s) !== ablesungAnzeigeMm(0.1, k, s)) return false;
      }
      return ablesungAnzeigeMm(0.1, 1, 1) !== ablesungAnzeigeMm(0.1, 1, -1);
    } },
  { name: "Maßband-Streuung innerhalb ±2,5 mm, deterministisch",
    ok: () => {
      for (let i = 0; i <= 150; i++) {
        const e = 0.5 + i * 0.01;
        if (Math.abs(massbandAnzeigeM(e) - e) > 0.0025) return false;
        if (massbandAnzeigeM(e) !== massbandAnzeigeM(e)) return false;
      }
      return true;
    } },
  { name: "Ehrliche Ablesung (mit Streuung) trifft λ auf unter 3 nm",
    ok: () => {
      const a = positionAkM(632.8, 600, 0.5, 1);
      const aq = mittelLinksRechts(ablesungAnzeigeMm(a, 1, -1), ablesungAnzeigeMm(a, 1, 1));
      return Math.abs(lambdaAusMessungNm(600, aq, 0.5, 1) - 632.8) < 3;
    } },
  { name: "Kleinwinkel-Falle: 600er über 7 % daneben, 100er unter 0,5 %",
    ok: () => {
      const fehler = g => {
        const a = positionAkM(632.8, g, 0.5, 1);
        return lambdaKleinwinkelNm(g, a * 1000, 0.5, 1) / 632.8 - 1;
      };
      return fehler(600) > 0.07 && fehler(100) < 0.005;
    } },
  { name: "Laser X landet eindeutig bei 405 nm",
    ok: () => {
      const a = positionAkM(405, 600, 0.5, 1);
      const aq = mittelLinksRechts(ablesungAnzeigeMm(a, 1, -1), ablesungAnzeigeMm(a, 1, 1));
      const lx = lambdaAusMessungNm(600, aq, 0.5, 1);
      return X_AUSWAHL_NM.reduce((b, w) => Math.abs(w - lx) < Math.abs(b - lx) ? w : b) === 405;
    } },
  { name: "Mindestprotokoll-Logik (leer alles offen, voll alles erfüllt)",
    ok: () => {
      const leer = protokollStatus([]);
      const voll = protokollStatus([
        { laserId: "rot", gitter: 600, k: 1 }, { laserId: "rot", gitter: 300, k: 2 },
        { laserId: "gruen", gitter: 300, k: 1 }, { laserId: "x", gitter: 600, k: 1 }
      ]);
      return leer.every(s => !s.ok) && voll.every(s => s.ok);
    } },
  { name: "Helfer eingebunden: parseDezimal und ablesungOk",
    ok: () => parseDezimal("203,5") === 203.5 && parseDezimal("203.5") === 203.5 &&
              Number.isNaN(parseDezimal("abc")) &&
              ablesungOk(204.9, 203.4, ABLESE_TOLERANZ_MM) && !ablesungOk(206.0, 203.4, ABLESE_TOLERANZ_MM) }
];

// ======================================================================
// Browser-Teil
// ======================================================================

// Laserfarbe aus der Wellenlänge — bewusste Ausnahme von den CSS-Variablen,
// denn die Farbe IST hier die Messgröße (sichtbar in Hell- und Dunkelmodus).
function lambdaFarbe(nm, alpha = 1) {
  let h;
  if (nm < 440) h = 270 - (nm - 380) / 60 * 30;
  else if (nm < 490) h = 240 - (nm - 440) / 50 * 60;
  else if (nm < 530) h = 180 - (nm - 490) / 40 * 60;
  else if (nm < 580) h = 120 - (nm - 530) / 50 * 60;
  else if (nm < 645) h = 60 - (nm - 580) / 65 * 60;
  else h = 0;
  return "hsla(" + Math.round(h) + ", 95%, 55%, " + alpha + ")";
}

const TIEF = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉" };
const subK = k => String(k).split("").map(z => TIEF[z] || z).join("");

export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;

  const zustand = {
    laser: LASER[0], gitter: 600, eWahr: 0.5,
    eEintrag: null,   // notierter Schirmabstand in m (null = noch nicht abgelesen)
    offen: {},        // "laserId|gitter|k" → { links?, rechts? } (Beträge in mm)
    lupe: null,       // { k, seite, ableseMm }
    zeilen: [],       // { laserId, kurz, gitter, k, links, rechts, aQuer, e, lambdaEintrag?, lambdaOk? }
    xGeloest: false, frageFeedback: null,
    meldung: "", phase: "aufbau"
  };

  const wechsle = bauePhasen(wurzel, [
    { id: "aufbau", label: "Aufbau" },
    { id: "messen", label: "Durchführung" },
    { id: "auswerten", label: "Auswertung" }
  ], wechslePhase);

  wurzel.insertAdjacentHTML("beforeend", `
    <div class="exp-flaeche">
      <div class="exp-links">
        <canvas id="exp-canvas" width="360" height="640" aria-label="Draufsicht auf den Versuch: unten der Laser, in der Mitte das Strichgitter, oben der Schirm mit einem Millimeter-Lineal von minus 300 bis plus 300. Auf dem Schirm leuchten die Beugungsmaxima; sie lassen sich anklicken. Rechts läuft ein Maßband vom Gitter zum Schirm, sein Messwert steht daneben."></canvas>
      </div>
      <div class="exp-rechts" id="exp-panel"></div>
    </div>`);

  const canvas = wurzel.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = wurzel.querySelector("#exp-panel");

  // Geometrie der Zeichnung
  const MITTE_X = 180, SCHIRM_Y = 66, PX_PRO_MM = 328 / 600, PX_PRO_M = 220, LASER_Y = 556;
  let dotTreffer = []; // Klickflächen der Lichtpunkte

  function gitterY() { return SCHIRM_Y + zustand.eWahr * PX_PRO_M; }
  function maximaJetzt() { return sichtbareMaxima(zustand.laser.lambdaNm, zustand.gitter, zustand.eWahr); }

  // ---------- Zeichnung (Draufsicht) ----------
  function zeichne() {
    const w = canvas.width, h = canvas.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
          cAkzent = farbe("--akzent"), cFlaeche = farbe("--flaeche");
    ctx.clearRect(0, 0, w, h);
    const gy = gitterY();
    const nullX = MITTE_X - MITTEN_VERSATZ_MM * PX_PRO_MM; // Lineal-Null neben der Achse

    // Schirm mit mm-Lineal
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cLeise; ctx.lineWidth = 1.5;
    ctx.fillRect(16, 34, 328, 32); ctx.strokeRect(16, 34, 328, 32);
    ctx.font = "9px system-ui, sans-serif"; ctx.textAlign = "center";
    for (let mm = -SCHIRM_HALB_MM; mm <= SCHIRM_HALB_MM; mm += 10) {
      const x = nullX + mm * PX_PRO_MM;
      if (x < 18 || x > 342) continue;
      const lang = mm % 100 === 0 ? 14 : mm % 50 === 0 ? 10 : 6;
      ctx.strokeStyle = mm % 100 === 0 ? cText : cLeise;
      ctx.beginPath(); ctx.moveTo(x, SCHIRM_Y); ctx.lineTo(x, SCHIRM_Y - lang); ctx.stroke();
      if (mm % 100 === 0) { ctx.fillStyle = cText; ctx.fillText(String(mm), x, 46); }
    }
    ctx.fillStyle = cText; ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "left";
    ctx.fillText("Schirm mit mm-Lineal", 16, 28);

    // Beugungsordnungen: Strahlfächer und Lichtpunkte (Laserfarbe aus λ)
    const maxima = maximaJetzt();
    dotTreffer = [];
    for (const m of maxima) {
      const x = nullX + m.ableseMm * PX_PRO_MM;
      ctx.strokeStyle = lambdaFarbe(zustand.laser.lambdaNm, m.k === 0 ? 0.75 : 0.3);
      ctx.lineWidth = m.k === 0 ? 2.5 : 1.5;
      ctx.beginPath(); ctx.moveTo(MITTE_X, gy); ctx.lineTo(x, SCHIRM_Y + 3); ctx.stroke();
      ctx.fillStyle = lambdaFarbe(zustand.laser.lambdaNm, 1);
      ctx.beginPath(); ctx.arc(x, SCHIRM_Y + 3, m.k === 0 ? 5 : 4, 0, 7); ctx.fill();
      dotTreffer.push({ x, y: SCHIRM_Y + 3, k: m.k, seite: m.seite });
    }
    if (maxima.length === 1) {
      ctx.fillStyle = cAkzent; ctx.font = "bold 13px system-ui, sans-serif"; ctx.textAlign = "center";
      ctx.fillText("Nur das 0. Maximum trifft das Lineal —", MITTE_X, 112);
      ctx.fillText("Schirmabstand e verkleinern!", MITTE_X, 130);
    }

    // Maßband (Gitter → Schirm) mit Messwert
    ctx.strokeStyle = cAkzent; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(336, SCHIRM_Y + 2); ctx.lineTo(336, gy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(330, SCHIRM_Y + 2); ctx.lineTo(342, SCHIRM_Y + 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(330, gy); ctx.lineTo(342, gy); ctx.stroke();
    ctx.save();
    ctx.translate(350, (SCHIRM_Y + gy) / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = cAkzent; ctx.font = "bold 12px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Maßband " + komma(massbandAnzeigeM(zustand.eWahr), 3) + " m", 0, 0);
    ctx.restore();

    // Laserstrahl bis zum Gitter
    ctx.strokeStyle = lambdaFarbe(zustand.laser.lambdaNm, 0.9); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(MITTE_X, LASER_Y); ctx.lineTo(MITTE_X, gy); ctx.stroke();

    // Gitter (verschiebt sich mit e — der Schirm bleibt fest)
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.fillRect(MITTE_X - 28, gy - 6, 56, 12); ctx.strokeRect(MITTE_X - 28, gy - 6, 56, 12);
    ctx.strokeStyle = cLeise; ctx.lineWidth = 1;
    for (let x = MITTE_X - 22; x <= MITTE_X + 22; x += 5) {
      ctx.beginPath(); ctx.moveTo(x, gy - 4); ctx.lineTo(x, gy + 4); ctx.stroke();
    }
    ctx.fillStyle = cText; ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "left";
    ctx.fillText("Gitter " + zustand.gitter + "/mm", MITTE_X + 36, gy + 4);

    // Lasergehäuse mit Aufdruck
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.fillRect(MITTE_X - 16, LASER_Y, 32, 50); ctx.strokeRect(MITTE_X - 16, LASER_Y, 32, 50);
    ctx.fillStyle = lambdaFarbe(zustand.laser.lambdaNm, 1);
    ctx.beginPath(); ctx.arc(MITTE_X, LASER_Y, 4, 0, 7); ctx.fill();
    ctx.fillStyle = cText; ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText(zustand.laser.name, MITTE_X, 622);
    ctx.fillText(zustand.laser.geheim ? "Aufdruck: λ = ???" : "Aufdruck: λ = " + zustand.laser.aufdruck, MITTE_X, 636);
    ctx.textAlign = "start";
  }

  // Klick auf einen Lichtpunkt → Lupe
  canvas.addEventListener("click", ev => {
    const r = canvas.getBoundingClientRect();
    const x = (ev.clientX - r.left) * canvas.width / r.width;
    const y = (ev.clientY - r.top) * canvas.height / r.height;
    const t = dotTreffer.find(d => Math.hypot(d.x - x, d.y - y) <= 14);
    if (t) oeffneLupe(t.k, t.seite);
  });

  function oeffneLupe(k, seite) {
    if (zustand.phase !== "messen") wechsle("messen");
    if (k > 0 && zustand.eEintrag === null) {
      zustand.meldung = "Notiere zuerst den Schirmabstand: Maßband ablesen und e eintragen.";
      panelMessen(); return;
    }
    const ablese = k === 0 ? MITTEN_VERSATZ_MM
      : ablesungAnzeigeMm(positionAkM(zustand.laser.lambdaNm, zustand.gitter, zustand.eWahr, k), k, seite);
    zustand.lupe = { k, seite, ableseMm: ablese };
    panelMessen();
  }

  // ---------- Lupe (vergrößerter Linealausschnitt) ----------
  function zeichneLupe() {
    const lc = panel.querySelector("#exp-lupe");
    if (!lc || !zustand.lupe) return;
    const c = lc.getContext("2d");
    const W = lc.width, H = lc.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
          cAkzent = farbe("--akzent"), cFlaeche = farbe("--flaeche");
    const mitte = Math.round(zustand.lupe.ableseMm), PXMM = 13;
    c.clearRect(0, 0, W, H);
    c.fillStyle = cFlaeche; c.fillRect(0, 24, W, 56);
    c.strokeStyle = cLeise; c.lineWidth = 1; c.strokeRect(0.5, 24.5, W - 1, 55);
    c.font = "12px system-ui, sans-serif";
    for (let mm = mitte - 13; mm <= mitte + 13; mm++) {
      const x = W / 2 + (mm - mitte) * PXMM;
      if (x < 4 || x > W - 4) continue;
      const lang = mm % 10 === 0 ? 26 : mm % 5 === 0 ? 18 : 11;
      c.strokeStyle = mm % 10 === 0 ? cText : cLeise;
      c.beginPath(); c.moveTo(x, 24); c.lineTo(x, 24 + lang); c.stroke();
      if (mm % 10 === 0) { c.fillStyle = cText; c.textAlign = "center"; c.fillText(String(mm), x, 72); }
    }
    c.fillStyle = cText; c.textAlign = "left"; c.font = "11px system-ui, sans-serif";
    c.fillText("mm-Lineal (Lupe)", 4, 14);
    // Lichtpunkt mit Schein und Ablesehilfe
    const xL = W / 2 + (zustand.lupe.ableseMm - mitte) * PXMM;
    const f = lambdaFarbe(zustand.laser.lambdaNm, 1);
    c.strokeStyle = cAkzent; c.setLineDash([3, 3]); c.lineWidth = 1;
    c.beginPath(); c.moveTo(xL, 96); c.lineTo(xL, 24); c.stroke(); c.setLineDash([]);
    c.fillStyle = f; c.globalAlpha = 0.3;
    c.beginPath(); c.arc(xL, 100, 13, 0, 7); c.fill();
    c.globalAlpha = 1;
    c.beginPath(); c.arc(xL, 100, 7, 0, 7); c.fill();
  }

  // ---------- Hilfen für die Panels ----------
  function zeigeMeldung() {
    const html = `<p id="exp-meldung" class="exp-meldung" aria-live="polite">${esc(zustand.meldung)}</p>`;
    zustand.meldung = "";
    return html;
  }
  const kurzName = z => `${z.kurz} · ${z.gitter}er`;

  function setzeKonfig(aenderung) {
    Object.assign(zustand, aenderung);
    zustand.offen = {}; zustand.lupe = null;
    zeichne();
  }

  function laserGitterWahl() {
    return `
      <div class="exp-regler">
        <label for="exp-laser">Laser:</label>
        <select id="exp-laser" class="exp-wahl">
          ${LASER.map((l, i) => `<option value="${i}"${zustand.laser === l ? " selected" : ""}>${esc(l.name)}${l.geheim ? " — λ unbekannt" : ` — Aufdruck ${esc(l.aufdruck)}`}</option>`).join("")}
        </select>
        <label for="exp-gitterwahl">Gitter:</label>
        <select id="exp-gitterwahl" class="exp-wahl">
          ${GITTER.map(g => `<option value="${g}"${zustand.gitter === g ? " selected" : ""}>${g} Striche/mm (Aufdruck: g = ${komma(1e6 / g, 1)} nm)</option>`).join("")}
        </select>
      </div>`;
  }
  function verdrahteWahl(nachWechsel) {
    panel.querySelector("#exp-laser").addEventListener("change", ev => {
      setzeKonfig({ laser: LASER[Number(ev.target.value)] }); nachWechsel();
    });
    panel.querySelector("#exp-gitterwahl").addEventListener("change", ev => {
      setzeKonfig({ gitter: Number(ev.target.value) }); nachWechsel();
    });
  }

  // ---------- Phase 1: Aufbau ----------
  function panelAufbau() {
    panel.innerHTML = `
      <h2>Aufbau und Geräte</h2>
      <p>Auf der optischen Bank stehen ein <strong>Laser</strong>, ein <strong>Strichgitter</strong> und im Abstand <em>e</em> dahinter ein fester <strong>Schirm</strong> mit mm-Lineal (±300 mm). Das Gitter beugt das Licht: Unter den Winkeln mit <em>sin&nbsp;α<sub>k</sub> = k·λ/g</em> entstehen helle Maxima (g&nbsp;=&nbsp;Gitterkonstante&nbsp;=&nbsp;1/Strichzahl). Aus der <strong>Lage der Maxima</strong> bestimmst du die Wellenlänge λ.</p>
      <p><strong>Plan:</strong> Schirmabstand <em>e</em> am Maßband ablesen und notieren. Dann jedes Maximum <strong>links und rechts</strong> mit der Lupe ausmessen — das System mittelt zu ā<sub>k</sub>. In der Auswertung rechnest du α&nbsp;=&nbsp;arctan(ā/e) und λ&nbsp;=&nbsp;g·sin&nbsp;α&nbsp;/&nbsp;k. Erst die bekannten Laser als Kontrolle (Aufdruck!), dann Laser X.</p>
      <p class="exp-hinweis">⚠ Laserschutz wie im echten Praktikum: nie in den Strahl blicken — auch nicht in den reflektierten. Hier passiert dir nichts, aber übe gleich die richtigen Handgriffe.</p>
      ${laserGitterWahl()}
      <p>Tipp: Je feiner das Gitter, desto weiter wandern die Maxima nach außen — beim 600er fliegt die 2. Ordnung sogar am Lineal vorbei. Wähle den Schirmabstand passend.</p>
      <button class="knopf" id="exp-weiter1">Zur Durchführung</button>`;
    verdrahteWahl(() => {});
    panel.querySelector("#exp-weiter1").addEventListener("click", () => wechsle("messen"));
  }

  // ---------- Phase 2: Durchführung ----------
  function panelMessen() {
    const maxima = maximaJetzt();
    const status = protokollStatus(zustand.zeilen);
    const eFehlt = zustand.eEintrag === null;
    const lupenTitel = zustand.lupe
      ? (zustand.lupe.k === 0 ? "0. Maximum (Mitte)" : `Maximum k = ${zustand.lupe.k}, ${zustand.lupe.seite < 0 ? "links" : "rechts"}`)
      : "";
    panel.innerHTML = `
      <h2>Durchführung</h2>
      ${laserGitterWahl()}
      <div class="exp-regler">
        <label for="exp-abstand">Schirmabstand einstellen (danach Maßband neu ablesen!):</label>
        <input type="range" id="exp-abstand" min="0.5" max="2" step="0.01" value="${zustand.eWahr}"
          aria-label="Schirmabstand zwischen 0,5 und 2 Metern; den Messwert zeigt das Maßband in der Zeichnung.">
      </div>
      <form id="exp-eform" class="exp-ablesen">
        <label for="exp-e">Maßband: e in m =</label>
        <input id="exp-e" inputmode="decimal" autocomplete="off" size="7" value="${eFehlt ? "" : komma(zustand.eEintrag, 3)}">
        <button class="knopf">Notieren</button>
        <strong id="exp-e-status">${eFehlt ? "✗ noch nicht notiert" : "✓ notiert"}</strong>
      </form>
      <div id="exp-lupe-block">${zustand.lupe ? `
        <h3>Lupe — ${lupenTitel}</h3>
        <canvas id="exp-lupe" class="exp-diagramm" width="340" height="118"
          aria-label="Lupenansicht des Lineals. Der Lichtpunkt liegt bei etwa ${komma(zustand.lupe.ableseMm, 1)} Millimetern."></canvas>
        ${zustand.lupe.k === 0
          ? `<p>Schau genau hin: Das 0. Maximum liegt <strong>nicht</strong> exakt auf der Null des Lineals. Merk dir das für die Auswertung — und miss deshalb immer beidseitig!</p>`
          : `<form id="exp-aform" class="exp-ablesen">
              <label for="exp-a">Ablesung in mm:</label>
              <input id="exp-a" inputmode="decimal" autocomplete="off" size="7">
              <button class="knopf">Übernehmen</button>
            </form>
            <p>Auf 1 mm genau ablesen (links ist das Vorzeichen egal — der Betrag zählt).</p>`}` : `
        <p>Klicke einen Lichtpunkt in der Zeichnung an (oder nutze die Knöpfe unten) — die Lupe zeigt dir das Lineal an dieser Stelle.</p>`}
      </div>
      <div class="exp-knopfzeile" aria-label="Maximum zum Ausmessen wählen">
        ${maxima.map(m => `<button class="knopf zweitrangig" data-k="${m.k}" data-seite="${m.seite}">${m.k === 0 ? "0. Max" : `k=${m.k} ${m.seite < 0 ? "links" : "rechts"}`}</button>`).join("")}
      </div>
      ${zeigeMeldung()}
      <h3>Messtabelle</h3>
      <table class="exp-tabelle">
        <thead><tr><th>Messung</th><th>k</th><th>|links| in mm</th><th>|rechts| in mm</th><th>ā in mm</th><th>e in m</th></tr></thead>
        <tbody>${zustand.zeilen.map(z =>
          `<tr><td>${esc(kurzName(z))}</td><td>${z.k}</td><td>${komma(z.links, 1)}</td><td>${komma(z.rechts, 1)}</td><td>${komma(z.aQuer, 1)}</td><td>${komma(z.e, 3)}</td></tr>`).join("")
          || '<tr><td colspan="6">noch leer</td></tr>'}</tbody>
      </table>
      <h3>Mindestens messen</h3>
      <ul>${status.map(s => `<li>${s.ok ? "✓" : "○"} ${esc(s.text)}</li>`).join("")}</ul>
      <button class="knopf" id="exp-weiter2" ${status.every(s => s.ok) ? "" : "disabled"}>Zur Auswertung</button>`;

    verdrahteWahl(panelMessen);

    // Schieberegler: Während des Ziehens nur die Zeichnung aktualisieren,
    // beim Loslassen das Panel neu aufbauen (sonst reißt das Ziehen ab).
    const regler = panel.querySelector("#exp-abstand");
    regler.addEventListener("input", ev => {
      zustand.eWahr = Number(ev.target.value);
      zustand.eEintrag = null; zustand.offen = {}; zustand.lupe = null;
      zeichne();
      panel.querySelector("#exp-e-status").textContent = "✗ Maßband neu ablesen!";
      panel.querySelector("#exp-e").value = "";
      panel.querySelector("#exp-lupe-block").innerHTML = "";
    });
    regler.addEventListener("change", () => {
      const hatteFokus = document.activeElement === regler;
      panelMessen();
      if (hatteFokus) panel.querySelector("#exp-abstand").focus(); // Tastatur: Fokus überlebt den Neuaufbau
    });

    panel.querySelector("#exp-eform").addEventListener("submit", ev => {
      ev.preventDefault();
      const ein = parseDezimal(panel.querySelector("#exp-e").value);
      if (!ablesungOk(ein, massbandAnzeigeM(zustand.eWahr), E_TOLERANZ_M)) {
        // kein Neuaufbau: Eingabe bleibt stehen und lässt sich korrigieren
        panel.querySelector("#exp-meldung").textContent = "✗ Schau noch einmal aufs Maßband in der Zeichnung — e in Metern, z. B. 0,502.";
        return;
      }
      zustand.eEintrag = ein;
      zustand.meldung = "✓ e notiert. Jetzt die Maxima anklicken und ausmessen — immer links UND rechts!";
      panelMessen();
    });

    panel.querySelectorAll("[data-k]").forEach(b => b.addEventListener("click", () =>
      oeffneLupe(Number(b.dataset.k), Number(b.dataset.seite))));

    panel.querySelector("#exp-aform")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const z = zustand.lupe;
      const ein = parseDezimal(panel.querySelector("#exp-a").value);
      if (!ablesungOk(Math.abs(ein), Math.abs(z.ableseMm), ABLESE_TOLERANZ_MM)) {
        // kein Neuaufbau: Lupe und Eingabe bleiben stehen
        panel.querySelector("#exp-meldung").textContent = "✗ Schau noch einmal in die Lupe: Wo sitzt die Mitte des Lichtpunkts? (Auf 1 mm genau.)";
        return;
      }
      const schluessel = `${zustand.laser.id}|${zustand.gitter}|${z.k}`;
      const o = zustand.offen[schluessel] || (zustand.offen[schluessel] = {});
      o[z.seite > 0 ? "rechts" : "links"] = Math.abs(ein);
      if (o.links !== undefined && o.rechts !== undefined) {
        const aQuer = mittelLinksRechts(o.links, o.rechts);
        const neu = { laserId: zustand.laser.id, kurz: zustand.laser.kurz, gitter: zustand.gitter,
                      k: z.k, links: o.links, rechts: o.rechts, aQuer, e: zustand.eEintrag };
        const idx = zustand.zeilen.findIndex(t => t.laserId === neu.laserId && t.gitter === neu.gitter && t.k === neu.k);
        if (idx >= 0) zustand.zeilen[idx] = neu; else zustand.zeilen.push(neu);
        zustand.meldung = `✓ ā${subK(z.k)} = (|links| + |rechts|) / 2 = ${komma(aQuer, 1)} mm — in die Tabelle übernommen.`;
      } else {
        zustand.meldung = `✓ Notiert. Miss dieselbe Ordnung jetzt auf der anderen Seite (k = ${z.k} ${z.seite > 0 ? "links" : "rechts"}).`;
      }
      zustand.lupe = null;
      panelMessen();
    });

    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechsle("auswerten"));
    zeichneLupe();
    const eingabe = panel.querySelector("#exp-a");
    if (eingabe) eingabe.focus();
  }

  // ---------- Phase 3: Auswertung ----------
  function panelAuswerten() {
    if (!zustand.zeilen.length) {
      panel.innerHTML = `
        <h2>Auswertung</h2>
        <p>Noch keine Messwerte — geh zurück zur Durchführung und miss zuerst ein paar Maxima aus (links und rechts!).</p>
        <button class="knopf" id="exp-zurueck0">Zur Durchführung</button>`;
      panel.querySelector("#exp-zurueck0").addEventListener("click", () => wechsle("messen"));
      return;
    }
    const mittelwerte = LASER.map(l => {
      const werte = zustand.zeilen.filter(z => z.laserId === l.id && z.lambdaOk).map(z => z.lambdaEintrag);
      return { l, n: werte.length, mw: mittel(werte) };
    }).filter(m => m.n > 0);
    const xFertig = zustand.zeilen.some(z => z.laserId === "x" && z.lambdaOk);

    panel.innerHTML = `
      <h2>Auswertung</h2>
      <p>Rechne für jede Zeile selbst: <em>α = arctan(ā/e)</em>, dann <em>λ = g·sin&nbsp;α / k</em> — mit ā in m! Die Gitterkonstante steht als Aufdruck auf dem Gitter (g = 1/Strichzahl). Gib λ in nm an; ±${LAMBDA_TOLERANZ_NM} nm sind okay.</p>
      <p class="exp-hinweis"><strong>sin ≠ tan!</strong> Beim 600er liegt das 1. Maximum (rot) schon bei α ≈ 22°. Die Kleinwinkel-Näherung λ ≈ g·ā/(e·k) ergäbe hier 684 nm statt 633 nm — gut 8 % daneben. Darum: erst arctan, dann sin. (Beim 100er mit α &lt; 4° wäre die Näherung noch okay.)</p>
      ${zustand.zeilen.map((z, i) => `
        <form class="exp-ablesen" data-zeile="${i}">
          <span><strong>${esc(kurzName(z))}</strong> (g = ${komma(1e6 / z.gitter, 1)} nm), k = ${z.k}, ā = ${komma(z.aQuer, 1)} mm, e = ${komma(z.e, 3)} m →</span>
          <label for="exp-l${i}">λ in nm:</label>
          <input id="exp-l${i}" inputmode="decimal" autocomplete="off" size="6" value="${z.lambdaOk ? komma(z.lambdaEintrag, 1) : ""}">
          <button class="knopf zweitrangig">Prüfen</button>
          <strong>${z.lambdaOk ? "✓" : ""}</strong>
        </form>`).join("")}
      ${zeigeMeldung()}
      ${mittelwerte.length ? `<h3>Mittelwert je Laser</h3>
      <ul>${mittelwerte.map(m => {
        if (m.l.geheim) return `<li>λ̄(${esc(m.l.name)}) = <strong>${komma(m.mw, 1)} nm</strong> aus ${m.n} Zeile${m.n > 1 ? "n" : ""} — welcher Pointer ist das?</li>`;
        const bew = bewertungLambda(m.mw, m.l.lambdaNm);
        return `<li>λ̄(${esc(m.l.name)}) = <strong>${komma(m.mw, 1)} nm</strong> — Aufdruck ${esc(m.l.aufdruck)}, Abweichung ${komma(bew.abw, 1)} %: <strong>${bew.stufe}</strong></li>`;
      }).join("")}</ul>` : ""}
      <h3>Laser X bestimmen</h3>
      ${xFertig ? `
      <form id="exp-xform" class="exp-ablesen">
        <label for="exp-x">Laser X ist ein Pointer mit λ =</label>
        <select id="exp-x" class="exp-wahl">
          <option value="">bitte wählen</option>
          ${X_AUSWAHL_NM.map(w => `<option value="${w}">${w} nm</option>`).join("")}
        </select>
        <button class="knopf zweitrangig">Prüfen</button>
        <strong id="exp-x-status">${zustand.xGeloest ? "✓ 405 nm — ein violetter Pointer!" : ""}</strong>
      </form>` : `<p>Miss erst Laser X aus und prüfe seine λ-Zeile — dann kannst du ihn hier identifizieren.</p>`}
      <h3>Kurz nachgedacht</h3>
      <form id="exp-frage">
        <p><strong>Warum misst man jedes Maximum links UND rechts und mittelt die Beträge?</strong></p>
        <p><label><input type="radio" name="frage" value="a"> Doppelt gemessen ist einfach genauer — reine Statistik.</label></p>
        <p><label><input type="radio" name="frage" value="b"> Die Null des Lineals sitzt nie exakt in der Schirmmitte: Beim Mitteln von |links| und |rechts| kürzt sich dieser Versatz heraus.</label></p>
        <p><label><input type="radio" name="frage" value="c"> Das Gitter beugt nach links stärker als nach rechts.</label></p>
        <button class="knopf zweitrangig">Prüfen</button>
        <strong id="exp-frage-status">${zustand.frageFeedback ? esc(zustand.frageFeedback) : ""}</strong>
      </form>
      <details class="exp-fehler"><summary>Fehlerbetrachtung — wie genau ist deine Wellenlänge?</summary>
        <p><strong>Lineal:</strong> ±1–2 mm Ablesegenauigkeit. Der relative Fehler sinkt, je größer ā ist — deshalb ist das feine 600er-Gitter trotz großer Winkel am genauesten.</p>
        <p><strong>Maßband:</strong> ±0,5 cm sind realistisch. Hängt es durch oder spannst du es schräg, wird e systematisch zu groß — und λ gleich mit.</p>
        <p><strong>Schirmmitte:</strong> Die Lineal-Null trifft die Strahlachse nie exakt (hier: 2 mm daneben). Einseitig gemessen wäre das ein systematischer Fehler — das Mitteln über links und rechts hebt ihn vollständig auf.</p>
        <p><strong>Gitter:</strong> Auch die Strichzahl hat Fertigungstoleranzen. Profis prüfen das Gitter mit einer bekannten Wellenlänge — genau das war dein roter Laser mit Aufdruck.</p>
      </details>
      <div class="sp-panel-knoepfe">
        <button class="knopf zweitrangig" id="exp-zurueck">Mehr Messungen</button>
        <button class="knopf zweitrangig" id="exp-csv">Messdaten als CSV</button>
        <button class="knopf" id="exp-neustart">Neues Experiment</button>
      </div>`;

    panel.querySelectorAll("[data-zeile]").forEach(f => f.addEventListener("submit", ev => {
      ev.preventDefault();
      const z = zustand.zeilen[Number(f.dataset.zeile)];
      const ein = parseDezimal(f.querySelector("input").value);
      const soll = lambdaAusMessungNm(z.gitter, z.aQuer, z.e, z.k);
      if (Number.isFinite(ein) && Math.abs(ein - soll) <= LAMBDA_TOLERANZ_NM) {
        z.lambdaEintrag = ein; z.lambdaOk = true;
        zustand.meldung = `✓ ${kurzName(z)}, k = ${z.k}: λ passt.`;
        panelAuswerten();
      } else {
        z.lambdaOk = false;
        // kein Neuaufbau: Eingabe bleibt zum Korrigieren stehen
        f.querySelector(":scope > strong").textContent = "✗";
        panel.querySelector("#exp-meldung").textContent = "✗ Prüfe deine Rechnung: α = arctan(ā/e) — ā vorher in m umrechnen! Dann λ = g·sin α/k, nicht die Kleinwinkel-Näherung.";
      }
    }));

    panel.querySelector("#exp-xform")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const wahl = panel.querySelector("#exp-x").value;
      const status = panel.querySelector("#exp-x-status");
      if (wahl === "405") {
        zustand.xGeloest = true;
        status.textContent = "✓ 405 nm — ein violetter Pointer!";
      } else {
        status.textContent = wahl ? "✗ Vergleiche mit deinem Mittelwert für Laser X." : "Wähle zuerst einen Wert.";
      }
    });

    panel.querySelector("#exp-frage").addEventListener("submit", ev => {
      ev.preventDefault();
      const wahl = panel.querySelector('input[name="frage"]:checked');
      zustand.frageFeedback = !wahl ? "Wähle zuerst eine Antwort."
        : wahl.value === "b" ? "✓ Genau! In der Lupe hast du es gesehen: Das 0. Maximum lag bei +2 mm, nicht bei 0. Dieser Versatz steckt links und rechts mit umgekehrtem Vorzeichen drin — der Mittelwert ā ist davon frei."
        : wahl.value === "a" ? "✗ Mitteln glättet zwar die Streuung — der entscheidende Grund ist aber ein systematischer Fehler. Wirf in der Durchführung einen Lupenblick aufs 0. Maximum!"
        : "✗ Das Gitter beugt völlig symmetrisch. Schau lieber nach, wo das 0. Maximum auf dem Lineal liegt …";
      panel.querySelector("#exp-frage-status").textContent = zustand.frageFeedback;
    });

    panel.querySelector("#exp-csv").addEventListener("click", () =>
      csvHerunterladen("gitter-wellenlaenge.csv",
        ["Laser", "Gitter in Striche/mm", "k", "links in mm", "rechts in mm", "a quer in mm", "e in m", "lambda in nm"],
        zustand.zeilen.map(z => [z.kurz, z.gitter, z.k, z.links, z.rechts, z.aQuer, z.e, z.lambdaOk ? z.lambdaEintrag : ""])));

    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechsle("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      Object.assign(zustand, {
        laser: LASER[0], gitter: 600, eWahr: 0.5, eEintrag: null,
        offen: {}, lupe: null, zeilen: [], xGeloest: false, frageFeedback: null, meldung: ""
      });
      zeichne();
      wechsle("aufbau");
    });
  }

  // ---------- Phasensteuerung ----------
  function wechslePhase(p) {
    zustand.phase = p;
    if (p === "aufbau") panelAufbau();
    if (p === "messen") panelMessen();
    if (p === "auswerten") panelAuswerten();
  }

  zeichne();
  wechsle("aufbau");
}
