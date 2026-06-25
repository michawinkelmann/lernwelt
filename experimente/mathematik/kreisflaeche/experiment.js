// experiment.js — Interaktives Mathe-Experiment: Die Kreisfläche durch Auszählen (Klasse 9).
// Realitätsnahe Messpraxis statt fertiger Formel: Kreise verschiedener Radien
// liegen auf einem Karoraster (1 Kästchen = 1 cm²). Die Fläche wird mit der
// klassischen Kästchenmethode geschätzt: ganz bedeckte Kästchen zählen voll,
// vom Kreisrand angeschnittene zählen halb. Die Kästchenzahl steht als Zahl an
// einer Anzeige — der Lernende liest sie SELBST ab und überträgt sie als A in
// cm². Trägt man A über r² auf, liegen alle Punkte auf einer Ursprungsgeraden;
// die Steigung ist immer dieselbe Zahl: π. Ergebnis: A = π·r².
// Die Auszähl-Streuung ist deterministisch geseedet (helfer.streuung), dadurch
// laufen die TESTS DOM-frei in Node (Modulebene browserfrei).

import {
  streuung, parseDezimal, komma, ablesungOk, esc, mittel, regression,
  farbe, bauePhasen, csvHerunterladen
} from "../../../assets/js/experiment/helfer.js";

// ---------- Kreise (r in cm; A_wahr = π·r² exakt) ----------
// Bewusst ab r = 3 cm: Bei sehr kleinen Kreisen ist der relative Randanteil so
// groß, dass die Kästchenmethode merklich daneben liegt — genau diese Einsicht
// (großer Kreis = genaueres Auszählen) ist Teil der Auswertung.
export const KREISE = [
  { id: "k3", name: "Kreis A", kurz: "A", r: 3 },
  { id: "k4", name: "Kreis B", kurz: "B", r: 4 },
  { id: "k5", name: "Kreis C", kurz: "C", r: 5 },
  { id: "k6", name: "Kreis D", kurz: "D", r: 6 },
  { id: "k7", name: "Kreis E", kurz: "E", r: 7 }
];
export const MINDEST_KREISE = 4;

// ---------- Toleranzen ----------
export const TOL_FLAECHE = 0.08;  // relativ — Auszählen am Rand ist von Natur aus ungenau
export const TOL_ZAHL    = 0.06;  // „berühmte Zahl" und Steigung (Kästchenmethode streut)

// ---------- Messlogik (rein, DOM-frei, Node-testbar) ----------
export function flaecheWahr(k) { return Math.PI * k.r * k.r; }

// Kästchenmethode wie auf Karopapier: Ein Kästchen zählt VOLL, wenn sein
// Mittelpunkt im Kreis liegt und der Kreisrand es nicht anschneidet; ein vom
// Rand angeschnittenes Kästchen zählt HALB (mal liegt mehr, mal weniger drin —
// das mittelt sich heraus). Die Geometrie ist exakt über alle Rasterzellen
// ausgewertet (kein Zufall); danach kommt eine kleine deterministische
// Verzähl-Streuung dazu, die mit dem Umfang (∝ r) wächst. Ergebnis: die
// abgelesene Kästchenzahl.
export function zaehleKaestchen(k) {
  const r = k.r;
  const R = Math.ceil(r) + 1;
  let voll = 0, halb = 0;
  for (let x = -R; x < R; x++) {
    for (let y = -R; y < R; y++) {
      const mx = x + 0.5, my = y + 0.5;                 // Zellmittelpunkt
      const mittelDrin = mx * mx + my * my <= r * r;
      const ecken = [
        x * x + y * y, (x + 1) * (x + 1) + y * y,
        x * x + (y + 1) * (y + 1), (x + 1) * (x + 1) + (y + 1) * (y + 1)
      ];
      const drin = ecken.filter(d => d <= r * r).length;
      const schneidet = drin > 0 && drin < 4;           // Rand kreuzt die Zelle
      if (mittelDrin && !schneidet) voll++;
      else if (schneidet) halb++;
    }
  }
  const roh = voll + halb / 2;                          // Kästchenmethode
  const stoer = streuung("kaestchen:" + k.id, Math.max(0.7, r * 0.5)); // Verzähl-Streuung ∝ Umfang
  return Math.round((roh + stoer) * 10) / 10;           // Anzeige auf 0,1 Kästchen
}

// abgelesene Kästchenzahl = Fläche in cm² (1 Kästchen = 1 cm²)
export function flaecheAus(kaestchen) { return kaestchen; }

// Regressionsgerade durch den Ursprung A = m·r² (kleinste Quadrate ohne
// Achsenabschnitt): m = Σ(x·y) / Σ(x²) — ohne Radius keine Fläche.
export function steigungUrsprung(punkte) {
  let sxx = 0, sxy = 0;
  for (const p of punkte) { sxx += p.x * p.x; sxy += p.x * p.y; }
  return sxx > 0 ? sxy / sxx : NaN;
}

