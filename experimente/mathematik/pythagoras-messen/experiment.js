// experiment.js — Interaktives Mathe-Experiment: Den Satz des Pythagoras vermessen (Klasse 9).
// Realitätsnahe Messpraxis statt fertiger Formel: mehrere rechtwinklige Dreiecke.
// Die beiden Katheten a, b liest der Lernende an einer waagerechten bzw.
// senkrechten mm-Skala SELBST ab, die Hypotenuse c an einer schräg
// angelegten mm-Skala. Danach wird a²+b² gegen c² aufgetragen: Alle Punkte
// liegen auf einer Ursprungsgeraden mit Steigung 1. Ergebnis: a² + b² = c².
// Die Mess-Streuung ist deterministisch geseedet (helfer.streuung), dadurch
// laufen die TESTS DOM-frei in Node (Modulebene browserfrei).

import {
  streuung, parseDezimal, komma, ablesungOk, esc, mittel, regression,
  farbe, bauePhasen, csvHerunterladen
} from "../../../assets/js/experiment/helfer.js";

// ---------- Dreiecke (a, b Katheten in cm; c = √(a²+b²) exakt) ----------
// Bewusst gemischte Formen (flach, hoch, fast gleichschenklig).
export const DREIECKE = [
  { id: "d1", name: "Dreieck 1", kurz: "1", a: 4.5, b: 6 },    // c = 7,5  (kleinstes)
  { id: "d2", name: "Dreieck 2", kurz: "2", a: 6,   b: 8 },    // c = 10
  { id: "d3", name: "Dreieck 3", kurz: "3", a: 5,   b: 12 },   // c = 13
  { id: "d4", name: "Dreieck 4", kurz: "4", a: 8,   b: 9 },    // c ≈ 12,04
  { id: "d5", name: "Dreieck 5", kurz: "5", a: 9,   b: 12 }    // c = 15  (groesstes)
];
export const MINDEST_DREIECKE = 4;

// ---------- Toleranzen (alles in cm) ----------
export const TOL_LAENGE = 0.2;   // Katheten und Hypotenuse an der mm-Skala ablesen
export const TOL_ZAHL   = 0.06;  // Steigung (≈ 1)

// ---------- Messlogik (rein, DOM-frei, Node-testbar) ----------
export function hypotenuseWahr(d) { return Math.sqrt(d.a * d.a + d.b * d.b); }

// Ablesen an der mm-Skala: wahre Länge + Ablese-Streuung ±0,075 cm, Anzeige in
// mm (0,1-cm-Raster), denn auf der mm-Skala liest man auf den Millimeter genau.
export function messeKathete(d, welche) {
  const wahr = welche === "a" ? d.a : d.b;
  const roh = wahr + streuung("kat:" + welche + ":" + d.id, 0.15);
  return Math.round(roh * 10) / 10;
}
export function messeHypotenuse(d) {
  const roh = hypotenuseWahr(d) + streuung("hyp:" + d.id, 0.15);
  return Math.round(roh * 10) / 10;
}

export function quadratsumme(a, b) { return a * a + b * b; }
export function quadrat(c) { return c * c; }

// Regressionsgerade durch den Ursprung y = m·x (kleinste Quadrate ohne
// Achsenabschnitt): m = Σ(x·y) / Σ(x²) — hier x = c², y = a²+b².
export function steigungUrsprung(punkte) {
  let sxx = 0, sxy = 0;
  for (const p of punkte) { sxx += p.x * p.x; sxy += p.x * p.y; }
  return sxx > 0 ? sxy / sxx : NaN;
}

// Antwort auf die Frage nach der berühmten Steigung: „1" (±0,06)
export function steigungAntwortOk(text) {
  const t = String(text).trim().toLowerCase();
  if (t === "eins" || t === "1:1" || t === "gleich") return true;
  return ablesungOk(parseDezimal(t), 1, TOL_ZAHL + 1e-9);
}

// größtes Dreieck = relativ genaueste Messung (gleicher Ablesefehler, größere
// Längen → kleiner relativer Fehler). Maß: Hypotenusenlänge.
export function relFehlerProMm(d) {
  // 1 mm Ablesefehler auf jeder der drei Seiten, relativ zur Quadratsumme
  return 0.1 / d.a + 0.1 / d.b + 0.1 / hypotenuseWahr(d);
}
export function genauestesDreieck(ids) {
  const dabei = DREIECKE.filter(d => ids.includes(d.id));
  return dabei.reduce((best, d) => (best === null || relFehlerProMm(d) < relFehlerProMm(best) ? d : best), null);
}

