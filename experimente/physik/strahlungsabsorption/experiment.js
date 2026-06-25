// experiment.js — Interaktives Experiment: Absorption radioaktiver Strahlung
// (Klasse 10, Atom- und Kernphysik). Realitätsnahe Messpraxis: ein Mischpräparat
// (Alpha + Beta + Gamma) strahlt in festem Abstand auf ein Geiger-Müller-Zählrohr.
// Der Lernende schiebt verschiedene ABSORBER zwischen Präparat und Rohr (nichts,
// Papier, Aluminium in zwei Dicken, Blei in mehreren Dicken), zählt die Impulse in
// einer festen Torzeit, liest den Zählerstand SELBST ab und rechnet die Zählrate aus.
// Entdeckung: Papier stoppt schon die Alpha-Strahlung, wenige Millimeter Aluminium
// die Beta-Strahlung, und nur dickes Blei schwächt die Gamma-Strahlung deutlich
// (näherungsweise exponentiell mit der Dicke). Die Zählung folgt einer determi-
// nistisch geseedeten Poisson-Statistik. Modulebene DOM-frei; Browser-Teil in
// starteExperiment().

import {
  mulberry32, seedAus, parseDezimal, komma, mittel, esc, ablesungOk,
  farbe, reduzierteBewegung, bauePhasen, csvHerunterladen
} from "../../../assets/js/experiment/helfer.js";

// ---------- Modellkonstanten ----------
// Netto-Zählraten der drei Komponenten OHNE Absorber, in Imp/s (gerundete Schulwerte).
export const R_ALPHA = 180;   // Alpha: hohe Rate, aber extrem leicht zu stoppen
export const R_BETA = 90;     // Beta: mittlere Reichweite
export const R_GAMMA = 40;    // Gamma: durchdringend
export const NULLRATE = 0.5;  // Imp/s — Umgebungsstrahlung
export const TORZEIT = 20;    // s — feste Torzeit jeder Messung

// Schwächungskoeffizienten (1/mm) für die exponentielle Gamma-Schwächung.
export const MU_GAMMA_AL = 0.20;   // Gamma in Aluminium (schwach)
export const MU_GAMMA_PB = 0.12;   // Gamma in Blei je mm (Modellwert)
export const MU_BETA_AL = 1.4;     // Beta in Aluminium (steil) — ein paar mm genügen

// Absorber-Katalog. dicke in mm, material: "keiner" | "papier" | "alu" | "blei".
export const ABSORBER = [
  { id: "keiner", name: "kein Absorber", material: "keiner", dicke: 0 },
  { id: "papier", name: "Papier (0,1 mm)", material: "papier", dicke: 0.1 },
  { id: "alu2",   name: "Aluminium 2 mm", material: "alu", dicke: 2 },
  { id: "alu5",   name: "Aluminium 5 mm", material: "alu", dicke: 5 },
  { id: "blei1",  name: "Blei 1 mm", material: "blei", dicke: 1 },
  { id: "blei5",  name: "Blei 5 mm", material: "blei", dicke: 5 },
  { id: "blei10", name: "Blei 10 mm", material: "blei", dicke: 10 }
];
export const absorberVon = id => ABSORBER.find(a => a.id === id);

// Eintrags-Toleranzen
export const TOLERANZ_RATE = 0.8;          // Imp/s — Eintrag R = N/T
export const MIN_MESSUNGEN = 4;            // verschiedene Absorber vor der Auswertung

// ---------- Physik (rein, Node-testbar) ----------
// Welcher Anteil der jeweiligen Komponente kommt durch den Absorber durch?
export function durchlassAlpha(a) {
  // Alpha: bereits von Papier (und allem Dickeren) praktisch vollständig gestoppt.
  return a.material === "keiner" ? 1 : 0;
}
export function durchlassBeta(a) {
  // Beta: Papier kaum, Aluminium exponentiell (wenige mm genügen), Blei erst recht 0.
  if (a.material === "keiner") return 1;
  if (a.material === "papier") return 0.92;            // Papier bremst Beta nur wenig
  if (a.material === "alu") return Math.exp(-MU_BETA_AL * a.dicke);
  return 0;                                            // Blei: Beta komplett weg
}
export function durchlassGamma(a) {
  // Gamma: Papier/dünnes Material fast ungehindert, exponentiell mit der Dicke.
  if (a.material === "keiner" || a.material === "papier") return 1;
  if (a.material === "alu") return Math.exp(-MU_GAMMA_AL * a.dicke);
  return Math.exp(-MU_GAMMA_PB * a.dicke);             // Blei
}
// wahre Netto-Zählrate hinter dem Absorber (ohne Nullrate)
export function netRate(a) {
  return R_ALPHA * durchlassAlpha(a) + R_BETA * durchlassBeta(a) + R_GAMMA * durchlassGamma(a);
}
// in der Torzeit erwartete Impulse (inkl. Untergrund)
export function erwarteteImpulse(a) {
  return (netRate(a) + NULLRATE) * TORZEIT;
}

