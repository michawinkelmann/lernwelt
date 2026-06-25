// experiment.js — Interaktives Mathe-Experiment: Die Winkelsumme im Vieleck (Klasse 7).
// Realitätsnahe Messpraxis statt fertiger Formel: vier Vielecke (Dreieck, Viereck,
// Fünfeck, Sechseck) liegen auf dem Tisch. An jeder Ecke legt man den Winkelmesser
// an und liest den Innenwinkel SELBST an der Gradskala ab; pro Figur werden die
// Winkel addiert: 180°, 360°, 540°, 720°. Trägt man die Winkelsumme über (n − 2)
// auf, liegen alle Punkte auf einer Ursprungsgeraden mit Steigung 180°.
// Entdeckung: Winkelsumme = (n − 2) · 180°.
// Die Mess-Streuung ist deterministisch geseedet (helfer.streuung), dadurch
// laufen die TESTS DOM-frei in Node.

import {
  streuung, parseDezimal, komma, ablesungOk, esc, mittel, regression,
  farbe, bauePhasen, csvHerunterladen
} from "../../../assets/js/experiment/helfer.js";

// ---------- Vielecke ----------
// Jede Figur ist über echte Eckpunkte (Bildkoordinaten, y nach unten) definiert.
// Die Innenwinkel werden daraus exakt berechnet; ihre Summe ergibt genau
// (n − 2)·180°. Bewusst sind es keine regelmäßigen Figuren — so steht an jeder
// Ecke eine andere, „krumme" Gradzahl, und das Addieren wird echtes Messen.
export const VIELECKE = [
  {
    id: "dreieck", name: "Dreieck", kurz: "Dreieck", n: 3,
    ecken: [{ x: 80, y: 300 }, { x: 300, y: 250 }, { x: 150, y: 90 }]
  },
  {
    id: "viereck", name: "Viereck", kurz: "Viereck", n: 4,
    ecken: [{ x: 70, y: 290 }, { x: 300, y: 300 }, { x: 280, y: 110 }, { x: 110, y: 80 }]
  },
  {
    id: "fuenfeck", name: "Fünfeck", kurz: "Fünfeck", n: 5,
    ecken: [{ x: 100, y: 300 }, { x: 290, y: 270 }, { x: 320, y: 140 }, { x: 190, y: 60 }, { x: 70, y: 160 }]
  },
  {
    id: "sechseck", name: "Sechseck", kurz: "Sechseck", n: 6,
    ecken: [{ x: 120, y: 310 }, { x: 270, y: 300 }, { x: 330, y: 190 }, { x: 250, y: 80 }, { x: 110, y: 80 }, { x: 60, y: 200 }]
  }
];
export const MINDEST_FIGUREN = 4;

// ---------- Toleranzen ----------
export const TOL_WINKEL = 1.5; // einzelner Winkel am Geodreieck (Grad)
export const TOL_SUMME  = 3;   // Winkelsumme aus mehreren Ablesungen (Grad)
export const TOL_ZAHL   = 3;   // Steigung der Geraden (Grad je (n − 2))

// ---------- Geometrie (rein, DOM-frei, Node-testbar) ----------
// Innenwinkel an Ecke i: Winkel zwischen den beiden anliegenden Seiten, in Grad.
export function innenwinkel(ecken, i) {
  const n = ecken.length;
  const a = ecken[(i - 1 + n) % n], b = ecken[i], c = ecken[(i + 1) % n];
  const v1x = a.x - b.x, v1y = a.y - b.y;
  const v2x = c.x - b.x, v2y = c.y - b.y;
  const dot = v1x * v2x + v1y * v2y;
  const l1 = Math.hypot(v1x, v1y), l2 = Math.hypot(v2x, v2y);
  let cos = dot / (l1 * l2);
  cos = Math.max(-1, Math.min(1, cos));
  return Math.acos(cos) * 180 / Math.PI;
}
export function alleWinkel(f) { return f.ecken.map((_, i) => innenwinkel(f.ecken, i)); }
export function winkelsummeWahr(f) { return alleWinkel(f).reduce((a, b) => a + b, 0); }
export function summeFormel(n) { return (n - 2) * 180; }

// Eine einzelne Winkelablesung am Geodreieck: wahrer Wert + Streuung ±0,5°,
// danach auf ganze Grad gerundet (so steht eine ganze Zahl an der Skala).
export function lieseWinkel(f, i) {
  const roh = innenwinkel(f.ecken, i) + streuung("w:" + f.id + ":" + i, 1.0);
  return Math.round(roh);
}
// Summe der einzeln abgelesenen (gerundeten) Winkel einer Figur.
export function summeAbgelesen(f) {
  return f.ecken.reduce((s, _, i) => s + lieseWinkel(f, i), 0);
}

// Regressionsgerade durch den Ursprung y = m·x (kleinste Quadrate ohne
// Achsenabschnitt): m = Σ(x·y) / Σ(x²) — denn ohne Teildreiecke keine Winkel.
export function steigungUrsprung(punkte) {
  let sxx = 0, sxy = 0;
  for (const p of punkte) { sxx += p.x * p.x; sxy += p.x * p.y; }
  return sxx > 0 ? sxy / sxx : NaN;
}