// ---------- TESTS (laufen DOM-frei in Node) ----------
// Unabhängige Nachrechnung: c² muss gleich a²+b² sein (geometrische Definition
// der Hypotenuse über die Wurzel — der Test prüft, dass die Quadrate stimmen,
// und zwar OHNE den Satz vorauszusetzen, rein aus c = √(a²+b²)).
export const TESTS = [
  { name: "c = √(a²+b²) für jedes Dreieck (Definition)", ok: () => DREIECKE.every(d => Math.abs(hypotenuseWahr(d) - Math.sqrt(d.a * d.a + d.b * d.b)) < 1e-12) },
  { name: "c² = a²+b² exakt (unabhängige Nachrechnung der Quadrate)", ok: () => DREIECKE.every(d => Math.abs(quadrat(hypotenuseWahr(d)) - quadratsumme(d.a, d.b)) < 1e-9) },
  { name: "konkrete Werte: (4,5;6)→7,5, (6,8)→10, (5,12)→13, (9,12)→15", ok: () =>
      Math.abs(hypotenuseWahr(DREIECKE[0]) - 7.5) < 1e-9
      && Math.abs(hypotenuseWahr(DREIECKE[1]) - 10) < 1e-9
      && Math.abs(hypotenuseWahr(DREIECKE[2]) - 13) < 1e-9
      && Math.abs(hypotenuseWahr(DREIECKE[4]) - 15) < 1e-9 },
  { name: "Ursprungs-Regression perfekter Punkte (a²+b² über c²): Steigung = 1", ok: () => Math.abs(steigungUrsprung(DREIECKE.map(d => ({ x: quadrat(hypotenuseWahr(d)), y: quadratsumme(d.a, d.b) }))) - 1) < 1e-9 },
  { name: "freie Regression (helfer.js) perfekter Punkte: m = 1, b = 0", ok: () => { const { m, b } = regression(DREIECKE.map(d => ({ x: quadrat(hypotenuseWahr(d)), y: quadratsumme(d.a, d.b) }))); return Math.abs(m - 1) < 1e-9 && Math.abs(b) < 1e-9; } },
  { name: "Streugrenzen: jede Ablesung ±0,075 cm um den wahren Wert", ok: () => DREIECKE.every(d => {
      const da = Math.abs(messeKathete(d, "a") - d.a), db = Math.abs(messeKathete(d, "b") - d.b), dc = Math.abs(messeHypotenuse(d) - hypotenuseWahr(d));
      return da <= 0.075 + 0.05 + 1e-9 && db <= 0.075 + 0.05 + 1e-9 && dc <= 0.075 + 0.05 + 1e-9; // +0,05 Rundung auf mm
    }) },
  { name: "Anzeige auf 0,1 cm (mm) gerastert", ok: () => DREIECKE.every(d => { const fa = messeKathete(d, "a") * 10, fb = messeKathete(d, "b") * 10, fc = messeHypotenuse(d) * 10; return Math.abs(fa - Math.round(fa)) < 1e-9 && Math.abs(fb - Math.round(fb)) < 1e-9 && Math.abs(fc - Math.round(fc)) < 1e-9; }) },
  { name: "Messwerte deterministisch (zweiter Aufruf identisch)", ok: () => DREIECKE.every(d => messeKathete(d, "a") === messeKathete(d, "a") && messeKathete(d, "b") === messeKathete(d, "b") && messeHypotenuse(d) === messeHypotenuse(d)) },
  { name: "Steigung der gemessenen Punkte nahe 1 (|m−1| < 0,03), ±-Prüfung greift", ok: () => { const m = steigungUrsprung(DREIECKE.map(d => ({ x: quadrat(messeHypotenuse(d)), y: quadratsumme(messeKathete(d, "a"), messeKathete(d, "b")) }))); return Math.abs(m - 1) < 0.03 && ablesungOk(m + 0.05, m, TOL_ZAHL) && !ablesungOk(m + 0.1, m, TOL_ZAHL); } },
  { name: "relativer 1-mm-Fehler fällt streng monoton (großes Dreieck = genauer)", ok: () => { const r = DREIECKE.map(relFehlerProMm); return r.every((w, i) => i === 0 || w < r[i - 1]) && genauestesDreieck(DREIECKE.map(d => d.id)).id === "d5"; } },
  { name: "Steigungs-Antwort: 1 als Text oder Zahl 1 ± 0,06", ok: () => steigungAntwortOk("1") && steigungAntwortOk(" 1,0 ") && steigungAntwortOk("eins") && steigungAntwortOk("0,97") && !steigungAntwortOk("2") && !steigungAntwortOk("1,2") && !steigungAntwortOk("") },
  { name: "parseDezimal + Längen-Toleranzen greifen", ok: () => { const a0 = messeKathete(DREIECKE[0], "a"); return parseDezimal("6,1") === 6.1 && parseDezimal(" 6.1 ") === 6.1 && Number.isNaN(parseDezimal("sechs")) && ablesungOk(a0 + 0.18, a0, TOL_LAENGE) && !ablesungOk(a0 + 0.25, a0, TOL_LAENGE) && !ablesungOk(NaN, a0, TOL_LAENGE); } }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;

  const zustand = {
    phase: "aufbau",
    gewaehlt: null,        // Dreieck in Arbeit
    schritt: "",           // "a" | "b" | "c"
    aNotiert: NaN,
    bNotiert: NaN,
    messungen: [],         // {id, name, a, b, c}
    meldung: "",
    regelErkannt: false,   // a²+b²=c² erkannt
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
    '<canvas id="exp-canvas" width="360" height="520" aria-label="Messplatz: ein rechtwinkliges Dreieck mit Millimeter-Skalen an den drei Seiten. Je nach Schritt ist die waagerechte Kathete a, die senkrechte Kathete b oder die schraege Hypotenuse c zum Ablesen hervorgehoben. Eine Anzeige zeigt den abgelesenen Wert."></canvas>',
    '</div>',
    '<div class="exp-rechts" id="exp-panel"></div>'
  ].join("");
  wurzel.appendChild(flaeche);

  const canvas = flaeche.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = flaeche.querySelector("#exp-panel");

  // Auswahl-Plätze (2 Spalten × 3 Reihen, letzter frei)
  const SLOTS = DREIECKE.map((d, i) => ({ x: 14 + (i % 2) * 172, y: 46 + Math.floor(i / 2) * 150, w: 160, h: 140 }));

  function rRect(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  }

  // kleine Vorschau eines Dreiecks (rechter Winkel unten links)
  function maleDreieckVorschau(d, x0, y0, maxW, maxH, F, dick) {
    const s = Math.min(maxW / Math.max(d.a, 1), maxH / Math.max(d.b, 1));
    const xR = x0, yR = y0;                     // rechter-Winkel-Punkt
    const xA = x0 + d.a * s, yB = y0 - d.b * s;
    ctx.beginPath();
    ctx.moveTo(xR, yR); ctx.lineTo(xA, yR); ctx.lineTo(xR, yB); ctx.closePath();
    ctx.fillStyle = F.cHauch; ctx.fill();
    ctx.strokeStyle = dick ? F.cAkzent : F.cText; ctx.lineWidth = dick ? 2.5 : 2; ctx.stroke();
    // rechter Winkel
    const q = Math.min(8, d.a * s * 0.3, d.b * s * 0.3);
    ctx.strokeStyle = F.cLeise; ctx.lineWidth = 1;
    ctx.strokeRect(xR, yR - q, q, q);
    return { xR, yR, xA, yB, s };
  }

  // ---------- Regal: Dreiecke zur Auswahl ----------
  function zeichneRegal(F) {
    ctx.fillStyle = F.cText; ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillText("Rechtwinklige Dreiecke — eins anklicken:", 12, 28);
    ctx.font = "12px system-ui, sans-serif";
    DREIECKE.forEach((d, i) => {
      const s = SLOTS[i], done = fertig(d.id);
      rRect(s.x, s.y, s.w, s.h, 10);
      ctx.fillStyle = F.cFlaeche; ctx.fill();
      ctx.strokeStyle = F.cLeise; ctx.lineWidth = done ? 1.5 : 2; ctx.stroke();
      maleDreieckVorschau(d, s.x + 24, s.y + s.h - 34, s.w - 48, s.h - 64, F, false);
      ctx.textAlign = "center"; ctx.fillStyle = done ? F.cLeise : F.cText;
      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.fillText(d.name + (done ? " ✓" : ""), s.x + s.w / 2, s.y + s.h - 12);
      ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start";
    });
  }

  // ---------- mm-Skala entlang einer Strecke (P -> Q), Länge L cm ----------
  function maleSkalaAuf(px0, py0, px1, py1, Lcm, mess, titel, F) {
    const dx = px1 - px0, dy = py1 - py0;
    const len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len;          // Einheitsrichtung
    const nx = -uy, ny = ux;                      // Normale (nach außen)
    const proCm = len / Lcm;
    // Skalenbalken leicht versetzt
    const ox = nx * 0, oy = ny * 0;
    ctx.strokeStyle = F.cAkzent; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(px0 + ox, py0 + oy); ctx.lineTo(px1 + ox, py1 + oy); ctx.stroke();
    // mm-Striche
    const maxMm = Math.floor(Lcm * 10);
    for (let mm = 0; mm <= maxMm; mm++) {
      const t = mm / 10 * proCm;
      const bx = px0 + ux * t, by = py0 + uy * t;
      const cmStrich = mm % 10 === 0, halb = mm % 5 === 0;
      const lTick = cmStrich ? 9 : halb ? 6 : 3;
      ctx.strokeStyle = cmStrich ? F.cText : F.cLeise; ctx.lineWidth = cmStrich ? 1.5 : 1;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + nx * lTick, by + ny * lTick); ctx.stroke();
      if (cmStrich) {
        ctx.fillStyle = F.cText; ctx.font = "10px system-ui, sans-serif"; ctx.textAlign = "center";
        ctx.fillText(String(mm / 10), bx + nx * 18, by + ny * 18 + 3);
        ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start";
      }
    }
    // Ablesemarke am gemessenen Wert
    const tw = mess * proCm;
    const mx = px0 + ux * tw, my = py0 + uy * tw;
    ctx.strokeStyle = F.cAkzent; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + nx * 14, my + ny * 14); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = F.cAkzent;
    ctx.beginPath(); ctx.arc(mx, my, 3.5, 0, 7); ctx.fill();
  }

  // ---------- Mess-Szene: ein Dreieck mit hervorgehobener Seite ----------
  function zeichneMessung(d, F) {
    const messA = messeKathete(d, "a"), messB = messeKathete(d, "b"), messC = messeHypotenuse(d);
    // Maßstab: Dreieck zentriert; px pro cm nach größtem Maß
    const cMax = Math.max(d.a, d.b, hypotenuseWahr(d));
    const feldW = canvas.width - 80, feldH = 300;
    const s = Math.min(feldW / cMax, feldH / Math.max(d.b, 1)) * 0.78;
    const xR = 70, yR = 360;                     // rechter Winkel
    const xA = xR + d.a * s, yB = yR - d.b * s;

    const titel = zustand.schritt === "a" ? "Kathete a ablesen" :
                  zustand.schritt === "b" ? "Kathete b ablesen" : "Hypotenuse c ablesen";
    ctx.fillStyle = F.cText; ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillText(d.name + " — " + titel, 12, 28);
    ctx.font = "12px system-ui, sans-serif";

    // Dreieckfläche
    ctx.beginPath(); ctx.moveTo(xR, yR); ctx.lineTo(xA, yR); ctx.lineTo(xR, yB); ctx.closePath();
    ctx.fillStyle = F.cHauch; ctx.globalAlpha = 0.5; ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = F.cText; ctx.lineWidth = 2; ctx.stroke();
    // rechter Winkel
    const q = 12;
    ctx.strokeStyle = F.cLeise; ctx.lineWidth = 1; ctx.strokeRect(xR, yR - q, q, q);
    // Seitenbeschriftung — nur die NICHT gerade gemessenen Seiten beschriften;
    // an der aktiven Seite liegt ohnehin die Skala (die sie eindeutig benennt).
    ctx.fillStyle = F.cText; ctx.textAlign = "center";
    if (zustand.schritt !== "a") ctx.fillText("a", (xR + xA) / 2, yR + 26);
    if (zustand.schritt !== "b") { ctx.textAlign = "right"; ctx.fillText("b", xR - 10, (yR + yB) / 2 + 4); ctx.textAlign = "center"; }
    if (zustand.schritt !== "c") ctx.fillText("c", (xA + xR) / 2 + 26, (yR + yB) / 2 - 8);
    ctx.textAlign = "start";

    // mm-Skala nur an der aktuell zu messenden Seite
    if (zustand.schritt === "a") {
      maleSkalaAuf(xR, yR + 16, xA, yR + 16, d.a, messA, "a", F);
    } else if (zustand.schritt === "b") {
      maleSkalaAuf(xR - 16, yR, xR - 16, yB, d.b, messB, "b", F);
    } else {
      // Hypotenuse: Skala leicht nach außen versetzt
      maleSkalaAuf(xA + 16, yR, xR + 16, yB - 0, hypotenuseWahr(d), messC, "c", F);
    }

    // Anzeige unten — der abzulesende Wert als Zahl
    const wert = zustand.schritt === "a" ? messA : zustand.schritt === "b" ? messB : messC;
    const sym = zustand.schritt;
    const ay = 432;
    ctx.fillStyle = F.cLeise; ctx.font = "12px system-ui, sans-serif";
    ctx.fillText("Skalen-Anzeige (auf mm genau):", 14, ay);
    rRect(14, ay + 10, 200, 40, 6);
    ctx.fillStyle = F.cHauch; ctx.fill();
    ctx.strokeStyle = F.cText; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = F.cText; ctx.font = "bold 19px ui-monospace, Consolas, monospace";
    ctx.textAlign = "right"; ctx.fillText(sym + " = " + komma(wert, 1) + " cm", 204, ay + 36);
    ctx.textAlign = "start"; ctx.font = "12px system-ui, sans-serif";
    ctx.fillStyle = F.cLeise;
    ctx.fillText("Lies den Wert an der blauen Skala ab und trag ihn ein.", 14, ay + 66);
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
    const d = zustand.gewaehlt;
    if (!d) zeichneRegal(F); else zeichneMessung(d, F);
  }

  // ---------- Interaktion ----------
  canvas.addEventListener("click", ev => {
    if (zustand.gewaehlt) return;
    const r = canvas.getBoundingClientRect();
    const x = (ev.clientX - r.left) * canvas.width / r.width;
    const y = (ev.clientY - r.top) * canvas.height / r.height;
    const i = SLOTS.findIndex(s => x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h);
    if (i >= 0) waehleDreieck(DREIECKE[i]);
  });

  function waehleDreieck(d) {
    if (zustand.phase !== "messen") wechslePhase("messen");
    if (fertig(d.id)) {
      zustand.meldung = d.name + " steht schon mit ✓ in der Tabelle — wähle ein anderes Dreieck.";
      panelMessen(); return;
    }
    zustand.gewaehlt = d; zustand.schritt = "a";
    zustand.aNotiert = NaN; zustand.bNotiert = NaN; zustand.meldung = "";
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
      '<p>Vor dir liegen fünf <strong>rechtwinklige Dreiecke</strong> in ganz verschiedenen Formen. In jedem Dreieck heißen die beiden Seiten am rechten Winkel <strong>Katheten</strong> (a und b), die längste Seite gegenüber dem rechten Winkel ist die <strong>Hypotenuse</strong> (c).</p>',
      '<p>An jeder Seite liegt eine <strong>Millimeter-Skala</strong>. Deine Aufgabe: drei Längen ablesen.</p>',
      '<p><strong>Dein Plan für jedes Dreieck:</strong></p>',
      '<ol>',
      '<li><strong>Kathete a</strong> an der waagerechten Skala ablesen,</li>',
      '<li><strong>Kathete b</strong> an der senkrechten Skala ablesen,</li>',
      '<li><strong>Hypotenuse c</strong> an der schrägen Skala ablesen.</li>',
      '</ol>',
      '<p>Danach untersuchst du, ob zwischen a, b und c immer derselbe Zusammenhang gilt — indem du <strong>a²+b²</strong> gegen <strong>c²</strong> aufträgst.</p>',
      '<p class="exp-hinweis"><strong>Vorhersage, bevor du startest:</strong> Was glaubst du — hängen die drei Seiten irgendwie fest zusammen, oder kann c bei gleichen Katheten verschieden sein? Und falls es eine Regel gibt: Wird sie bei jedem Dreieck dieselbe sein? Notiere deine Vermutung im Kopf.</p>',
      '<p>Vermiss <strong>mindestens ' + MINDEST_DREIECKE + ' Dreiecke</strong> — je mehr (und je größer), desto deutlicher wird das Muster.</p>',
      '<button class="knopf" id="exp-weiter1">Zur Durchführung</button>'
    ].join("");
    panel.querySelector("#exp-weiter1").addEventListener("click", () => wechslePhase("messen"));
  }

  function panelMessen() {
    const d = zustand.gewaehlt;
    const n = zustand.messungen.length;
    let oben = "";
    if (!d) {
      oben = [
        '<p>Wähle dein nächstes Dreieck — klicke es im Bild an (oder hier):</p>',
        '<div class="exp-masseknoepfe" aria-label="Dreieck wählen">',
        DREIECKE.map(x => '<button class="knopf zweitrangig" data-dreieck="' + x.id + '" ' + (fertig(x.id) ? "disabled" : "") + '>' + esc(x.kurz) + (fertig(x.id) ? " ✓" : "") + "</button>").join(""),
        '</div>'
      ].join("");
    } else if (zustand.schritt === "a") {
      oben = [
        '<p><strong>Schritt 1 — Kathete a:</strong> Die <strong>waagerechte</strong> Seite am rechten Winkel. An ihr liegt die blaue mm-Skala, die 0 ganz links am Eckpunkt. Lies ab, wo die Seite endet — auf den Millimeter genau (dicke Striche = ganze cm).</p>',
        '<form id="exp-a" class="exp-ablesen">',
        '<label for="exp-wert-a">a =</label>',
        '<input id="exp-wert-a" inputmode="decimal" autocomplete="off" size="7"> cm',
        '<button class="knopf">Notieren</button>',
        '</form>'
      ].join("");
    } else if (zustand.schritt === "b") {
      oben = [
        '<p>✓ a = <strong>' + komma(zustand.aNotiert, 1) + ' cm</strong> notiert.</p>',
        '<p><strong>Schritt 2 — Kathete b:</strong> Die <strong>senkrechte</strong> Seite am rechten Winkel. Lies an der blauen Skala ab, wie lang sie ist.</p>',
        '<form id="exp-b" class="exp-ablesen">',
        '<label for="exp-wert-b">b =</label>',
        '<input id="exp-wert-b" inputmode="decimal" autocomplete="off" size="7"> cm',
        '<button class="knopf">Notieren</button>',
        '</form>'
      ].join("");
    } else {
      oben = [
        '<p>✓ a = <strong>' + komma(zustand.aNotiert, 1) + ' cm</strong>, b = <strong>' + komma(zustand.bNotiert, 1) + ' cm</strong> notiert.</p>',
        '<p><strong>Schritt 3 — Hypotenuse c:</strong> Die <strong>schräge</strong> Seite gegenüber dem rechten Winkel — die längste. An ihr liegt die blaue Skala. Lies ihre Länge ab.</p>',
        '<form id="exp-c" class="exp-ablesen">',
        '<label for="exp-wert-c">c =</label>',
        '<input id="exp-wert-c" inputmode="decimal" autocomplete="off" size="7"> cm',
        '<button class="knopf">Notieren</button>',
        '</form>'
      ].join("");
    }
    panel.innerHTML = [
      '<h2>Durchführung</h2>',
      oben,
      d ? '<p><button class="knopf zweitrangig" id="exp-abbruch">Dreieck zurücklegen</button></p>' : "",
      '<p id="exp-meldung" class="exp-meldung" aria-live="polite">' + esc(zustand.meldung) + '</p>',
      '<h3>Messtabelle</h3>',
      '<table class="exp-tabelle">',
      '<thead><tr><th>Dreieck</th><th>a in cm</th><th>b in cm</th><th>c in cm</th></tr></thead>',
      '<tbody>' + (zustand.messungen.map(z => '<tr><td>' + esc(z.name) + '</td><td>' + komma(z.a, 1) + '</td><td>' + komma(z.b, 1) + '</td><td><strong>' + komma(z.c, 1) + '</strong></td></tr>').join("") || '<tr><td colspan="4">noch leer</td></tr>') + '</tbody>',
      '</table>',
      '<p>' + n + ' von mindestens ' + MINDEST_DREIECKE + ' Dreiecken vermessen.' + (n >= MINDEST_DREIECKE ? " Das reicht — mehr ist trotzdem besser!" : "") + '</p>',
      '<button class="knopf" id="exp-weiter2" ' + (n >= MINDEST_DREIECKE ? "" : "disabled") + '>Zur Auswertung</button>'
    ].join("");

    panel.querySelectorAll("[data-dreieck]").forEach(b =>
      b.addEventListener("click", () => waehleDreieck(DREIECKE.find(x => x.id === b.dataset.dreieck))));
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
    panel.querySelector("#exp-abbruch")?.addEventListener("click", () => {
      zustand.gewaehlt = null; zustand.schritt = ""; zustand.aNotiert = NaN; zustand.bNotiert = NaN; zustand.meldung = "";
      zeichne(); panelMessen();
    });
    panel.querySelector("#exp-a")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-wert-a").value);
      if (!ablesungOk(eingabe, messeKathete(d, "a"), TOL_LAENGE)) {
        melde("✗ Schau noch einmal auf die blaue Skala an der waagerechten Seite: Bei welchem Wert endet sie? Dicke Striche = ganze cm, kleine = mm.");
        return;
      }
      zustand.aNotiert = eingabe; zustand.schritt = "b"; zustand.meldung = "";
      zeichne(); panelMessen();
    });
    panel.querySelector("#exp-b")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-wert-b").value);
      if (!ablesungOk(eingabe, messeKathete(d, "b"), TOL_LAENGE)) {
        melde("✗ Schau noch einmal auf die Skala an der senkrechten Seite. Du bist nah dran!");
        return;
      }
      zustand.bNotiert = eingabe; zustand.schritt = "c"; zustand.meldung = "";
      zeichne(); panelMessen();
    });
    panel.querySelector("#exp-c")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-wert-c").value);
      if (!ablesungOk(eingabe, messeHypotenuse(d), TOL_LAENGE)) {
        melde("✗ Schau noch einmal auf die Skala an der schrägen Seite (die längste). Dicke Striche = ganze cm.");
        return;
      }
      zustand.messungen.push({ id: d.id, name: d.name, a: zustand.aNotiert, b: zustand.bNotiert, c: eingabe });
      zustand.meldung = "✓ " + d.name + " vermessen: a = " + komma(zustand.aNotiert, 1) + " cm, b = " + komma(zustand.bNotiert, 1) + " cm, c = " + komma(eingabe, 1) + " cm.";
      zustand.gewaehlt = null; zustand.schritt = ""; zustand.aNotiert = NaN; zustand.bNotiert = NaN;
      zeichne(); panelMessen();
    });
  }

  function panelAuswerten() {
    const zeilen = zustand.messungen;
    if (zeilen.length < MINDEST_DREIECKE) {
      panel.innerHTML = '<h2>Auswertung</h2><p>Noch zu wenige Messwerte! Geh zu „2 · Durchführung" und vermiss zuerst mindestens ' + MINDEST_DREIECKE + ' Dreiecke.</p>';
      return;
    }
    const quotienten = zeilen.map(z => quadratsumme(z.a, z.b) / quadrat(z.c));
    const qMittel = mittel(quotienten);
    const punkte = zeilen.map(z => ({ x: quadrat(z.c), y: quadratsumme(z.a, z.b) }));
    const m = steigungUrsprung(punkte);
    const frei = regression(punkte);
    const gemessen = DREIECKE.filter(x => fertig(x.id));
    const sortiert = gemessen.slice().sort((p, q) => hypotenuseWahr(p) - hypotenuseWahr(q));
    const kleinstes = sortiert[0], groesstes = sortiert[sortiert.length - 1];

    const teil1 = [
      '<h3>1 · Quadrate vergleichen: a²+b² und c²</h3>',
      '<p>Rechne bei jedem Dreieck beide Größen aus und vergleiche:</p>',
      '<table class="exp-tabelle">',
      '<thead><tr><th>Dreieck</th><th>a²+b²</th><th>c²</th></tr></thead>',
      '<tbody>' + zeilen.map(z => '<tr><td>' + esc(z.name) + '</td><td>' + komma(quadratsumme(z.a, z.b), 1) + '</td><td>' + komma(quadrat(z.c), 1) + '</td></tr>').join("") + '</tbody>',
      '</table>',
      '<p>Die beiden Spalten sind bei jedem Dreieck fast <strong>gleich</strong> — kleine Unterschiede kommen nur vom Ablesen!</p>',
      zustand.regelErkannt ? (
        '<p class="exp-hinweis">✓ Genau: <strong>a² + b² = c²</strong> — der <strong>Satz des Pythagoras</strong>. Im rechtwinkligen Dreieck ist die Summe der Kathetenquadrate gleich dem Hypotenusenquadrat. Der Mittelwert von (a²+b²) ÷ c² liegt bei ' + komma(qMittel, 3) + ' — also dicht an 1.</p>'
      ) : (
        '<form id="exp-regel" class="exp-ablesen">' +
        '<label for="exp-wert-regel">Welche Gleichung verbindet a²+b² und c² (Form: a²+b² = …)?</label>' +
        '<input id="exp-wert-regel" autocomplete="off" size="10">' +
        '<button class="knopf">Prüfen</button>' +
        '</form>' +
        '<details class="exp-hilfe"><summary>Hilfe</summary><p>Vergleiche Spalte 2 mit Spalte 3. Wenn a²+b² ungefähr dasselbe ist wie c², dann lautet die Gleichung „a²+b² = c²“. Tippe „c²“ oder „c^2“ ein.</p></details>'
      )
    ].join("");

    const teil2 = !zustand.regelErkannt ? "" : [
      '<h3>2 · Alle Punkte auf einer Geraden mit Steigung 1</h3>',
      '<p>Jedes Dreieck wird ein Punkt: <strong>c² nach rechts, a²+b² nach oben</strong>. Liegen alle auf der Geraden y = x (also a²+b² = c²), muss die Steigung genau 1 sein.</p>',
      '<canvas id="exp-diagramm" class="exp-diagramm" width="440" height="300" aria-label="Diagramm: a-Quadrat plus b-Quadrat ueber c-Quadrat. Alle Messpunkte liegen auf der Ursprungsgeraden mit Steigung 1; ein gestricheltes Steigungsdreieck ist eingezeichnet."></canvas>',
      zustand.steigungOk ? (
        '<p>✓ Steigung m ≈ <strong>' + komma(m, 3) + '</strong> — praktisch genau 1! Lässt man die Gerade frei (nicht durch null gezwungen), liefert die Regression als Achsenabschnitt b ≈ ' + komma(frei.b, 1) + ': nahe null. Die Punkte liegen auf y = x.</p>' +
        '<p class="exp-hinweis"><strong>Kernsatz:</strong> In jedem rechtwinkligen Dreieck gilt</p>' +
        '<p class="exp-hinweis" style="text-align:center"><strong>a² + b² = c²</strong></p>' +
        '<p>Das ist der Satz des Pythagoras — unabhängig von der Form des Dreiecks, solange der Winkel zwischen a und b 90° beträgt.</p>'
      ) : (
        '<p>Bestimme die Steigung der Geraden: <strong>Steigung = Δ(a²+b²) ÷ Δ(c²)</strong>. Nimm das gestrichelte Steigungsdreieck im Diagramm zu Hilfe.</p>' +
        '<details class="exp-hilfe"><summary>Hilfe: Schritt für Schritt</summary>' +
        '<p><strong>Teilschritt 1 – Dreieck ablesen:</strong> Im Diagramm ist ein gestricheltes <strong>Steigungsdreieck</strong>. Die waagerechte Seite ist Δ(c²), die senkrechte Δ(a²+b²). Beide Werte stehen am Dreieck.</p>' +
        '<p><strong>Teilschritt 2 – teilen:</strong> Steigung = Δ(a²+b²) ÷ Δ(c²). Weil a²+b² und c² fast gleich sind, kommt eine Zahl nahe 1 heraus. Beispiel: 100 ÷ 100 = 1.</p>' +
        '</details>' +
        '<form id="exp-m" class="exp-ablesen">' +
        '<label for="exp-wert-m">Steigung =</label>' +
        '<input id="exp-wert-m" inputmode="decimal" autocomplete="off" size="7">' +
        '<button class="knopf">Prüfen</button>' +
        '<button class="knopf zweitrangig" type="button" id="exp-m-zeigen">Steigung anzeigen</button>' +
        '</form>' +
        (zustand.steigungGezeigt ? '<p>Die Regression rechnet: m ≈ <strong>' + komma(m, 3) + '</strong>. Tippe den Wert oben ein.</p>' : "")
      )
    ].join("");

    const teil3 = !zustand.steigungOk ? "" : [
      '<h3>3 · Wo misst man am genauesten?</h3>',
      '<p>Stell dir vor, du verliest dich an jeder Seite um nur <strong>1 mm</strong>. Bei welchem deiner Dreiecke verfälscht das den Vergleich a²+b² ↔ c² am wenigsten?</p>',
      '<label for="exp-genau">Am genauesten ist:</label>',
      '<select id="exp-genau" class="exp-wahl">',
      '<option value="">— wähle ein Dreieck —</option>',
      gemessen.map(x => '<option value="' + x.id + '">' + esc(x.name) + " (c ≈ " + komma(hypotenuseWahr(x), 1) + " cm)</option>").join(""),
      '</select>',
      zustand.genauOk ? (
        '<p class="exp-hinweis">✓ Richtig: <strong>' + esc(groesstes.name) + '</strong> (größte Seiten)! Derselbe Millimeter Ablesefehler fällt bei langen Seiten weniger ins Gewicht als bei kurzen. Beim kleinsten Dreieck (' + esc(kleinstes.kurz) + ') macht 1 mm relativ etwa ' + komma(relFehlerProMm(kleinstes) * 100, 1) + ' % aus, beim größten (' + esc(groesstes.kurz) + ') nur ' + komma(relFehlerProMm(groesstes) * 100, 1) + ' %. Je größer das Dreieck, desto genauer.</p>'
      ) : ""
    ].join("");

    const abschluss = !zustand.genauOk ? "" : '<p><strong>Experiment komplett!</strong> Du hast den Satz des Pythagoras nicht nachgeschlagen, sondern selbst vermessen: a²+b² ≈ c² (Steigung ' + komma(m, 2) + '). Speichere deine Messwerte als CSV — und prüf das Ganze mit Geodreieck und Papier nach.</p>';

    panel.innerHTML = [
      '<h2>Auswertung</h2>',
      teil1, teil2, teil3, abschluss,
      '<p id="exp-meldung" class="exp-meldung" aria-live="polite"></p>',
      '<details class="exp-fehler"><summary>Fehlerbetrachtung — warum nie haargenau gleich?</summary>',
      '<p><strong>Ablesen auf mm:</strong> Auf den Millimeter genau abzulesen ist die Grenze. Schon ein halber Millimeter pro Seite verschiebt a²+b² und c² etwas — deshalb sind beide nie exakt gleich, nur sehr nah.</p>',
      '<p><strong>Quadrieren verstärkt:</strong> Weil die Werte quadriert werden, wirkt sich ein kleiner Längenfehler auf a²+b² und c² merklich aus — besonders bei kurzen Seiten.</p>',
      '<p><strong>Großes Dreieck schlägt kleines:</strong> Bei langen Seiten ist 1 mm relativ wenig. Darum liefern große Dreiecke die saubereren Werte.</p>',
      '<p><strong>Rechter Winkel ist Pflicht:</strong> Der Satz gilt nur, wenn der Winkel zwischen a und b wirklich 90° ist. Bei einem schiefen Dreieck stimmt a²+b² = c² nicht mehr.</p>',
      '</details>',
      '<div class="exp-knopfzeile">',
      '<button class="knopf zweitrangig" id="exp-zurueck">Mehr messen</button>',
      '<button class="knopf zweitrangig" id="exp-csv">Messwerte als CSV speichern</button>',
      '<button class="knopf" id="exp-neustart">Neues Experiment</button>',
      '</div>'
    ].join("");

    panel.querySelector("#exp-regel")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const t = panel.querySelector("#exp-wert-regel").value.trim().toLowerCase().replace(/\s/g, "");
      if (t === "c²" || t === "c^2" || t === "c2" || t === "c*c" || t === "c·c") {
        zustand.regelErkannt = true; panelAuswerten();
      } else {
        melde("✗ Noch nicht. Vergleiche die beiden Spalten: a²+b² ist fast genau so groß wie c². Tippe „c²“ (oder „c^2“) ein.");
      }
    });
    panel.querySelector("#exp-m")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const e = parseDezimal(panel.querySelector("#exp-wert-m").value);
      if (ablesungOk(e, m, TOL_ZAHL)) {
        zustand.steigungOk = true; panelAuswerten();
      } else {
        melde("✗ Steigung = Δ(a²+b²) ÷ Δ(c²). Lies beide Werte am Dreieck ab und teile — das Ergebnis liegt nahe 1.");
      }
    });
    panel.querySelector("#exp-m-zeigen")?.addEventListener("click", () => {
      zustand.steigungGezeigt = true; panelAuswerten();
    });
    const auswahl = panel.querySelector("#exp-genau");
    if (auswahl) {
      if (zustand.genauOk) { auswahl.value = groesstes.id; auswahl.disabled = true; }
      auswahl.addEventListener("change", ev => {
        if (!ev.target.value) return;
        if (ev.target.value === groesstes.id) {
          zustand.genauOk = true; panelAuswerten();
        } else {
          melde("✗ Überleg: 1 mm von 5 cm ist viel, 1 mm von 15 cm fast nichts. Bei welchem Dreieck sind die Seiten am längsten?");
        }
      });
    }
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      csvHerunterladen("pythagoras-messwerte.csv",
        ["Dreieck", "a in cm", "b in cm", "c in cm", "a-Quadrat plus b-Quadrat", "c-Quadrat"],
        zeilen.map(z => [z.name, z.a, z.b, z.c, quadratsumme(z.a, z.b), quadrat(z.c)]));
    });
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      zustand.gewaehlt = null; zustand.schritt = ""; zustand.aNotiert = NaN; zustand.bNotiert = NaN;
      zustand.messungen = []; zustand.meldung = "";
      zustand.regelErkannt = false; zustand.steigungOk = false;
      zustand.steigungGezeigt = false; zustand.genauOk = false;
      zeichne(); wechslePhase("aufbau");
    });
    if (zustand.regelErkannt) zeichneDiagramm(m);
  }

  // Diagramm: a²+b² über c², Ursprungsgerade, Steigungsdreieck
  function zeichneDiagramm(m) {
    const dia = panel.querySelector("#exp-diagramm");
    if (!dia || !zustand.messungen.length) return;
    const c = dia.getContext("2d");
    const cText = farbe("--text"), cLeise = farbe("--text-leise", "#767676"), cAkzent = farbe("--akzent", "#1762a8");
    const W = dia.width, H = dia.height, L = 58, U = H - 42;
    const punkte = zustand.messungen.map(z => ({ x: quadrat(z.c), y: quadratsumme(z.a, z.b) }));
    const xMax = Math.max(...punkte.map(p => p.x)) * 1.12;
    const yMax = Math.max(...punkte.map(p => p.y), xMax) * 1.0;
    const obenMax = Math.max(xMax, yMax);
    const X = v => L + v / obenMax * (W - L - 16);
    const Y = v => U - v / obenMax * (U - 18);
    c.clearRect(0, 0, W, H);
    c.font = "12px system-ui, sans-serif";
    c.strokeStyle = cText; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(L, 10); c.lineTo(L, U); c.lineTo(W - 8, U); c.stroke();
    c.fillStyle = cText;
    c.fillText("a²+b²", 10, 20); c.fillText("c²", W - 26, U + 30);
    c.fillText("0", L - 14, U + 14);
    if (Number.isFinite(m)) {
      const xEnd = obenMax;
      c.strokeStyle = cLeise; c.setLineDash([6, 5]);
      c.beginPath(); c.moveTo(X(0), Y(0)); c.lineTo(X(xEnd), Y(m * xEnd)); c.stroke();
      // Steigungsdreieck
      const xn = Math.round(obenMax / 2 / 10) * 10 || obenMax / 2;
      c.beginPath(); c.moveTo(X(0), Y(0)); c.lineTo(X(xn), Y(0)); c.lineTo(X(xn), Y(m * xn)); c.stroke();
      c.setLineDash([]);
      c.fillStyle = cLeise; c.textAlign = "center";
      c.fillText("Δ(c²) = " + komma(xn, 0), X(xn / 2), U - 6);
      c.textAlign = "start";
      c.fillText("Δ(a²+b²) = " + komma(m * xn, 0), X(xn) + 8, (Y(m * xn) + U) / 2);
    }
    for (const z of zustand.messungen) {
      c.fillStyle = cAkzent; c.beginPath(); c.arc(X(quadrat(z.c)), Y(quadratsumme(z.a, z.b)), 5, 0, 7); c.fill();
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