// Phi^-1(p): Quantilfunktion der Standardnormalverteilung (Acklam-Näherung).
export function inversNormal(p) {
  if (!(p > 0 && p < 1)) return NaN;
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const pu = 0.02425;
  if (p < pu) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
           ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - pu) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
            ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const q = p - 0.5, r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
         (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}
export function poissonGeseedet(mu, schluessel) {
  if (!(mu > 0)) return 0;
  const u = Math.min(1 - 1e-12, Math.max(1e-12, mulberry32(seedAus(schluessel))()));
  return Math.max(0, Math.round(mu + Math.sqrt(mu) * inversNormal(u)));
}
export function zaehleImpulse(absId, lauf) {
  const a = absorberVon(absId);
  return poissonGeseedet(erwarteteImpulse(a), "abs:" + absId + ":" + lauf);
}

// ---------- Auswertelogik (rein) ----------
export function rateAus(n, T) { return n / T; }
export function rateEintragOk(eingabe, n) {
  return ablesungOk(eingabe, rateAus(n, TORZEIT), TOLERANZ_RATE);
}
export function anzahlAbsorber(messungen) {
  return new Set(messungen.map(m => m.absId)).size;
}
export function bereitFuerAuswertung(messungen) {
  return anzahlAbsorber(messungen) >= MIN_MESSUNGEN;
}
// Welche Komponenten kommen durch (für die Erkenntnis-Auswertung)?
export function kommtAlphaDurch(a) { return durchlassAlpha(a) > 0.01; }
export function kommtBetaDurch(a) { return durchlassBeta(a) > 0.05; }
export function kommtGammaDurch(a) { return durchlassGamma(a) > 0.05; }

