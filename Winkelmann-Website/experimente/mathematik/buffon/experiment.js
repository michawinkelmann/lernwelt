// experiment.js — Interaktives Experiment: Buffonsche Nadel (Klasse 9/10).
// Zufall trifft Geometrie: Nadeln der Länge l fallen auf liniertes Papier mit
// Linienabstand a (l < a, „kurze Nadel" — jede Nadel kreuzt höchstens eine
// Linie). Gezählt werden Würfe N und Treffer T; allein daraus entsteht die
// Schätzung π̂ = 2·l·N/(a·T) der Kreiszahl.
//
// MODELL (Modulebene DOM-frei, in Node testbar):
//   Ein Wurf ist durch zwei Zahlen vollständig beschrieben:
//     y ∈ [0, a/2]  — Abstand des Nadel-MITTELPUNKTS zur nächsten Linie
//     φ ∈ [0, π/2)  — Winkel zwischen Nadel und Linienrichtung
//   Treffer ⇔ y ≤ (l/2)·sin φ.
//   Theorie (wird erst in der Auswertung aufgedeckt):
//     P(Treffer) = 2l/(π·a) = 0,477465 für l = 3 cm, a = 4 cm.
//   Wurf Nr. i ist deterministisch: mulberry32(seedAus("wurf:" + i)) liefert
//   erst y, dann φ — dadurch reproduzierbar und in Node prüfbar.

import {
  mulberry32, seedAus, parseDezimal, komma, esc,
  farbe, reduzierteBewegung, bauePhasen, csvHerunterladen
} from "../../../assets/js/experiment/helfer.js";

// ---------- Versuchsgeometrie ----------
export const A = 4;                            // cm — Linienabstand
export const L = 3;                            // cm — Nadellänge (l < a!)
export const MEILENSTEINE = [100, 1000, 5000]; // Protokollpunkte
export const PI_TOLERANZ = 0.02;               // erlaubte Abweichung beim selbst gerechneten π̂
export const N_MAX = 20000;                    // mehr Würfe braucht hier niemand

// ---------- Modell (reine Funktionen) ----------
export function pTheorie() { return (2 * L) / (Math.PI * A); }

// Treffer genau dann, wenn der Mittelpunktsabstand y die „Reichweite" (l/2)·sin φ nicht übersteigt
export function trefferTest(y, phi) { return y <= (L / 2) * Math.sin(phi); }

// Wurf Nr. i (deterministisch): erst y ∈ [0, a/2], dann φ ∈ [0, π/2)
export function wurfMitSeed(praefix, i) {
  const r = mulberry32(seedAus(praefix + ":" + i));
  const y = r() * (A / 2);
  const phi = r() * (Math.PI / 2);
  return { y, phi, treffer: trefferTest(y, phi) };
}
export function wurf(i) { return wurfMitSeed("wurf", i); }

// Schätzer: π̂ = 2·l·N/(a·T) — die Umkehrung von P = 2l/(π·a) mit P ≈ T/N
export function piSchaetzer(n, t) {
  return t > 0 && n > 0 ? (2 * L * n) / (A * t) : NaN;
}

// Protokoll-Eingabe: das selbst gerechnete π̂ muss auf ±0,02 stimmen
export function protokollOk(eingabe, n, t) {
  const soll = piSchaetzer(n, t);
  return Number.isFinite(eingabe) && Number.isFinite(soll) &&
    Math.abs(eingabe - soll) <= PI_TOLERANZ + 1e-12;
}

// n Würfe am Stück (für TESTS und Konvergenzbetrachtungen)
export function simuliere(n, praefix = "wurf") {
  let t = 0;
  for (let i = 1; i <= n; i++) if (wurfMitSeed(praefix, i).treffer) t++;
  return { n, t, quote: t / n, piDach: piSchaetzer(n, t) };
}

// ---------- Prüffälle (analytisch bekannte Lösungen) ----------
export const pruefFaelle = [
  { soll: { p: 0.477465 }, toleranz: 1e-6 },                   // P = 2l/(πa) = 1,5/π
  { n: 200000, soll: { quoteNah: 0.004, piNah: 0.03 } },       // geseedeter Großlauf
  { n: 4000, t: 4000 * (2 * L) / (Math.PI * A), soll: { pi: Math.PI }, toleranz: 1e-12 } // Schätzer invertiert P exakt
];

