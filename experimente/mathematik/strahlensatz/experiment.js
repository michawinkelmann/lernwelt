// experiment.js — Interaktives Mathe-Experiment: Den Strahlensatz vermessen (Klasse 9).
// Realitätsnahe Messpraxis statt fertiger Formel: Zwei Strahlen gehen vom
// Scheitel Z aus. Eine verschiebbare Parallele (immer dieselbe Richtung)
// schneidet beide Strahlen; sie erzeugt auf Strahl 1 den Abschnitt ZA und auf
// Strahl 2 den Abschnitt ZA′. Beide Abschnitte liest der Lernende an mm-Skalen
// SELBST ab — für mehrere Parallel-Stellungen. Trägt man ZA′ über ZA auf,
// liegen alle Punkte auf einer Ursprungsgeraden; ihre Steigung ist das feste
// Verhältnis ZA′ : ZA (Strahlensatz: gleiche Verhältnisse auf beiden Strahlen).
// Die Ablese-Streuung ist deterministisch geseedet (helfer.streuung), dadurch
// laufen die TESTS DOM-frei in Node (Modulebene browserfrei).

import {
  streuung, parseDezimal, komma, ablesungOk, esc, mittel, regression,
  farbe, bauePhasen, csvHerunterladen
} from "../../../assets/js/experiment/helfer.js";

// ---------- festes Verhältnis (Strahlensatz-Konstante) ----------
// k = ZA′ / ZA. Durch die feste Lage der beiden Strahlen und die feste
// Parallelen-Richtung ist dieses Verhältnis für JEDE Stellung gleich.
export const VERHAELTNIS = 1.6;

// ---------- Parallel-Stellungen: Abschnitt ZA auf Strahl 1 (in cm) ----------
// (Verschiedene Stellungen der Parallele = verschiedene ZA-Werte.)
export const STELLUNGEN = [
  { id: "s1", name: "Stellung 1", kurz: "1", za: 3 },
  { id: "s2", name: "Stellung 2", kurz: "2", za: 5 },
  { id: "s3", name: "Stellung 3", kurz: "3", za: 6.5 },
  { id: "s4", name: "Stellung 4", kurz: "4", za: 8 },
  { id: "s5", name: "Stellung 5", kurz: "5", za: 10 }
];
export const MINDEST_STELLUNGEN = 4;

// ---------- Toleranzen (alles in cm) ----------
export const TOL_LAENGE = 0.2;   // Abschnitte an der mm-Skala ablesen
export const TOL_ZAHL   = 0.08;  // Verhältnis (Steigung)

// ---------- Messlogik (rein, DOM-frei, Node-testbar) ----------
export function zaStrichWahr(st) { return VERHAELTNIS * st.za; }

// Ablesen an der mm-Skala auf dem Strahl: wahrer Abschnitt + Ablese-Streuung
// ±0,075 cm, Anzeige in mm (0,1-cm-Raster).
export function messeZA(st) {
  const roh = st.za + streuung("za:" + st.id, 0.15);
  return Math.round(roh * 10) / 10;
}
export function messeZAStrich(st) {
  const roh = zaStrichWahr(st) + streuung("zas:" + st.id, 0.15);
  return Math.round(roh * 10) / 10;
}

// Regressionsgerade durch den Ursprung y = m·x (kleinste Quadrate ohne
// Achsenabschnitt): m = Σ(x·y) / Σ(x²) — hier x = ZA, y = ZA′.
export function steigungUrsprung(punkte) {
  let sxx = 0, sxy = 0;
  for (const p of punkte) { sxx += p.x * p.x; sxy += p.x * p.y; }
  return sxx > 0 ? sxy / sxx : NaN;
}

// Antwort auf die Frage nach dem Verhältnis: VERHAELTNIS (±Toleranz) oder als
// Verhältnis „1,6" bzw. als Bruch nahe 1,6.
export function verhaeltnisAntwortOk(text) {
  const t = String(text).trim().toLowerCase().replace(/\s/g, "");
  // Bruch a:b oder a/b zulassen
  const bruch = t.match(/^(\d+(?:[.,]\d+)?)[:\/](\d+(?:[.,]\d+)?)$/);
  if (bruch) {
    const a = parseDezimal(bruch[1]), b = parseDezimal(bruch[2]);
    return b !== 0 && ablesungOk(a / b, VERHAELTNIS, TOL_ZAHL + 1e-9);
  }
  return ablesungOk(parseDezimal(t), VERHAELTNIS, TOL_ZAHL + 1e-9);
}

// größte Stellung = relativ genaueste Messung (gleicher Ablesefehler, größere
// Abschnitte → kleiner relativer Fehler). Maß: ZA-Länge.
export function relFehlerProMm(st) { return 0.1 / st.za + 0.1 / zaStrichWahr(st); }
export function genauesteStellung(ids) {
  const dabei = STELLUNGEN.filter(s => ids.includes(s.id));
  return dabei.reduce((best, s) => (best === null || s.za > best.za ? s : best), null);
}