// ---------- TESTS (laufen DOM-frei in Node) ----------
export const TESTS = [
  { name: "Ohne Absorber kommt alles durch: R = 180+90+40 = 310 Imp/s", ok: () =>
      Math.abs(netRate(absorberVon("keiner")) - 310) < 1e-9 },
  { name: "Papier stoppt Alpha komplett, lässt Beta/Gamma fast durch", ok: () => {
      const a = absorberVon("papier");
      return durchlassAlpha(a) === 0 &&
             Math.abs(netRate(a) - (R_BETA * 0.92 + R_GAMMA)) < 1e-9 &&    // 82,8 + 40
             Math.abs(netRate(a) - 122.8) < 1e-9;
    } },
  { name: "Unabhängige Nachrechnung: 2 mm Alu = Alpha 0, Beta e^-2,8, Gamma e^-0,4", ok: () => {
      const a = absorberVon("alu2");
      const ref = 0 + 90 * Math.exp(-1.4 * 2) + 40 * Math.exp(-0.20 * 2);
      return Math.abs(netRate(a) - ref) < 1e-9;
    } },
  { name: "5 mm Alu: Beta praktisch weg (<0,1 Imp/s), Gamma noch da", ok: () => {
      const a = absorberVon("alu5");
      return R_BETA * durchlassBeta(a) < 0.1 && durchlassGamma(a) > 0.3;
    } },
  { name: "Blei: Beta = 0; Gamma exponentiell mit der Dicke (Halbierung ~5,8 mm)", ok: () => {
      const b1 = absorberVon("blei1"), b5 = absorberVon("blei5"), b10 = absorberVon("blei10");
      const halb = Math.log(2) / MU_GAMMA_PB;                       // ~5,78 mm
      return durchlassBeta(b5) === 0 &&
             Math.abs(durchlassGamma(b1) - Math.exp(-0.12)) < 1e-9 &&
             durchlassGamma(b10) < durchlassGamma(b5) &&
             durchlassGamma(b5) < durchlassGamma(b1) &&
             Math.abs(halb - 5.776) < 0.01;
    } },
  { name: "Monotonie: 1 mm > 5 mm > 10 mm Blei in der Netto-Rate", ok: () =>
      netRate(absorberVon("blei1")) > netRate(absorberVon("blei5")) &&
      netRate(absorberVon("blei5")) > netRate(absorberVon("blei10")) },
  { name: "Komponenten-Durchlass-Flags konsistent (Alpha nur ohne Absorber)", ok: () =>
      kommtAlphaDurch(absorberVon("keiner")) && !kommtAlphaDurch(absorberVon("papier")) &&
      kommtBetaDurch(absorberVon("papier")) && !kommtBetaDurch(absorberVon("alu5")) &&
      kommtGammaDurch(absorberVon("blei1")) },
  { name: "Zählung deterministisch reproduzierbar", ok: () =>
      zaehleImpulse("keiner", 1) === zaehleImpulse("keiner", 1) &&
      zaehleImpulse("blei5", 2) === zaehleImpulse("blei5", 2) },
  { name: "Doppelmessung: zwei Läufe -> verschiedene N (Zählstatistik)", ok: () =>
      zaehleImpulse("keiner", 1) !== zaehleImpulse("keiner", 2) &&
      zaehleImpulse("alu2", 1) !== zaehleImpulse("alu2", 2) },
  { name: "Zählstatistik: |N - mu| <= 5*sqrt(mu) für alle Absorber, beide Läufe", ok: () => {
      for (const a of ABSORBER) {
        for (const lauf of [1, 2]) {
          const mu = erwarteteImpulse(a);
          const n = zaehleImpulse(a.id, lauf);
          if (n !== zaehleImpulse(a.id, lauf)) return false;
          if (Math.abs(n - mu) > 5 * Math.sqrt(mu) + 0.5) return false;
        }
      }
      return true;
    } },
  { name: "Eintrag-Toleranz Rate +/-0,8 Imp/s; Auswertungs-Schwelle 4 Absorber", ok: () => {
      const n = Math.round(netRate(absorberVon("keiner")) * TORZEIT);
      if (!rateEintragOk(n / TORZEIT, n)) return false;
      const m = [{ absId: "keiner" }, { absId: "papier" }, { absId: "alu2" }];
      if (anzahlAbsorber(m) !== 3 || bereitFuerAuswertung(m)) return false;
      return bereitFuerAuswertung(m.concat([{ absId: "blei5" }]));
    } }
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
    absId: "keiner",
    laufZaehler: {},
    zaehlung: null,       // { absId, T, N, lauf, fertig, verbucht }
    anzeigeN: 0,
    fortschritt: 0,
    messungen: [],        // { absId, name, dicke, material, N, R }
    vorhersage: ""
  };
  let animId = 0;

  const wechslePhase = bauePhasen(wurzel, [
    { id: "aufbau", label: "Aufbau" },
    { id: "messen", label: "Durchführung" },
    { id: "auswerten", label: "Auswertung" }
  ], zeigePhase);

  const flaeche = document.createElement("div");
  flaeche.className = "exp-flaeche";
  flaeche.innerHTML =
    '<div class="exp-links">' +
    '<canvas id="exp-canvas" width="400" height="500" aria-label="Versuchsaufbau: links ein radioaktives Präparat, in der Mitte ein Absorberhalter mit dem gerade eingeschobenen Material, rechts ein Geiger-Müller-Zählrohr. Darunter ein digitaler Impulszähler mit Display, Torzeit und Fortschrittsbalken sowie ein Balkendiagramm der Zählrate je Absorber."></canvas>' +
    '</div>' +
    '<div class="exp-rechts" id="exp-panel"></div>';
  wurzel.appendChild(flaeche);

  const canvas = flaeche.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = flaeche.querySelector("#exp-panel");

  const aktuellerAbsorber = () => absorberVon(zustand.absId);

  // ---------- Zählung ----------
  function starteZaehlung() {
    const absId = zustand.absId;
    const lauf = (zustand.laufZaehler[absId] || 0) + 1;
    zustand.laufZaehler[absId] = lauf;
    const N = zaehleImpulse(absId, lauf);
    zustand.zaehlung = { absId, T: TORZEIT, N, lauf, fertig: false, verbucht: false };
    zustand.anzeigeN = 0;
    zustand.fortschritt = 0;
    cancelAnimationFrame(animId);
    if (reduziert) { beendeZaehlung(); return; }
    const start = performance.now(), dauer = 1600;
    const tick = jetzt => {
      const f = Math.min(1, (jetzt - start) / dauer);
      zustand.fortschritt = f;
      zustand.anzeigeN = Math.round(zustand.zaehlung.N * f);
      zeichne();
      if (f < 1) animId = requestAnimationFrame(tick);
      else beendeZaehlung();
    };
    animId = requestAnimationFrame(tick);
    panelMessen();
  }
  function beendeZaehlung() {
    zustand.fortschritt = 1;
    zustand.anzeigeN = zustand.zaehlung.N;
    zustand.zaehlung.fertig = true;
    zeichne();
    if (zustand.phase === "messen") panelMessen("✓ Torzeit abgelaufen — lies N ab und rechne R = N/T.");
  }

  // ---------- Zeichnung ----------
  function zeichne() {
    const w = canvas.width, h = canvas.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"), cAkzent = farbe("--akzent"),
          cFlaeche = farbe("--flaeche"), cHauch = farbe("--hauch", "#eee");
    function rrect(x, y, b, hh, rad) {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, b, hh, rad); else ctx.rect(x, y, b, hh);
    }
    ctx.clearRect(0, 0, w, h);
    ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "start";

    const a = aktuellerAbsorber();
    const mitteY = 70;

    // --- Präparat (links) ---
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.fillRect(20, mitteY - 16, 22, 32); ctx.strokeRect(20, mitteY - 16, 22, 32);
    ctx.fillStyle = cAkzent; ctx.beginPath(); ctx.arc(42, mitteY, 4, 0, 7); ctx.fill();
    ctx.fillStyle = cLeise; ctx.textAlign = "start"; ctx.fillText("Präparat", 14, mitteY - 24);
    ctx.fillText("α β γ", 18, mitteY + 34);

    // --- Strahlung zwischen Präparat und Absorber ---
    ctx.strokeStyle = cAkzent; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
    for (const dy of [-7, 0, 7]) { ctx.beginPath(); ctx.moveTo(46, mitteY); ctx.lineTo(150, mitteY + dy); ctx.stroke(); }
    ctx.setLineDash([]);

    // --- Absorberhalter (Mitte) ---
    const hx = 150;
    ctx.strokeStyle = cText; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(hx - 4, mitteY - 40); ctx.lineTo(hx - 4, mitteY + 40); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hx + 40, mitteY - 40); ctx.lineTo(hx + 40, mitteY + 40); ctx.stroke();
    if (a.material !== "keiner") {
      let fuell = cHauch, label = "";
      if (a.material === "papier") { fuell = "#e8e2d0"; label = "Papier"; }
      else if (a.material === "alu") { fuell = "#c8cdd3"; label = "Aluminium"; }
      else { fuell = "#6b7077"; label = "Blei"; }
      const breite = a.material === "papier" ? 6 : Math.min(34, 8 + a.dicke * 2.4);
      ctx.fillStyle = fuell; ctx.strokeStyle = cText; ctx.lineWidth = 2;
      ctx.fillRect(hx + 18 - breite / 2, mitteY - 30, breite, 60);
      ctx.strokeRect(hx + 18 - breite / 2, mitteY - 30, breite, 60);
      ctx.fillStyle = cText; ctx.textAlign = "center"; ctx.font = "11px system-ui, sans-serif";
      ctx.fillText(label, hx + 18, mitteY + 52);
      ctx.fillStyle = cLeise; ctx.fillText(komma(a.dicke, a.dicke < 1 ? 1 : 0) + " mm", hx + 18, mitteY + 66);
    } else {
      ctx.fillStyle = cLeise; ctx.textAlign = "center"; ctx.fillText("kein Absorber", hx + 18, mitteY + 52);
    }
    ctx.fillStyle = cLeise; ctx.textAlign = "start"; ctx.fillText("Absorber", hx - 6, mitteY - 48);

    // --- abgeschwächte Strahlung hinter Absorber ---
    const durch = a.material === "keiner" ? 1 : netRate(a) / 310;
    ctx.strokeStyle = cAkzent; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.3 + 0.7 * durch; ctx.setLineDash([4, 4]);
    for (const dy of [-6, 0, 6]) { ctx.beginPath(); ctx.moveTo(hx + 40, mitteY + dy * 0.4); ctx.lineTo(296, mitteY + dy); ctx.stroke(); }
    ctx.setLineDash([]); ctx.globalAlpha = 1;

    // --- GM-Zählrohr (rechts) ---
    ctx.fillStyle = cHauch; ctx.strokeStyle = cText; ctx.lineWidth = 1.5;
    ctx.fillRect(296, mitteY - 12, 6, 24); ctx.strokeRect(296, mitteY - 12, 6, 24);
    ctx.lineWidth = 2; rrect(302, mitteY - 18, 44, 36, 6);
    ctx.fillStyle = cFlaeche; ctx.fill(); ctx.strokeStyle = cText; ctx.stroke();
    ctx.fillStyle = cLeise; ctx.textAlign = "center"; ctx.fillText("GM-Rohr", 324, mitteY + 32); ctx.textAlign = "start";

    // --- digitaler Impulszähler ---
    const z = zustand.zaehlung;
    rrect(20, 130, 360, 92, 10);
    ctx.fillStyle = cFlaeche; ctx.fill(); ctx.strokeStyle = cText; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = cText; ctx.font = "bold 12px system-ui, sans-serif"; ctx.textAlign = "start";
    ctx.fillText("Digitaler Impulszähler", 34, 150);
    ctx.fillStyle = cHauch; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.fillRect(34, 160, 150, 40); ctx.strokeRect(34, 160, 150, 40);
    ctx.fillStyle = cText; ctx.font = "bold 26px ui-monospace, Consolas, monospace"; ctx.textAlign = "end";
    ctx.fillText(String(zustand.anzeigeN), 178, 190);
    ctx.font = "10px system-ui, sans-serif"; ctx.fillStyle = cLeise; ctx.textAlign = "start";
    ctx.fillText("Impulse N", 34, 214);
    ctx.fillStyle = cLeise; ctx.fillText("Torzeit", 200, 156);
    ctx.fillStyle = cText; ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillText("T = " + TORZEIT + " s", 200, 174);
    ctx.font = "11px system-ui, sans-serif"; ctx.fillStyle = cLeise;
    ctx.fillText(z ? (z.fertig ? "fertig ✓" : "zählt …") : "bereit", 200, 192);
    ctx.strokeStyle = cLeise; ctx.lineWidth = 1.5; ctx.strokeRect(200, 200, 168, 12);
    if (z) { ctx.fillStyle = cAkzent; ctx.fillRect(201, 201, 166 * (z.fertig ? 1 : zustand.fortschritt), 10); }

    // --- Balkendiagramm: Zählrate je gemessenem Absorber ---
    const D = { x: 110, y: 250, b: 258, h: 210 };
    const rMax = 320;
    const px0 = D.x, py = r => D.y + D.h - (r / rMax) * D.h;
    ctx.strokeStyle = cText; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(D.x, D.y - 6); ctx.lineTo(D.x, D.y + D.h); ctx.lineTo(D.x + D.b + 4, D.y + D.h); ctx.stroke();
    ctx.font = "10px system-ui, sans-serif"; ctx.textAlign = "end";
    for (let r = 0; r <= rMax; r += 80) {
      const y = py(r);
      ctx.strokeStyle = cHauch; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(D.x, y); ctx.lineTo(D.x + D.b, y); ctx.stroke();
      ctx.fillStyle = cLeise; ctx.fillText(String(r), D.x - 6, y + 4);
    }
    ctx.save(); ctx.translate(D.x - 40, D.y + D.h / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = cText; ctx.font = "bold 11px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Zählrate R in Imp/s", 0, 0); ctx.restore();
    ctx.textAlign = "center";
    const gemessene = [...zustand.messungen].sort((a1, b1) =>
      ABSORBER.findIndex(x => x.id === a1.absId) - ABSORBER.findIndex(x => x.id === b1.absId));
    if (gemessene.length) {
      const bw = Math.min(30, (D.b - 12) / gemessene.length - 6);
      gemessene.forEach((m, i) => {
        const x = px0 + 12 + i * ((D.b - 12) / gemessene.length);
        const y = py(Math.min(m.R, rMax));
        ctx.fillStyle = cAkzent;
        ctx.fillRect(x, y, bw, D.y + D.h - y);
        ctx.save(); ctx.translate(x + bw / 2, D.y + D.h + 6); ctx.rotate(-Math.PI / 4);
        ctx.fillStyle = cLeise; ctx.font = "9px system-ui, sans-serif"; ctx.textAlign = "end";
        ctx.fillText(kurzname(m.absId), 0, 0); ctx.restore();
      });
    } else {
      ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "center";
      ctx.fillText("Hier wächst je Absorber ein Balken.", D.x + D.b / 2, D.y + D.h / 2);
    }
    ctx.textAlign = "start";
  }
  function kurzname(absId) {
    return ({ keiner: "ohne", papier: "Papier", alu2: "Al 2", alu5: "Al 5", blei1: "Pb 1", blei5: "Pb 5", blei10: "Pb 10" })[absId] || absId;
  }

  // ---------- Panels je Phase ----------
  function panelAufbau() {
    panel.innerHTML =
      '<h2>Aufbau und Geräte</h2>' +
      '<p>Ein <strong>Mischpräparat</strong> sendet alle drei Strahlungsarten aus: <strong>α</strong>, <strong>β</strong> und <strong>γ</strong>. In festem Abstand steht ein <strong>Geiger-Müller-Zählrohr</strong>. Dazwischen kannst du <strong>Absorber</strong> in einen Halter schieben: Papier, Aluminium (2 mm und 5 mm), Blei (1 mm, 5 mm, 10 mm). Ein <strong>digitaler Impulszähler</strong> zählt die Impulse in einer Torzeit von ' + TORZEIT + ' s.</p>' +
      '<p><strong>Plan:</strong> Miss zuerst <strong>ohne Absorber</strong>, dann mit jedem Absorber. Lies den Zählerstand N <strong>selbst</strong> ab, rechne R = N/T und vergleiche. Aus dem Vergleich entdeckst du, <strong>welche Strahlungsart von welchem Material</strong> gestoppt wird.</p>' +
      '<p class="exp-hinweis">⚠ Im echten Labor: drei A des Strahlenschutzes — <strong>A</strong>bstand, <strong>A</strong>bschirmung, <strong>A</strong>ufenthaltsdauer. Präparate nur mit der Zange greifen.</p>' +
      '<label for="exp-vorhersage"><strong>Deine Vorhersage:</strong> Welche Strahlung lässt sich am schwersten abschirmen?</label>' +
      '<select id="exp-vorhersage" class="exp-wahl">' +
      '<option value="">— bitte wählen —</option>' +
      '<option value="alpha"' + (zustand.vorhersage === "alpha" ? " selected" : "") + '>Die Alpha-Strahlung (α).</option>' +
      '<option value="beta"' + (zustand.vorhersage === "beta" ? " selected" : "") + '>Die Beta-Strahlung (β).</option>' +
      '<option value="gamma"' + (zustand.vorhersage === "gamma" ? " selected" : "") + '>Die Gamma-Strahlung (γ).</option>' +
      '</select>' +
      '<p id="exp-vorhersage-meldung" class="exp-meldung" aria-live="polite"></p>' +
      '<button class="knopf" id="exp-weiter1">Zur Durchführung</button>';
    panel.querySelector("#exp-vorhersage").addEventListener("change", ev => {
      zustand.vorhersage = ev.target.value;
      panel.querySelector("#exp-vorhersage-meldung").textContent =
        ev.target.value ? "Notiert — am Ende prüfst du das an deinen Messwerten." : "";
    });
    panel.querySelector("#exp-weiter1").addEventListener("click", () => wechslePhase("messen"));
  }

  function panelMessen(meldung = "") {
    const z = zustand.zaehlung;
    const laeuft = z && !z.fertig;
    const formBereit = z && z.fertig && !z.verbucht;
    const schonGemessen = zustand.messungen.some(m => m.absId === zustand.absId);
    const optionen = ABSORBER.map(a => {
      const fertig = zustand.messungen.some(m => m.absId === a.id);
      return '<option value="' + a.id + '"' + (a.id === zustand.absId ? " selected" : "") + '>' + esc(a.name) + (fertig ? " ✓" : "") + '</option>';
    }).join("");
    const offen = ABSORBER.find(a => !zustand.messungen.some(m => m.absId === a.id));
    panel.innerHTML =
      '<h2>Durchführung</h2>' +
      '<div class="exp-regler">' +
      '<label for="exp-abs"><strong>Absorber einschieben:</strong></label>' +
      '<select id="exp-abs" class="exp-wahl" ' + (laeuft ? "disabled" : "") + '>' + optionen + '</select>' +
      '</div>' +
      '<button class="knopf" id="exp-start" ' + (laeuft || schonGemessen ? "disabled" : "") + '>Zählen starten (T = ' + TORZEIT + ' s)</button>' +
      (schonGemessen ? '<p class="exp-hinweis">Diesen Absorber hast du schon gemessen' + (offen ? " — offen: " + esc(offen.name) : "") + '.</p>' : "") +
      '<form id="exp-eintrag" class="exp-ablesen">' +
      '<label for="exp-n-eintrag">Zählerstand N ablesen:</label>' +
      '<input id="exp-n-eintrag" inputmode="numeric" autocomplete="off" size="6" ' + (formBereit ? "" : "disabled") + '>' +
      '<label for="exp-r-eintrag">R = N/T in Imp/s</label>' +
      '<input id="exp-r-eintrag" inputmode="decimal" autocomplete="off" size="6" ' + (formBereit ? "" : "disabled") + '>' +
      '<button class="knopf" ' + (formBereit ? "" : "disabled") + '>In die Tabelle</button>' +
      '</form>' +
      '<p id="exp-meldung" class="exp-meldung" aria-live="polite">' + esc(meldung) + '</p>' +
      '<h3>Messtabelle</h3>' +
      '<table class="exp-tabelle"><thead><tr><th>Absorber</th><th>N</th><th>R = N/T in Imp/s</th></tr></thead>' +
      '<tbody>' + (zustand.messungen.length
        ? [...zustand.messungen].sort((a1, b1) => ABSORBER.findIndex(x => x.id === a1.absId) - ABSORBER.findIndex(x => x.id === b1.absId))
            .map(m => '<tr><td>' + esc(m.name) + '</td><td>' + m.N + '</td><td>' + komma(m.R, 1) + '</td></tr>').join("")
        : '<tr><td colspan="3">noch leer</td></tr>') + '</tbody></table>' +
      '<p>Bisher: <strong>' + anzahlAbsorber(zustand.messungen) + '</strong> von mindestens ' + MIN_MESSUNGEN + ' Absorbern. Tipp: Miss unbedingt „kein Absorber" als Bezug.</p>' +
      '<button class="knopf" id="exp-weiter2" ' + (bereitFuerAuswertung(zustand.messungen) ? "" : "disabled") + '>Zur Auswertung</button>';
    panel.querySelector("#exp-abs").addEventListener("change", ev => {
      zustand.absId = ev.target.value;
      const zz = zustand.zaehlung;
      if (zz && zz.fertig && !zz.verbucht) {
        zustand.zaehlung = null; zustand.anzeigeN = 0; zustand.fortschritt = 0;
        zeichne();
        panelMessen("Anderer Absorber gewählt — die nicht eingetragene Zählung ist verworfen. Starte neu.");
        return;
      }
      zeichne();
      panelMessen();
    });
    panel.querySelector("#exp-start").addEventListener("click", () => { if (!schonGemessen) starteZaehlung(); });
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
    panel.querySelector("#exp-eintrag").addEventListener("submit", ev => {
      ev.preventDefault();
      const zz = zustand.zaehlung;
      if (!(zz && zz.fertig && !zz.verbucht)) return;
      const en = parseDezimal(panel.querySelector("#exp-n-eintrag").value);
      const er = parseDezimal(panel.querySelector("#exp-r-eintrag").value);
      const meldungEl = panel.querySelector("#exp-meldung");
      if (!Number.isFinite(en) || en !== zz.N) {
        meldungEl.textContent = "✗ Tippe den Zählerstand N exakt vom Display ab — Ziffer für Ziffer.";
        return;
      }
      if (!rateEintragOk(er, zz.N)) {
        meldungEl.textContent = "✗ Rechne R = N geteilt durch die Torzeit T = " + TORZEIT + " s.";
        return;
      }
      const a = absorberVon(zz.absId);
      zz.verbucht = true;
      zustand.messungen.push({ absId: zz.absId, name: a.name, dicke: a.dicke, material: a.material, N: zz.N, R: rateAus(zz.N, TORZEIT) });
      zeichne();
      const naechster = ABSORBER.find(x => !zustand.messungen.some(m => m.absId === x.id));
      if (naechster) zustand.absId = naechster.id;
      panelMessen("✓ Eingetragen — der Balken steht jetzt im Diagramm." + (naechster ? " Weiter mit: " + naechster.name + "." : " Alle Absorber gemessen!"));
    });
  }

  function panelAuswerten() {
    if (!bereitFuerAuswertung(zustand.messungen)) {
      panel.innerHTML =
        '<h2>Auswertung</h2>' +
        '<p>Miss mindestens <strong>' + MIN_MESSUNGEN + ' verschiedene Absorber</strong> (am besten inklusive „kein Absorber").</p>' +
        '<p>Aktuell: ' + anzahlAbsorber(zustand.messungen) + ' Absorber.</p>' +
        '<button class="knopf" id="exp-zurueck0">Zur Durchführung</button>';
      panel.querySelector("#exp-zurueck0").addEventListener("click", () => wechslePhase("messen"));
      return;
    }
    const zeilen = [...zustand.messungen].sort((a, b) => ABSORBER.findIndex(x => x.id === a.absId) - ABSORBER.findIndex(x => x.id === b.absId));
    const ohne = zeilen.find(m => m.absId === "keiner");
    const r0 = ohne ? ohne.R : Math.max(...zeilen.map(m => m.R));
    panel.innerHTML =
      '<h2>Auswertung</h2>' +
      '<h3>1 · Zählraten vergleichen</h3>' +
      '<table class="exp-tabelle"><thead><tr><th>Absorber</th><th>R in Imp/s</th><th>Anteil von „ohne"</th></tr></thead><tbody>' +
      zeilen.map(m => '<tr><td>' + esc(m.name) + '</td><td>' + komma(m.R, 1) + '</td><td>' + (r0 > 0 ? komma(100 * m.R / r0, 0) + " %" : "–") + '</td></tr>').join("") +
      '</tbody></table>' +
      (ohne ? "" : '<p class="exp-hinweis">Für die Anteile fehlt die Messung „kein Absorber" — geh zurück und nimm sie auf.</p>') +
      '<h3>2 · Welche Strahlung stoppt welcher Absorber?</h3>' +
      '<p>Schon dünnes <strong>Papier</strong> senkt die Rate spürbar — es hält die <strong>α-Strahlung</strong> auf (sehr geringe Reichweite). Wenige Millimeter <strong>Aluminium</strong> entfernen zusätzlich die <strong>β-Strahlung</strong>. Was dann noch durchkommt, ist <strong>γ-Strahlung</strong>: Sie wird erst von <strong>dickem Blei</strong> deutlich geschwächt — und auch dort nie ganz auf null, sondern <strong>exponentiell mit der Dicke</strong>.</p>' +
      '<form id="exp-zuord" class="exp-ablesen">' +
      '<label for="exp-z1">Vom Papier gestoppt wird vor allem …</label>' +
      '<select id="exp-z1" class="exp-wahl"><option value="">— wählen —</option><option value="alpha">α-Strahlung</option><option value="beta">β-Strahlung</option><option value="gamma">γ-Strahlung</option></select>' +
      '<label for="exp-z2">Erst von dickem Blei stark geschwächt wird …</label>' +
      '<select id="exp-z2" class="exp-wahl"><option value="">— wählen —</option><option value="alpha">α-Strahlung</option><option value="beta">β-Strahlung</option><option value="gamma">γ-Strahlung</option></select>' +
      '<button class="knopf">Prüfen</button>' +
      '</form>' +
      '<p id="exp-zuord-meldung" class="exp-meldung" aria-live="polite"></p>' +
      '<h3>3 · Blei: Schwächung mit der Dicke</h3>' +
      '<p>Vergleiche deine Blei-Zeilen (1 mm, 5 mm, 10 mm): Die Rate sinkt mit jeder zusätzlichen Schicht um denselben <em>Anteil</em> — das ist die <strong>exponentielle Schwächung</strong> der γ-Strahlung. Sie verschwindet nie ganz, wird aber mit genug Blei beliebig klein.</p>' +
      bleiAbschnitt(zeilen) +
      '<h3>4 · Erkenntnisfrage</h3>' +
      '<p><strong>Warum sinkt die Rate hinter Blei nie exakt auf die Nullrate?</strong></p>' +
      '<select id="exp-f1" class="exp-wahl" aria-label="Antwort auswählen">' +
      '<option value="">— Antwort wählen —</option>' +
      '<option value="a">Weil das Zählrohr defekt ist.</option>' +
      '<option value="b">Weil die γ-Schwächung exponentiell ist: Jede Schicht nimmt denselben Anteil weg, sodass nie ganz null erreicht wird.</option>' +
      '<option value="c">Weil Blei selbst radioaktiv ist und mitstrahlt.</option>' +
      '</select>' +
      '<button class="knopf zweitrangig" id="exp-f1k">Antwort prüfen</button>' +
      '<p id="exp-f1-meldung" class="exp-meldung" aria-live="polite"></p>' +
      '<details class="exp-fehler"><summary>Fehlerbetrachtung — was das Modell vereinfacht</summary>' +
      '<p><strong>Zählstatistik (±√N):</strong> Auch hier streut jede Messung um etwa ±√N. Bei stark abgeschirmter γ-Strahlung (kleines N) wird die relative Schwankung größer — mehrfach messen oder länger zählen hilft.</p>' +
      '<p><strong>Nullrate:</strong> Das Rohr tickt auch ohne Präparat (≈ ' + komma(NULLRATE, 1) + ' Imp/s). Hinter dickem Blei nähert sich die Anzeige diesem Untergrund, nicht der echten Null.</p>' +
      '<p><strong>Streustrahlung und Bremsstrahlung:</strong> In Materie entstehen Sekundärteilchen; abgebremste β-Teilchen erzeugen etwas Röntgen-Bremsstrahlung. Reale Messungen sind dadurch etwas „schmutziger" als dieses Modell.</p>' +
      '</details>' +
      '<div class="exp-knopfzeile">' +
      '<button class="knopf zweitrangig" id="exp-csv">Messwerte als CSV</button>' +
      '<button class="knopf zweitrangig" id="exp-zurueck">Mehr Messungen</button>' +
      '<button class="knopf" id="exp-neustart">Neues Experiment</button>' +
      '</div>';
    panel.querySelector("#exp-zuord").addEventListener("submit", ev => {
      ev.preventDefault();
      const z1 = panel.querySelector("#exp-z1").value, z2 = panel.querySelector("#exp-z2").value;
      const meldungEl = panel.querySelector("#exp-zuord-meldung");
      if (!z1 || !z2) { meldungEl.textContent = "Wähle bei beiden Zeilen eine Antwort aus."; return; }
      if (z1 === "alpha" && z2 === "gamma") {
        let text = "✓ Genau: Papier stoppt die α-Strahlung (kürzeste Reichweite), Aluminium die β-Strahlung, und nur dickes Blei schwächt die durchdringende γ-Strahlung stark.";
        if (zustand.vorhersage === "gamma") text += " Deine Vorhersage war richtig — γ ist am schwersten abzuschirmen!";
        else if (zustand.vorhersage) text += " Vergleiche mit deiner Vorhersage: Am schwersten abzuschirmen ist die γ-Strahlung.";
        meldungEl.textContent = text;
      } else {
        meldungEl.textContent = "✗ Schau in deine Tabelle: Welcher Anteil verschwindet schon beim Papier (das ist α)? Und was kommt selbst durch Blei noch durch (das ist γ)?";
      }
    });
    panel.querySelector("#exp-f1k").addEventListener("click", () => {
      const wahl = panel.querySelector("#exp-f1").value, m = panel.querySelector("#exp-f1-meldung");
      if (!wahl) { m.textContent = "Wähle zuerst eine Antwort aus."; return; }
      m.textContent = wahl === "b"
        ? "✓ Richtig: Bei exponentieller Schwächung halbiert jede gleiche Dickenschicht die Rate erneut — aus 40 wird 20, dann 10, dann 5 … Der Wert nähert sich der Nullrate, erreicht sie aber theoretisch nie. Deshalb arbeitet man mit ausreichend dickem Blei."
        : "✗ Das Rohr ist intakt, und Blei strahlt nicht. Denk an die Form der Schwächung: Jede Schicht nimmt denselben Anteil weg — was bedeutet das für ein Erreichen der exakten Null?";
    });
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      const datenZeilen = zeilen.map(m => [m.name, m.material, String(m.dicke), String(m.N), m.R]);
      csvHerunterladen("strahlungsabsorption-messwerte.csv",
        ["Absorber", "Material", "Dicke in mm", "N", "R in Imp/s"], datenZeilen);
    });
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      cancelAnimationFrame(animId);
      zustand.absId = "keiner"; zustand.laufZaehler = {}; zustand.zaehlung = null;
      zustand.anzeigeN = 0; zustand.fortschritt = 0; zustand.messungen = []; zustand.vorhersage = "";
      zeichne();
      wechslePhase("aufbau");
    });
  }

  // Hilfsabschnitt: Blei-Dicken-Tabelle, falls mindestens zwei Blei-Messungen vorliegen
  function bleiAbschnitt(zeilen) {
    const blei = zeilen.filter(m => m.material === "blei").sort((a, b) => a.dicke - b.dicke);
    if (blei.length < 2) return '<p class="exp-hinweis">Für diesen Vergleich brauchst du mindestens zwei Blei-Dicken — miss z. B. 1 mm und 5 mm.</p>';
    return '<table class="exp-tabelle"><thead><tr><th>Blei-Dicke in mm</th><th>R in Imp/s</th></tr></thead><tbody>' +
      blei.map(m => '<tr><td>' + komma(m.dicke, 0) + '</td><td>' + komma(m.R, 1) + '</td></tr>').join("") +
      '</tbody></table>';
  }

  function zeigePhase(id) {
    zustand.phase = id;
    if (id === "aufbau") panelAufbau();
    if (id === "messen") panelMessen();
    if (id === "auswerten") panelAuswerten();
  }

  zeichne();
  wechslePhase("aufbau");
}