export const TESTS = [
  { name: "P(Treffer) = 2l/(πa) = 0,477465",
    ok: () => Math.abs(pTheorie() - 0.477465) < 1e-6 },
  { name: "trefferTest-Randfälle: y = 0 trifft (φ > 0), y = a/2 trifft nie (l < a), Grenze zählt",
    ok: () => trefferTest(0, 0.2) && trefferTest(0, Math.PI / 2 - 1e-9) &&
      !trefferTest(A / 2, Math.PI / 2) && !trefferTest(A / 2, 1.2) &&
      trefferTest((L / 2) * Math.sin(0.7), 0.7) &&
      !trefferTest((L / 2) * Math.sin(0.7) + 1e-9, 0.7) },
  { name: "Determinismus: Wurf i reproduzierbar, verschiedene i verschieden",
    ok: () => {
      const w1 = wurf(42), w2 = wurf(42);
      return w1.y === w2.y && w1.phi === w2.phi && w1.treffer === w2.treffer &&
        (wurf(1).y !== wurf(2).y || wurf(1).phi !== wurf(2).phi);
    } },
  { name: "Wertebereiche: y ∈ [0, a/2], φ ∈ [0, π/2) für die ersten 1000 Würfe",
    ok: () => {
      for (let i = 1; i <= 1000; i++) {
        const w = wurf(i);
        if (!(w.y >= 0 && w.y <= A / 2 && w.phi >= 0 && w.phi < Math.PI / 2)) return false;
      }
      return true;
    } },
  { name: "Schätzerformel invertiert P exakt (T = N·P → π̂ = π); NaN bei T = 0",
    ok: () => Math.abs(piSchaetzer(4000, 4000 * pTheorie()) - Math.PI) < 1e-12 &&
      Number.isNaN(piSchaetzer(10, 0)) },
  { name: "Großlauf N = 200 000 (seeded): |Quote − P| < 0,004 und |π̂ − π| < 0,03",
    ok: () => {
      const s = simuliere(200000);
      return Math.abs(s.quote - pTheorie()) < 0.004 && Math.abs(s.piDach - Math.PI) < 0.03;
    } },
  { name: "Konvergenz: Fehler bei N = 100·k im Mittel kleiner als bei N = k (k = 200, 5 Seeds)",
    ok: () => {
      const seeds = ["s1", "s2", "s3", "s4", "s5"];
      const fehler = n => seeds.reduce((summe, s) =>
        summe + Math.abs(simuliere(n, s).piDach - Math.PI), 0) / seeds.length;
      return fehler(100 * 200) < fehler(200);
    } },
  { name: "Protokoll-Prüfung: ±0,02 um 2lN/(aT), Komma-Eingaben",
    ok: () => protokollOk(3.13, 100, 48) && !protokollOk(3.15, 100, 48) &&
      protokollOk(piSchaetzer(1000, 477), 1000, 477) &&
      !protokollOk(NaN, 100, 48) && protokollOk(parseDezimal("3,13"), 100, 48) },
  { name: "Meilenstein-Stände deterministisch, T monoton wachsend, Quote plausibel",
    ok: () => {
      const a1 = simuliere(100), a2 = simuliere(100), b = simuliere(1000), c = simuliere(5000);
      return a1.t === a2.t && a1.t <= b.t && b.t <= c.t &&
        a1.quote > 0.3 && a1.quote < 0.7;
    } },
  { name: "Prüffälle konsistent",
    ok: () => pruefFaelle.every(p => {
      if (p.soll.p !== undefined) return Math.abs(pTheorie() - p.soll.p) <= p.toleranz;
      if (p.soll.quoteNah !== undefined) {
        const s = simuliere(p.n);
        return Math.abs(s.quote - pTheorie()) < p.soll.quoteNah &&
          Math.abs(s.piDach - Math.PI) < p.soll.piNah;
      }
      return Math.abs(piSchaetzer(p.n, p.t) - p.soll.pi) <= p.toleranz;
    }) }
];

// ======================================================================
// Browser-Teil
// ======================================================================

// Zeichengeometrie des „Papiers"
const PX = 14;                    // Pixel pro cm
const LINIEN = 8;                 // gezeichnete Linien
const RAND_Y = (A / 2) * PX;      // halber Linienabstand als Rand oben/unten
const NADEL_CAP = 6000;           // gezeichnet werden höchstens so viele Nadeln (gezählt alle)

// Anzeige-Lage eines Wurfs: dekorative Größen (Linie, Seite, x-Position,
// Neigungsrichtung) aus eigenem Seed — y und φ kommen unverändert aus wurf(i).
function nadelLage(i) {
  const w = wurf(i);
  const r = mulberry32(seedAus("lage:" + i));
  let linie = Math.min(LINIEN - 1, Math.floor(r() * LINIEN));
  let seite = r() < 0.5 ? -1 : 1;
  if (linie === 0) seite = 1;
  if (linie === LINIEN - 1) seite = -1;
  return { ...w, i, linie, seite, fx: 0.06 + r() * 0.88, richtung: r() < 0.5 ? -1 : 1 };
}

