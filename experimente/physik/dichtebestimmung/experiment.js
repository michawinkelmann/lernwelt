// experiment.js — Interaktives Experiment: Dichtebestimmung (Klasse 5–7).
// Realitätsnahe Messpraxis statt idealer Simulation: jeden Probekörper auf
// die digitale Waage legen und den Anzeigewert übertragen, dann eintauchen
// und den Wasserstand an der ml-Skala SELBST ablesen. Aus m und V folgt
// die Dichte — und damit das Material des geheimen Würfels X. Das
// schwimmende Holz lehrt den klassischen Senkkörper-Trick.
// Die kleine Messstreuung ist deterministisch geseedet (helfer.streuung),
// dadurch bleiben die TESTS in Node analytisch prüfbar (Modulebene DOM-frei).

import {
  streuung, parseDezimal, komma, ablesungOk, esc,
  farbe, reduzierteBewegung, bauePhasen, csvHerunterladen
} from "../../../assets/js/experiment/helfer.js";

// ---------- Konstanten ----------
export const RHO_WASSER = 1.0;        // g/cm³
export const WASSER_START_ML = 50.0;  // Anfangsstand im 100-ml-Zylinder
export const SENKKOERPER_V = 5.0;     // cm³ — Stahlmutter am Faden
export const TOL_WAAGE_G = 0.15;      // Anzeigewert fast exakt übertragen
export const TOL_ZYLINDER_ML = 1.0;   // Skala selbst ablesen (1-ml-Striche)
export const TOL_DICHTE = 0.1;        // ρ = m/V selbst rechnen

// ---------- Probekörper (fest; V bewusst „krumm", m = ρ·V exakt) ----------
function koerper(id, name, kurz, rho, v, geheim = false) {
  return { id, name, kurz, rho, v, m: rho * v, geheim };
}
export const KOERPER = [
  koerper("alu", "Aluminium", "Alu", 2.70, 12.4),
  koerper("eisen", "Eisen", "Eisen", 7.87, 8.6),
  koerper("messing", "Messing", "Messing", 8.40, 6.5),
  koerper("pvc", "PVC (Kunststoff)", "PVC", 1.40, 18.0),
  koerper("holz", "Buchenholz", "Holz", 0.72, 22.0),
  koerper("x", "Würfel X", "X", 7.14, 9.8, true) // in Wahrheit Zink — psst!
];
export const LOESUNG_X = "Zink";

export const VERGLEICHSDICHTEN = [
  { name: "Buchenholz", rho: 0.72 },
  { name: "PVC", rho: 1.40 },
  { name: "Aluminium", rho: 2.70 },
  { name: "Zink", rho: 7.14 },
  { name: "Eisen", rho: 7.87 },
  { name: "Messing", rho: 8.40 },
  { name: "Kupfer", rho: 8.96 },
  { name: "Blei", rho: 11.34 }
];

// ---------- Mess- und Auswertelogik (rein, Node-testbar) ----------
export function schwimmt(k) { return k.rho < RHO_WASSER; }

// Digitale Waage: wahre Masse + Gerätestreuung, gerundet auf 0,1 g
export function anzeigeMasse(k) {
  return Math.round((k.m + streuung("waage:" + k.id, 0.2)) * 10) / 10;
}
// Messzylinder: gezeichneter (= abzulesender) Wasserstand in ml
export function wahrerStand(k) {
  return WASSER_START_ML + k.v + streuung("zyl:" + k.id, 0.8);
}
export function standSenkkoerper() {
  return WASSER_START_ML + SENKKOERPER_V + streuung("zyl:senkkoerper", 0.8);
}
export function standMitSenkkoerper(k) {
  return WASSER_START_ML + SENKKOERPER_V + k.v + streuung("zyl:" + k.id, 0.8);
}
// Ein schwimmender Körper verdrängt nur sein Gewicht an Wasser (m/ρ_Wasser)
export function schwimmStand(k) {
  return WASSER_START_ML + k.m / RHO_WASSER;
}
export function volumenAusStand(standMl) { return standMl - WASSER_START_ML; }
export function volumenAusStaenden(standBeideMl, standSenkMl) { return standBeideMl - standSenkMl; }
export function dichteAus(m, v) { return v > 0 ? m / v : NaN; }
export function naechstesMaterial(rho) {
  if (!Number.isFinite(rho)) return null;
  return VERGLEICHSDICHTEN.reduce((best, s) =>
    Math.abs(s.rho - rho) < Math.abs(best.rho - rho) ? s : best);
}