// ---------- TESTS (laufen DOM-frei in Node) ----------
// Unabhängige Nachrechnung: Das Verhältnis ZA′/ZA muss für JEDE Stellung gleich
// (= VERHAELTNIS) sein — rein aus der Definition, ohne den Strahlensatz
// vorauszusetzen. Genau das ist die Kernaussage.
export const TESTS = [
  { name: "ZA′ = k·ZA für jede Stellung (Definition, k = 1,6)", ok: () => STELLUNGEN.every(s => Math.abs(zaStrichWahr(s) - VERHAELTNIS * s.za) < 1e-12) },
  { name: "Verhältnis ZA′/ZA ist für alle Stellungen gleich (= k)", ok: () => STELLUNGEN.every(s => Math.abs(zaStrichWahr(s) / s.za - VERHAELTNIS) < 1e-12) },
  { name: "konkrete Werte: ZA=3→ZA′=4,8; ZA=5→8; ZA=10→16", ok: () =>
      Math.abs(zaStrichWahr(STELLUNGEN[0]) - 4.8) < 1e-9
      && Math.abs(zaStrichWahr(STELLUNGEN[1]) - 8) < 1e-9
      && Math.abs(zaStrichWahr(STELLUNGEN[4]) - 16) < 1e-9 },
  { name: "Ursprungs-Regression perfekter Punkte (ZA′ über ZA): Steigung = k", ok: () => Math.abs(steigungUrsprung(STELLUNGEN.map(s => ({ x: s.za, y: zaStrichWahr(s) }))) - VERHAELTNIS) < 1e-9 },
  { name: "freie Regression (helfer.js) perfekter Punkte: m = k, b = 0", ok: () => { const { m, b } = regression(STELLUNGEN.map(s => ({ x: s.za, y: zaStrichWahr(s) }))); return Math.abs(m - VERHAELTNIS) < 1e-9 && Math.abs(b) < 1e-9; } },
  { name: "Streugrenzen: jede Ablesung ±0,075 cm (+ mm-Rundung) um den wahren Wert", ok: () => STELLUNGEN.every(s => {
      const e1 = Math.abs(messeZA(s) - s.za), e2 = Math.abs(messeZAStrich(s) - zaStrichWahr(s));
      return e1 <= 0.075 + 0.05 + 1e-9 && e2 <= 0.075 + 0.05 + 1e-9;
    }) },
  { name: "Anzeige auf 0,1 cm (mm) gerastert", ok: () => STELLUNGEN.every(s => { const f1 = messeZA(s) * 10, f2 = messeZAStrich(s) * 10; return Math.abs(f1 - Math.round(f1)) < 1e-9 && Math.abs(f2 - Math.round(f2)) < 1e-9; }) },
  { name: "Messwerte deterministisch (zweiter Aufruf identisch)", ok: () => STELLUNGEN.every(s => messeZA(s) === messeZA(s) && messeZAStrich(s) === messeZAStrich(s)) },
  { name: "Steigung der gemessenen Punkte nahe k (|m−k| < 0,05), ±-Prüfung greift", ok: () => { const m = steigungUrsprung(STELLUNGEN.map(s => ({ x: messeZA(s), y: messeZAStrich(s) }))); return Math.abs(m - VERHAELTNIS) < 0.05 && ablesungOk(m + 0.07, m, TOL_ZAHL) && !ablesungOk(m + 0.12, m, TOL_ZAHL); } },
  { name: "relativer 1-mm-Fehler fällt streng monoton mit ZA (größte Stellung gewinnt)", ok: () => { const r = STELLUNGEN.map(relFehlerProMm); return r.every((w, i) => i === 0 || w < r[i - 1]) && genauesteStellung(STELLUNGEN.map(s => s.id)).id === "s5"; } },
  { name: "Verhältnis-Antwort: 1,6 als Zahl, Bruch (8:5, 16/10) oder ±0,08", ok: () => verhaeltnisAntwortOk("1,6") && verhaeltnisAntwortOk(" 1.6 ") && verhaeltnisAntwortOk("8:5") && verhaeltnisAntwortOk("16/10") && verhaeltnisAntwortOk("1,55") && !verhaeltnisAntwortOk("1") && !verhaeltnisAntwortOk("2:1") && !verhaeltnisAntwortOk("") },
  { name: "parseDezimal + Längen-Toleranzen greifen", ok: () => { const z0 = messeZA(STELLUNGEN[0]); return parseDezimal("3,1") === 3.1 && parseDezimal(" 3.1 ") === 3.1 && Number.isNaN(parseDezimal("drei")) && ablesungOk(z0 + 0.18, z0, TOL_LAENGE) && !ablesungOk(z0 + 0.25, z0, TOL_LAENGE) && !ablesungOk(NaN, z0, TOL_LAENGE); } }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;

  const zustand = {
    phase: "aufbau",
    gewaehlt: null,        // Stellung in Arbeit
    schritt: "",           // "za" | "zas"
    zaNotiert: NaN,
    messungen: [],         // {id, name, za, zas}
    meldung: "",
    verhErkannt: false,    // konstantes Verhältnis erkannt
    steigungOk: false,
    steigungGezeigt: false,
    genauOk: false
  };
  const fertig = id => zustand.messungen.some(z => z.id === id);

  const wechslePhase = bauePhasen(wurzel, [
    { id: "aufbau", label: "Aufbau" },
    { id: "messen", label: "Durchführung" },
    { id: "auswerten", label: "Auswertung" }
  ], zeigePhase);

  const flaeche = document.createElement("div");
  flaeche.className = "exp-flaeche";
  flaeche.innerHTML = [
    '<div class="exp-links">',
    '<canvas id="exp-canvas" width="360" height="500" aria-label="Messplatz: vom Scheitel Z gehen zwei Strahlen aus. Eine Parallele schneidet beide Strahlen in den Punkten A und A-Strich. An jedem Strahl liegt eine Millimeter-Skala, an der der Abschnitt vom Scheitel abgelesen wird. Eine Anzeige zeigt den abgelesenen Wert."></canvas>',
    '</div>',
    '<div class="exp-rechts" id="exp-panel"></div>'
  ].join("");
  wurzel.appendChild(flaeche);

  const canvas = flaeche.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = flaeche.querySelector("#exp-panel");

  // Auswahl-Plätze (Reihe oben)
  const SLOTS = STELLUNGEN.map((s, i) => ({ x: 10 + i * 69, y: 44, w: 64, h: 78 }));

  // Strahlen-Geometrie (Bildkoordinaten). Z links; Strahl 1 nach rechts-oben,
  // Strahl 2 flacher rechts-unten. Maßstab px/cm so, dass ZA=10 passt.
  const ZX = 44, ZY = 252;
  const PROCM = 21;                              // px je cm entlang Strahl 1
  const D1 = { x: Math.cos(-0.60), y: Math.sin(-0.60) };  // Strahl 1 (nach oben)
  const D2 = { x: Math.cos(0.26), y: Math.sin(0.26) };    // Strahl 2 (leicht nach unten)
  // Damit ZA′ = k·ZA auf Strahl 2 dieselbe Parallele liefert, skaliert die
  // px-Länge auf Strahl 2 mit demselben k (rein zeichnerisch konsistent).

  function rRect(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  }

  // Punkt auf Strahl 1 bei Abschnitt za (cm)
  function p1(za) { return { x: ZX + D1.x * za * PROCM, y: ZY + D1.y * za * PROCM }; }
  // Punkt auf Strahl 2 bei Abschnitt zas (cm) — eigener px-Maßstab, so dass
  // gleiche cm-Längen vergleichbar gezeichnet werden
  const PROCM2 = 15;
  function p2(zas) { return { x: ZX + D2.x * zas * PROCM2, y: ZY + D2.y * zas * PROCM2 }; }

  // ---------- Regal: Stellungen zur Auswahl ----------
  function zeichneRegal(F) {
    ctx.fillStyle = F.cText; ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillText("Parallel-Stellungen — eine anklicken:", 12, 26);
    ctx.font = "12px system-ui, sans-serif";
    STELLUNGEN.forEach((s, i) => {
      const sl = SLOTS[i], done = fertig(s.id);
      rRect(sl.x, sl.y, sl.w, sl.h, 8);
      ctx.fillStyle = F.cFlaeche; ctx.fill();
      ctx.strokeStyle = F.cLeise; ctx.lineWidth = done ? 1.5 : 2; ctx.stroke();
      // Mini-Skizze: Scheitel + zwei kurze Strahlen + Parallele
      const zx = sl.x + 12, zy = sl.y + 44, L = 36;
      ctx.strokeStyle = F.cText; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(zx, zy); ctx.lineTo(zx + L, zy - 22);
      ctx.moveTo(zx, zy); ctx.lineTo(zx + L, zy + 12); ctx.stroke();
      const t = 0.4 + i * 0.12;
      ctx.strokeStyle = done ? F.cLeise : F.cAkzent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(zx + L * t, zy - 22 * t); ctx.lineTo(zx + L * t, zy + 12 * t); ctx.stroke();
      ctx.fillStyle = done ? F.cLeise : F.cText; ctx.textAlign = "center";
      ctx.font = "bold 11px system-ui, sans-serif";
      ctx.fillText(s.kurz + (done ? " ✓" : ""), sl.x + sl.w / 2, sl.y + sl.h - 6);
      ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start";
    });
    ctx.fillStyle = F.cLeise; ctx.textAlign = "center";
    ctx.fillText("Jede Stellung der Parallele liefert ein Paar (ZA, ZA′).", canvas.width / 2, 168);
    ctx.fillText("Du liest beide Abschnitte an den Skalen ab.", canvas.width / 2, 190);
    ctx.textAlign = "start";
  }

  // ---------- mm-Skala entlang eines Strahls (von Z aus, Länge Lcm) ----------
  // Lcm = bis hierher reicht der gezeichnete Strahl (cm). skalaCm = bis hierher
  // trägt die aktive Skala Striche/Zahlen (sonst wird das Bild zu voll). Die
  // cm-Zahlen werden nur gesetzt, wenn sie genug Abstand haben.
  function maleStrahlSkala(dir, proCm, Lcm, skalaCm, mess, aktiv, F) {
    const ux = dir.x, uy = dir.y;
    const nx = -uy, ny = ux;                      // Normale (Beschriftungsseite)
    const endX = ZX + ux * Lcm * proCm, endY = ZY + uy * Lcm * proCm;
    ctx.strokeStyle = aktiv ? F.cAkzent : F.cText; ctx.lineWidth = aktiv ? 2.5 : 2;
    ctx.beginPath(); ctx.moveTo(ZX, ZY); ctx.lineTo(endX, endY); ctx.stroke();
    if (!aktiv) return { endX, endY, nx, ny };
    // cm-Zahl nur jede labelStep-te cm, damit die Zahlen nicht kollidieren
    const labelStep = proCm >= 22 ? 1 : proCm >= 12 ? 2 : 5;
    const maxMm = Math.floor(skalaCm * 10);
    for (let mm = 0; mm <= maxMm; mm++) {
      const t = mm / 10 * proCm;
      const bx = ZX + ux * t, by = ZY + uy * t;
      const cmStrich = mm % 10 === 0, halb = mm % 5 === 0;
      const lTick = cmStrich ? 9 : halb ? 6 : 3;
      ctx.strokeStyle = cmStrich ? F.cText : F.cLeise; ctx.lineWidth = cmStrich ? 1.5 : 1;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + nx * lTick, by + ny * lTick); ctx.stroke();
      if (cmStrich && mm > 0 && (mm / 10) % labelStep === 0) {
        ctx.fillStyle = F.cText; ctx.font = "10px system-ui, sans-serif"; ctx.textAlign = "center";
        ctx.fillText(String(mm / 10), bx + nx * 18, by + ny * 18 + 3);
        ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start";
      }
    }
    // Ablesemarke
    const tw = mess * proCm;
    const mx = ZX + ux * tw, my = ZY + uy * tw;
    ctx.strokeStyle = F.cAkzent; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + nx * 14, my + ny * 14); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = F.cAkzent; ctx.beginPath(); ctx.arc(mx, my, 3.5, 0, 7); ctx.fill();
    return { endX, endY, nx, ny };
  }

  // ---------- Mess-Szene ----------
  function zeichneMessung(st, F) {
    const messZA = messeZA(st), messZAS = messeZAStrich(st);
    const aktivZA = zustand.schritt === "za";

    const titel = aktivZA ? "ZA ablesen (Strahl 1)" : "ZA′ ablesen (Strahl 2)";
    ctx.fillStyle = F.cText; ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillText(st.name + " — " + titel, 12, 26);
    ctx.font = "12px system-ui, sans-serif";

    // Strahl-Länge knapp über den größtmöglichen Abschnitt; Skala nur bis dort,
    // wo die aktive Messung liegt (+1 cm), damit die Zahlen lesbar bleiben.
    const Lcm1 = 11.5, Lcm2 = VERHAELTNIS * 11.5;
    const skala1 = Math.min(Lcm1, Math.ceil(messZA) + 1);
    const skala2 = Math.min(Lcm2, Math.ceil(messZAS) + 1);
    const e1 = maleStrahlSkala(D1, PROCM, Lcm1, skala1, messZA, aktivZA, F);
    const e2 = maleStrahlSkala(D2, PROCM2, Lcm2, skala2, messZAS, !aktivZA, F);

    // Scheitel Z
    ctx.fillStyle = F.cText; ctx.beginPath(); ctx.arc(ZX, ZY, 4, 0, 7); ctx.fill();
    ctx.font = "bold 13px system-ui, sans-serif"; ctx.textAlign = "right";
    ctx.fillText("Z", ZX - 6, ZY + 4); ctx.textAlign = "start";
    ctx.font = "12px system-ui, sans-serif";

    // Parallele dieser Stellung: verbindet A (auf Strahl 1, bei za) und
    // A′ (auf Strahl 2, bei k·za). Diese Verbindungen sind für alle
    // Stellungen parallel (Strahlensatz).
    const A = p1(st.za), As = p2(zaStrichWahr(st));
    ctx.strokeStyle = F.cAkzent; ctx.lineWidth = 2; ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(As.x, As.y); ctx.stroke();
    ctx.globalAlpha = 1;
    // blasse weitere Parallelen zur Orientierung
    ctx.strokeStyle = F.cLeise; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    for (const f of [0.5, 1.5]) {
      const Ai = p1(st.za * f), Asi = p2(zaStrichWahr(st) * f);
      if (st.za * f <= Lcm1) { ctx.beginPath(); ctx.moveTo(Ai.x, Ai.y); ctx.lineTo(Asi.x, Asi.y); ctx.stroke(); }
    }
    ctx.setLineDash([]);

    // Punkte A und A′ markieren
    ctx.fillStyle = F.cText;
    ctx.beginPath(); ctx.arc(A.x, A.y, 3, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(As.x, As.y, 3, 0, 7); ctx.fill();
    ctx.font = "bold 12px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("A", A.x + 2, A.y - 8);
    ctx.fillText("A′", As.x + 12, As.y + 4);
    ctx.textAlign = "start"; ctx.font = "12px system-ui, sans-serif";

    // Strahl-Bezeichner an den Strahlenden, nach außen versetzt (Normale)
    ctx.fillStyle = F.cLeise; ctx.textAlign = "center";
    ctx.fillText("Strahl 1", e1.endX + e1.nx * 16 + 4, e1.endY + e1.ny * 16 - 4);
    ctx.fillText("Strahl 2", e2.endX + e2.nx * 20, e2.endY + e2.ny * 20 + 8);
    ctx.textAlign = "start";

    // Anzeige unten — abzulesender Wert als Zahl
    const wert = aktivZA ? messZA : messZAS;
    const sym = aktivZA ? "ZA" : "ZA′";
    const ay = 420;
    ctx.fillStyle = F.cLeise; ctx.font = "12px system-ui, sans-serif";
    ctx.fillText("Skalen-Anzeige (auf mm genau):", 14, ay);
    rRect(14, ay + 10, 210, 40, 6);
    ctx.fillStyle = F.cHauch; ctx.fill();
    ctx.strokeStyle = F.cText; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = F.cText; ctx.font = "bold 18px ui-monospace, Consolas, monospace";
    ctx.textAlign = "right"; ctx.fillText(sym + " = " + komma(wert, 1) + " cm", 214, ay + 36);
    ctx.textAlign = "start"; ctx.font = "12px system-ui, sans-serif";
    ctx.fillStyle = F.cLeise;
    ctx.fillText("Lies den Abschnitt an der blauen Skala ab und trag ihn ein.", 14, ay + 66);
  }

  function zeichne() {
    const F = {
      cText: farbe("--text"), cLeise: farbe("--text-leise", "#767676"),
      cAkzent: farbe("--akzent", "#1762a8"), cFlaeche: farbe("--flaeche", "#fff"),
      cHauch: farbe("--hauch", "#eee")
    };
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineJoin = "round";
    ctx.font = "12px system-ui, sans-serif";
    ctx.textAlign = "start";
    const st = zustand.gewaehlt;
    if (!st) zeichneRegal(F); else zeichneMessung(st, F);
  }

  // ---------- Interaktion ----------
  canvas.addEventListener("click", ev => {
    if (zustand.gewaehlt) return;
    const r = canvas.getBoundingClientRect();
    const x = (ev.clientX - r.left) * canvas.width / r.width;
    const y = (ev.clientY - r.top) * canvas.height / r.height;
    const i = SLOTS.findIndex(s => x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h);
    if (i >= 0) waehleStellung(STELLUNGEN[i]);
  });

  function waehleStellung(st) {
    if (zustand.phase !== "messen") wechslePhase("messen");
    if (fertig(st.id)) {
      zustand.meldung = st.name + " steht schon mit ✓ in der Tabelle — wähle eine andere Stellung.";
      panelMessen(); return;
    }
    zustand.gewaehlt = st; zustand.schritt = "za";
    zustand.zaNotiert = NaN; zustand.meldung = "";
    zeichne(); panelMessen();
  }

  function melde(text) {
    zustand.meldung = text;
    const el = panel.querySelector("#exp-meldung");
    if (el) el.textContent = text;
  }

  // ---------- Panels ----------
  function panelAufbau() {
    panel.innerHTML = [
      '<h2>Aufbau und Idee</h2>',
      '<p>Vom <strong>Scheitel Z</strong> gehen <strong>zwei Strahlen</strong> aus. Eine <strong>Parallele</strong> schneidet beide Strahlen: auf Strahl 1 im Punkt <strong>A</strong>, auf Strahl 2 im Punkt <strong>A′</strong>.</p>',
      '<p>Der Abschnitt vom Scheitel bis zum Schnittpunkt heißt auf Strahl 1 <strong>ZA</strong>, auf Strahl 2 <strong>ZA′</strong>. An jedem Strahl liegt eine <strong>Millimeter-Skala</strong> mit der 0 am Scheitel.</p>',
      '<p>Du kannst die Parallele in <strong>verschiedene Stellungen</strong> bringen — jede liefert ein anderes Paar (ZA, ZA′).</p>',
      '<p><strong>Dein Plan für jede Stellung:</strong></p>',
      '<ol>',
      '<li><strong>ZA</strong> auf Strahl 1 ablesen,</li>',
      '<li><strong>ZA′</strong> auf Strahl 2 ablesen.</li>',
      '</ol>',
      '<p>Danach trägst du ZA′ über ZA auf und untersuchst, ob das <strong>Verhältnis</strong> ZA′ : ZA immer gleich bleibt.</p>',
      '<p class="exp-hinweis"><strong>Vorhersage, bevor du startest:</strong> Wenn du die Parallele weiter vom Scheitel weg schiebst, werden ZA und ZA′ beide größer. Aber: Bleibt ihr <em>Verhältnis</em> dabei gleich, oder ändert es sich? Notiere deine Vermutung im Kopf.</p>',
      '<p>Vermiss <strong>mindestens ' + MINDEST_STELLUNGEN + ' Stellungen</strong> — je mehr (und je weiter außen), desto deutlicher wird das Muster.</p>',
      '<button class="knopf" id="exp-weiter1">Zur Durchführung</button>'
    ].join("");
    panel.querySelector("#exp-weiter1").addEventListener("click", () => wechslePhase("messen"));
  }

  function panelMessen() {
    const st = zustand.gewaehlt;
    const n = zustand.messungen.length;
    let oben = "";
    if (!st) {
      oben = [
        '<p>Wähle deine nächste Parallel-Stellung — klicke sie im Bild an (oder hier):</p>',
        '<div class="exp-masseknoepfe" aria-label="Stellung wählen">',
        STELLUNGEN.map(x => '<button class="knopf zweitrangig" data-stellung="' + x.id + '" ' + (fertig(x.id) ? "disabled" : "") + '>' + esc(x.kurz) + (fertig(x.id) ? " ✓" : "") + "</button>").join(""),
        '</div>'
      ].join("");
    } else if (zustand.schritt === "za") {
      oben = [
        '<p><strong>Schritt 1 — ZA (Strahl 1):</strong> An <strong>Strahl 1</strong> (oben) liegt die blaue mm-Skala, die 0 am Scheitel Z. Lies ab, in welchem Abschnitt ZA die Parallele den Strahl im Punkt A schneidet — auf den Millimeter genau (dicke Striche = ganze cm).</p>',
        '<form id="exp-za" class="exp-ablesen">',
        '<label for="exp-wert-za">ZA =</label>',
        '<input id="exp-wert-za" inputmode="decimal" autocomplete="off" size="7"> cm',
        '<button class="knopf">Notieren</button>',
        '</form>'
      ].join("");
    } else {
      oben = [
        '<p>✓ ZA = <strong>' + komma(zustand.zaNotiert, 1) + ' cm</strong> notiert.</p>',
        '<p><strong>Schritt 2 — ZA′ (Strahl 2):</strong> Dieselbe Parallele schneidet <strong>Strahl 2</strong> (unten) im Punkt A′. Lies an der blauen Skala den Abschnitt ZA′ ab.</p>',
        '<form id="exp-zas" class="exp-ablesen">',
        '<label for="exp-wert-zas">ZA′ =</label>',
        '<input id="exp-wert-zas" inputmode="decimal" autocomplete="off" size="7"> cm',
        '<button class="knopf">Notieren</button>',
        '</form>'
      ].join("");
    }
    panel.innerHTML = [
      '<h2>Durchführung</h2>',
      oben,
      st ? '<p><button class="knopf zweitrangig" id="exp-abbruch">Stellung zurücklegen</button></p>' : "",
      '<p id="exp-meldung" class="exp-meldung" aria-live="polite">' + esc(zustand.meldung) + '</p>',
      '<h3>Messtabelle</h3>',
      '<table class="exp-tabelle">',
      '<thead><tr><th>Stellung</th><th>ZA in cm</th><th>ZA′ in cm</th><th>ZA′ ÷ ZA</th></tr></thead>',
      '<tbody>' + (zustand.messungen.map(z => '<tr><td>' + esc(z.name) + '</td><td>' + komma(z.za, 1) + '</td><td>' + komma(z.zas, 1) + '</td><td><strong>' + komma(z.zas / z.za, 2) + '</strong></td></tr>').join("") || '<tr><td colspan="4">noch leer</td></tr>') + '</tbody>',
      '</table>',
      '<p>' + n + ' von mindestens ' + MINDEST_STELLUNGEN + ' Stellungen vermessen.' + (n >= MINDEST_STELLUNGEN ? " Das reicht — mehr ist trotzdem besser!" : "") + '</p>',
      '<button class="knopf" id="exp-weiter2" ' + (n >= MINDEST_STELLUNGEN ? "" : "disabled") + '>Zur Auswertung</button>'
    ].join("");

    panel.querySelectorAll("[data-stellung]").forEach(b =>
      b.addEventListener("click", () => waehleStellung(STELLUNGEN.find(x => x.id === b.dataset.stellung))));
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
    panel.querySelector("#exp-abbruch")?.addEventListener("click", () => {
      zustand.gewaehlt = null; zustand.schritt = ""; zustand.zaNotiert = NaN; zustand.meldung = "";
      zeichne(); panelMessen();
    });
    panel.querySelector("#exp-za")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-wert-za").value);
      if (!ablesungOk(eingabe, messeZA(st), TOL_LAENGE)) {
        melde("✗ Schau noch einmal auf die blaue Skala an Strahl 1: Bei welchem Wert liegt der Punkt A? Dicke Striche = ganze cm, kleine = mm.");
        return;
      }
      zustand.zaNotiert = eingabe; zustand.schritt = "zas"; zustand.meldung = "";
      zeichne(); panelMessen();
    });
    panel.querySelector("#exp-zas")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-wert-zas").value);
      if (!ablesungOk(eingabe, messeZAStrich(st), TOL_LAENGE)) {
        melde("✗ Schau noch einmal auf die Skala an Strahl 2 (Punkt A′). Du bist nah dran!");
        return;
      }
      zustand.messungen.push({ id: st.id, name: st.name, za: zustand.zaNotiert, zas: eingabe });
      zustand.meldung = "✓ " + st.name + ": ZA = " + komma(zustand.zaNotiert, 1) + " cm, ZA′ = " + komma(eingabe, 1) + " cm. Rechne mal ZA′ ÷ ZA …";
      zustand.gewaehlt = null; zustand.schritt = ""; zustand.zaNotiert = NaN;
      zeichne(); panelMessen();
    });
  }

  function panelAuswerten() {
    const zeilen = zustand.messungen;
    if (zeilen.length < MINDEST_STELLUNGEN) {
      panel.innerHTML = '<h2>Auswertung</h2><p>Noch zu wenige Messwerte! Geh zu „2 · Durchführung" und vermiss zuerst mindestens ' + MINDEST_STELLUNGEN + ' Stellungen.</p>';
      return;
    }
    const quotienten = zeilen.map(z => z.zas / z.za);
    const qMittel = mittel(quotienten);
    const punkte = zeilen.map(z => ({ x: z.za, y: z.zas }));
    const m = steigungUrsprung(punkte);
    const frei = regression(punkte);
    const gemessen = STELLUNGEN.filter(x => fertig(x.id));
    const sortiert = gemessen.slice().sort((p, q) => p.za - q.za);
    const kleinste = sortiert[0], groesste = sortiert[sortiert.length - 1];

    const teil1 = [
      '<h3>1 · Ein festes Verhältnis: ZA′ ÷ ZA</h3>',
      '<p>Teile bei jeder Stellung den Abschnitt auf Strahl 2 durch den auf Strahl 1 — ZA′ ÷ ZA:</p>',
      '<p>' + zeilen.map(z => '<strong>' + komma(z.zas / z.za, 2) + '</strong>').join(" · ") + '<br>',
      'Mittelwert: <strong>' + komma(qMittel, 2) + '</strong> — ob die Parallele nah am Scheitel steht oder weit weg, das Verhältnis bleibt fast gleich!</p>',
      zustand.verhErkannt ? (
        '<p class="exp-hinweis">✓ Genau: Das Verhältnis ZA′ : ZA ist <strong>konstant</strong> (hier ≈ ' + komma(qMittel, 2) + '). Das ist die Kernaussage des <strong>Strahlensatzes</strong>: Schneiden Parallelen zwei Strahlen aus einem Scheitel, so stehen die Abschnitte auf dem einen Strahl im gleichen Verhältnis wie die entsprechenden Abschnitte auf dem anderen.</p>'
      ) : (
        '<form id="exp-verh" class="exp-ablesen">' +
        '<label for="exp-wert-verh">Welchen (ungefähren) Wert hat das Verhältnis ZA′ ÷ ZA? (Zahl oder Bruch)</label>' +
        '<input id="exp-wert-verh" autocomplete="off" size="8">' +
        '<button class="knopf">Prüfen</button>' +
        '</form>' +
        '<details class="exp-hilfe"><summary>Hilfe</summary><p>Schau auf die letzte Spalte der Tabelle: Alle Werte ZA′ ÷ ZA sind fast gleich. Tippe den gerundeten gemeinsamen Wert ein (z. B. 1,6) — ein Bruch wie 8:5 geht auch.</p></details>'
      )
    ].join("");

    const teil2 = !zustand.verhErkannt ? "" : [
      '<h3>2 · Alle Punkte auf einer Ursprungsgeraden</h3>',
      '<p>Jede Stellung wird ein Punkt: <strong>ZA nach rechts, ZA′ nach oben</strong>. Liegen alle auf einer Geraden durch den Ursprung, ist ZA′ = m · ZA mit festem m — und m ist genau das Verhältnis.</p>',
      '<canvas id="exp-diagramm" class="exp-diagramm" width="440" height="300" aria-label="Diagramm: ZA-Strich ueber ZA. Alle Messpunkte liegen auf einer Ursprungsgeraden; ein gestricheltes Steigungsdreieck zeigt Delta ZA und Delta ZA-Strich."></canvas>',
      zustand.steigungOk ? (
        '<p>✓ Steigung m ≈ <strong>' + komma(m, 2) + '</strong> — das ist das Verhältnis! Lässt man die Gerade frei (nicht durch null gezwungen), liefert die Regression als Achsenabschnitt b ≈ ' + komma(frei.b, 1) + ' cm: praktisch null. Die Gerade <em>muss</em> durch den Scheitel (Ursprung) gehen — bei ZA = 0 ist auch ZA′ = 0.</p>' +
        '<p class="exp-hinweis"><strong>Kernsatz (Strahlensatz):</strong> Parallelen schneiden aus zwei Strahlen Abschnitte im</p>' +
        '<p class="exp-hinweis" style="text-align:center"><strong>gleichen Verhältnis: ZA′ : ZA = konstant</strong></p>' +
        '<p>Unabhängig davon, wie weit die Parallele vom Scheitel entfernt ist.</p>'
      ) : (
        '<p>Bestimme die Steigung der Geraden: <strong>Steigung = ΔZA′ ÷ ΔZA</strong>. Nimm das gestrichelte Steigungsdreieck im Diagramm zu Hilfe.</p>' +
        '<details class="exp-hilfe"><summary>Hilfe: Schritt für Schritt</summary>' +
        '<p><strong>Teilschritt 1 – Dreieck ablesen:</strong> Im Diagramm ist ein gestricheltes <strong>Steigungsdreieck</strong>. Die waagerechte Seite ist ΔZA, die senkrechte ΔZA′. Beide Werte stehen am Dreieck.</p>' +
        '<p><strong>Teilschritt 2 – teilen:</strong> Steigung = ΔZA′ ÷ ΔZA. Das ist dieselbe Zahl, die du schon aus der Spalte „ZA′ ÷ ZA“ kennst.</p>' +
        '</details>' +
        '<form id="exp-m" class="exp-ablesen">' +
        '<label for="exp-wert-m">Steigung =</label>' +
        '<input id="exp-wert-m" inputmode="decimal" autocomplete="off" size="7">' +
        '<button class="knopf">Prüfen</button>' +
        '<button class="knopf zweitrangig" type="button" id="exp-m-zeigen">Steigung anzeigen</button>' +
        '</form>' +
        (zustand.steigungGezeigt ? '<p>Die Regression rechnet: m ≈ <strong>' + komma(m, 2) + '</strong>. Tippe den Wert oben ein.</p>' : "")
      )
    ].join("");

    const teil3 = !zustand.steigungOk ? "" : [
      '<h3>3 · Wo misst man das Verhältnis am genauesten?</h3>',
      '<p>Stell dir vor, du verliest dich an beiden Abschnitten um nur <strong>1 mm</strong>. Bei welcher deiner Stellungen verfälscht das das Verhältnis ZA′ ÷ ZA am wenigsten?</p>',
      '<label for="exp-genau">Am genauesten ist:</label>',
      '<select id="exp-genau" class="exp-wahl">',
      '<option value="">— wähle eine Stellung —</option>',
      gemessen.map(x => '<option value="' + x.id + '">' + esc(x.name) + " (ZA = " + komma(x.za, 1) + " cm)</option>").join(""),
      '</select>',
      zustand.genauOk ? (
        '<p class="exp-hinweis">✓ Richtig: <strong>' + esc(groesste.name) + '</strong> (größter Abschnitt)! Derselbe Millimeter Ablesefehler fällt bei langen Abschnitten weniger ins Gewicht. Bei der Stellung nah am Scheitel (' + esc(kleinste.kurz) + ') macht 1 mm relativ etwa ' + komma(relFehlerProMm(kleinste) * 100, 1) + ' % aus, bei der weit außen (' + esc(groesste.kurz) + ') nur ' + komma(relFehlerProMm(groesste) * 100, 1) + ' %. Je weiter die Parallele vom Scheitel weg, desto genauer.</p>'
      ) : ""
    ].join("");

    const abschluss = !zustand.genauOk ? "" : '<p><strong>Experiment komplett!</strong> Du hast den Strahlensatz nicht nachgeschlagen, sondern selbst vermessen: ZA′ ÷ ZA ≈ ' + komma(qMittel, 2) + ' für jede Stellung. Speichere deine Messwerte als CSV — und prüf das Ganze mit Geodreieck und Lineal nach.</p>';

    panel.innerHTML = [
      '<h2>Auswertung</h2>',
      teil1, teil2, teil3, abschluss,
      '<p id="exp-meldung" class="exp-meldung" aria-live="polite"></p>',
      '<details class="exp-fehler"><summary>Fehlerbetrachtung — warum nie haargenau gleich?</summary>',
      '<p><strong>Ablesen auf mm:</strong> Auf den Millimeter genau abzulesen ist die Grenze. Schon ein halber Millimeter verschiebt ZA oder ZA′ — deshalb ist das Verhältnis nie für alle Stellungen exakt gleich, nur sehr nah.</p>',
      '<p><strong>Parallelen müssen wirklich parallel sein:</strong> Der Strahlensatz gilt nur, wenn die schneidenden Geraden tatsächlich parallel sind. Ein kleiner Winkelfehler verändert das Verhältnis.</p>',
      '<p><strong>Nah am Scheitel ist heikel:</strong> Bei kurzen Abschnitten fällt 1 mm relativ stark ins Gewicht. Weit außen ist die Messung genauer.</p>',
      '<p><strong>Verwandt — die Ähnlichkeit:</strong> Die kleinen und großen Dreiecke (Scheitel + Schnittpunkte) sind <em>ähnlich</em> — gleiche Winkel, gleiche Seitenverhältnisse. Der Strahlensatz ist nichts anderes als diese Ähnlichkeit in Abschnitten ausgedrückt.</p>',
      '</details>',
      '<div class="exp-knopfzeile">',
      '<button class="knopf zweitrangig" id="exp-zurueck">Mehr messen</button>',
      '<button class="knopf zweitrangig" id="exp-csv">Messwerte als CSV speichern</button>',
      '<button class="knopf" id="exp-neustart">Neues Experiment</button>',
      '</div>'
    ].join("");

    panel.querySelector("#exp-verh")?.addEventListener("submit", ev => {
      ev.preventDefault();
      if (verhaeltnisAntwortOk(panel.querySelector("#exp-wert-verh").value)) {
        zustand.verhErkannt = true; panelAuswerten();
      } else {
        melde("✗ Noch nicht. Schau auf die letzte Tabellenspalte: Alle Werte ZA′ ÷ ZA sind fast gleich. Tippe den gemeinsamen Wert ein (Zahl wie 1,6 oder Bruch wie 8:5).");
      }
    });
    panel.querySelector("#exp-m")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const e = parseDezimal(panel.querySelector("#exp-wert-m").value);
      if (ablesungOk(e, m, TOL_ZAHL)) {
        zustand.steigungOk = true; panelAuswerten();
      } else {
        melde("✗ Steigung = ΔZA′ ÷ ΔZA. Lies beide Werte am Dreieck ab und teile — es ist das Verhältnis aus Spalte 4.");
      }
    });
    panel.querySelector("#exp-m-zeigen")?.addEventListener("click", () => {
      zustand.steigungGezeigt = true; panelAuswerten();
    });
    const auswahl = panel.querySelector("#exp-genau");
    if (auswahl) {
      if (zustand.genauOk) { auswahl.value = groesste.id; auswahl.disabled = true; }
      auswahl.addEventListener("change", ev => {
        if (!ev.target.value) return;
        if (ev.target.value === groesste.id) {
          zustand.genauOk = true; panelAuswerten();
        } else {
          melde("✗ Überleg: 1 mm von 3 cm ist viel, 1 mm von 10 cm fast nichts. Bei welcher Stellung sind die Abschnitte am längsten?");
        }
      });
    }
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      csvHerunterladen("strahlensatz-messwerte.csv",
        ["Stellung", "ZA in cm", "ZA-Strich in cm", "ZA-Strich geteilt durch ZA"],
        zeilen.map(z => [z.name, z.za, z.zas, z.zas / z.za]));
    });
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      zustand.gewaehlt = null; zustand.schritt = ""; zustand.zaNotiert = NaN;
      zustand.messungen = []; zustand.meldung = "";
      zustand.verhErkannt = false; zustand.steigungOk = false;
      zustand.steigungGezeigt = false; zustand.genauOk = false;
      zeichne(); wechslePhase("aufbau");
    });
    if (zustand.verhErkannt) zeichneDiagramm(m);
  }

  // Diagramm: ZA′ über ZA, Ursprungsgerade, Steigungsdreieck
  function zeichneDiagramm(m) {
    const dia = panel.querySelector("#exp-diagramm");
    if (!dia || !zustand.messungen.length) return;
    const c = dia.getContext("2d");
    const cText = farbe("--text"), cLeise = farbe("--text-leise", "#767676"), cAkzent = farbe("--akzent", "#1762a8");
    const W = dia.width, H = dia.height, L = 54, U = H - 42;
    const punkte = zustand.messungen.map(z => ({ x: z.za, y: z.zas }));
    const xMax = Math.max(...punkte.map(p => p.x)) * 1.12;
    const yMax = Math.max(...punkte.map(p => p.y)) * 1.12;
    const X = v => L + v / xMax * (W - L - 16);
    const Y = v => U - v / yMax * (U - 18);
    c.clearRect(0, 0, W, H);
    c.font = "12px system-ui, sans-serif";
    c.strokeStyle = cText; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(L, 10); c.lineTo(L, U); c.lineTo(W - 8, U); c.stroke();
    c.fillStyle = cText;
    c.fillText("ZA′ in cm", 8, 20); c.fillText("ZA in cm", W - 66, U + 30);
    c.fillText("0", L - 14, U + 14);
    if (Number.isFinite(m)) {
      const xEnd = Math.min(xMax, yMax / m);
      c.strokeStyle = cLeise; c.setLineDash([6, 5]);
      c.beginPath(); c.moveTo(X(0), Y(0)); c.lineTo(X(xEnd), Y(m * xEnd)); c.stroke();
      const xn = Math.max(...punkte.map(p => p.x)) >= 8 ? 8 : 4;
      c.beginPath(); c.moveTo(X(0), Y(0)); c.lineTo(X(xn), Y(0)); c.lineTo(X(xn), Y(m * xn)); c.stroke();
      c.setLineDash([]);
      c.fillStyle = cLeise; c.textAlign = "center";
      c.fillText("ΔZA = " + xn + " cm", X(xn / 2), U - 6);
      const links = X(xn) + 110 > W - 6;
      c.textAlign = links ? "end" : "start";
      c.fillText("ΔZA′ = " + komma(m * xn, 1) + " cm", links ? X(xn) - 8 : X(xn) + 8, (Y(m * xn) + U) / 2);
      c.textAlign = "start";
    }
    for (const z of zustand.messungen) {
      c.fillStyle = cAkzent; c.beginPath(); c.arc(X(z.za), Y(z.zas), 5, 0, 7); c.fill();
    }
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