export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;
  const reduziert = reduzierteBewegung();

  const zustand = {
    n: 0, t: 0,
    nadeln: [],            // gespeicherte Nadel-Lagen (bis NADEL_CAP, fürs Neuzeichnen)
    verlauf: [],           // {n, pi} für den Konvergenz-Plot
    schnappschuesse: {},   // Meilenstein → {n, t} (exakt beim Erreichen festgehalten)
    protokoll: {},         // Meilenstein → akzeptiertes, selbst gerechnetes π̂
    vorhersage: "",
    frage1: "", frage2: "",
    formelOffen: false,
    meldung: "",
    laeuft: false,
    phase: "aufbau"
  };

  wurzel.innerHTML = "";
  const wechsle = bauePhasen(wurzel, [
    { id: "aufbau", label: "Aufbau" },
    { id: "werfen", label: "Durchführung" },
    { id: "auswerten", label: "Auswertung" }
  ], zeigePhase);
  const flaeche = document.createElement("div");
  flaeche.className = "exp-flaeche";
  flaeche.innerHTML = `
    <div class="exp-links">
      <canvas id="exp-canvas" width="420" height="${2 * RAND_Y + (LINIEN - 1) * A * PX}" aria-label="Liniertes Papier mit Linienabstand 4 cm. Geworfene Nadeln erscheinen darauf; Treffer sind farbig hervorgehoben und zusätzlich mit einem Punkt auf der gekreuzten Linie markiert, Nadeln ohne Treffer bleiben blass."></canvas>
    </div>
    <div class="exp-rechts" id="exp-panel"></div>`;
  wurzel.appendChild(flaeche);
  const canvas = flaeche.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = flaeche.querySelector("#exp-panel");

  // ---------- Zeichnung: Papier und Nadeln ----------
  function linieY(k) { return RAND_Y + k * A * PX; }

  function pfeilspitze(x, y, nachUnten) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 4, y + 7 * nachUnten);
    ctx.lineTo(x + 4, y + 7 * nachUnten);
    ctx.closePath(); ctx.fill();
  }

  function zeichnePapier() {
    const cText = farbe("--text"), cLeise = farbe("--text-leise");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = cLeise; ctx.lineWidth = 1.5;
    for (let k = 0; k < LINIEN; k++) {
      const y = linieY(k);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
    // Abstands-Beschriftung a = 4 cm zwischen den obersten beiden Linien
    const x0 = 16, y1 = linieY(0), y2 = linieY(1);
    ctx.strokeStyle = cText; ctx.fillStyle = cText; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x0, y1 + 3); ctx.lineTo(x0, y2 - 3); ctx.stroke();
    pfeilspitze(x0, y1 + 2, 1);
    pfeilspitze(x0, y2 - 2, -1);
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText("a = 4 cm", x0 + 7, (y1 + y2) / 2 + 4);
  }

  function zeichneNadel(lage) {
    const cOk = farbe("--ok", "#2c7029"), cLeise = farbe("--text-leise"), cBg = farbe("--flaeche", "#fff");
    const basisY = linieY(lage.linie);
    const mx = lage.fx * canvas.width;
    const my = basisY + lage.seite * lage.y * PX;
    const hx = (L / 2) * Math.cos(lage.phi) * PX * lage.richtung;
    const hy = (L / 2) * Math.sin(lage.phi) * PX;
    ctx.strokeStyle = lage.treffer ? cOk : cLeise;
    ctx.lineWidth = lage.treffer ? 2.2 : 1.6;
    ctx.globalAlpha = lage.treffer ? 0.95 : 0.55;
    ctx.beginPath(); ctx.moveTo(mx - hx, my - hy); ctx.lineTo(mx + hx, my + hy); ctx.stroke();
    ctx.globalAlpha = 1;
    if (lage.treffer) {
      // Kreuzungspunkt: zusätzlich zur Farbe ein ✓-Punkt auf der Linie (nie nur Farbe)
      const s = hy > 1e-9 ? (basisY - my) / hy : 0;
      const dx = mx + s * hx;
      ctx.fillStyle = cOk;
      ctx.beginPath(); ctx.arc(dx, basisY, 4.5, 0, 7); ctx.fill();
      ctx.strokeStyle = cBg; ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(dx - 2.2, basisY + 0.2);
      ctx.lineTo(dx - 0.6, basisY + 1.9);
      ctx.lineTo(dx + 2.4, basisY - 1.9);
      ctx.stroke();
    }
  }

  // Beispielnadel mit Längen-Beschriftung (nur in der Aufbau-Phase)
  function zeichneMusterNadel() {
    const cText = farbe("--text");
    const y = (linieY(1) + linieY(2)) / 2;
    const x1 = canvas.width / 2 - (L / 2) * PX, x2 = canvas.width / 2 + (L / 2) * PX;
    ctx.strokeStyle = cText; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
    ctx.fillStyle = cText; ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Nadel: l = 3 cm", (x1 + x2) / 2, y - 8);
    ctx.textAlign = "start";
  }

  function zeichneAlles(mitMuster) {
    zeichnePapier();
    for (const lage of zustand.nadeln) zeichneNadel(lage);
    if (mitMuster) zeichneMusterNadel();
  }

  // ---------- Konvergenz-Plot (π̂ über N, logarithmische N-Achse) ----------
  function zeichnePlot() {
    const dia = panel.querySelector("#exp-plot");
    if (!dia) return;
    const c = dia.getContext("2d");
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
          cAkzent = farbe("--akzent"), cOk = farbe("--ok", "#2c7029");
    const W = dia.width, H = dia.height, Lx = 40, R = 10, O = 12, U = H - 30;
    const yMin = 2, yMax = 4.5;
    const X = n => Lx + Math.log10(Math.max(n, 1)) / Math.log10(N_MAX) * (W - Lx - R);
    const Y = p => U - (Math.min(Math.max(p, yMin), yMax) - yMin) / (yMax - yMin) * (U - O);
    c.clearRect(0, 0, W, H);
    c.font = "12px system-ui, sans-serif";
    c.strokeStyle = cText; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(Lx, O); c.lineTo(Lx, U); c.lineTo(W - R, U); c.stroke();
    // N-Stufen 1, 10, 100, 1000, 10000
    c.textAlign = "center";
    for (const stufe of [1, 10, 100, 1000, 10000]) {
      const x = X(stufe);
      c.strokeStyle = cLeise; c.lineWidth = 1;
      c.beginPath(); c.moveTo(x, U); c.lineTo(x, U + 5); c.stroke();
      c.fillStyle = cLeise;
      c.fillText(stufe === 10000 ? "10 000" : String(stufe), x, U + 18);
    }
    c.textAlign = "right";
    for (let p = 2; p <= 4.51; p += 0.5) {
      const y = Y(p);
      c.strokeStyle = cLeise; c.lineWidth = 1;
      c.beginPath(); c.moveTo(Lx - 4, y); c.lineTo(Lx, y); c.stroke();
      c.fillStyle = cLeise; c.fillText(komma(p, 1), Lx - 7, y + 4);
    }
    c.textAlign = "start";
    // gestrichelte π-Linie
    const yPi = Y(Math.PI);
    c.strokeStyle = cOk; c.lineWidth = 1.5; c.setLineDash([7, 5]);
    c.beginPath(); c.moveTo(Lx, yPi); c.lineTo(W - R, yPi); c.stroke();
    c.setLineDash([]);
    c.fillStyle = cOk; c.fillText("π", W - R - 14, yPi - 6);
    // Verlauf der Schätzung
    if (zustand.verlauf.length) {
      c.strokeStyle = cAkzent; c.lineWidth = 2;
      c.beginPath();
      zustand.verlauf.forEach((p, idx) => {
        if (idx === 0) c.moveTo(X(p.n), Y(p.pi)); else c.lineTo(X(p.n), Y(p.pi));
      });
      c.stroke();
      const letzt = zustand.verlauf[zustand.verlauf.length - 1];
      c.fillStyle = cAkzent;
      c.beginPath(); c.arc(X(letzt.n), Y(letzt.pi), 3.5, 0, 7); c.fill();
    }
  }

  // ---------- Werfen ----------
  function traceSchritt(n) {
    return n <= 100 || (n <= 1000 && n % 5 === 0) || (n <= 10000 && n % 50 === 0) || n % 250 === 0;
  }

  function setzeMeldung(text) {
    zustand.meldung = text;
    const el = panel.querySelector("#exp-meldung");
    if (el) el.textContent = text;
  }

  function aktualisiereZaehler() {
    const eN = panel.querySelector("#exp-n"), eT = panel.querySelector("#exp-t"),
          ePi = panel.querySelector("#exp-pi");
    if (!eN) return;
    eN.textContent = String(zustand.n);
    eT.textContent = String(zustand.t);
    const pi = piSchaetzer(zustand.n, zustand.t);
    ePi.textContent = Number.isFinite(pi) ? komma(pi, 4) : "—";
  }

  function werfe(anzahl) {
    if (zustand.laeuft) return;
    const frei = N_MAX - zustand.n;
    if (frei <= 0) {
      setzeMeldung("Bei N = 20 000 ist hier Schluss — fürs Protokoll reichen 5000 längst.");
      return;
    }
    anzahl = Math.min(anzahl, frei);
    zustand.laeuft = true;
    panel.querySelectorAll("[data-wuerfe], #exp-reset").forEach(k => { k.disabled = true; });
    const proSchritt = reduziert ? anzahl : Math.max(1, Math.ceil(anzahl / 24));
    let rest = anzahl;
    function schritt() {
      const k = Math.min(proSchritt, rest);
      for (let j = 0; j < k; j++) {
        zustand.n += 1;
        const lage = nadelLage(zustand.n);
        if (lage.treffer) zustand.t += 1;
        if (zustand.nadeln.length < NADEL_CAP) {
          zustand.nadeln.push(lage);
          zeichneNadel(lage);
        }
        if (MEILENSTEINE.includes(zustand.n)) {
          zustand.schnappschuesse[zustand.n] = { n: zustand.n, t: zustand.t };
        }
        if (zustand.t > 0 && traceSchritt(zustand.n)) {
          zustand.verlauf.push({ n: zustand.n, pi: piSchaetzer(zustand.n, zustand.t) });
        }
      }
      rest -= k;
      aktualisiereZaehler();
      zeichnePlot();
      if (rest > 0) { requestAnimationFrame(schritt); return; }
      zustand.laeuft = false;
      if (zustand.phase === "werfen") {
        panelWerfen();
        const offen = naechsterOffenerMeilenstein();
        setzeMeldung(offen
          ? `✓ ${anzahl} Würfe geworfen. Meilenstein N = ${offen.n} erreicht — übertrag ihn unten ins Protokoll.`
          : `✓ ${anzahl} Würfe geworfen.`);
      }
    }
    schritt();
  }

  function naechsterOffenerMeilenstein() {
    for (const m of MEILENSTEINE) {
      if (zustand.schnappschuesse[m] && zustand.protokoll[m] === undefined) {
        return { n: m, t: zustand.schnappschuesse[m].t };
      }
    }
    return null;
  }

  // ---------- Panels je Phase ----------
  function panelAufbau() {
    panel.innerHTML = `
      <h2>Aufbau und Plan</h2>
      <p>Vor dir liegt liniertes „Papier": parallele Linien im Abstand <strong>a = 4 cm</strong>. Geworfen werden Nadeln der Länge <strong>l = 3 cm</strong>. Weil l &lt; a ist („kurze Nadel"), kann jede Nadel höchstens <em>eine</em> Linie kreuzen.</p>
      <p><strong>Treffer</strong> heißt: Die Nadel kreuzt oder berührt eine Linie. Im Bild sind Treffer farbig <em>und</em> mit einem Punkt auf der gekreuzten Linie markiert — Nadeln ohne Treffer bleiben blass.</p>
      <p><strong>Plan:</strong> Wirf viele Nadeln (das Werfen übernimmt der Zufall), zähl Würfe N und Treffer T mit und übertrage bei N = 100, 1000 und 5000 je eine Zeile ins Protokoll. Dabei rechnest du jedes Mal <strong>π̂ = 2·l·N / (a·T)</strong> selbst aus. Warum ausgerechnet diese Formel die Kreiszahl liefert, deckt die Auswertung auf.</p>
      <p class="exp-hinweis">Georges-Louis Leclerc, Graf von Buffon, hat dieses Nadelproblem 1777 veröffentlicht — lange bevor es Computer gab. Es gilt als das älteste Zufallsexperiment, mit dem man π bestimmen kann.</p>
      <label for="exp-vorhersage"><strong>Deine Vorhersage:</strong> Wie viele von 100 Nadeln treffen wohl eine Linie?</label>
      <select id="exp-vorhersage" class="exp-wahl">
        <option value="">bitte wählen …</option>
        <option value="10">etwa 10 von 100</option>
        <option value="25">etwa 25 von 100</option>
        <option value="50">etwa 50 von 100</option>
        <option value="75">etwa 75 von 100</option>
        <option value="90">etwa 90 von 100</option>
      </select>
      <p id="exp-vorhersage-echo" class="exp-meldung" aria-live="polite">${zustand.vorhersage ? "Gespeichert — die Auflösung kommt in der Auswertung." : ""}</p>
      <button class="knopf" id="exp-weiter1">Zur Durchführung</button>`;
    panel.querySelector("#exp-vorhersage").value = zustand.vorhersage;
    panel.querySelector("#exp-vorhersage").addEventListener("change", ev => {
      zustand.vorhersage = ev.target.value;
      panel.querySelector("#exp-vorhersage-echo").textContent =
        zustand.vorhersage ? "Gespeichert — die Auflösung kommt in der Auswertung." : "";
    });
    panel.querySelector("#exp-weiter1").addEventListener("click", () => wechsle("werfen"));
  }

  function panelWerfen() {
    const offen = naechsterOffenerMeilenstein();
    const fertig = Object.keys(zustand.protokoll).length;
    panel.innerHTML = `
      <h2>Durchführung</h2>
      <div class="exp-knopfzeile" aria-label="Nadeln werfen">
        <button class="knopf" data-wuerfe="10">10 Würfe</button>
        <button class="knopf" data-wuerfe="100">100 Würfe</button>
        <button class="knopf" data-wuerfe="1000">1000 Würfe</button>
        <button class="knopf zweitrangig" id="exp-reset">Von vorn</button>
      </div>
      <p>Würfe N = <strong id="exp-n">0</strong> · Treffer T = <strong id="exp-t">0</strong> · Schätzung π̂ = 2·l·N/(a·T) = <strong id="exp-pi">—</strong></p>
      <p id="exp-meldung" class="exp-meldung" aria-live="polite"></p>
      <canvas id="exp-plot" class="exp-diagramm" width="430" height="240" aria-label="Konvergenz-Diagramm: Schätzwert über der Wurfzahl N mit logarithmischer N-Achse in Stufen und gestrichelter Linie bei π."></canvas>
      <p>Links das Papier: farbig + Punkt = Treffer, blass = kein Treffer (gezeichnet werden die ersten ${NADEL_CAP} Nadeln, gezählt alle). Oben der Plot: deine Schätzung π̂ über N — die gestrichelte Linie ist π.</p>
      <h3>Protokoll</h3>
      <table class="exp-tabelle"><thead><tr><th>N</th><th>T</th><th>π̂ (selbst gerechnet)</th></tr></thead>
      <tbody>${MEILENSTEINE.map(m => {
        const s = zustand.schnappschuesse[m], p = zustand.protokoll[m];
        return `<tr><td>${m}</td><td>${s ? s.t : "—"}</td><td>${p !== undefined ? "✓ " + komma(p, 4) : (s ? "→ unten eintragen" : "—")}</td></tr>`;
      }).join("")}</tbody></table>
      ${offen ? `
      <form id="exp-protokoll" class="exp-ablesen">
        <label for="exp-pi-eingabe">Meilenstein N = ${offen.n} mit T = ${offen.t}: Rechne π̂ = 2·l·N/(a·T) selbst aus (2 bis 4 Nachkommastellen) und trag es ein:</label>
        <input id="exp-pi-eingabe" inputmode="decimal" autocomplete="off" size="8">
        <button class="knopf">Eintragen</button>
      </form>` : ""}
      <p>${fertig} von ${MEILENSTEINE.length} Protokollzeilen.</p>
      <button class="knopf" id="exp-weiter2" ${fertig >= MEILENSTEINE.length ? "" : "disabled"}>Zur Auswertung</button>`;
    panel.querySelectorAll("[data-wuerfe]").forEach(k =>
      k.addEventListener("click", () => werfe(Number(k.dataset.wuerfe))));
    panel.querySelector("#exp-reset").addEventListener("click", () => {
      zustand.n = 0; zustand.t = 0; zustand.nadeln = []; zustand.verlauf = [];
      zustand.schnappschuesse = {}; zustand.protokoll = {};
      zustand.meldung = "Alles zurückgesetzt — das Papier ist wieder leer.";
      zeichneAlles(false);
      panelWerfen();
    });
    panel.querySelector("#exp-protokoll")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const ziel = naechsterOffenerMeilenstein();
      if (!ziel) return;
      const eingabe = parseDezimal(panel.querySelector("#exp-pi-eingabe").value);
      if (protokollOk(eingabe, ziel.n, ziel.t)) {
        zustand.protokoll[ziel.n] = eingabe;
        zustand.meldung = "✓ Eingetragen — dein π̂ passt.";
        panelWerfen();
      } else {
        setzeMeldung(`✗ Das passt noch nicht: Rechne 2 · 3 · ${ziel.n} geteilt durch (4 · ${ziel.t}) und runde auf 2 bis 4 Nachkommastellen. Komma oder Punkt — beides geht.`);
      }
    });
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechsle("auswerten"));
    const meldungEl = panel.querySelector("#exp-meldung");
    meldungEl.textContent = zustand.meldung;
    aktualisiereZaehler();
    zeichnePlot();
  }

  // Begründungsskizze: Rechteck aller (φ, y)-Würfe mit „günstige Fälle"-Fläche
  function formelSkizze() {
    const W = 380, H = 220, ml = 66, mr = 16, mt = 18, mb = 34;
    const X = phi => ml + phi / (Math.PI / 2) * (W - ml - mr);
    const Y = y => H - mb - (y / 2) * (H - mt - mb);
    let kurve = "";
    for (let g = 0; g <= 90; g += 3) {
      const phi = g * Math.PI / 180;
      kurve += `${kurve ? " L" : "M"}${X(phi).toFixed(1)},${Y(1.5 * Math.sin(phi)).toFixed(1)}`;
    }
    const flaecheTreffer = `${kurve} L${X(Math.PI / 2).toFixed(1)},${Y(0).toFixed(1)} L${X(0).toFixed(1)},${Y(0).toFixed(1)} Z`;
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Skizze: Rechteck aller möglichen Würfe mit Winkel φ von 0 bis 90 Grad und Abstand y von 0 bis 2 Zentimeter. Die Fläche unter der Sinuskurve y gleich 1,5 mal Sinus φ ist der Treffer-Bereich." style="max-width:430px;width:100%;height:auto;">
      <rect x="${X(0)}" y="${Y(2)}" width="${(X(Math.PI / 2) - X(0)).toFixed(1)}" height="${(Y(0) - Y(2)).toFixed(1)}" fill="none" stroke="var(--text-leise)" stroke-width="1.5"/>
      <path d="${flaecheTreffer}" fill="var(--ok)" fill-opacity="0.18" stroke="none"/>
      <path d="${kurve}" fill="none" stroke="var(--ok)" stroke-width="2.5"/>
      <line x1="${X(0)}" y1="${Y(1.5)}" x2="${X(Math.PI / 2)}" y2="${Y(1.5)}" stroke="var(--text-leise)" stroke-width="1" stroke-dasharray="5 4"/>
      <text x="${X(0) - 8}" y="${Y(0) + 4}" text-anchor="end" fill="var(--text)" font-size="12">0</text>
      <text x="${X(0) - 8}" y="${Y(1.5) + 4}" text-anchor="end" fill="var(--text)" font-size="12">1,5 = l/2</text>
      <text x="${X(0) - 8}" y="${Y(2) + 4}" text-anchor="end" fill="var(--text)" font-size="12">2 = a/2</text>
      <text x="${X(0)}" y="${Y(2) - 6}" fill="var(--text)" font-size="12">Abstand y in cm</text>
      <text x="${X(0)}" y="${H - 8}" fill="var(--text)" font-size="12">0°</text>
      <text x="${X(Math.PI / 2)}" y="${H - 8}" text-anchor="end" fill="var(--text)" font-size="12">90°</text>
      <text x="${(X(0) + X(Math.PI / 2)) / 2}" y="${H - 8}" text-anchor="middle" fill="var(--text)" font-size="12">Winkel φ</text>
      <text x="${X(Math.PI / 3)}" y="${Y(0.45)}" text-anchor="middle" fill="var(--text)" font-size="13" font-weight="600">Treffer ✓</text>
      <text x="${X(0.32)}" y="${Y(1.75)}" fill="var(--text)" font-size="13">kein Treffer</text>
      <text x="${X(1.13)}" y="${Y(1.84)}" fill="var(--ok)" font-size="12">y = 1,5 · sin φ</text>
    </svg>`;
  }

  function formelBlock() {
    const echo = zustand.vorhersage
      ? `<p><strong>Deine Vorhersage:</strong> etwa ${esc(zustand.vorhersage)} von 100 — tatsächlich trifft im Schnitt knapp jede zweite Nadel (rund 48 von 100).</p>`
      : "";
    return `
      <p>Ein Wurf ist durch zwei Zahlen komplett beschrieben: den Abstand <strong>y</strong> des Nadel-Mittelpunkts zur nächsten Linie (zwischen 0 und a/2 = 2 cm) und den Winkel <strong>φ</strong> zwischen Nadel und Linien (zwischen 0° und 90°). Die Nadel kreuzt eine Linie genau dann, wenn <strong>y ≤ (l/2)·sin φ</strong> — ihre „Reichweite" quer zu den Linien beträgt (l/2)·sin φ.</p>
      ${formelSkizze()}
      <p>Jeder Wurf ist also ein zufälliger Punkt in diesem Rechteck, und alle Punkte sind gleich wahrscheinlich. Wie beim Würfeln gilt: <strong>P = günstige Fälle durch mögliche Fälle</strong> — nur dass hier Flächen statt Anzahlen verglichen werden. Die Rechteckfläche ist (π/2) · 2 = <strong>π</strong> (der Winkel wird dafür im Bogenmaß gemessen: 90° = π/2). Und die grüne Fläche unter dem Sinusbogen ist genau <strong>1,5 = l/2</strong> — dass das exakt aufgeht, rechnet man in der Oberstufe mit einem Integral nach; hier darfst du es der Skizze glauben.</p>
      <p>Also: <strong>P(Treffer) = (l/2) / (π·a/4) = 2l/(π·a) = 1,5/π ≈ 0,477</strong>. Da steckt π! Es kommt über den <em>Winkel</em> ins Spiel: Die Nadel kann sich in alle Richtungen drehen — und Drehung heißt Kreis, auch wenn weit und breit keiner zu sehen ist.</p>
      <p>Den Rest erledigt deine Trefferquote: T/N ≈ P = 1,5/π. Nach π umgestellt: <strong>π ≈ 1,5 · N/T = 2·l·N/(a·T) = π̂</strong> — genau die Formel, mit der du das Protokoll gefüllt hast.</p>
      ${echo}`;
  }

  function panelAuswerten() {
    const zeilen = MEILENSTEINE
      .filter(m => zustand.protokoll[m] !== undefined)
      .map(m => ({ n: m, t: zustand.schnappschuesse[m].t, eingabe: zustand.protokoll[m] }));
    panel.innerHTML = `
      <h2>Auswertung</h2>
      ${zeilen.length ? `
      <table class="exp-tabelle"><thead><tr><th>N</th><th>T</th><th>π̂ (deine Rechnung)</th><th>|π̂ − π|</th></tr></thead>
      <tbody>${zeilen.map(z => `<tr><td>${z.n}</td><td>${z.t}</td><td>${komma(z.eingabe, 4)}</td><td>${komma(Math.abs(z.eingabe - Math.PI), 4)}</td></tr>`).join("")}</tbody></table>
      <canvas id="exp-plot" class="exp-diagramm" width="430" height="240" aria-label="Konvergenz-Diagramm: Schätzwert über der Wurfzahl N mit logarithmischer N-Achse in Stufen und gestrichelter Linie bei π."></canvas>`
      : `<p>Noch keine Protokollzeilen — wirf in der Durchführung erst Nadeln und füll das Protokoll. Die Formel-Aufdeckung unten funktioniert aber auch jetzt schon.</p>`}
      ${zeilen.length === MEILENSTEINE.length ? "" : `<p class="exp-hinweis">Tipp: Mit allen drei Protokollzeilen (N = 100, 1000, 5000) siehst du am besten, wie sich π̂ langsam an π heranschiebt.</p>`}
      <h3>Warum landet hier π?</h3>
      ${zustand.formelOffen ? formelBlock() : `<button class="knopf" id="exp-formel">Formel aufdecken</button>`}
      <h3>Erkenntnisfragen</h3>
      <p><strong>1.</strong> Deine Schätzung π̂ schwankt. Wie viele Würfe brauchst du <em>ungefähr</em>, damit eine weitere Nachkommastelle sicher steht?</p>
      <select id="exp-frage1" class="exp-wahl" aria-label="Antwort zu Frage 1 auswählen">
        <option value="">bitte wählen …</option>
        <option value="x2">doppelt so viele (×2)</option>
        <option value="x10">10-mal so viele (×10)</option>
        <option value="x100">100-mal so viele (×100)</option>
      </select>
      <button class="knopf zweitrangig" id="exp-frage1-knopf">Antwort prüfen</button>
      <p id="exp-frage1-meldung" class="exp-meldung" aria-live="polite">${esc(zustand.frage1)}</p>
      <p><strong>2.</strong> Im Experiment <a href="../../../experimente/mathematik/pi-messen/index.html">Die Kreiszahl π vermessen</a> bekommst du mit Maßband und Messschieber schneller mehr Nachkommastellen — Messen schlägt Werfen. Warum nutzt man Zufallsmethoden trotzdem?</p>
      <select id="exp-frage2" class="exp-wahl" aria-label="Antwort zu Frage 2 auswählen">
        <option value="">bitte wählen …</option>
        <option value="a">Weil Werfen bei genügend Geduld immer genauer wird als jedes Messgerät.</option>
        <option value="b">Weil Zufallsverfahren auch dort noch funktionieren, wo Messen und Zeichnen unmöglich werden — etwa bei Flächen und Volumen in sehr vielen Dimensionen.</option>
        <option value="c">Weil man beim Werfen nichts rechnen muss.</option>
      </select>
      <button class="knopf zweitrangig" id="exp-frage2-knopf">Antwort prüfen</button>
      <p id="exp-frage2-meldung" class="exp-meldung" aria-live="polite">${esc(zustand.frage2)}</p>
      <h3>Protokoll sichern</h3>
      <button class="knopf zweitrangig" id="exp-csv" ${zeilen.length ? "" : "disabled"}>Messtabelle als CSV herunterladen</button>
      <details class="exp-fehler"><summary>Fehlerbetrachtung — wo dieses Experiment „schummelt"</summary>
        <p><strong>Pseudozufall:</strong> Der Rechner würfelt nicht wirklich, er rechnet eine Zahlenfolge aus, die nur zufällig aussieht. Probier es: Nach „Von vorn" fallen exakt dieselben Nadeln noch einmal! Für unseren Zweck reicht dieser Pseudozufall — echter Zufall ist er nicht.</p>
        <p><strong>Endliches N:</strong> T/N ist nur eine Schätzung der Trefferwahrscheinlichkeit. Selbst bei N = 5000 schwankt π̂ typischerweise noch um einige Hundertstel — deshalb darfst du aus einer einzelnen Zahl nie zu viele Nachkommastellen herauslesen (siehe Frage 1).</p>
        <p><strong>Echte Nadeln:</strong> Auf echtem Papier rollen Nadeln nach dem Aufprall weg, verbiegen sich, bleiben aufeinander liegen, und die Linien haben selbst eine Breite. Beim Nachmachen mit Zahnstochern gilt: viele Würfe, Grenzfälle fair entscheiden, und was vom Blatt rutscht, zählt nicht.</p>
      </details>
      <div class="exp-knopfzeile">
        <button class="knopf zweitrangig" id="exp-zurueck">Mehr Würfe</button>
      </div>`;
    panel.querySelector("#exp-formel")?.addEventListener("click", () => {
      zustand.formelOffen = true;
      panelAuswerten();
    });
    panel.querySelector("#exp-frage1-knopf").addEventListener("click", () => {
      const wahl = panel.querySelector("#exp-frage1").value;
      if (!wahl) return;
      zustand.frage1 = wahl === "x100"
        ? "✓ Genau! Der Zufallsfehler schrumpft nur mit 1/√N. Eine Nachkommastelle mehr heißt 10-mal genauer — dafür brauchst du 100-mal so viele Würfe. Am Plot siehst du das: Pro Stufe der log-Achse wird die Kurve nur etwa 3-mal ruhiger (√10 ≈ 3,16)."
        : "✗ Schau auf den Plot: Von N = 100 zu N = 1000 (×10) wird die Kurve nur wenig ruhiger — der Fehler fällt bloß mit 1/√N. Versuch es noch einmal.";
      panel.querySelector("#exp-frage1-meldung").textContent = zustand.frage1;
    });
    panel.querySelector("#exp-frage2-knopf").addEventListener("click", () => {
      const wahl = panel.querySelector("#exp-frage2").value;
      if (!wahl) return;
      zustand.frage2 = wahl === "b"
        ? "✓ Richtig — das ist die Idee der Monte-Carlo-Methoden: Bei einem „Volumen“ in 50 oder 100 Dimensionen (so etwas taucht in Physik, Finanzmathematik und KI ständig auf) versagt jedes Maßband und jedes Raster. Zufällige Stichproben funktionieren weiter — und ihr Fehler fällt mit 1/√N, ganz egal, wie viele Dimensionen es sind."
        : wahl === "a"
          ? "✗ Leider nein — wegen des 1/√N-Fehlers wird Werfen nur quälend langsam genauer. Der wahre Vorteil liegt woanders …"
          : "✗ Gerechnet hast du hier ständig (π̂ = 2·l·N/(a·T)). Der wahre Vorteil liegt woanders …";
      panel.querySelector("#exp-frage2-meldung").textContent = zustand.frage2;
    });
    panel.querySelector("#exp-csv")?.addEventListener("click", () => {
      csvHerunterladen("buffon-protokoll.csv",
        ["N", "T", "pi_dach_gerechnet", "pi_dach_exakt", "abstand_zu_pi"],
        zeilen.map(z => [z.n, z.t, z.eingabe, piSchaetzer(z.n, z.t), Math.abs(piSchaetzer(z.n, z.t) - Math.PI)]));
    });
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechsle("werfen"));
    zeichnePlot();
  }

  function zeigePhase(id) {
    zustand.phase = id;
    zeichneAlles(id === "aufbau");
    if (id === "aufbau") panelAufbau();
    if (id === "werfen") panelWerfen();
    if (id === "auswerten") panelAuswerten();
  }

  wechsle("aufbau");
}