// Antwort auf die Frage nach der „Grundzahl": 180 (± Toleranz) oder als Text.
export function grundzahlOk(text) {
  const t = String(text).trim().toLowerCase();
  if (t === "180°" || t === "180 grad" || t === "hundertachtzig") return true;
  return ablesungOk(parseDezimal(t), 180, TOL_ZAHL + 1e-9);
}

// Vorhergesagte Winkelsumme über die Formel (zur Selbstkontrolle in Auswertung 3).
export function vorhersageSumme(n) { return summeFormel(n); }

// ---------- TESTS (laufen DOM-frei in Node) ----------
export const TESTS = [
  { name: "Innenwinkelsumme = (n − 2)·180° exakt für jede Figur", ok: () => VIELECKE.every(f => Math.abs(winkelsummeWahr(f) - summeFormel(f.n)) < 1e-6) },
  { name: "Dreieck 180°, Viereck 360°, Fünfeck 540°, Sechseck 720° (Formel)", ok: () => summeFormel(3) === 180 && summeFormel(4) === 360 && summeFormel(5) === 540 && summeFormel(6) === 720 },
  { name: "Anzahl Ecken passt zu n bei jeder Figur", ok: () => VIELECKE.every(f => f.ecken.length === f.n) },
  { name: "jeder Innenwinkel liegt echt zwischen 0° und 180° (konvex/krumm)", ok: () => VIELECKE.every(f => alleWinkel(f).every(w => w > 5 && w < 179)) },
  // Unabhängige Nachrechnung: Innenwinkelsumme aus der Summe der Außenwinkel.
  // Für jedes einfache Vieleck gilt: Summe der Außenwinkel = 360°, also
  // Summe Innenwinkel = n·180° − 360° = (n − 2)·180°. Hier mit der eigenen
  // Winkelberechnung (Innen = 180 − Außen) gegengeprüft.
  { name: "unabhängig: n·180° − Außenwinkelsumme (=360°) ergänzt zur Innensumme", ok: () => VIELECKE.every(f => { const aussen = alleWinkel(f).reduce((s, w) => s + (180 - w), 0); return Math.abs(aussen - 360) < 1e-6 && Math.abs(f.n * 180 - aussen - winkelsummeWahr(f)) < 1e-6; }) },
  { name: "Ursprungs-Regression der perfekten Punkte (n−2, Summe): Steigung = 180°", ok: () => Math.abs(steigungUrsprung(VIELECKE.map(f => ({ x: f.n - 2, y: summeFormel(f.n) }))) - 180) < 1e-9 },
  { name: "freie Regression (helfer.js) der perfekten Punkte: m = 180°, b = 0°", ok: () => { const { m, b } = regression(VIELECKE.map(f => ({ x: f.n - 2, y: summeFormel(f.n) }))); return Math.abs(m - 180) < 1e-9 && Math.abs(b) < 1e-6; } },
  { name: "abgelesene Einzelwinkel sind ganze Zahlen, Streuung ≤ 1°", ok: () => VIELECKE.every(f => f.ecken.every((_, i) => { const w = lieseWinkel(f, i); return Number.isInteger(w) && Math.abs(w - innenwinkel(f.ecken, i)) <= 1.0 + 1e-9; })) },
  { name: "abgelesene Winkelsumme je Figur ≤ 3° neben (n−2)·180°", ok: () => VIELECKE.every(f => Math.abs(summeAbgelesen(f) - summeFormel(f.n)) <= 3) },
  { name: "Messungen deterministisch (zweiter Aufruf identisch)", ok: () => VIELECKE.every(f => f.ecken.every((_, i) => lieseWinkel(f, i) === lieseWinkel(f, i))) },
  { name: "Steigung der abgelesenen Summen nahe 180°, ±3°-Prüfung greift", ok: () => { const m = steigungUrsprung(VIELECKE.map(f => ({ x: f.n - 2, y: summeAbgelesen(f) }))); return Math.abs(m - 180) <= 2 && ablesungOk(m + 2, m, TOL_ZAHL) && !ablesungOk(m + 5, m, TOL_ZAHL); } },
  { name: "parseDezimal + Toleranzen (Winkel/Summe/Grundzahl)", ok: () => { return parseDezimal("57,3") === 57.3 && parseDezimal(" 90 ") === 90 && Number.isNaN(parseDezimal("spitz")) && ablesungOk(91, 90, TOL_WINKEL) && !ablesungOk(92, 90, TOL_WINKEL) && ablesungOk(362, 360, TOL_SUMME) && !ablesungOk(364, 360, TOL_SUMME) && grundzahlOk("180") && grundzahlOk("180°") && grundzahlOk(" 181 ") && !grundzahlOk("90") && !grundzahlOk("360") && !grundzahlOk(""); } }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;

  const zustand = {
    phase: "aufbau",
    gewaehlt: null,          // Figur in Arbeit
    eckIndex: 0,             // welche Ecke wird gerade gemessen
    notiert: [],             // schon abgelesene Winkel der aktuellen Figur
    messungen: [],           // {id, name, n, winkel:[...], summe}
    meldung: "",
    grundzahlOk: false,      // Auswertung 1 gelöst
    steigungOk: false,       // Auswertung 2 gelöst
    steigungGezeigt: false,
    formelOk: false          // Auswertung 3 gelöst
  };
  const fertig = id => zustand.messungen.some(z => z.id === id);

  const wechslePhase = bauePhasen(wurzel, [
    { id: "aufbau", label: "Aufbau" },
    { id: "messen", label: "Durchführung" },
    { id: "auswerten", label: "Auswertung" }
  ], zeigePhase);

  const flaeche = document.createElement("div");
  flaeche.className = "exp-flaeche";
  flaeche.innerHTML =
    '<div class="exp-links">' +
    '<canvas id="exp-canvas" width="380" height="420" aria-label="Messplatz: vier Vielecke vom Dreieck bis zum Sechseck. Beim Messen liegt ein halbrunder Winkelmesser an der gewählten Ecke; die abgelesene Gradzahl steht direkt an der Ecke."></canvas>' +
    '</div>' +
    '<div class="exp-rechts" id="exp-panel"></div>';
  wurzel.appendChild(flaeche);

  const canvas = flaeche.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = flaeche.querySelector("#exp-panel");

  // Ablage-Plätze für die Figurwahl (2 Spalten × 2 Reihen)
  const SLOTS = VIELECKE.map((f, i) => ({ x: 12 + (i % 2) * 186, y: 44 + Math.floor(i / 2) * 188, w: 178, h: 178 }));

  function rRect(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  }

  // ---------- Figur in einen Rahmen zeichnen (verkleinert + verschoben) ----------
  function maleFigurKlein(f, slot, F) {
    const minX = Math.min(...f.ecken.map(e => e.x)), maxX = Math.max(...f.ecken.map(e => e.x));
    const minY = Math.min(...f.ecken.map(e => e.y)), maxY = Math.max(...f.ecken.map(e => e.y));
    const pad = 26;
    const s = Math.min((slot.w - 2 * pad) / (maxX - minX), (slot.h - 2 * pad) / (maxY - minY));
    const ox = slot.x + slot.w / 2 - ((minX + maxX) / 2) * s;
    const oy = slot.y + slot.h / 2 - ((minY + maxY) / 2) * s - 6;
    const P = e => ({ x: ox + e.x * s, y: oy + e.y * s });
    ctx.beginPath();
    f.ecken.forEach((e, i) => { const p = P(e); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
    ctx.closePath();
    ctx.fillStyle = F.cHauch; ctx.fill();
    ctx.strokeStyle = F.cAkzent; ctx.lineWidth = 2.5; ctx.stroke();
    f.ecken.forEach(e => { const p = P(e); ctx.fillStyle = F.cText; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, 7); ctx.fill(); });
  }

  function zeichneRegal(F) {
    ctx.fillStyle = F.cText; ctx.font = "bold 14px system-ui, sans-serif";
    ctx.textAlign = "start";
    ctx.fillText("Vielecke — anklicken:", 12, 28);
    ctx.font = "12px system-ui, sans-serif";
    VIELECKE.forEach((f, i) => {
      const slot = SLOTS[i], done = fertig(f.id);
      rRect(slot.x, slot.y, slot.w, slot.h, 10);
      ctx.fillStyle = F.cFlaeche; ctx.fill();
      ctx.strokeStyle = F.cLeise; ctx.lineWidth = done ? 1.5 : 2; ctx.stroke();
      maleFigurKlein(f, slot, F);
      ctx.textAlign = "center"; ctx.fillStyle = done ? F.cLeise : F.cText;
      ctx.font = "bold 13px system-ui, sans-serif";
      ctx.fillText(f.kurz + " (n = " + f.n + ")" + (done ? " ✓" : ""), slot.x + slot.w / 2, slot.y + slot.h - 12);
      ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start";
    });
  }

  // ---------- Mess-Szene: Figur groß + Winkelmesser an der aktuellen Ecke ----------
  function figurTransform(f) {
    const minX = Math.min(...f.ecken.map(e => e.x)), maxX = Math.max(...f.ecken.map(e => e.x));
    const minY = Math.min(...f.ecken.map(e => e.y)), maxY = Math.max(...f.ecken.map(e => e.y));
    const pad = 70;
    const s = Math.min((canvas.width - 2 * pad) / (maxX - minX), (canvas.height - 2 * pad - 24) / (maxY - minY));
    const ox = canvas.width / 2 - ((minX + maxX) / 2) * s;
    const oy = (canvas.height + 24) / 2 - ((minY + maxY) / 2) * s;
    return e => ({ x: ox + e.x * s, y: oy + e.y * s });
  }

  function zeichneMessen(f, F) {
    const P = figurTransform(f);
    const i = zustand.eckIndex;
    const n = f.ecken.length;
    ctx.fillStyle = F.cText; ctx.font = "bold 14px system-ui, sans-serif"; ctx.textAlign = "start";
    ctx.fillText(f.name + " — Ecke " + (i + 1) + " von " + n, 12, 26);
    ctx.font = "12px system-ui, sans-serif";

    // Figur
    ctx.beginPath();
    f.ecken.forEach((e, k) => { const p = P(e); k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
    ctx.closePath();
    ctx.fillStyle = F.cHauch; ctx.fill();
    ctx.strokeStyle = F.cText; ctx.lineWidth = 2.5; ctx.stroke();

    // schon gemessene Ecken mit Gradzahl markieren
    f.ecken.forEach((e, k) => {
      const p = P(e);
      const istAktuell = k === i;
      ctx.fillStyle = istAktuell ? F.cAkzent : F.cText;
      ctx.beginPath(); ctx.arc(p.x, p.y, istAktuell ? 5 : 3.5, 0, 7); ctx.fill();
      if (k < zustand.notiert.length) {
        ctx.fillStyle = F.cLeise; ctx.font = "bold 12px system-ui, sans-serif"; ctx.textAlign = "center";
        ctx.fillText(zustand.notiert[k] + "°", p.x, p.y - 10);
        ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start";
      }
    });

    // Winkelmesser an der aktuellen Ecke
    zeichneWinkelmesser(f, P, i, F);
  }

  // Halbkreis-Winkelmesser, an der Ecke i ausgerichtet: die 0°-Linie liegt
  // auf der einen Schenkelrichtung, die Gradskala läuft bis zur anderen.
  function zeichneWinkelmesser(f, P, i, F) {
    const n = f.ecken.length;
    const a = f.ecken[(i - 1 + n) % n], b = f.ecken[i], c = f.ecken[(i + 1) % n];
    const pb = P(b);
    // Richtungen der beiden Schenkel (im Bild)
    let aRichtung = Math.atan2(P(a).y - pb.y, P(a).x - pb.x);
    let cRichtung = Math.atan2(P(c).y - pb.y, P(c).x - pb.x);
    const wert = lieseWinkel(f, i);

    const R = 56;
    // Halbkreis-Skala, von Schenkel A bis Schenkel C (über den kleineren Winkel = Innenwinkel)
    // Wir zeichnen den Bogen direkt zwischen den beiden Schenkelrichtungen.
    let start = aRichtung, ende = cRichtung;
    // sicherstellen, dass wir den inneren Sektor durchlaufen
    let delta = ende - start;
    while (delta <= -Math.PI) delta += 2 * Math.PI;
    while (delta > Math.PI) delta -= 2 * Math.PI;

    // Skalenring (transparente Lupe)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pb.x, pb.y);
    ctx.arc(pb.x, pb.y, R, start, start + delta, delta < 0);
    ctx.closePath();
    ctx.fillStyle = F.cFlaeche; ctx.globalAlpha = 0.55; ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = F.cAkzent; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();

    // Schenkel verlängern (gestrichelt) als „Anlegekanten"
    ctx.strokeStyle = F.cLeise; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(pb.x, pb.y); ctx.lineTo(pb.x + Math.cos(start) * (R + 18), pb.y + Math.sin(start) * (R + 18));
    ctx.moveTo(pb.x, pb.y); ctx.lineTo(pb.x + Math.cos(ende) * (R + 18), pb.y + Math.sin(ende) * (R + 18));
    ctx.stroke(); ctx.setLineDash([]);

    // Gradstriche auf dem Bogen (alle 10°), bezogen auf den Innenwinkel
    const step = delta / wert; // Radiant pro Grad entlang des Bogens
    ctx.strokeStyle = F.cText; ctx.fillStyle = F.cText;
    for (let g = 0; g <= wert; g += 10) {
      const ang = start + step * g;
      const lang = g % 30 === 0;
      const r1 = R, r2 = R - (lang ? 9 : 5);
      ctx.lineWidth = lang ? 1.6 : 1;
      ctx.beginPath();
      ctx.moveTo(pb.x + Math.cos(ang) * r1, pb.y + Math.sin(ang) * r1);
      ctx.lineTo(pb.x + Math.cos(ang) * r2, pb.y + Math.sin(ang) * r2);
      ctx.stroke();
    }
    // 0°-Markierung und der abgelesene Wert als beschriftete Marke
    ctx.font = "bold 11px system-ui, sans-serif"; ctx.textAlign = "center";
    const a0 = start, av = start + delta;
    ctx.fillText("0°", pb.x + Math.cos(a0) * (R + 12), pb.y + Math.sin(a0) * (R + 12) + 4);

    // Ablesemarke (Pfeil) auf dem zweiten Schenkel + große Gradzahl im Sektor
    const amid = start + delta / 2;
    ctx.fillStyle = F.cAkzent;
    ctx.font = "bold 15px system-ui, sans-serif";
    ctx.fillText(wert + "°", pb.x + Math.cos(amid) * (R * 0.55), pb.y + Math.sin(amid) * (R * 0.55) + 5);
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start";

    // Hinweisbanner unten
    ctx.fillStyle = F.cLeise; ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Lies die markierte Gradzahl im Winkel ab", canvas.width / 2, canvas.height - 9);
    ctx.textAlign = "start";
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
    const f = zustand.gewaehlt;
    if (!f) { zeichneRegal(F); return; }
    zeichneMessen(f, F);
  }

  // ---------- Interaktion ----------
  canvas.addEventListener("click", ev => {
    if (zustand.gewaehlt) return;
    const r = canvas.getBoundingClientRect();
    const x = (ev.clientX - r.left) * canvas.width / r.width;
    const y = (ev.clientY - r.top) * canvas.height / r.height;
    const i = SLOTS.findIndex(s => x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h);
    if (i >= 0) waehleFigur(VIELECKE[i]);
  });

  function waehleFigur(f) {
    if (zustand.phase !== "messen") wechslePhase("messen");
    if (fertig(f.id)) {
      zustand.meldung = f.name + " steht schon mit ✓ in der Tabelle — wähle ein anderes Vieleck.";
      panelMessen(); return;
    }
    zustand.gewaehlt = f; zustand.eckIndex = 0; zustand.notiert = []; zustand.meldung = "";
    zeichne(); panelMessen();
  }

  function melde(text) {
    zustand.meldung = text;
    const el = panel.querySelector("#exp-meldung");
    if (el) el.textContent = text;
  }

  // ---------- Panels ----------
  function panelAufbau() {
    panel.innerHTML =
      '<h2>Aufbau und Geräte</h2>' +
      '<p>Auf dem Tisch liegen <strong>vier Vielecke</strong>: ein Dreieck, ein Viereck, ein Fünfeck und ein Sechseck. Sie sind bewusst <strong>unregelmäßig</strong> — an jeder Ecke steckt eine andere Gradzahl. Dazu ein <strong>Winkelmesser</strong> (Geodreieck).</p>' +
      '<p><strong>Dein Plan für jede Figur:</strong></p>' +
      '<ol>' +
      '<li>Winkelmesser nacheinander an <strong>jede Ecke</strong> anlegen,</li>' +
      '<li>jeden <strong>Innenwinkel</strong> ablesen und notieren,</li>' +
      '<li>alle Winkel einer Figur <strong>addieren</strong> — das ist die Winkelsumme.</li>' +
      '</ol>' +
      '<p class="exp-hinweis"><strong>Sag voraus, bevor du misst:</strong> Wie groß ist die Winkelsumme im Dreieck? Und was passiert, wenn die Figur eine Ecke mehr bekommt — bleibt die Summe gleich, oder wächst sie? Schreib dir deine Vermutung auf und prüfe sie nachher an der Tabelle.</p>' +
      '<p>Miss alle <strong>' + MINDEST_FIGUREN + ' Figuren</strong> — beginne beim Dreieck, dann eine Ecke nach der anderen mehr.</p>' +
      '<button class="knopf" id="exp-weiter1">Zur Durchführung</button>';
    panel.querySelector("#exp-weiter1").addEventListener("click", () => wechslePhase("messen"));
  }

  function panelMessen() {
    const f = zustand.gewaehlt;
    const fertigZahl = zustand.messungen.length;
    let oben = "";
    if (!f) {
      oben =
        '<p>Wähle dein nächstes Vieleck — klicke es im Bild an (oder hier):</p>' +
        '<div class="exp-masseknoepfe" aria-label="Vieleck wählen">' +
        VIELECKE.map(x => '<button class="knopf zweitrangig" data-figur="' + x.id + '" ' + (fertig(x.id) ? "disabled" : "") + '>' + esc(x.kurz) + (fertig(x.id) ? " ✓" : "") + '</button>').join("") +
        '</div>';
    } else {
      const i = zustand.eckIndex;
      const teilliste = zustand.notiert.length
        ? '<p>Schon abgelesen: ' + zustand.notiert.map(w => '<strong>' + w + '°</strong>').join(" · ") + (zustand.notiert.length > 1 ? ' &nbsp;(Summe bisher: ' + zustand.notiert.reduce((a, b) => a + b, 0) + '°)' : '') + '</p>'
        : '';
      oben =
        '<p><strong>' + esc(f.name) + '</strong> — Ecke <strong>' + (i + 1) + ' von ' + f.n + '</strong>. Der Winkelmesser liegt an dieser Ecke an: seine 0°-Linie auf dem einen Schenkel, die Gradzahl steht im Inneren des Winkels. Lies sie ab.</p>' +
        teilliste +
        '<form id="exp-w" class="exp-ablesen">' +
        '<label for="exp-wert-w">Innenwinkel =</label>' +
        '<input id="exp-wert-w" inputmode="decimal" autocomplete="off" size="6"> °' +
        '<button class="knopf">Notieren</button>' +
        '</form>';
    }
    panel.innerHTML =
      '<h2>Durchführung</h2>' +
      oben +
      (f ? '<p><button class="knopf zweitrangig" id="exp-abbruch">Figur zurücklegen</button></p>' : "") +
      '<p id="exp-meldung" class="exp-meldung" aria-live="polite">' + esc(zustand.meldung) + '</p>' +
      '<h3>Messtabelle</h3>' +
      '<table class="exp-tabelle">' +
      '<thead><tr><th>Figur</th><th>Ecken n</th><th>Einzelwinkel in °</th><th>Summe in °</th></tr></thead>' +
      '<tbody>' + (zustand.messungen.map(z => '<tr><td>' + esc(z.name) + '</td><td>' + z.n + '</td><td>' + z.winkel.join(" + ") + '</td><td><strong>' + z.summe + '</strong></td></tr>').join("") || '<tr><td colspan="4">noch leer</td></tr>') + '</tbody>' +
      '</table>' +
      '<p>' + fertigZahl + ' von ' + MINDEST_FIGUREN + ' Figuren gemessen.' + (fertigZahl >= MINDEST_FIGUREN ? " Stark — alle vier sind drin!" : "") + '</p>' +
      '<button class="knopf" id="exp-weiter2" ' + (fertigZahl >= MINDEST_FIGUREN ? "" : "disabled") + '>Zur Auswertung</button>';

    panel.querySelectorAll("[data-figur]").forEach(b =>
      b.addEventListener("click", () => waehleFigur(VIELECKE.find(x => x.id === b.dataset.figur))));
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
    panel.querySelector("#exp-abbruch")?.addEventListener("click", () => {
      zustand.gewaehlt = null; zustand.eckIndex = 0; zustand.notiert = []; zustand.meldung = "";
      zeichne(); panelMessen();
    });
    panel.querySelector("#exp-w")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-wert-w").value);
      const wahr = lieseWinkel(f, zustand.eckIndex);
      if (!ablesungOk(eingabe, wahr, TOL_WINKEL)) {
        melde("✗ Schau noch einmal genau auf die Skala: Wo trifft der zweite Schenkel auf die Gradzahl? Die große blaue Zahl im Winkel hilft dir. (Auf 1° genau, Komma oder Punkt.)");
        return;
      }
      zustand.notiert.push(wahr);
      if (zustand.notiert.length < f.n) {
        zustand.eckIndex += 1; zustand.meldung = "✓ notiert — weiter zur nächsten Ecke.";
        zeichne(); panelMessen();
      } else {
        const summe = zustand.notiert.reduce((a, b) => a + b, 0);
        zustand.messungen.push({ id: f.id, name: f.name, n: f.n, winkel: zustand.notiert.slice(), summe });
        zustand.meldung = "✓ " + f.name + " fertig! Die Winkelsumme ist " + zustand.notiert.join(" + ") + " = " + summe + "°.";
        zustand.gewaehlt = null; zustand.eckIndex = 0; zustand.notiert = [];
        zeichne(); panelMessen();
      }
    });
  }

  function panelAuswerten() {
    const zeilen = zustand.messungen;
    if (zeilen.length < MINDEST_FIGUREN) {
      panel.innerHTML = '<h2>Auswertung</h2><p>Noch zu wenige Figuren! Geh zu „2 · Durchführung" und miss zuerst alle ' + MINDEST_FIGUREN + ' Vielecke.</p>';
      return;
    }
    // nach n sortieren, damit die Reihe Dreieck→Sechseck stimmt
    const sortiert = zeilen.slice().sort((a, b) => a.n - b.n);
    const punkte = sortiert.map(z => ({ x: z.n - 2, y: z.summe }));
    const m = steigungUrsprung(punkte);
    const frei = regression(punkte);

    const teil1 =
      '<h3>1 · Ein Muster in der Tabelle</h3>' +
      '<p>Deine Winkelsummen:<br>' +
      sortiert.map(z => esc(z.kurz || z.name) + ' (n = ' + z.n + '): <strong>' + z.summe + '°</strong>').join("<br>") +
      '</p>' +
      '<p>Von Figur zu Figur kommen <strong>immer rund 180° dazu</strong>: 180 → 360 → 540 → 720. Jede zusätzliche Ecke bringt ein weiteres Dreieck — und damit 180° mehr.</p>' +
      (zustand.grundzahlOk ?
        '<p class="exp-hinweis">✓ Die <strong>Grundzahl ist 180°</strong> — die Winkelsumme des Dreiecks. Sie steckt in jedem Vieleck: Man kann jedes n-Eck von einer Ecke aus in <strong>(n − 2) Dreiecke</strong> zerlegen.</p>'
        :
        '<form id="exp-grund" class="exp-ablesen">' +
        '<label for="exp-wert-grund">Welche Zahl kommt mit jeder weiteren Ecke dazu?</label>' +
        '<input id="exp-wert-grund" autocomplete="off" size="6"> (in Grad)' +
        '<button class="knopf">Prüfen</button>' +
        '</form>');

    const teil2 = !zustand.grundzahlOk ? "" :
      '<h3>2 · Alle Punkte auf einer Geraden</h3>' +
      '<p>Trag jede Figur als Punkt auf: nach rechts die Zahl der Teildreiecke <strong>(n − 2)</strong>, nach oben die Winkelsumme. Die gestrichelte Gerade ist die <strong>Regressionsgerade durch den Ursprung</strong> — sie passt am besten zu allen Punkten. (Dass sie durch null läuft, ist klar: 0 Teildreiecke → 0°.)</p>' +
      '<canvas id="exp-diagramm" class="exp-diagramm" width="440" height="300" aria-label="Diagramm: Winkelsumme über (n minus 2). Alle vier Messpunkte liegen auf einer Ursprungsgeraden; ein gestricheltes Steigungsdreieck zeigt Delta x und Delta y."></canvas>' +
      (zustand.steigungOk ?
        '<p>✓ Steigung m ≈ <strong>' + komma(m, 1) + '°</strong> — wieder 180°! Lässt man die Gerade frei (nicht durch null gezwungen), liefert die Regression als Achsenabschnitt b ≈ ' + komma(frei.b, 1) + '°: praktisch null. Die Gerade <em>will</em> durch den Ursprung.</p>' +
        '<p class="exp-hinweis"><strong>Kernsatz:</strong> Die Winkelsumme hängt nur von der Eckenzahl ab — nicht von Form oder Größe: <strong>Winkelsumme = (n − 2) · 180°.</strong></p>'
        :
        '<p>Bestimme die Steigung der Geraden: <strong>Steigung = Δy ÷ Δx</strong>. Nimm das gestrichelte Steigungsdreieck im Diagramm zu Hilfe.</p>' +
        '<details class="exp-hilfe"><summary>Hilfe: Schritt für Schritt</summary>' +
        '<p><strong>Teilschritt 1 – Dreieck ablesen:</strong> Im Diagramm ist ein gestricheltes <strong>Steigungsdreieck</strong> eingezeichnet. Die waagerechte Seite ist Δx (eine Strecke nach rechts, in Teildreiecken), die senkrechte Seite ist Δy (das Stück nach oben, in Grad). Beide Werte stehen am Dreieck.</p>' +
        '<p><strong>Teilschritt 2 – teilen:</strong> Rechne Steigung = Δy ÷ Δx. Beispiel mit erfundenen Zahlen: Wäre Δx = 2 und Δy = 350°, ergäbe das 350 ÷ 2 = 175°. Setz deine echten Dreieckswerte ein.</p>' +
        '</details>' +
        '<form id="exp-m" class="exp-ablesen">' +
        '<label for="exp-wert-m">Steigung =</label>' +
        '<input id="exp-wert-m" inputmode="decimal" autocomplete="off" size="6"> °' +
        '<button class="knopf">Prüfen</button>' +
        '<button class="knopf zweitrangig" type="button" id="exp-m-zeigen">Steigung anzeigen</button>' +
        '</form>' +
        (zustand.steigungGezeigt ? '<p>Die Regression rechnet: m ≈ <strong>' + komma(m, 1) + '°</strong>. Tippe den Wert oben ein.</p>' : ""));

    const teil3 = !zustand.steigungOk ? "" :
      '<h3>3 · Die Formel anwenden</h3>' +
      '<p>Mit der Formel kannst du jede Winkelsumme vorhersagen, <strong>ohne zu messen</strong>. Probier es: Wie groß ist die Innenwinkelsumme in einem <strong>Achteck</strong> (n = 8)?</p>' +
      '<form id="exp-acht" class="exp-ablesen">' +
      '<label for="exp-wert-acht">Winkelsumme im Achteck =</label>' +
      '<input id="exp-wert-acht" inputmode="decimal" autocomplete="off" size="6"> °' +
      '<button class="knopf">Prüfen</button>' +
      '</form>' +
      (zustand.formelOk ?
        '<p class="exp-hinweis">✓ Richtig: (8 − 2) · 180° = 6 · 180° = <strong>' + vorhersageSumme(8) + '°</strong>. Du hast die Formel selbst aus deinen Messwerten gewonnen — und sie trägt weit über die vier gemessenen Figuren hinaus.</p>'
        : "");

    const abschluss = !zustand.formelOk ? "" :
      '<p><strong>Experiment komplett!</strong> Du hast die Winkelsumme nicht nachgeschlagen, sondern selbst vermessen und das Muster erkannt: <strong>(n − 2) · 180°</strong>. Speichere deine Messwerte als CSV — und zeichne zu Hause ein eigenes Vieleck zum Nachprüfen.</p>';

    panel.innerHTML =
      '<h2>Auswertung</h2>' +
      teil1 + teil2 + teil3 + abschluss +
      '<p id="exp-meldung" class="exp-meldung" aria-live="polite"></p>' +
      '<details class="exp-fehler"><summary>Fehlerbetrachtung — warum nie haargenau 180°, 360°, …?</summary>' +
      '<p><strong>Anlegen des Winkelmessers:</strong> Liegt der Mittelpunkt nicht genau auf der Ecke oder die 0°-Linie nicht genau auf dem Schenkel, liest du ein, zwei Grad zu viel oder zu wenig ab. Sorgfältig anlegen, auf Augenhöhe ablesen.</p>' +
      '<p><strong>Runden:</strong> Du liest auf ganze Grad. Mehrere kleine Rundungen addieren sich — deshalb landet die Summe knapp neben dem glatten Wert, aber sehr nah dran.</p>' +
      '<p><strong>Dicke Linien:</strong> Eine breit gezeichnete Kante macht die Ecke unscharf; die Schenkelrichtung ist dann nicht eindeutig. Dünn und genau zeichnen hilft.</p>' +
      '<p><strong>Trotzdem klar erkennbar:</strong> Auch mit Messfehlern springen die Summen deutlich in 180°-Stufen — das Muster ist robust.</p>' +
      '</details>' +
      '<div class="exp-knopfzeile">' +
      '<button class="knopf zweitrangig" id="exp-zurueck">Mehr messen</button>' +
      '<button class="knopf zweitrangig" id="exp-csv">Messwerte als CSV speichern</button>' +
      '<button class="knopf" id="exp-neustart">Neues Experiment</button>' +
      '</div>';

    panel.querySelector("#exp-grund")?.addEventListener("submit", ev => {
      ev.preventDefault();
      if (grundzahlOk(panel.querySelector("#exp-wert-grund").value)) {
        zustand.grundzahlOk = true; panelAuswerten();
      } else {
        melde("✗ Noch nicht. Tipp: Vergleiche zwei benachbarte Zeilen — Viereck minus Dreieck, Fünfeck minus Viereck. Immer derselbe Sprung. (Zahl in Grad.)");
      }
    });
    panel.querySelector("#exp-m")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const e = parseDezimal(panel.querySelector("#exp-wert-m").value);
      if (ablesungOk(e, m, TOL_ZAHL)) {
        zustand.steigungOk = true; panelAuswerten();
      } else {
        melde("✗ Steigung = Δy ÷ Δx. Lies beide Werte am gestrichelten Dreieck ab und teile — auf ±3° genau, Komma oder Punkt.");
      }
    });
    panel.querySelector("#exp-m-zeigen")?.addEventListener("click", () => {
      zustand.steigungGezeigt = true; panelAuswerten();
    });
    panel.querySelector("#exp-acht")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const e = parseDezimal(panel.querySelector("#exp-wert-acht").value);
      if (ablesungOk(e, vorhersageSumme(8), 0.5)) {
        zustand.formelOk = true; panelAuswerten();
      } else {
        melde("✗ Setz n = 8 in (n − 2) · 180° ein: (8 − 2) = 6, dann mal 180°. Rechne genau.");
      }
    });
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      csvHerunterladen("winkelsumme-messwerte.csv",
        ["Figur", "Ecken n", "Teildreiecke (n-2)", "Winkelsumme in Grad"],
        sortiert.map(z => [z.name, z.n, z.n - 2, z.summe]));
    });
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      zustand.gewaehlt = null; zustand.eckIndex = 0; zustand.notiert = [];
      zustand.messungen = []; zustand.meldung = "";
      zustand.grundzahlOk = false; zustand.steigungOk = false;
      zustand.steigungGezeigt = false; zustand.formelOk = false;
      zeichne(); wechslePhase("aufbau");
    });
    if (zustand.grundzahlOk) zeichneDiagramm(m, punkte);
  }

  // Diagramm: Messpunkte (n−2, Summe), Ursprungsgerade, Steigungsdreieck
  function zeichneDiagramm(m, punkte) {
    const dia = panel.querySelector("#exp-diagramm");
    if (!dia || !punkte.length) return;
    const c = dia.getContext("2d");
    const cText = farbe("--text"), cLeise = farbe("--text-leise", "#767676"), cAkzent = farbe("--akzent", "#1762a8");
    const W = dia.width, H = dia.height, L = 54, U = H - 42;
    const xMax = Math.max(...punkte.map(p => p.x)) + 1; // bis (n-2)=5
    const yMax = Math.max(...punkte.map(p => p.y)) * 1.12;
    const X = x => L + x / xMax * (W - L - 16);
    const Y = y => U - y / yMax * (U - 18);
    c.clearRect(0, 0, W, H);
    c.font = "12px system-ui, sans-serif";
    c.strokeStyle = cText; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(L, 10); c.lineTo(L, U); c.lineTo(W - 8, U); c.stroke();
    c.fillStyle = cText; c.textAlign = "start";
    c.fillText("Summe in °", 8, 20);
    c.fillText("n − 2", W - 52, U + 32);
    c.fillText("0", L - 16, U + 14);
    // x-Achsenmarken bei 1..xMax
    c.textAlign = "center";
    for (let x = 1; x <= Math.floor(xMax); x++) {
      c.strokeStyle = cLeise; c.lineWidth = 1;
      c.beginPath(); c.moveTo(X(x), U); c.lineTo(X(x), U + 5); c.stroke();
      c.fillStyle = cText; c.fillText(String(x), X(x), U + 18);
    }
    c.textAlign = "start";
    if (Number.isFinite(m)) {
      const xEnd = Math.min(xMax, yMax / m);
      c.strokeStyle = cLeise; c.setLineDash([6, 5]);
      c.beginPath(); c.moveTo(X(0), Y(0)); c.lineTo(X(xEnd), Y(m * xEnd)); c.stroke();
      // Steigungsdreieck über Δx = 2
      const dx = 2;
      c.beginPath(); c.moveTo(X(0), Y(0)); c.lineTo(X(dx), Y(0)); c.lineTo(X(dx), Y(m * dx)); c.stroke();
      c.setLineDash([]);
      c.fillStyle = cLeise; c.textAlign = "center";
      c.fillText("Δx = " + dx, X(dx / 2), U - 6);
      c.textAlign = "start";
      c.fillText("Δy = " + komma(m * dx, 0) + "°", X(dx) + 8, (Y(m * dx) + U) / 2);
    }
    for (const p of punkte) {
      c.fillStyle = cAkzent; c.beginPath(); c.arc(X(p.x), Y(p.y), 5, 0, 7); c.fill();
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