// Antwort auf die Frage nach der berühmten Zahl: „pi"/„π" oder Zahl 3,14 ± Toleranz
export function piAntwortOk(text) {
  const t = String(text).trim().toLowerCase();
  if (t === "π" || t === "pi" || t === "kreiszahl" || t === "kreiszahl pi" || t === "kreiszahl π") return true;
  return ablesungOk(parseDezimal(t), Math.PI, TOL_ZAHL + 1e-9);
}

// Größter Kreis = relativ genauste Auszählung: Der Rand (Verzähl-Unsicherheit)
// wächst nur mit r, die Fläche aber mit r² — der relative Randanteil sinkt.
export function relRandAnteil(k) { return (2 * Math.PI * k.r) / flaecheWahr(k); } // ~ Umfang / Fläche = 2/r
export function genauesterKreis(ids) {
  const dabei = KREISE.filter(k => ids.includes(k.id));
  return dabei.reduce((best, k) => (best === null || k.r > best.r ? k : best), null);
}

// ---------- TESTS (laufen DOM-frei in Node) ----------
// Unabhängige Nachrechnung der Kästchenmethode (rein numerisch, nicht über die
// Geometrie von zaehleKaestchen): Monte-Carlo-Schätzung mit deterministischem
// Generator. Sie muss π·r² auf wenige Prozent treffen — und damit zeigen, dass
// das Auszählen wirklich gegen die Kreisfläche strebt.
function flaecheMonteCarlo(r) {
  let a = 12345 + Math.round(r * 1000), drin = 0;
  const N = 40000, rnd = () => { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; };
  for (let i = 0; i < N; i++) {
    const x = (rnd() * 2 - 1) * r, y = (rnd() * 2 - 1) * r;
    if (x * x + y * y <= r * r) drin++;
  }
  return drin / N * (2 * r) * (2 * r);
}