// ---------- TESTS (laufen DOM-frei in Node) ----------
export const TESTS = [
  { name: "m = ρ·V exakt für alle Körper", ok: () => KOERPER.every(k => Math.abs(k.m - k.rho * k.v) < 1e-9) },
  { name: "Genau ein Körper schwimmt: Buchenholz (ρ < 1)", ok: () => KOERPER.filter(schwimmt).length === 1 && schwimmt(KOERPER.find(k => k.id === "holz")) },
  { name: "Waage deterministisch, Anzeige höchstens 0,15 g neben m", ok: () => KOERPER.every(k => anzeigeMasse(k) === anzeigeMasse(k) && Math.abs(anzeigeMasse(k) - k.m) <= 0.15) },
  { name: "Zylinder: Stand höchstens 0,4 ml neben 50 + V", ok: () => KOERPER.filter(k => !schwimmt(k)).every(k => Math.abs(wahrerStand(k) - (WASSER_START_ML + k.v)) <= 0.4) },
  { name: "Senkkörper allein: 55,0 ml ± 0,4", ok: () => Math.abs(standSenkkoerper() - 55.0) <= 0.4 },
  { name: "Senkkörper-Arithmetik: V_Holz = Stand_beide − Stand_senk", ok: () => { const holz = KOERPER.find(k => k.id === "holz"); return volumenAusStaenden(77.0, 55.0) === 22.0 && Math.abs(volumenAusStaenden(standMitSenkkoerper(holz), standSenkkoerper()) - holz.v) <= 0.8; } },
  { name: "Synthetisch perfekte Messung → ρ exakt", ok: () => KOERPER.every(k => Math.abs(dichteAus(k.m, k.v) - k.rho) < 1e-9) },
  { name: "parseDezimal: Komma und Punkt", ok: () => parseDezimal("7,14") === 7.14 && parseDezimal(" 7.14 ") === 7.14 && Number.isNaN(parseDezimal("sieben")) },
  { name: "Toleranzen Waage/Zylinder/Dichte greifen", ok: () => ablesungOk(33.5, 33.48, TOL_WAAGE_G) && !ablesungOk(33.7, 33.48, TOL_WAAGE_G) && !ablesungOk(NaN, 33.48, TOL_WAAGE_G) && ablesungOk(62, 62.4, TOL_ZYLINDER_ML) && !ablesungOk(64, 62.4, TOL_ZYLINDER_ML) && ablesungOk(2.7, dichteAus(33.5, 12.4), TOL_DICHTE) && !ablesungOk(2.5, dichteAus(33.5, 12.4), TOL_DICHTE) },
  { name: "Würfel X wird als Zink erkannt (auch mit Messfehlern)", ok: () => naechstesMaterial(dichteAus(69.972, 9.8)).name === LOESUNG_X && naechstesMaterial(dichteAus(70.0, 10.0)).name === LOESUNG_X && naechstesMaterial(dichteAus(69.9, 10.5)).name === LOESUNG_X },
  { name: "Schwimmstand Holz: 50 ml + m/ρ_Wasser = 65,84 ml", ok: () => Math.abs(schwimmStand(KOERPER.find(k => k.id === "holz")) - 65.84) < 1e-9 },
  { name: "Zylinder läuft nie über (alle Stände < 100 ml)", ok: () => KOERPER.filter(k => !schwimmt(k)).every(k => wahrerStand(k) < 100) && standMitSenkkoerper(KOERPER.find(k => k.id === "holz")) < 100 }
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
    gewaehlt: null,      // aktuell bearbeiteter Körper
    schritt: "",         // "wiegen" | "tauchbereit" | "ablesen" | "schwimmt" | "senk" | "beide"
    mNotiert: NaN,       // vom Schüler übertragener Waagenwert
    senkAblesung: NaN,   // abgelesener Stand: Stahlmutter allein
    messungen: [],       // {id, name, m, v}
    dichten: {},         // id → bestätigter ρ-Wert des Schülers
    materialGeloest: false,
    wasserIst: WASSER_START_ML, animVon: WASSER_START_ML, animZiel: WASSER_START_ML, animStart: 0,
    meldung: ""
  };
  const fertig = id => zustand.messungen.some(z => z.id === id);

  // Phasen-Tabs über den gemeinsamen Helfer
  const wechslePhase = bauePhasen(wurzel, [
    { id: "aufbau", label: "Aufbau" },
    { id: "messen", label: "Durchführung" },
    { id: "auswerten", label: "Auswertung" }
  ], zeigePhase);

  const flaeche = document.createElement("div");
  flaeche.className = "exp-flaeche";
  flaeche.innerHTML = `
    <div class="exp-links">
      <canvas id="exp-canvas" width="360" height="640" aria-label="Versuchsaufbau: digitale Waage mit Anzeige, Messzylinder mit Milliliterskala und Wasser, sechs anklickbare Probekörper und eine Stahlmutter am Faden als Senkkörper."></canvas>
    </div>
    <div class="exp-rechts" id="exp-panel"></div>`;
  wurzel.appendChild(flaeche);

  const canvas = flaeche.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = flaeche.querySelector("#exp-panel");

  // ---------- Geometrie ----------
  const SLOTS = KOERPER.map((k, i) => ({ x: 14 + (i % 2) * 104, y: 204 + Math.floor(i / 2) * 72, w: 98, h: 64 }));
  const ZX = 238, ZB = 96, BODEN = 552;                  // Messzylinder
  const yMl = ml => BODEN - ml * 5;                      // 1 ml = 5 px
  const kantePx = k => Math.round(14 * Math.cbrt(k.v));  // Klötzchengröße

  function rRect(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  }

  // ---------- Wasser-Animation ----------
  function zielStand() {
    const k = zustand.gewaehlt, s = zustand.schritt;
    if (!k || s === "wiegen" || s === "tauchbereit") return WASSER_START_ML;
    if (s === "ablesen") return wahrerStand(k);
    if (s === "schwimmt") return schwimmStand(k);
    if (s === "senk") return standSenkkoerper();
    if (s === "beide") return standMitSenkkoerper(k);
    return WASSER_START_ML;
  }
  function setzeWasser() {
    zustand.animZiel = zielStand();
    zustand.animVon = zustand.wasserIst;
    zustand.animStart = performance.now();
    if (reduziert || zustand.animZiel === zustand.animVon) {
      zustand.wasserIst = zustand.animZiel; zeichne(); return;
    }
    requestAnimationFrame(animWasser);
  }
  function animWasser() {
    const t = Math.min(1, (performance.now() - zustand.animStart) / 600);
    const e = 1 - Math.pow(1 - t, 3);
    zustand.wasserIst = zustand.animVon + (zustand.animZiel - zustand.animVon) * e;
    zeichne();
    if (t < 1) requestAnimationFrame(animWasser);
  }

  // ---------- Zeichnung ----------
  function maleKoerper(k, cx, yU, skal, cText, cFlaeche, cLeise) {
    const s = Math.round(kantePx(k) * skal);
    const x = cx - s / 2, y = yU - s;
    rRect(x, y, s, s, 3);
    ctx.fillStyle = cFlaeche; ctx.fill();
    ctx.strokeStyle = cText; ctx.lineWidth = 2; ctx.stroke();
    if (k.id === "holz") { // angedeutete Maserung
      ctx.strokeStyle = cLeise; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 4, y + s * 0.35); ctx.lineTo(x + s - 4, y + s * 0.3);
      ctx.moveTo(x + 4, y + s * 0.72); ctx.lineTo(x + s - 4, y + s * 0.66);
      ctx.stroke();
    }
    if (k.geheim) {
      ctx.fillStyle = cText; ctx.font = "bold 13px system-ui, sans-serif"; ctx.textAlign = "center";
      ctx.fillText("X", cx, y + s / 2 + 4);
      ctx.textAlign = "start"; ctx.font = "12px system-ui, sans-serif";
    }
  }
  function maleMutter(cx, cy, r, cText, cFlaeche) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 3 * i + Math.PI / 6;
      const px = cx + r * Math.cos(a), py = cy + r * Math.sin(a);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = cFlaeche; ctx.fill();
    ctx.strokeStyle = cText; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.4, 0, 7); ctx.stroke();
  }

  function zeichne() {
    const w = canvas.width, h = canvas.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise", "#767676"),
          cAkzent = farbe("--akzent", "#1762a8"), cFlaeche = farbe("--flaeche", "#fff"),
          cHauch = farbe("--hauch", "#eee");
    ctx.clearRect(0, 0, w, h);
    ctx.lineJoin = "round";
    ctx.font = "12px system-ui, sans-serif";

    // ---- digitale Waage ----
    ctx.fillStyle = cLeise; ctx.fillText("Digitale Waage", 40, 86);
    ctx.fillStyle = cText;
    ctx.fillRect(40, 96, 136, 6);    // Teller
    ctx.fillRect(100, 102, 16, 8);   // Säule
    rRect(56, 110, 104, 46, 8); ctx.fillStyle = cFlaeche; ctx.fill();
    ctx.strokeStyle = cText; ctx.lineWidth = 2; ctx.stroke();
    rRect(66, 119, 84, 26, 4); ctx.fillStyle = cHauch; ctx.fill();
    ctx.strokeStyle = cLeise; ctx.lineWidth = 1.5; ctx.stroke();
    const aufWaage = zustand.gewaehlt && (zustand.schritt === "wiegen" || zustand.schritt === "tauchbereit");
    ctx.fillStyle = cText; ctx.font = "bold 15px ui-monospace, Consolas, monospace"; ctx.textAlign = "right";
    ctx.fillText((aufWaage ? komma(anzeigeMasse(zustand.gewaehlt), 1) : "0,0") + " g", 144, 137);
    ctx.textAlign = "start"; ctx.font = "12px system-ui, sans-serif";
    if (aufWaage) maleKoerper(zustand.gewaehlt, 108, 96, 1, cText, cFlaeche, cLeise);

    // ---- Ablage mit Probekörpern ----
    ctx.fillStyle = cText; ctx.font = "bold 13px system-ui, sans-serif";
    ctx.fillText("Probekörper — anklicken:", 14, 196);
    ctx.font = "12px system-ui, sans-serif";
    KOERPER.forEach((k, i) => {
      const s = SLOTS[i];
      const aktiv = zustand.gewaehlt && zustand.gewaehlt.id === k.id;
      const done = fertig(k.id);
      rRect(s.x, s.y, s.w, s.h, 8); ctx.fillStyle = cFlaeche; ctx.fill();
      ctx.strokeStyle = aktiv ? cAkzent : cLeise; ctx.lineWidth = aktiv ? 3 : 1.5; ctx.stroke();
      if (!aktiv) maleKoerper(k, s.x + s.w / 2, s.y + 38, 0.72, done ? cLeise : cText, cFlaeche, cLeise);
      ctx.textAlign = "center"; ctx.fillStyle = done ? cLeise : cText;
      ctx.fillText(k.kurz + (done ? " ✓" : ""), s.x + s.w / 2, s.y + 56);
      ctx.textAlign = "start";
    });

    // ---- Stahlmutter-Vorrat ----
    ctx.fillStyle = cLeise;
    ctx.fillText("Stahlmutter am Faden", 66, 452);
    ctx.fillText("(unser Senkkörper)", 66, 468);
    if (zustand.schritt !== "senk" && zustand.schritt !== "beide") {
      ctx.strokeStyle = cLeise; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(40, 430); ctx.lineTo(40, 447); ctx.stroke();
      maleMutter(40, 460, 13, cText, cFlaeche);
    }

    // ---- Messzylinder ----
    ctx.strokeStyle = cText; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ZX - 3, 40); ctx.lineTo(ZX - 3, BODEN + 3);
    ctx.lineTo(ZX + ZB + 3, BODEN + 3); ctx.lineTo(ZX + ZB + 3, 40);
    ctx.stroke();
    ctx.fillStyle = cLeise; ctx.fillText("Messzylinder", ZX + 2, 26);

    // Wasser
    const yW = yMl(zustand.wasserIst);
    ctx.globalAlpha = 0.22; ctx.fillStyle = cAkzent;
    ctx.fillRect(ZX, yW, ZB, BODEN - yW);
    ctx.globalAlpha = 1;

    // Inhalt des Zylinders
    const mx = ZX + ZB / 2;
    if (zustand.gewaehlt) {
      const k = zustand.gewaehlt;
      if (zustand.schritt === "ablesen") maleKoerper(k, mx, BODEN - 4, 1, cText, cFlaeche, cLeise);
      if (zustand.schritt === "schwimmt") maleKoerper(k, mx, yW + 0.72 * kantePx(k), 1, cText, cFlaeche, cLeise);
      if (zustand.schritt === "senk" || zustand.schritt === "beide") {
        ctx.strokeStyle = cLeise; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(mx, 40); ctx.lineTo(mx, BODEN - 30); ctx.stroke();
        maleMutter(mx, BODEN - 17, 13, cText, cFlaeche);
        if (zustand.schritt === "beide") maleKoerper(k, mx, BODEN - 32, 1, cText, cFlaeche, cLeise);
        else maleKoerper(k, 200, BODEN, 1, cText, cFlaeche, cLeise); // Holz liegt bereit
      }
    }

    // Wasseroberfläche
    ctx.strokeStyle = cAkzent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ZX, yW); ctx.lineTo(ZX + ZB, yW); ctx.stroke();

    // Skala zuletzt — bleibt über Wasser und Körpern lesbar
    for (let ml = 0; ml <= 100; ml += 1) {
      const y = yMl(ml);
      const lang = ml % 10 === 0 ? 16 : ml % 5 === 0 ? 11 : 6;
      ctx.strokeStyle = ml % 10 === 0 ? cText : cLeise; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ZX, y); ctx.lineTo(ZX + lang, y); ctx.stroke();
      if (ml % 10 === 0) { ctx.fillStyle = cText; ctx.fillText(String(ml), ZX + 20, y + 4); }
    }
    ctx.fillStyle = cText; ctx.fillText("ml", ZX + 20, yMl(100) - 12);
  }

  // ---------- Interaktion ----------
  canvas.addEventListener("click", ev => {
    const r = canvas.getBoundingClientRect();
    const x = (ev.clientX - r.left) * canvas.width / r.width;
    const y = (ev.clientY - r.top) * canvas.height / r.height;
    const i = SLOTS.findIndex(s => x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h);
    if (i >= 0) waehleKoerper(KOERPER[i]);
  });

  function waehleKoerper(k) {
    if (zustand.phase !== "messen") { wechslePhase("messen"); }
    if (fertig(k.id)) {
      zustand.meldung = k.name + " steht schon mit ✓ in der Tabelle — wähle einen anderen Körper.";
      panelMessen(); return;
    }
    zustand.gewaehlt = k; zustand.schritt = "wiegen";
    zustand.mNotiert = NaN; zustand.senkAblesung = NaN; zustand.meldung = "";
    setzeWasser(); panelMessen();
  }

  function melde(text) {
    zustand.meldung = text;
    const el = panel.querySelector("#exp-meldung");
    if (el) el.textContent = text;
  }

  function schliesseMessungAb(v, text) {
    zustand.messungen.push({ id: zustand.gewaehlt.id, name: zustand.gewaehlt.name, m: zustand.mNotiert, v });
    zustand.gewaehlt = null; zustand.schritt = "";
    zustand.mNotiert = NaN; zustand.senkAblesung = NaN;
    zustand.meldung = text + (zustand.messungen.length < KOERPER.length ? " Wähle den nächsten Körper!" : " Alle sechs geschafft — ab zur Auswertung!");
    setzeWasser(); panelMessen();
  }

  // ---------- Panels ----------
  function panelAufbau() {
    panel.innerHTML = `
      <h2>Aufbau und Geräte</h2>
      <p>Auf dem Tisch stehen eine <strong>digitale Waage</strong> (zeigt auf 0,1 g genau) und ein <strong>Messzylinder</strong> mit Wasser — gefüllt bis genau <strong>50,0 ml</strong>. Jeder kleine Strich auf der Skala bedeutet 1 ml. Dazu: sechs <strong>Probekörper</strong> und eine Stahlmutter am Faden, die wir später noch brauchen.</p>
      <p><strong>Worum geht es?</strong> Gleich groß heißt nicht gleich schwer! Wie viel ein Stoff pro Raumstück wiegt, verrät seine <strong>Dichte</strong> ρ (sprich: „rho"): <strong>ρ = m ÷ V</strong>, also Masse geteilt durch Volumen. Wir messen sie in g/cm³.</p>
      <p><strong>Dein Plan für jeden Körper:</strong></p>
      <ol>
        <li><strong>Wiegen:</strong> Körper auf die Waage, Anzeige abschreiben → Masse m.</li>
        <li><strong>Eintauchen:</strong> Körper ins Wasser. Es steigt! Den neuen Stand liest du selbst ab → Volumen V.</li>
        <li><strong>Rechnen:</strong> Am Ende teilst du m durch V → Dichte ρ.</li>
      </ol>
      <p class="exp-hinweis">Der Wassertrick heißt <strong>Verdrängung</strong>: Ein Körper schiebt genau so viel Wasser beiseite, wie er selbst Platz braucht. Praktisch dabei: <strong>1 ml = 1 cm³</strong>.</p>
      <p>Ein Körper heißt nur <strong>„Würfel X"</strong> — sein Material ist geheim. Am Ende findest du es heraus!</p>
      <button class="knopf" id="exp-weiter1">Zur Durchführung</button>`;
    panel.querySelector("#exp-weiter1").addEventListener("click", () => wechslePhase("messen"));
  }

  function panelMessen() {
    const k = zustand.gewaehlt;
    const n = zustand.messungen.length;
    let oben = "";
    if (!k) {
      oben = `
        <p>Wähle deinen nächsten Probekörper — klicke ihn im Bild an (oder hier):</p>
        <div class="exp-masseknoepfe" aria-label="Probekörper wählen">
          ${KOERPER.map(x => `<button class="knopf zweitrangig" data-koerper="${x.id}" ${fertig(x.id) ? "disabled" : ""}>${esc(x.kurz)}${fertig(x.id) ? " ✓" : ""}</button>`).join("")}
        </div>`;
    } else if (zustand.schritt === "wiegen") {
      oben = `
        <p><strong>${esc(k.name)}</strong> liegt auf der Waage.</p>
        <p><strong>Schritt 1 — Wiegen:</strong> Schreib genau ab, was das Display zeigt (mit der Stelle nach dem Komma).</p>
        <form id="exp-wiegen" class="exp-ablesen">
          <label for="exp-m">m =</label>
          <input id="exp-m" inputmode="decimal" autocomplete="off" size="7"> g
          <button class="knopf">Notieren</button>
        </form>`;
    } else if (zustand.schritt === "tauchbereit") {
      oben = `
        <p>✓ Masse notiert: m = <strong>${komma(zustand.mNotiert, 1)} g</strong>.</p>
        <p><strong>Schritt 2 — Volumen:</strong> Das Wasser steht bei <strong>50,0 ml</strong>. Tauch den Körper ein und schau, wie hoch es steigt!</p>
        <button class="knopf" id="exp-tauchen">In den Messzylinder eintauchen</button>`;
    } else if (zustand.schritt === "ablesen") {
      oben = `
        <p>Das Wasser ist gestiegen! Lies den neuen Stand ab — auf Augenhöhe, am tiefsten Punkt des Wasserbogens (Meniskus). Jeder kleine Strich ist 1 ml.</p>
        <details class="exp-hilfe"><summary>Hilfe: Schritt für Schritt</summary>
          <p><strong>So liest du ab:</strong> Geh mit den Augen auf die Höhe der Wasseroberfläche. Such die nächste beschriftete Zahl (z. B. 60) und zähle von dort die kleinen Striche weiter — jeder Strich ist 1 ml. Tippe genau diesen Stand ins Feld.</p>
          <p><strong>Was zählt:</strong> Hier trägst du nur den abgelesenen Wasserstand ein. Das Volumen des Körpers rechnet das Experiment danach selbst aus: V = neuer Stand − 50,0 ml (so viel Wasser hat der Körper zur Seite geschoben).</p>
          <p><strong>Beispiel (erfundene Zahl!):</strong> Steht das Wasser jetzt bei 63 ml, dann hat der Körper 63 − 50 = 13 ml verdrängt, also V = 13 cm³ (denn 1 ml = 1 cm³).</p>
        </details>
        <form id="exp-stand" class="exp-ablesen">
          <label for="exp-ml">Wasserstand:</label>
          <input id="exp-ml" inputmode="decimal" autocomplete="off" size="7"> ml
          <button class="knopf">Notieren</button>
        </form>`;
    } else if (zustand.schritt === "schwimmt") {
      oben = `
        <p class="exp-hinweis"><strong>Oha — das Holz schwimmt!</strong> Es taucht nur zum Teil ein, der Wasserstand zeigt also <em>nicht</em> sein ganzes Volumen. So können wir V nicht messen.</p>
        <p><strong>Der Trick:</strong> Eine Stahlmutter zieht das Holz als <strong>Senkkörper</strong> ganz unter Wasser. Damit ihr eigenes Volumen nicht stört, tauchen wir sie <strong>zuerst allein</strong> ein und merken uns den Stand.</p>
        <button class="knopf" id="exp-senk">Stahlmutter zuerst allein eintauchen</button>`;
    } else if (zustand.schritt === "senk") {
      oben = `
        <p>Nur die Stahlmutter hängt am Faden im Wasser, das Holz liegt bereit. Lies den Wasserstand ab:</p>
        <form id="exp-stand" class="exp-ablesen">
          <label for="exp-ml">Stand mit Stahlmutter:</label>
          <input id="exp-ml" inputmode="decimal" autocomplete="off" size="7"> ml
          <button class="knopf">Notieren</button>
        </form>`;
    } else if (zustand.schritt === "beide") {
      oben = `
        <p>✓ Stand mit Stahlmutter allein: <strong>${komma(zustand.senkAblesung, 1)} ml</strong> — gemerkt.</p>
        <p>Jetzt hängt das Holz an der Stahlmutter, beide sind ganz unter Wasser. Lies den neuen Stand ab:</p>
        <details class="exp-hilfe" open><summary>Hilfe: Schritt für Schritt</summary>
          <p><strong>So liest du ab:</strong> Lies wieder den Wasserstand auf Augenhöhe am untersten Punkt der Oberfläche ab und tippe ihn ein. Jetzt sind Stahlmutter und Holz zusammen unter Wasser.</p>
          <p><strong>Warum der Trick funktioniert:</strong> Die Stahlmutter war beim ersten Stand schon dabei. Wenn du den ersten Stand (nur Mutter) vom zweiten Stand (Mutter + Holz) abziehst, fällt die Mutter heraus und übrig bleibt allein das Holz-Volumen: V(Holz) = Stand (beide) − Stand (nur Mutter).</p>
          <p><strong>Beispiel (erfundene Zahlen!):</strong> Stand nur Mutter = 55 ml, Stand mit Holz + Mutter = 78 ml → V(Holz) = 78 − 55 = 23 cm³. Das Experiment rechnet diese Differenz gleich für dich aus.</p>
        </details>
        <form id="exp-stand" class="exp-ablesen">
          <label for="exp-ml">Stand mit Holz + Mutter:</label>
          <input id="exp-ml" inputmode="decimal" autocomplete="off" size="7"> ml
          <button class="knopf">Notieren</button>
        </form>`;
    }
    panel.innerHTML = `
      <h2>Durchführung</h2>
      ${oben}
      ${k ? '<p><button class="knopf zweitrangig" id="exp-abbruch">Körper zurücklegen</button></p>' : ""}
      <p id="exp-meldung" class="exp-meldung" aria-live="polite">${esc(zustand.meldung)}</p>
      <h3>Messtabelle</h3>
      <table class="exp-tabelle">
        <thead><tr><th>Körper</th><th>m in g</th><th>V in cm³</th></tr></thead>
        <tbody>${zustand.messungen.map(z => `<tr><td>${esc(z.name)}</td><td>${komma(z.m, 1)}</td><td>${komma(z.v, 1)}</td></tr>`).join("") || '<tr><td colspan="3">noch leer</td></tr>'}</tbody>
      </table>
      <p>${n} von ${KOERPER.length} Körpern gemessen.${n >= 3 && n < KOERPER.length ? " Ab 3 darfst du auswerten — mit allen 6 wird es noch besser!" : ""}</p>
      <button class="knopf" id="exp-weiter2" ${n >= 3 ? "" : "disabled"}>Zur Auswertung</button>`;

    panel.querySelectorAll("[data-koerper]").forEach(b =>
      b.addEventListener("click", () => waehleKoerper(KOERPER.find(x => x.id === b.dataset.koerper))));
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
    panel.querySelector("#exp-abbruch")?.addEventListener("click", () => {
      zustand.gewaehlt = null; zustand.schritt = ""; zustand.meldung = "";
      setzeWasser(); panelMessen();
    });
    panel.querySelector("#exp-tauchen")?.addEventListener("click", () => {
      zustand.schritt = schwimmt(k) ? "schwimmt" : "ablesen"; zustand.meldung = "";
      setzeWasser(); panelMessen();
    });
    panel.querySelector("#exp-senk")?.addEventListener("click", () => {
      zustand.schritt = "senk"; zustand.meldung = "";
      setzeWasser(); panelMessen();
    });
    panel.querySelector("#exp-wiegen")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-m").value);
      if (!ablesungOk(eingabe, anzeigeMasse(k), TOL_WAAGE_G)) {
        melde("✗ Das steht nicht auf dem Display. Schau genau hin und tippe die Zahl ab — mit der Stelle nach dem Komma.");
        return;
      }
      zustand.mNotiert = eingabe; zustand.schritt = "tauchbereit"; zustand.meldung = "";
      panelMessen();
    });
    panel.querySelector("#exp-stand")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-ml").value);
      const soll = zustand.schritt === "senk" ? standSenkkoerper()
                 : zustand.schritt === "beide" ? standMitSenkkoerper(k)
                 : wahrerStand(k);
      if (!ablesungOk(eingabe, soll, TOL_ZYLINDER_ML)) {
        melde("✗ Schau noch einmal genau hin: Auf welcher Höhe steht das Wasser? Zähle von einer Zehnerzahl aus die kleinen Striche — jeder ist 1 ml.");
        return;
      }
      if (zustand.schritt === "senk") {
        zustand.senkAblesung = eingabe; zustand.schritt = "beide"; zustand.meldung = "";
        setzeWasser(); panelMessen();
      } else if (zustand.schritt === "beide") {
        const v = volumenAusStaenden(eingabe, zustand.senkAblesung);
        schliesseMessungAb(v, `✓ Stark! V(Holz) = ${komma(eingabe, 1)} ml − ${komma(zustand.senkAblesung, 1)} ml = ${komma(v, 1)} cm³. Die Stahlmutter zählt nicht mit, denn sie war bei beiden Ständen dabei.`);
      } else {
        const v = volumenAusStand(eingabe);
        schliesseMessungAb(v, `✓ Gut abgelesen! V = ${komma(eingabe, 1)} ml − 50,0 ml = ${komma(v, 1)} cm³, denn 1 ml = 1 cm³.`);
      }
    });
  }

  function panelAuswerten() {
    const zeilen = zustand.messungen;
    if (!zeilen.length) {
      panel.innerHTML = `<h2>Auswertung</h2><p>Noch keine Messwerte! Geh zu „2 · Durchführung" und miss zuerst ein paar Körper.</p>`;
      return;
    }
    panel.innerHTML = `
      <h2>Auswertung</h2>
      <p>Rechne für jede Zeile die <strong>Dichte</strong> aus: <strong>ρ = m ÷ V</strong>. Runde auf 2 Stellen nach dem Komma und trag dein Ergebnis ein (Taschenrechner erlaubt):</p>
      <details class="exp-hilfe"><summary>Hilfe: Schritt für Schritt</summary>
        <p><strong>Teilschritt:</strong> Nimm aus einer Zeile die Masse m (in g) und das Volumen V (in cm³) und teile m durch V. Das Ergebnis ist die Dichte ρ in g/cm³ — trag sie in das Feld dieser Zeile ein.</p>
        <p><strong>Beispiel (erfundene Zahlen!):</strong> Stünde in der Zeile m = 50 g und V = 20 cm³, dann ρ = 50 ÷ 20 = 2,50 g/cm³. Tippe also 2,50 ein. Mach das Zeile für Zeile mit deinen eigenen Werten.</p>
        <p><strong>Tipp zum Runden:</strong> Zwei Stellen nach dem Komma reichen. Zeigt der Taschenrechner z. B. 2,4975, schreibst du 2,50.</p>
      </details>
      <table class="exp-tabelle">
        <thead><tr><th>Körper</th><th>m in g</th><th>V in cm³</th><th>ρ in g/cm³</th><th></th></tr></thead>
        <tbody>${zeilen.map((z, i) => `<tr><td>${esc(z.name)}</td><td>${komma(z.m, 1)}</td><td>${komma(z.v, 1)}</td><td><input class="exp-eingabe" data-zeile="${i}" inputmode="decimal" autocomplete="off" aria-label="Dichte von ${esc(z.name)} in Gramm pro Kubikzentimeter"></td><td data-status="${i}"></td></tr>`).join("")}</tbody>
      </table>
      <p id="exp-meldung" class="exp-meldung" aria-live="polite"></p>
      <div id="exp-erkenntnisse"></div>
      <h3>Vergleichstabelle: Dichten bekannter Stoffe</h3>
      <table class="exp-tabelle">
        <thead><tr><th>Stoff</th><th>ρ in g/cm³</th></tr></thead>
        <tbody>${VERGLEICHSDICHTEN.map(s => `<tr><td>${esc(s.name)}</td><td>${komma(s.rho, 2)}</td></tr>`).join("")}</tbody>
      </table>
      <details class="exp-fehler"><summary>Fehlerbetrachtung — warum stimmt es nie haargenau?</summary>
        <p><strong>Meniskus und Blickwinkel:</strong> Wasser zieht sich am Glasrand etwas hoch — die Oberfläche ist ein kleiner Bogen (Meniskus). Lies immer den tiefsten Punkt ab, und zwar auf Augenhöhe! Wer schräg von oben oder unten guckt, liest schnell 1–2 ml daneben.</p>
        <p><strong>Tropfen am Körper:</strong> Holst du einen Körper heraus, nimmt er Wassertropfen mit. Beim nächsten Mal fehlt dieses Wasser — darum kontrolliert man den Anfangsstand vor jeder Messung. (Hier wird heimlich für dich nachgefüllt.)</p>
        <p><strong>Die Waage rundet:</strong> Sie zeigt nur Schritte von 0,1 g. Der wahre Wert liegt immer ein kleines Stück daneben.</p>
        <p>Kleine Fehler bei m und V verschieben ρ schnell um ein paar Zehntel — deshalb vergleicht man mit einer Tabelle und sucht den <em>nächstgelegenen</em> Wert.</p>
      </details>
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
      const i = Number(inp.dataset.zeile), z = zeilen[i];
      if (zustand.dichten[z.id] !== undefined) { inp.value = komma(zustand.dichten[z.id], 2); markiere(i, true); }
      inp.addEventListener("change", () => {
        const wert = parseDezimal(inp.value);
        if (!Number.isFinite(wert)) {
          delete zustand.dichten[z.id]; markiere(i, false);
          melde("Gib eine Zahl ein — Komma oder Punkt, beides geht.");
        } else if (ablesungOk(wert, dichteAus(z.m, z.v), TOL_DICHTE)) {
          zustand.dichten[z.id] = wert; markiere(i, true);
          melde(`✓ ${z.name}: ρ ≈ ${komma(wert, 2)} g/cm³ — richtig gerechnet!`);
        } else {
          delete zustand.dichten[z.id]; markiere(i, false);
          melde(`✗ Prüf deine Rechnung: ρ = m ÷ V = ${komma(z.m, 1)} ÷ ${komma(z.v, 1)}. Du schaffst das!`);
        }
        zeigeErkenntnisse();
      });
    });
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      csvHerunterladen("dichtebestimmung-messwerte.csv",
        ["Körper", "m in g", "V in cm³", "Dichte in g/cm³"],
        zeilen.map(z => [z.name, z.m, z.v, dichteAus(z.m, z.v)]));
    });
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      zustand.gewaehlt = null; zustand.schritt = ""; zustand.messungen = [];
      zustand.dichten = {}; zustand.materialGeloest = false; zustand.meldung = "";
      zustand.mNotiert = NaN; zustand.senkAblesung = NaN;
      setzeWasser(); wechslePhase("aufbau");
    });
    zeigeErkenntnisse();
  }

  function zeigeErkenntnisse() {
    const box = panel.querySelector("#exp-erkenntnisse");
    if (!box) return;
    const dHolz = zustand.dichten.holz, dX = zustand.dichten.x;
    let html = "";
    if (dHolz !== undefined) {
      html += `<p class="exp-hinweis"><strong>Die Schwimm-Regel:</strong> Dein Buchenholz hat ρ ≈ ${komma(dHolz, 2)} g/cm³ — <strong>weniger als Wasser</strong> (1,00 g/cm³). Genau darum schwimmt es! Merke: ρ kleiner als 1 g/cm³ → schwimmt, ρ größer als 1 g/cm³ → sinkt.</p>`;
    }
    if (dX !== undefined && !zustand.materialGeloest) {
      html += `
        <p><strong>Der große Moment:</strong> Würfel X hat bei dir ρ ≈ ${komma(dX, 2)} g/cm³. Vergleiche mit der Tabelle unten — aus welchem Stoff ist er?</p>
        <label for="exp-material">Würfel X ist aus:</label>
        <select id="exp-material" class="exp-wahl">
          <option value="">— wähle einen Stoff —</option>
          ${VERGLEICHSDICHTEN.map(s => `<option>${esc(s.name)}</option>`).join("")}
        </select>`;
    }
    if (zustand.materialGeloest) {
      html += `<p class="exp-hinweis">✓ <strong>Gelöst:</strong> Würfel X ist aus <strong>Zink</strong> (ρ = 7,14 g/cm³). So bestimmen auch Fachleute unbekannte Materialien — gut gemacht!</p>`;
    }
    const alleDichten = zustand.messungen.length && zustand.messungen.every(z => zustand.dichten[z.id] !== undefined);
    if (alleDichten && zustand.messungen.length === KOERPER.length && zustand.materialGeloest) {
      html += `<p><strong>Experiment komplett!</strong> Sechs Körper gewogen, eingetaucht, berechnet — und Würfel X enttarnt. Speichere deine Messwerte als CSV, wenn du magst.</p>`;
    }
    box.innerHTML = html;
    box.querySelector("#exp-material")?.addEventListener("change", ev => {
      const wahl = ev.target.value;
      if (!wahl) return;
      if (wahl === LOESUNG_X) {
        zustand.materialGeloest = true;
        melde("✓ Richtig! Würfel X ist aus Zink — dein Messwert liegt am nächsten an 7,14 g/cm³.");
        zeigeErkenntnisse();
      } else {
        melde(`✗ ${wahl} passt noch nicht. Vergleiche: Welcher Tabellenwert liegt am nächsten an deinen ${komma(zustand.dichten.x, 2)} g/cm³? Beim Ablesen machen 1–2 Striche schon viel aus — versuch es gleich nochmal.`);
      }
    });
  }

  function zeigePhase(id) {
    zustand.phase = id;
    if (id === "aufbau") panelAufbau();
    else if (id === "messen") panelMessen();
    else panelAuswerten();
  }

  setzeWasser();
  wechslePhase("aufbau");
}