export const TESTS = [
  { name: "A_wahr = π·r² exakt für jeden Kreis", ok: () => KREISE.every(k => Math.abs(flaecheWahr(k) - Math.PI * k.r * k.r) < 1e-12) },
  { name: "Unabhängige Monte-Carlo-Fläche ≈ π·r² (Abweichung < 3 %)", ok: () => KREISE.every(k => Math.abs(flaecheMonteCarlo(k.r) - flaecheWahr(k)) / flaecheWahr(k) < 0.03) },
  { name: "Kästchenmethode (ohne Streuung) trifft π·r² auf < 8 %", ok: () => KREISE.every(k => {
      const r = k.r, R = Math.ceil(r) + 1; let voll = 0, halb = 0;
      for (let x = -R; x < R; x++) for (let y = -R; y < R; y++) {
        const mx = x + 0.5, my = y + 0.5, mittelDrin = mx*mx+my*my <= r*r;
        const e = [x*x+y*y,(x+1)*(x+1)+y*y,x*x+(y+1)*(y+1),(x+1)*(x+1)+(y+1)*(y+1)];
        const d = e.filter(v => v <= r*r).length, schneidet = d > 0 && d < 4;
        if (mittelDrin && !schneidet) voll++; else if (schneidet) halb++;
      }
      return Math.abs((voll + halb/2) - flaecheWahr(k)) / flaecheWahr(k) < 0.08;
    }) },
  { name: "abgelesene Kästchenzahl liegt nah an A_wahr (rel. ≤ 8 %)", ok: () => KREISE.every(k => Math.abs(zaehleKaestchen(k) - flaecheWahr(k)) / flaecheWahr(k) <= 0.08) },
  { name: "Auszählwerte deterministisch (zweiter Aufruf identisch)", ok: () => KREISE.every(k => zaehleKaestchen(k) === zaehleKaestchen(k)) },
  { name: "Anzeige auf 0,1 Kästchen gerastert", ok: () => KREISE.every(k => { const z = zaehleKaestchen(k) * 10; return Math.abs(z - Math.round(z)) < 1e-9; }) },
  { name: "Ursprungs-Regression perfekter Punkte (A über r²): Steigung = π", ok: () => Math.abs(steigungUrsprung(KREISE.map(k => ({ x: k.r * k.r, y: flaecheWahr(k) }))) - Math.PI) < 1e-9 },
  { name: "freie Regression (helfer.js) perfekter Punkte: m = π, b = 0", ok: () => { const { m, b } = regression(KREISE.map(k => ({ x: k.r * k.r, y: flaecheWahr(k) }))); return Math.abs(m - Math.PI) < 1e-9 && Math.abs(b) < 1e-9; } },
  { name: "Steigung der ausgezählten Punkte nahe π (|m−π| < 0,05), ±-Prüfung greift", ok: () => { const m = steigungUrsprung(KREISE.map(k => ({ x: k.r * k.r, y: zaehleKaestchen(k) }))); return Math.abs(m - Math.PI) < 0.05 && ablesungOk(m + 0.05, m, TOL_ZAHL) && !ablesungOk(m + 0.1, m, TOL_ZAHL); } },
  { name: "relativer Randanteil fällt streng monoton mit r (größter Kreis gewinnt)", ok: () => { const w = KREISE.map(relRandAnteil); return w.every((v, i) => i === 0 || v < w[i - 1]) && genauesterKreis(KREISE.map(k => k.id)).id === "k7"; } },
  { name: "π-Antwort: pi/π als Text oder Zahl 3,14 ± Toleranz", ok: () => piAntwortOk("π") && piAntwortOk("Pi") && piAntwortOk(" 3,14 ") && piAntwortOk("3.1416") && !piAntwortOk("3") && !piAntwortOk("3,3") && !piAntwortOk("") },
  { name: "parseDezimal + Flächen-Toleranz (relativ) greifen", ok: () => { const A = flaecheWahr(KREISE[1]); return parseDezimal("50,3") === 50.3 && Number.isNaN(parseDezimal("zwei")) && ablesungOk(A * 1.05, A, A * TOL_FLAECHE) && !ablesungOk(A * 1.1, A, A * TOL_FLAECHE); } }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;

  const zustand = {
    phase: "aufbau",
    gewaehlt: null,        // Kreis in Arbeit
    abgelesen: NaN,        // eingetragene Fläche (cm²)
    messungen: [],         // {id, name, r, kaestchen, A}
    meldung: "",
    piErkannt: false,
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
    '<canvas id="exp-canvas" width="360" height="500" aria-label="Messplatz: ein Kreis liegt auf einem Karoraster, ein Kaestchen entspricht einem Quadratzentimeter. Ganz bedeckte Kaestchen sind ausgefuellt, am Rand angeschnittene sind schraffiert. Eine Anzeige zeigt die ausgezaehlte Kaestchenzahl."></canvas>',
    '</div>',
    '<div class="exp-rechts" id="exp-panel"></div>'
  ].join("");
  wurzel.appendChild(flaeche);

  const canvas = flaeche.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = flaeche.querySelector("#exp-panel");

  // Ablage-Plätze für die Kreiswahl (in einer Reihe oben)
  const SLOTS = KREISE.map((k, i) => ({ x: 10 + i * 69, y: 44, w: 64, h: 90 }));

  function rRect(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  }

  // ---------- Regal: Kreise zur Auswahl (kleine Vorschau) ----------
  function zeichneRegal(F) {
    ctx.fillStyle = F.cText; ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillText("Kreise — einen anklicken:", 12, 26);
    ctx.font = "12px system-ui, sans-serif";
    KREISE.forEach((k, i) => {
      const s = SLOTS[i], done = fertig(k.id);
      rRect(s.x, s.y, s.w, s.h, 8);
      ctx.fillStyle = F.cFlaeche; ctx.fill();
      ctx.strokeStyle = F.cLeise; ctx.lineWidth = done ? 1.5 : 2; ctx.stroke();
      const cx = s.x + s.w / 2, cy = s.y + 38, rr = Math.min(26, 4.2 * k.r);
      ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 7);
      ctx.fillStyle = F.cHauch; ctx.fill();
      ctx.strokeStyle = done ? F.cLeise : F.cAkzent; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = done ? F.cLeise : F.cText;
      ctx.textAlign = "center"; ctx.font = "bold 12px system-ui, sans-serif";
      ctx.fillText(k.kurz + (done ? " ✓" : ""), cx, s.y + s.h - 18);
      ctx.font = "11px system-ui, sans-serif";
      ctx.fillText("r = " + k.r + " cm", cx, s.y + s.h - 4);
      ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start";
    });
    ctx.fillStyle = F.cLeise; ctx.textAlign = "center";
    ctx.fillText("1 Kästchen = 1 cm² — du zählst die Fläche aus.", canvas.width / 2, 196);
    ctx.fillText("Größere Kreise geben das schönere Muster.", canvas.width / 2, 218);
    ctx.textAlign = "start";
  }

  // ---------- Karoraster mit Kreis + Auszähl-Färbung + Zähl-Anzeige ----------
  function zeichneRaster(k, F) {
    const kaestchen = zaehleKaestchen(k);
    const A = flaecheWahr(k);
    // Rasterbereich: quadratisch zentriert, so dass der Kreis (Radius r cm)
    // bequem hineinpasst. px pro cm so gewählt, dass der größte Kreis (r = 7)
    // mit Rand sicher in die Höhe passt (Platz für Titel oben + Anzeige unten).
    const halbCm = Math.ceil(k.r) + 1;                 // sichtbare halbe Rasterbreite in cm
    const px = Math.max(8, Math.min(18, Math.floor((canvas.height - 230) / (2 * 8))));
    const breitePx = 2 * halbCm * px;
    const ox = Math.round((canvas.width - breitePx) / 2);
    const oy = 64;
    const cxPx = ox + halbCm * px, cyPx = oy + halbCm * px;
    const rPx = k.r * px;

    ctx.fillStyle = F.cText; ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillText(k.name + " — Radius r = " + k.r + " cm", 12, 26);
    ctx.font = "12px system-ui, sans-serif";

    // volle und angeschnittene Kästchen einfärben — exakt wie die Zählmethode:
    // Mittelpunkt drin und Rand schneidet nicht -> voll; Rand schneidet -> halb.
    for (let gx = -halbCm; gx < halbCm; gx++) {
      for (let gy = -halbCm; gy < halbCm; gy++) {
        const mx = gx + 0.5, my = gy + 0.5, mittelDrin = mx*mx+my*my <= k.r*k.r;
        const e = [gx*gx+gy*gy,(gx+1)*(gx+1)+gy*gy,gx*gx+(gy+1)*(gy+1),(gx+1)*(gx+1)+(gy+1)*(gy+1)];
        const drin = e.filter(v => v <= k.r * k.r).length;
        const schneidet = drin > 0 && drin < 4;
        const istVoll = mittelDrin && !schneidet;
        if (!istVoll && !schneidet) continue;
        const zx = cxPx + gx * px, zy = cyPx + gy * px;
        if (istVoll) {
          ctx.fillStyle = F.cHauch; ctx.fillRect(zx, zy, px, px);
        } else {
          // Randkästchen schraffieren (zählt halb)
          ctx.save();
          ctx.beginPath(); ctx.rect(zx, zy, px, px); ctx.clip();
          ctx.strokeStyle = F.cAkzent; ctx.lineWidth = 1; ctx.globalAlpha = 0.5;
          for (let d = -px; d < px; d += 5) {
            ctx.beginPath(); ctx.moveTo(zx + d, zy); ctx.lineTo(zx + d + px, zy + px); ctx.stroke();
          }
          ctx.restore();
        }
      }
    }
    // Rasterlinien
    ctx.strokeStyle = F.cLeise; ctx.lineWidth = 0.5; ctx.globalAlpha = 0.7;
    for (let gx = -halbCm; gx <= halbCm; gx++) {
      const x = cxPx + gx * px;
      ctx.beginPath(); ctx.moveTo(x, oy); ctx.lineTo(x, oy + breitePx); ctx.stroke();
    }
    for (let gy = -halbCm; gy <= halbCm; gy++) {
      const y = cyPx + gy * px;
      ctx.beginPath(); ctx.moveTo(ox, y); ctx.lineTo(ox + breitePx, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Kreislinie + Radius
    ctx.beginPath(); ctx.arc(cxPx, cyPx, rPx, 0, 7);
    ctx.strokeStyle = F.cText; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.strokeStyle = F.cAkzent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cxPx, cyPx); ctx.lineTo(cxPx + rPx, cyPx); ctx.stroke();
    ctx.fillStyle = F.cAkzent;
    ctx.beginPath(); ctx.arc(cxPx, cyPx, 2.5, 0, 7); ctx.fill();
    ctx.fillStyle = F.cText; ctx.textAlign = "center";
    ctx.fillText("r", cxPx + rPx / 2, cyPx - 6);
    ctx.textAlign = "start";

    // Legende rechts neben dem Raster, falls Platz
    const legX = ox + breitePx + 8;
    if (legX < canvas.width - 70) {
      ctx.font = "11px system-ui, sans-serif";
      ctx.fillStyle = F.cHauch; ctx.fillRect(legX, oy + 4, 12, 12);
      ctx.strokeStyle = F.cLeise; ctx.lineWidth = 0.5; ctx.strokeRect(legX, oy + 4, 12, 12);
      ctx.fillStyle = F.cText; ctx.fillText("voll: 1", legX + 16, oy + 14);
      ctx.fillStyle = F.cAkzent; ctx.globalAlpha = 0.5; ctx.fillRect(legX, oy + 24, 12, 12); ctx.globalAlpha = 1;
      ctx.fillStyle = F.cText; ctx.fillText("Rand:", legX + 16, oy + 34);
      ctx.fillText("½", legX + 4, oy + 50);
      ctx.font = "12px system-ui, sans-serif";
    }

    // Zähl-Anzeige unten — die abzulesende GRÖSSE als Zahl
    const ay = oy + breitePx + 22;
    ctx.fillStyle = F.cLeise; ctx.font = "12px system-ui, sans-serif";
    ctx.fillText("Zählhilfe (volle + halbe Kästchen):", 14, ay);
    rRect(14, ay + 10, 200, 40, 6);
    ctx.fillStyle = F.cHauch; ctx.fill();
    ctx.strokeStyle = F.cText; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = F.cText; ctx.font = "bold 19px ui-monospace, Consolas, monospace";
    ctx.textAlign = "right"; ctx.fillText(komma(kaestchen, 1) + " Kästchen", 204, ay + 36);
    ctx.textAlign = "start"; ctx.font = "12px system-ui, sans-serif";
    ctx.fillStyle = F.cLeise;
    ctx.fillText("1 Kästchen = 1 cm²  →  lies die Fläche A ab!", 14, ay + 66);
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
    const k = zustand.gewaehlt;
    if (!k) zeichneRegal(F); else zeichneRaster(k, F);
  }

  // ---------- Interaktion ----------
  canvas.addEventListener("click", ev => {
    if (zustand.gewaehlt) return;
    const r = canvas.getBoundingClientRect();
    const x = (ev.clientX - r.left) * canvas.width / r.width;
    const y = (ev.clientY - r.top) * canvas.height / r.height;
    const i = SLOTS.findIndex(s => x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h);
    if (i >= 0) waehleKreis(KREISE[i]);
  });

  function waehleKreis(k) {
    if (zustand.phase !== "messen") wechslePhase("messen");
    if (fertig(k.id)) {
      zustand.meldung = k.name + " steht schon mit ✓ in der Tabelle — wähle einen anderen Kreis.";
      panelMessen(); return;
    }
    zustand.gewaehlt = k; zustand.abgelesen = NaN; zustand.meldung = "";
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
      '<p>Vor dir liegen fünf <strong>Kreise</strong> mit verschiedenen Radien — alle auf demselben <strong>Karoraster</strong>. Jedes Kästchen ist genau <strong>1 cm · 1 cm = 1 cm²</strong> groß.</p>',
      '<p>Den Flächeninhalt eines Kreises misst man hier ganz handfest mit der <strong>Kästchenmethode</strong>:</p>',
      '<ul>',
      '<li>Jedes Kästchen, das <strong>ganz</strong> im Kreis liegt, zählt <strong>1</strong>.</li>',
      '<li>Jedes Kästchen, das der Rand <strong>anschneidet</strong>, zählt <strong>½</strong> (mal liegt etwas mehr, mal etwas weniger drin — das mittelt sich heraus).</li>',
      '</ul>',
      '<p><strong>Dein Plan für jeden Kreis:</strong></p>',
      '<ol>',
      '<li>die <strong>Kästchenzahl</strong> an der Zählhilfe ablesen,',
      '<li>als <strong>Fläche A</strong> in cm² eintragen (1 Kästchen = 1 cm²),</li>',
      '<li>später A über das <strong>Radiusquadrat r²</strong> auftragen.</li>',
      '</ol>',
      '<p class="exp-hinweis"><strong>Vorhersage, bevor du startest:</strong> Wenn du den Radius <em>verdoppelst</em> (von r auf 2r), wie ändert sich die Fläche — wird sie doppelt so groß, dreimal oder viermal so groß? Behalte deine Vermutung im Kopf und prüfe sie nachher an der Tabelle.</p>',
      '<p>Vermiss <strong>mindestens ' + MINDEST_KREISE + ' Kreise</strong> — je mehr (und je größer), desto deutlicher wird das Muster.</p>',
      '<button class="knopf" id="exp-weiter1">Zur Durchführung</button>'
    ].join("");
    panel.querySelector("#exp-weiter1").addEventListener("click", () => wechslePhase("messen"));
  }

  function panelMessen() {
    const k = zustand.gewaehlt;
    const n = zustand.messungen.length;
    let oben = "";
    if (!k) {
      oben = [
        '<p>Wähle deinen nächsten Kreis — klicke ihn im Bild an (oder hier):</p>',
        '<div class="exp-masseknoepfe" aria-label="Kreis wählen">',
        KREISE.map(x => '<button class="knopf zweitrangig" data-kreis="' + x.id + '" ' + (fertig(x.id) ? "disabled" : "") + '>' + esc(x.kurz) + " (r = " + x.r + ")" + (fertig(x.id) ? " ✓" : "") + "</button>").join(""),
        '</div>'
      ].join("");
    } else {
      oben = [
        '<p><strong>' + esc(k.name) + ' (r = ' + k.r + ' cm):</strong> Schau auf das Raster. Die <strong>voll bedeckten</strong> Kästchen sind grau hinterlegt, die <strong>angeschnittenen</strong> am Rand sind schraffiert (zählen halb). Die <strong>Zählhilfe</strong> unten im Bild hat schon abgezählt — lies die Kästchenzahl ab.</p>',
        '<p>Weil 1 Kästchen = 1 cm², ist die Fläche A genau diese Zahl in cm². Trag sie ein:</p>',
        '<form id="exp-a" class="exp-ablesen">',
        '<label for="exp-wert-a">A =</label>',
        '<input id="exp-wert-a" inputmode="decimal" autocomplete="off" size="7"> cm²',
        '<button class="knopf">Notieren</button>',
        '</form>'
      ].join("");
    }
    panel.innerHTML = [
      '<h2>Durchführung</h2>',
      oben,
      k ? '<p><button class="knopf zweitrangig" id="exp-abbruch">Kreis zurücklegen</button></p>' : "",
      '<p id="exp-meldung" class="exp-meldung" aria-live="polite">' + esc(zustand.meldung) + '</p>',
      '<h3>Messtabelle</h3>',
      '<table class="exp-tabelle">',
      '<thead><tr><th>Kreis</th><th>r in cm</th><th>r² in cm²</th><th>A in cm²</th></tr></thead>',
      '<tbody>' + (zustand.messungen.map(z => '<tr><td>' + esc(z.name) + '</td><td>' + z.r + '</td><td>' + (z.r * z.r) + '</td><td><strong>' + komma(z.A, 1) + '</strong></td></tr>').join("") || '<tr><td colspan="4">noch leer</td></tr>') + '</tbody>',
      '</table>',
      '<p>' + n + ' von mindestens ' + MINDEST_KREISE + ' Kreisen vermessen.' + (n >= MINDEST_KREISE ? " Das reicht — mehr ist trotzdem besser!" : "") + '</p>',
      '<button class="knopf" id="exp-weiter2" ' + (n >= MINDEST_KREISE ? "" : "disabled") + '>Zur Auswertung</button>'
    ].join("");

    panel.querySelectorAll("[data-kreis]").forEach(b =>
      b.addEventListener("click", () => waehleKreis(KREISE.find(x => x.id === b.dataset.kreis))));
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
    panel.querySelector("#exp-abbruch")?.addEventListener("click", () => {
      zustand.gewaehlt = null; zustand.abgelesen = NaN; zustand.meldung = "";
      zeichne(); panelMessen();
    });
    panel.querySelector("#exp-a")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-wert-a").value);
      const kaestchen = zaehleKaestchen(k);
      if (!ablesungOk(eingabe, kaestchen, 0.6)) {
        melde("✗ Schau noch einmal auf die Zählhilfe im Bild: Welche Kästchenzahl steht dort? Diese Zahl ist die Fläche A in cm².");
        return;
      }
      const A = flaecheAus(eingabe);
      zustand.messungen.push({ id: k.id, name: k.name, r: k.r, kaestchen: eingabe, A });
      zustand.meldung = "✓ " + k.name + ": A ≈ " + komma(A, 1) + " cm² notiert. Schau gleich, wie A mit r² zusammenhängt!";
      zustand.gewaehlt = null; zustand.abgelesen = NaN;
      zeichne(); panelMessen();
    });
  }

  function panelAuswerten() {
    const zeilen = zustand.messungen;
    if (zeilen.length < MINDEST_KREISE) {
      panel.innerHTML = '<h2>Auswertung</h2><p>Noch zu wenige Messwerte! Geh zu „2 · Durchführung" und vermiss zuerst mindestens ' + MINDEST_KREISE + ' Kreise.</p>';
      return;
    }
    const quotienten = zeilen.map(z => z.A / (z.r * z.r));
    const qMittel = mittel(quotienten);
    const punkte = zeilen.map(z => ({ x: z.r * z.r, y: z.A }));
    const m = steigungUrsprung(punkte);
    const frei = regression(punkte);
    const gemessen = KREISE.filter(x => fertig(x.id)); // aufsteigend nach r
    const kleinstes = gemessen[0], groesstes = gemessen[gemessen.length - 1];
    const abwProzent = Math.abs(qMittel - Math.PI) / Math.PI * 100;

    const teil1 = [
      '<h3>1 · Ein Muster: A geteilt durch r²</h3>',
      '<p>Teile bei jedem Kreis die Fläche durch das Radiusquadrat — A ÷ r²:</p>',
      '<p>' + zeilen.map(z => '<strong>' + komma(z.A / (z.r * z.r), 2) + '</strong>').join(" · ") + '<br>',
      'Mittelwert: <strong>' + komma(qMittel, 2) + '</strong> — ob kleiner oder großer Kreis, es kommt fast immer dasselbe heraus!</p>',
      zustand.piErkannt ? (
        '<p class="exp-hinweis">✓ Diese Zahl heißt <strong>π</strong> (sprich „Pi") — die <strong>Kreiszahl</strong>, dieselbe wie bei Umfang ÷ Durchmesser! Sie beginnt mit 3,14159… Dein Mittelwert ' + komma(qMittel, 2) + ' liegt nur ' + komma(abwProzent, 1) + ' % daneben — beim Auszählen am Rand entsteht diese kleine Abweichung.</p>'
      ) : (
        '<form id="exp-pi" class="exp-ablesen">' +
        '<label for="exp-wert-pi">Um welche berühmte Zahl drängeln sich deine Quotienten A ÷ r²?</label>' +
        '<input id="exp-wert-pi" autocomplete="off" size="7">' +
        '<button class="knopf">Prüfen</button>' +
        '</form>'
      )
    ].join("");

    const teil2 = !zustand.piErkannt ? "" : [
      '<h3>2 · Alle Punkte auf einer Geraden</h3>',
      '<p>Jeder Kreis wird ein Punkt: <strong>r² nach rechts, A nach oben</strong>. Die gestrichelte Gerade ist die <strong>Regressionsgerade durch den Ursprung</strong> — die Gerade, die am besten zu allen Punkten passt. (Dass sie durch null muss, ist klar: ohne Radius keine Fläche.)</p>',
      '<canvas id="exp-diagramm" class="exp-diagramm" width="440" height="300" aria-label="Diagramm: Flaeche A ueber Radiusquadrat r-Quadrat. Alle Messpunkte liegen auf einer Ursprungsgeraden; ein gestricheltes Steigungsdreieck zeigt Delta r-Quadrat und Delta A."></canvas>',
      zustand.steigungOk ? (
        '<p>✓ Steigung m ≈ <strong>' + komma(m, 2) + '</strong> — schon wieder π! Lässt man die Gerade frei (nicht durch null gezwungen), liefert die Regression als Achsenabschnitt b ≈ ' + komma(frei.b, 1) + ' cm²: praktisch null. Die Gerade <em>will</em> durch den Ursprung.</p>' +
        '<p class="exp-hinweis"><strong>Kernsatz:</strong> Die Fläche wächst nicht mit r, sondern mit <strong>r²</strong> — und der Faktor davor ist immer π:</p>' +
        '<p class="exp-hinweis" style="text-align:center"><strong>A = π · r²</strong></p>' +
        '<p>Verdoppelst du also den Radius, wird r² <em>viermal</em> so groß — und damit auch die Fläche. Stimmt das mit deiner Vorhersage überein?</p>'
      ) : (
        '<p>Bestimme die Steigung der Geraden: <strong>Steigung = ΔA ÷ Δ(r²)</strong>. Nimm das gestrichelte Steigungsdreieck im Diagramm zu Hilfe.</p>' +
        '<details class="exp-hilfe"><summary>Hilfe: Schritt für Schritt</summary>' +
        '<p><strong>Teilschritt 1 – Dreieck ablesen:</strong> Im Diagramm ist ein gestricheltes <strong>Steigungsdreieck</strong> eingezeichnet. Die waagerechte Seite ist Δ(r²) (eine Strecke nach rechts, in cm²), die senkrechte Seite ist ΔA (das Stück nach oben, in cm²). Beide Werte stehen am Dreieck.</p>' +
        '<p><strong>Teilschritt 2 – teilen:</strong> Rechne Steigung = ΔA ÷ Δ(r²). Beispiel mit erfundenen Zahlen: Wäre Δ(r²) = 20 cm² und ΔA = 63 cm², ergäbe das 63 ÷ 20 = 3,15. Setz deine echten Dreieckswerte ein; die Steigung ist die Zahl, die du schon aus Spalte „A ÷ r²“ kennst.</p>' +
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
      '<h3>3 · Wo zählt man am genauesten aus?</h3>',
      '<p>Beim Auszählen entsteht die ganze Unsicherheit <strong>am Rand</strong> — dort, wo Kästchen nur teilweise drinliegen. Bei welchem deiner Kreise fällt dieser Randfehler im Verhältnis zur Fläche am wenigsten ins Gewicht?</p>',
      '<label for="exp-genau">Am genauesten ist:</label>',
      '<select id="exp-genau" class="exp-wahl">',
      '<option value="">— wähle einen Kreis —</option>',
      gemessen.map(x => '<option value="' + x.id + '">' + esc(x.name) + " (r = " + x.r + ")</option>").join(""),
      '</select>',
      zustand.genauOk ? (
        '<p class="exp-hinweis">✓ Richtig: <strong>' + esc(groesstes.name) + '</strong> (r = ' + groesstes.r + ' cm)! Der Rand wächst nur mit dem <em>Umfang</em> (∝ r), die Fläche aber mit <strong>r²</strong>. Beim kleinsten Kreis (' + esc(kleinstes.kurz) + ') macht der angeschnittene Rand rund ±' + komma(relRandAnteil(kleinstes) * 100, 0) + ' % der Fläche aus, beim größten (' + esc(groesstes.kurz) + ') nur ±' + komma(relRandAnteil(groesstes) * 100, 0) + ' %. Je größer der Kreis, desto kleiner der relative Randanteil — desto genauer das Auszählen.</p>'
      ) : ""
    ].join("");

    const abschluss = !zustand.genauOk ? "" : '<p><strong>Experiment komplett!</strong> Du hast die Kreisflächenformel nicht nachgeschlagen, sondern selbst ausgezählt: A ÷ r² ≈ ' + komma(qMittel, 2) + ' ≈ π. Speichere deine Messwerte als CSV — und prüf das Ganze zu Hause mit Karopapier und Zirkel nach.</p>';

    panel.innerHTML = [
      '<h2>Auswertung</h2>',
      teil1, teil2, teil3, abschluss,
      '<p id="exp-meldung" class="exp-meldung" aria-live="polite"></p>',
      '<details class="exp-fehler"><summary>Fehlerbetrachtung — warum nie haargenau π?</summary>',
      '<p><strong>Randkästchen:</strong> Mal liegt etwas mehr, mal weniger als die Hälfte eines angeschnittenen Kästchens im Kreis. „Halb zählen" ist ein Kompromiss — bei vielen Kästchen mittelt sich der Fehler heraus, ganz weg ist er nie.</p>',
      '<p><strong>Rastergröße:</strong> Mit feinerem Raster (z. B. mm-Papier statt cm-Kästchen) wird das Auszählen genauer, weil weniger Fläche „im Rand" steckt. Im Grenzfall unendlich feiner Kästchen kommt exakt π heraus.</p>',
      '<p><strong>Großer Kreis schlägt kleinen:</strong> Beim Auszählen lohnt sich ein großer Radius — der relative Randanteil sinkt mit 2/r.</p>',
      '<p><strong>Verwandte Messung:</strong> Dieselbe Zahl π hast du beim Experiment „Kreiszahl vermessen" als Umfang ÷ Durchmesser gefunden. In jedem Kreis steckt dieselbe Konstante — beim Umfang (u = π·d) wie bei der Fläche (A = π·r²).</p>',
      '</details>',
      '<div class="exp-knopfzeile">',
      '<button class="knopf zweitrangig" id="exp-zurueck">Mehr messen</button>',
      '<button class="knopf zweitrangig" id="exp-csv">Messwerte als CSV speichern</button>',
      '<button class="knopf" id="exp-neustart">Neues Experiment</button>',
      '</div>'
    ].join("");

    panel.querySelector("#exp-pi")?.addEventListener("submit", ev => {
      ev.preventDefault();
      if (piAntwortOk(panel.querySelector("#exp-wert-pi").value)) {
        zustand.piErkannt = true; panelAuswerten();
      } else {
        melde("✗ Noch nicht. Tipp: Schau auf den Mittelwert deiner Quotienten — die Zahl hat einen griechischen Namen und steckt in jedem Kreis. (Zahl oder Name eingeben.)");
      }
    });
    panel.querySelector("#exp-m")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const e = parseDezimal(panel.querySelector("#exp-wert-m").value);
      if (ablesungOk(e, m, TOL_ZAHL)) {
        zustand.steigungOk = true; panelAuswerten();
      } else {
        melde("✗ Steigung = ΔA ÷ Δ(r²). Lies beide Werte am gestrichelten Dreieck ab und teile — Komma oder Punkt.");
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
          melde("✗ Überleg: Der Rand wächst mit r, die Fläche mit r². Wo ist der angeschnittene Rand im Verhältnis zur ganzen Fläche am kleinsten?");
        }
      });
    }
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      csvHerunterladen("kreisflaeche-messwerte.csv",
        ["Kreis", "r in cm", "r-Quadrat in cm-Quadrat", "A in cm-Quadrat", "A geteilt durch r-Quadrat"],
        zeilen.map(z => [z.name, z.r, z.r * z.r, z.A, z.A / (z.r * z.r)]));
    });
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      zustand.gewaehlt = null; zustand.abgelesen = NaN;
      zustand.messungen = []; zustand.meldung = "";
      zustand.piErkannt = false; zustand.steigungOk = false;
      zustand.steigungGezeigt = false; zustand.genauOk = false;
      zeichne(); wechslePhase("aufbau");
    });
    if (zustand.piErkannt) zeichneDiagramm(m);
  }

  // A-r²-Diagramm: Messpunkte, Ursprungsgerade, Steigungsdreieck
  function zeichneDiagramm(m) {
    const dia = panel.querySelector("#exp-diagramm");
    if (!dia || !zustand.messungen.length) return;
    const c = dia.getContext("2d");
    const cText = farbe("--text"), cLeise = farbe("--text-leise", "#767676"), cAkzent = farbe("--akzent", "#1762a8");
    const W = dia.width, H = dia.height, L = 54, U = H - 42;
    const punkte = zustand.messungen.map(z => ({ x: z.r * z.r, y: z.A }));
    const xMax = Math.max(...punkte.map(p => p.x)) * 1.12;
    const yMax = Math.max(...punkte.map(p => p.y)) * 1.12;
    const X = v => L + v / xMax * (W - L - 16);
    const Y = v => U - v / yMax * (U - 18);
    c.clearRect(0, 0, W, H);
    c.font = "12px system-ui, sans-serif";
    c.strokeStyle = cText; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(L, 10); c.lineTo(L, U); c.lineTo(W - 8, U); c.stroke();
    c.fillStyle = cText;
    c.fillText("A in cm²", 8, 20); c.fillText("r² in cm²", W - 66, U + 30);
    c.fillText("0", L - 14, U + 14);
    if (Number.isFinite(m)) {
      const xEnd = Math.min(xMax, yMax / m);
      c.strokeStyle = cLeise; c.setLineDash([6, 5]);
      c.beginPath(); c.moveTo(X(0), Y(0)); c.lineTo(X(xEnd), Y(m * xEnd)); c.stroke();
      // Steigungsdreieck an „runder“ Stelle
      const xn = Math.max(...punkte.map(p => p.x)) >= 25 ? 25 : 16;
      c.beginPath(); c.moveTo(X(0), Y(0)); c.lineTo(X(xn), Y(0)); c.lineTo(X(xn), Y(m * xn)); c.stroke();
      c.setLineDash([]);
      c.fillStyle = cLeise; c.textAlign = "center";
      c.fillText("Δ(r²) = " + xn + " cm²", X(xn / 2), U - 6);
      const links = X(xn) + 110 > W - 6;
      c.textAlign = links ? "end" : "start";
      c.fillText("ΔA = " + komma(m * xn, 0) + " cm²", links ? X(xn) - 8 : X(xn) + 8, (Y(m * xn) + U) / 2);
      c.textAlign = "start";
    }
    for (const z of zustand.messungen) {
      c.fillStyle = cAkzent; c.beginPath(); c.arc(X(z.r * z.r), Y(z.A), 5, 0, 7); c.fill();
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
