// experiment.js — Interaktives Experiment: Franck-Hertz-Versuch (Qualifikationsphase).
// Realitätsnahe Messpraxis statt fertiger Kurve: Die Beschleunigungsspannung wird
// SELBST langsam hochgefahren, der Auffängerstrom am analogen nA-Meter beobachtet,
// jedes Strom-Minimum eigenhändig aufgespürt und notiert. Aus den Minima-Abständen
// folgt die Anregungsenergie von Quecksilber (4,9 eV). Die Anzeige-Streuung ist
// deterministisch geseedet (helfer.js) — dadurch laufen die TESTS auch in Node.
// Die Modulebene ist DOM-frei; alles Browser-Spezifische lebt in starteExperiment().

import {
  streuung, parseDezimal, komma, mittel, esc,
  farbe, reduzierteBewegung, bauePhasen, csvHerunterladen
} from "../../../assets/js/experiment/helfer.js";

// ---------- Modellkonstanten ----------
export const U_KONTAKT = 1.5;        // V — Kontaktspannung zwischen Kathode und Gitter
export const E_ANREGUNG = 4.9;       // eV — Anregungsenergie von Quecksilber
export const U_MAX = 30;             // V — Stellbereich der Beschleunigungsspannung
export const I_SKALA = 400;          // nA — Vollausschlag des analogen Messwerks
export const TOLERANZ_MINIMUM = 0.15; // V — so genau muss ein Minimum notiert werden
const C_STROM = 3.2;                 // nA — Skalierung der Anlaufkennlinie
const DIP_TIEFE = 0.72, DIP_BREITE = 0.85, ANZAHL_DIPS = 5;

// ---------- Modell (rein, Node-testbar) ----------
// Raumladungs-Anlaufkurve ~ (U − U_k)^1,5, multiplikativ eingekerbt an den Stellen
// U_k + n·4,9 V (Elektronen geben dort 1, 2, … n Energiepakete an Hg-Atome ab).
export function stromModell(U) {
  const basis = C_STROM * Math.pow(Math.max(0, U - U_KONTAKT), 1.5);
  let kerben = 1;
  for (let n = 1; n <= ANZAHL_DIPS; n++) {
    const d = (U - (U_KONTAKT + n * E_ANREGUNG)) / DIP_BREITE;
    kerben *= 1 - DIP_TIEFE * Math.exp(-d * d);
  }
  return basis * kerben;
}

// Was das nA-Meter anzeigt: Modellwert + reproduzierbare Streuung (±1 nA),
// nie negativ — der Zeiger hat bei 0 einen Anschlag.
export function messStrom(U) {
  return Math.max(0, stromModell(U) + streuung("I:" + U, 2));
}

// Zeigerstellung: klemmt an beiden Skalenenden
export function nadelWert(i) {
  return Math.max(0, Math.min(I_SKALA, i));
}

// Lokale Minima der Modellkurve, numerisch auf dem 0,01-V-Raster bestimmt.
// (Sie liegen NICHT exakt bei U_k + n·4,9 V: Die steigende Grundkurve zieht jedes
// Tal ein kleines Stück zur Seite — die Abstände bleiben trotzdem ≈ 4,9 V.)
export function findeMinima(raster = 0.01) {
  const minima = [];
  const von = U_KONTAKT + 0.5;
  const schritte = Math.round((U_MAX - von) / raster);
  let vor = stromModell(von), hier = stromModell(von + raster);
  for (let i = 1; i < schritte; i++) {
    const nach = stromModell(von + (i + 1) * raster);
    if (hier < vor && hier < nach) minima.push(Math.round((von + i * raster) * 100) / 100);
    vor = hier; hier = nach;
  }
  return minima;
}
export const MINIMA = findeMinima();

// nächstgelegenes numerisches Minimum zu einer getippten Spannung
export function naechstesMinimum(u) {
  let best = 0;
  for (let i = 1; i < MINIMA.length; i++) {
    if (Math.abs(u - MINIMA[i]) < Math.abs(u - MINIMA[best])) best = i;
  }
  return { n: best + 1, u: MINIMA[best] };
}
export function minimumOk(eingabe, minimumU) {
  // winziges Epsilon gegen Gleitkomma-Raender (z. B. 6,36 + 0,15)
  return Number.isFinite(eingabe) && Math.abs(eingabe - minimumU) <= TOLERANZ_MINIMUM + 1e-9;
}

// ---------- Auswertung (rein) ----------
export function abstaende(werte) {
  return werte.slice(1).map((w, i) => w - werte[i]);
}
export function eaAusMinima(minimaU) {
  return mittel(abstaende(minimaU)); // Zahlenwert in V ≙ Energie in eV
}
export function wellenlaengeNm(eV) {
  return 1239.84 / eV; // h·c = 1239,84 nm·eV
}
// E_a gilt nahe 4,9 eV als richtig; wer sauber den eigenen Mittelwert bildet,
// bekommt ihn ebenfalls anerkannt (Ablesefehler nicht doppelt bestrafen).
export function pruefeEa(eingabe, eigenesMittel) {
  if (!Number.isFinite(eingabe)) return false;
  return Math.abs(eingabe - E_ANREGUNG) <= 0.1 ||
         (Number.isFinite(eigenesMittel) && Math.abs(eingabe - eigenesMittel) <= 0.02);
}

// ---------- TESTS (laufen DOM-frei in Node) ----------
export const TESTS = [
  { name: "Modell liefert genau 5 Minima (0,01-V-Raster)", ok: () => MINIMA.length === 5 },
  { name: "Minima-Abstände alle 4,90 ± 0,05 V", ok: () => {
      const d = abstaende(MINIMA);
      return d.length === 4 && d.every(x => Math.abs(x - 4.9) <= 0.05);
    } },
  { name: "Erstes Minimum bei 6,4 ± 0,2 V (Kontaktspannung!)", ok: () => Math.abs(MINIMA[0] - 6.4) <= 0.2 },
  { name: "I(U) ≥ 0 überall (0…30 V, Raster 0,01)", ok: () => {
      for (let k = 0; k <= 3000; k++) if (stromModell(k / 100) < 0) return false;
      return true;
    } },
  { name: "I(0) = 0 und I(U_Kontakt) = 0", ok: () => stromModell(0) === 0 && stromModell(U_KONTAKT) === 0 },
  { name: "Pipeline: perfekte Minima → E_a exakt 4,9 eV", ok: () => {
      const perfekt = [1, 2, 3, 4, 5].map(n => U_KONTAKT + n * E_ANREGUNG);
      return Math.abs(eaAusMinima(perfekt) - 4.9) < 1e-9;
    } },
  { name: "Anzeige weicht höchstens ±1 nA vom Modell ab", ok: () => {
      for (let k = 0; k <= 300; k++) {
        const U = k / 10;
        if (Math.abs(messStrom(U) - Math.max(0, stromModell(U))) > 1 + 1e-12) return false;
      }
      return true;
    } },
  { name: "Anzeige deterministisch reproduzierbar", ok: () =>
      messStrom(12.3) === messStrom(12.3) && messStrom(6.4) === messStrom(6.4) },
  { name: "Minimum-Eingabe: Toleranz ±0,15 V", ok: () =>
      minimumOk(MINIMA[0] + 0.15, MINIMA[0]) && !minimumOk(MINIMA[0] + 0.16, MINIMA[0]) && !minimumOk(NaN, MINIMA[0]) },
  { name: "naechstesMinimum ordnet n richtig zu", ok: () =>
      naechstesMinimum(6.4).n === 1 && naechstesMinimum(11.2).n === 2 && naechstesMinimum(26.3).n === 5 },
  { name: "λ(4,9 eV) ≈ 253 nm", ok: () => Math.abs(wellenlaengeNm(E_ANREGUNG) - 253) <= 0.5 },
  { name: "Zeiger klemmt an den Skalenenden", ok: () =>
      nadelWert(486.9) === I_SKALA && nadelWert(-0.7) === 0 && nadelWert(123.4) === 123.4 },
  { name: "E_a-Prüfung: ±0,1 eV um 4,9", ok: () =>
      pruefeEa(4.81, NaN) && pruefeEa(5.0, NaN) && !pruefeEa(5.11, NaN) && pruefeEa(4.76, 4.77) }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;
  const reduziert = reduzierteBewegung();

  const zustand = {
    u: 0,          // eingestellte Spannung in V (Raster 0,1)
    uMax: 0,       // bis hierhin wurde schon gefahren (Schreiber-Spur)
    nadelIst: 0,   // träge Zeigerstellung des Messwerks in nA
    notiert: [],   // notierte Minima: { n, u }
    phase: "aufbau"
  };

  const wechslePhase = bauePhasen(wurzel, [
    { id: "aufbau", label: "Aufbau" },
    { id: "messen", label: "Durchführung" },
    { id: "auswerten", label: "Auswertung" }
  ], zeigePhase);

  const flaeche = document.createElement("div");
  flaeche.className = "exp-flaeche";
  flaeche.innerHTML = `
    <div class="exp-links">
      <canvas id="exp-geraet" width="380" height="446" aria-label="Versuchsaufbau: Franck-Hertz-Röhre mit Glühkathode K, Gitter G und Auffänger A im Ofen bei 170 Grad Celsius, Quecksilberdampf in der Röhre, darunter ein analoges Nanoamperemeter für den Auffängerstrom."></canvas>
      <canvas id="exp-schreiber" width="380" height="252" aria-label="XY-Schreiber: Auffängerstrom über Beschleunigungsspannung — die Kurve entsteht, soweit du schon gefahren bist."></canvas>
    </div>
    <div class="exp-rechts" id="exp-panel"></div>`;
  wurzel.appendChild(flaeche);

  const geraetCanvas = flaeche.querySelector("#exp-geraet");
  const schreiberCanvas = flaeche.querySelector("#exp-schreiber");
  const ctx = geraetCanvas.getContext("2d");
  const sctx = schreiberCanvas.getContext("2d");
  const panel = flaeche.querySelector("#exp-panel");

  // ---------- Spannung stellen ----------
  function setzeU(wert) {
    zustand.u = Math.max(0, Math.min(U_MAX, Math.round(wert * 10) / 10));
    zustand.uMax = Math.max(zustand.uMax, zustand.u);
    const anzeige = panel.querySelector("#exp-uwert");
    if (anzeige) anzeige.textContent = komma(zustand.u, 1) + " V";
    const slider = panel.querySelector("#exp-u");
    if (slider && Number(slider.value) !== zustand.u) slider.value = String(zustand.u);
    zeichneSchreiber();
    nadelNach(nadelWert(messStrom(zustand.u)));
  }

  // ---------- träges Messwerk (Animation; reduzierte Bewegung: Sprung) ----------
  let animLaeuft = false, nadelZiel = 0;
  function nadelNach(ziel) {
    nadelZiel = ziel;
    if (reduziert) { zustand.nadelIst = ziel; zeichneGeraet(); return; }
    if (!animLaeuft) { animLaeuft = true; requestAnimationFrame(nadelTick); }
  }
  function nadelTick() {
    const diff = nadelZiel - zustand.nadelIst;
    if (Math.abs(diff) < 0.4) {
      zustand.nadelIst = nadelZiel; zeichneGeraet(); animLaeuft = false; return;
    }
    zustand.nadelIst += diff * 0.22;
    zeichneGeraet();
    requestAnimationFrame(nadelTick);
  }

  // ---------- Zeichnung: Röhre im Ofen + analoges nA-Meter ----------
  function zeichneGeraet() {
    const w = geraetCanvas.width, h = geraetCanvas.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"), cAkzent = farbe("--akzent"),
          cFehler = farbe("--fehler", "#b33"), cFlaeche = farbe("--flaeche"), cHauch = farbe("--hauch", "#eee");
    function rrect(x, y, b, hh, rad) {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, b, hh, rad); else ctx.rect(x, y, b, hh);
    }
    ctx.clearRect(0, 0, w, h);
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start";

    // Ofen (konstant 170 °C — im echten Versuch erst nach ~15 min erreicht)
    ctx.fillStyle = cHauch; ctx.fillRect(14, 18, 352, 182);
    ctx.lineWidth = 3; ctx.strokeStyle = cText; ctx.strokeRect(14, 18, 352, 182);
    ctx.fillStyle = cLeise; ctx.fillText("Ofen", 24, 38);
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cAkzent; ctx.lineWidth = 2;
    rrect(278, 24, 78, 26, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = cText; ctx.font = "bold 14px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("170 °C", 317, 42);
    ctx.textAlign = "start"; ctx.font = "12px system-ui, sans-serif";

    // Röhre (Glaskolben)
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    rrect(34, 66, 312, 112, 18); ctx.fill(); ctx.stroke();
    const yM = 122;

    // Hg-Dampf (Symbol: verteilte Atome)
    ctx.strokeStyle = cLeise; ctx.lineWidth = 1.5;
    for (const [hx, hy] of [[112, 98], [148, 138], [183, 92], [212, 142], [243, 104], [167, 115], [132, 86], [226, 121]]) {
      ctx.beginPath(); ctx.arc(hx, hy, 4, 0, 7); ctx.stroke();
    }
    ctx.fillStyle = cLeise; ctx.fillText("Hg-Dampf", 148, 170);

    // Glühkathode K mit Heizwendel
    ctx.fillStyle = cText; ctx.fillRect(64, yM - 34, 9, 68);
    ctx.strokeStyle = cText; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(46, yM - 18);
    for (let i = 0; i <= 6; i++) ctx.lineTo(52 + (i % 2 ? 6 : 0), yM - 18 + i * 6);
    ctx.lineTo(46, yM + 18); ctx.stroke();
    // Gitter G (gestrichelt)
    ctx.strokeStyle = cText; ctx.lineWidth = 2.5; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(272, yM - 44); ctx.lineTo(272, yM + 44); ctx.stroke();
    ctx.setLineDash([]);
    // Auffänger A
    ctx.fillStyle = cText; ctx.fillRect(318, yM - 38, 7, 76);
    // Elektronen unterwegs (statisches Symbol)
    ctx.fillStyle = cAkzent;
    for (const ex of [96, 146, 196]) { ctx.beginPath(); ctx.arc(ex, yM, 3, 0, 7); ctx.fill(); }
    ctx.strokeStyle = cAkzent; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(206, yM); ctx.lineTo(244, yM); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(244, yM); ctx.lineTo(236, yM - 4); ctx.lineTo(236, yM + 4); ctx.closePath(); ctx.fill();
    ctx.fillText("e⁻", 92, yM - 12);
    // Elektroden-Beschriftung
    ctx.fillStyle = cText; ctx.font = "bold 13px system-ui, sans-serif";
    ctx.fillText("K", 50, 196); ctx.fillText("G", 252, 196); ctx.fillText("A", 302, 196);
    ctx.font = "12px system-ui, sans-serif";

    // Beschleunigungskreis: K — U_B — G
    ctx.strokeStyle = cText; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(68, yM + 34); ctx.lineTo(68, 222); ctx.lineTo(184, 222); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(196, 222); ctx.lineTo(272, 222); ctx.lineTo(272, yM + 44); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(184, 206); ctx.lineTo(184, 238); ctx.stroke();          // lange Platte
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(196, 214); ctx.lineTo(196, 230); ctx.stroke();          // kurze Platte
    ctx.lineWidth = 1.5;
    ctx.fillStyle = cAkzent; ctx.font = "bold 14px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("U_B = " + komma(zustand.u, 1) + " V", 190, 258);
    ctx.textAlign = "start"; ctx.font = "12px system-ui, sans-serif";

    // Auffängerkreis: A — Gegenspannung — nA-Meter
    ctx.strokeStyle = cText;
    ctx.beginPath(); ctx.moveTo(321, yM + 38); ctx.lineTo(321, 282); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(311, 218); ctx.lineTo(331, 218); ctx.stroke();          // lange Platte
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(315, 226); ctx.lineTo(327, 226); ctx.stroke();          // kurze Platte
    ctx.lineWidth = 1.5;
    ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "right";
    ctx.fillText("Gegenspannung", 306, 226);
    ctx.textAlign = "start"; ctx.font = "12px system-ui, sans-serif";

    // analoges nA-Meter
    const mx = 190, my = 414, r = 104;
    const winkel = v => (150 - v / I_SKALA * 120) * Math.PI / 180;
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2.5;
    rrect(58, 282, 264, 152, 10); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = cText; ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let v = 0; v <= I_SKALA; v += 5) {
      const a = winkel(v), X = mx + Math.cos(a) * r, Y = my - Math.sin(a) * r;
      if (v === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
    }
    ctx.stroke();
    for (let v = 0; v <= I_SKALA; v += 25) {
      const a = winkel(v), gross = v % 100 === 0;
      const r2 = r - (gross ? 14 : 8);
      ctx.lineWidth = gross ? 2 : 1.2; ctx.strokeStyle = cText;
      ctx.beginPath();
      ctx.moveTo(mx + Math.cos(a) * r, my - Math.sin(a) * r);
      ctx.lineTo(mx + Math.cos(a) * r2, my - Math.sin(a) * r2);
      ctx.stroke();
      if (gross) {
        ctx.fillStyle = cText; ctx.textAlign = "center";
        ctx.fillText(String(v), mx + Math.cos(a) * (r - 26), my - Math.sin(a) * (r - 26) + 4);
      }
    }
    ctx.fillStyle = cText; ctx.textAlign = "center"; ctx.font = "bold 13px system-ui, sans-serif";
    ctx.fillText("I_A in nA", mx, 302);
    ctx.font = "12px system-ui, sans-serif";
    // Zeiger
    const va = winkel(nadelWert(zustand.nadelIst));
    ctx.strokeStyle = cAkzent; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(mx, my);
    ctx.lineTo(mx + Math.cos(va) * (r - 18), my - Math.sin(va) * (r - 18)); ctx.stroke();
    ctx.fillStyle = cText; ctx.beginPath(); ctx.arc(mx, my, 6, 0, 7); ctx.fill();
    // Überlauf nicht nur über Farbe melden
    if (messStrom(zustand.u) > I_SKALA) {
      ctx.fillStyle = cFehler; ctx.font = "bold 13px system-ui, sans-serif"; ctx.textAlign = "start";
      ctx.fillText("über 400 nA!", 66, 304);
    }
    ctx.textAlign = "start";
  }

  // ---------- Zeichnung: XY-Schreiber (I über U, soweit gefahren) ----------
  function zeichneSchreiber() {
    const w = schreiberCanvas.width, h = schreiberCanvas.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"), cAkzent = farbe("--akzent");
    const L = 46, R = w - 10, T = 18, B = h - 30;
    const xU = u => L + u / U_MAX * (R - L);
    const yI = i => B - Math.min(i, I_SKALA) / I_SKALA * (B - T);
    sctx.clearRect(0, 0, w, h);
    sctx.font = "11px system-ui, sans-serif";
    for (let u = 0; u <= U_MAX; u += 5) {
      sctx.strokeStyle = cLeise; sctx.globalAlpha = u % 10 === 0 ? 0.7 : 0.35; sctx.lineWidth = 1;
      sctx.beginPath(); sctx.moveTo(xU(u), T); sctx.lineTo(xU(u), B); sctx.stroke();
      sctx.globalAlpha = 1; sctx.fillStyle = cText; sctx.textAlign = "center";
      sctx.fillText(String(u), xU(u), B + 14);
    }
    for (let i = 0; i <= I_SKALA; i += 100) {
      sctx.strokeStyle = cLeise; sctx.globalAlpha = 0.45; sctx.lineWidth = 1;
      sctx.beginPath(); sctx.moveTo(L, yI(i)); sctx.lineTo(R, yI(i)); sctx.stroke();
      sctx.globalAlpha = 1; sctx.fillStyle = cText; sctx.textAlign = "right";
      sctx.fillText(String(i), L - 5, yI(i) + 4);
    }
    sctx.strokeStyle = cText; sctx.lineWidth = 1.6;
    sctx.beginPath(); sctx.moveTo(L, T - 4); sctx.lineTo(L, B); sctx.lineTo(R, B); sctx.stroke();
    sctx.fillStyle = cText; sctx.textAlign = "left"; sctx.fillText("I_A in nA", L + 4, T - 7);
    sctx.textAlign = "right"; sctx.fillText("U_B in V", R, h - 4);
    sctx.fillStyle = cLeise; sctx.fillText("XY-Schreiber", R, T - 7);
    // notierte Minima markieren
    for (const z of zustand.notiert) {
      sctx.strokeStyle = cLeise; sctx.setLineDash([4, 4]); sctx.lineWidth = 1;
      sctx.beginPath(); sctx.moveTo(xU(z.u), T); sctx.lineTo(xU(z.u), B); sctx.stroke();
      sctx.setLineDash([]);
      sctx.fillStyle = cText; sctx.textAlign = "center"; sctx.fillText("n=" + z.n, xU(z.u), T + 11);
    }
    // Spur, soweit gefahren — reduzierte Bewegung: Punkte statt durchgezogener Spur
    const K = Math.round(zustand.uMax * 10);
    sctx.strokeStyle = cAkzent; sctx.fillStyle = cAkzent; sctx.lineWidth = 1.8;
    if (reduziert) {
      for (let k = 0; k <= K; k += 2) {
        const u = k / 10;
        sctx.beginPath(); sctx.arc(xU(u), yI(messStrom(u)), 1.6, 0, 7); sctx.fill();
      }
    } else if (K > 0) {
      sctx.beginPath();
      for (let k = 0; k <= K; k++) {
        const u = k / 10, X = xU(u), Y = yI(messStrom(u));
        if (k === 0) sctx.moveTo(X, Y); else sctx.lineTo(X, Y);
      }
      sctx.stroke();
    }
    // Schreibstift an der aktuellen Position
    sctx.beginPath(); sctx.arc(xU(zustand.u), yI(messStrom(zustand.u)), 4, 0, 7); sctx.fill();
  }

  // ---------- Panels je Phase ----------
  function panelAufbau() {
    panel.innerHTML = `
      <h2>Aufbau und Geräte</h2>
      <p>In einem <strong>Ofen</strong> (konstant 170 °C) sitzt eine evakuierte Röhre mit einem Tropfen Quecksilber — bei dieser Temperatur füllt <strong>Hg-Dampf</strong> die Röhre. Die <strong>Glühkathode K</strong> setzt Elektronen frei, die Beschleunigungsspannung <em>U<sub>B</sub></em> zieht sie zum <strong>Gitter G</strong>. Dahinter bremst eine kleine Gegenspannung: Nur Elektronen mit genügend Restenergie erreichen den <strong>Auffänger A</strong> — ihren winzigen Strom (Nanoampere!) zeigt das analoge Messwerk, der XY-Schreiber zeichnet ihn über <em>U<sub>B</sub></em> auf.</p>
      <p><strong>Plan:</strong> Fahre <em>U<sub>B</sub></em> von 0 bis 30 V <strong>langsam</strong> hoch. Jedes Mal, wenn der Auffängerstrom ein <strong>Minimum</strong> durchläuft, bestimmst du dessen Spannung und notierst sie — mindestens vier Stück. Aus den <strong>Abständen</strong> der Minima folgt die Anregungsenergie des Quecksilbers.</p>
      <p class="exp-hinweis">⚠ Im echten Labor heizt der Ofen erst ~15 Minuten vor, und heißer Hg-Dampf verlangt Respekt. Hier ist die Röhre schon warm und betriebsbereit.</p>
      <button class="knopf" id="exp-weiter1">Zur Durchführung</button>`;
    panel.querySelector("#exp-weiter1").addEventListener("click", () => wechslePhase("messen"));
  }

  function panelMessen(meldung = "") {
    panel.innerHTML = `
      <h2>Durchführung</h2>
      <div class="exp-regler">
        <label for="exp-u">Beschleunigungsspannung U<sub>B</sub>: <strong id="exp-uwert">${komma(zustand.u, 1)} V</strong></label>
        <input type="range" id="exp-u" min="0" max="${U_MAX}" step="0.1" value="${zustand.u}">
        <div class="exp-knopfzeile" aria-label="Feineinstellung der Spannung">
          <button class="knopf zweitrangig" data-du="-1">−1 V</button>
          <button class="knopf zweitrangig" data-du="-0.1">−0,1 V</button>
          <button class="knopf zweitrangig" data-du="0.1">+0,1 V</button>
          <button class="knopf zweitrangig" data-du="1">+1 V</button>
        </div>
      </div>
      <p>Fahre <strong>langsam</strong> hoch und beobachte den Zeiger: Sinkt er und steigt danach wieder, hast du ein <strong>Tal</strong> gefunden. Taste dich mit ±0,1 V an die tiefste Stelle heran — der Schreiber links hilft dir dabei.</p>
      <form id="exp-notieren" class="exp-ablesen">
        <label for="exp-umin">Minimum notieren — U in V:</label>
        <input id="exp-umin" inputmode="decimal" autocomplete="off" size="7">
        <button class="knopf">Notieren</button>
      </form>
      <p id="exp-meldung" class="exp-meldung" aria-live="polite">${esc(meldung)}</p>
      <h3>Notierte Minima</h3>
      <table class="exp-tabelle"><thead><tr><th>n</th><th>U<sub>min</sub> in V</th></tr></thead>
      <tbody>${zustand.notiert.map(z => `<tr><td>${z.n}</td><td>${komma(z.u, 2)}</td></tr>`).join("") || '<tr><td colspan="2">noch leer</td></tr>'}</tbody></table>
      <p>${zustand.notiert.length} von mindestens 4 Minima.</p>
      <button class="knopf" id="exp-weiter2" ${zustand.notiert.length >= 4 ? "" : "disabled"}>Zur Auswertung</button>`;
    panel.querySelector("#exp-u").addEventListener("input", ev => setzeU(parseDezimal(ev.target.value)));
    panel.querySelectorAll("[data-du]").forEach(k =>
      k.addEventListener("click", () => setzeU(zustand.u + Number(k.dataset.du))));
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
    panel.querySelector("#exp-notieren").addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-umin").value);
      const meldungEl = panel.querySelector("#exp-meldung");
      if (!Number.isFinite(eingabe) || eingabe < 0 || eingabe > U_MAX) {
        meldungEl.textContent = "Bitte eine Spannung zwischen 0 und 30 V eingeben (Komma erlaubt).";
        return;
      }
      const kand = naechstesMinimum(eingabe);
      if (!minimumOk(eingabe, kand.u)) {
        meldungEl.textContent = "✗ An dieser Stelle liegt kein Tal-Tiefpunkt. Fahre langsam über das Tal und suche die Spannung mit dem kleinsten Zeigerausschlag (auf ±0,1 V genau).";
        return;
      }
      if (zustand.uMax < kand.u + 0.3) {
        meldungEl.textContent = "Erst hinfahren, dann notieren: Ein Minimum erkennst du sicher, wenn der Zeiger dahinter wieder steigt.";
        return;
      }
      if (zustand.notiert.some(z => z.n === kand.n)) {
        meldungEl.textContent = "Das Minimum n = " + kand.n + " hast du schon notiert — fahre weiter zum nächsten Tal.";
        return;
      }
      zustand.notiert.push({ n: kand.n, u: eingabe });
      zustand.notiert.sort((a, b) => a.n - b.n);
      zeichneSchreiber();
      panelMessen("✓ Minimum n = " + kand.n + " bei " + komma(eingabe, 2) + " V notiert.");
    });
  }

  function panelAuswerten() {
    if (zustand.notiert.length < 4) {
      panel.innerHTML = `
        <h2>Auswertung</h2>
        <p>Du brauchst mindestens <strong>4 notierte Minima</strong>, damit sich die Auswertung lohnt. Fahre zurück und such weiter — die Täler laufen nicht weg.</p>
        <button class="knopf" id="exp-zurueck0">Zur Durchführung</button>`;
      panel.querySelector("#exp-zurueck0").addEventListener("click", () => wechslePhase("messen"));
      return;
    }
    const paare = [];
    for (let i = 0; i + 1 < zustand.notiert.length; i++) {
      const a = zustand.notiert[i], b = zustand.notiert[i + 1];
      if (b.n === a.n + 1) paare.push({ a, b });
    }
    panel.innerHTML = `
      <h2>Auswertung</h2>
      <table class="exp-tabelle"><thead><tr><th>n</th><th>U<sub>min</sub> in V</th></tr></thead>
      <tbody>${zustand.notiert.map(z => `<tr><td>${z.n}</td><td>${komma(z.u, 2)}</td></tr>`).join("")}</tbody></table>
      <h3>1 · Abstände der Minima</h3>
      <form id="exp-duform">
        ${paare.map((p, i) => `<p class="exp-ablesen"><label for="exp-du-${i}">ΔU = U(${p.b.n}) − U(${p.a.n}) =</label>
          <input class="exp-eingabe" id="exp-du-${i}" inputmode="decimal" autocomplete="off" size="6"> V
          <span id="exp-du-ok-${i}" aria-live="polite"></span></p>`).join("")}
        <button class="knopf zweitrangig">Abstände prüfen</button>
      </form>
      <p id="exp-du-meldung" class="exp-meldung" aria-live="polite"></p>
      <h3>2 · Anregungsenergie</h3>
      <p>Jedes Volt Beschleunigungsspannung gibt einem Elektron 1 eV Energie. Bilde den <strong>Mittelwert</strong> deiner ΔU-Werte:</p>
      <form id="exp-eaform" class="exp-ablesen">
        <label for="exp-ea">E<sub>a</sub> =</label>
        <input id="exp-ea" inputmode="decimal" autocomplete="off" size="6"> eV
        <button class="knopf">Prüfen</button>
      </form>
      <p id="exp-ea-meldung" class="exp-meldung" aria-live="polite"></p>
      <h3>3 · Der Klassiker: Warum liegt das erste Minimum nicht bei 4,9 V?</h3>
      <select id="exp-frage" class="exp-wahl" aria-label="Antwort auswählen">
        <option value="">— Antwort wählen —</option>
        <option value="a">Die Elektronen brauchen für das erste Tal zwei Stöße hintereinander.</option>
        <option value="b">Zwischen Kathode und Gitter wirkt zusätzlich eine Kontaktspannung — sie verschiebt die ganze Kurve um etwa 1,5 V.</option>
        <option value="c">Das nA-Meter zeigt grundsätzlich um einige Volt zu spät an.</option>
        <option value="d">Unterhalb von 6 V lässt der Hg-Dampf gar keine Elektronen durch.</option>
      </select>
      <button class="knopf zweitrangig" id="exp-frage-knopf">Antwort prüfen</button>
      <p id="exp-frage-meldung" class="exp-meldung" aria-live="polite"></p>
      <h3>4 · Bonus: das ausgesandte Licht</h3>
      <p>Angeregte Hg-Atome fallen zurück und senden dabei ein Photon aus: λ = 1239,84 nm·eV / E<sub>a</sub>. Wie groß ist λ?</p>
      <form id="exp-lambdaform" class="exp-ablesen">
        <label for="exp-lambda">λ ≈</label>
        <input id="exp-lambda" inputmode="decimal" autocomplete="off" size="6"> nm
        <button class="knopf">Prüfen</button>
      </form>
      <p id="exp-lambda-meldung" class="exp-meldung" aria-live="polite"></p>
      <details class="exp-fehler"><summary>Fehlerbetrachtung — wie genau ist das?</summary>
        <p>Die Täler sind <strong>flach</strong>: Nahe am Minimum ändert sich der Strom kaum, die Position lässt sich nur auf etwa ±0,2 V ablesen. Deshalb mittelt man über mehrere Abstände, statt einem einzelnen zu vertrauen.</p>
        <p>Die <strong>Ofentemperatur</strong> bestimmt die Dampfdichte: zu kalt → kaum Stöße, die Täler verschwinden; zu heiß → der Strom bricht insgesamt ein. Um 170–180 °C ist der gutmütige Bereich — deshalb wird sie konstant gehalten.</p>
        <p>Die <strong>Kontaktspannung</strong> verschiebt alle Minima gemeinsam — auf die <em>Abstände</em> hat sie keinen Einfluss. Genau deshalb wertet man Abstände aus, nie absolute Lagen.</p>
      </details>
      <div class="exp-knopfzeile">
        <button class="knopf zweitrangig" id="exp-csv">Messwerte als CSV</button>
        <button class="knopf zweitrangig" id="exp-zurueck">Mehr Minima notieren</button>
        <button class="knopf" id="exp-neustart">Neues Experiment</button>
      </div>`;
    panel.querySelector("#exp-duform").addEventListener("submit", ev => {
      ev.preventDefault();
      let alleOk = true;
      paare.forEach((p, i) => {
        const wert = parseDezimal(panel.querySelector("#exp-du-" + i).value);
        const soll = p.b.u - p.a.u;
        const ok = Number.isFinite(wert) && Math.abs(wert - soll) <= 0.1;
        panel.querySelector("#exp-du-ok-" + i).textContent = ok ? "✓" : "✗";
        if (!ok) alleOk = false;
      });
      panel.querySelector("#exp-du-meldung").textContent = alleOk
        ? "✓ Alle Abstände stimmen — und alle liegen nahe 4,9 V. Das ist kein Zufall!"
        : "Noch nicht alles richtig: ΔU ist jeweils die Differenz zweier benachbarter Tabellenwerte.";
    });
    panel.querySelector("#exp-eaform").addEventListener("submit", ev => {
      ev.preventDefault();
      const wert = parseDezimal(panel.querySelector("#exp-ea").value);
      const eigenes = mittel(paare.map(p => p.b.u - p.a.u));
      panel.querySelector("#exp-ea-meldung").textContent = pruefeEa(wert, eigenes)
        ? "✓ E_a ≈ 4,9 eV. Genau dieses Energiepaket — nicht mehr, nicht weniger — nimmt ein Hg-Atom beim Stoß auf: Die Energieaufnahme ist gequantelt!"
        : "✗ Bilde den Mittelwert deiner ΔU-Werte (in V) — sein Zahlenwert ist E_a in eV.";
    });
    panel.querySelector("#exp-frage-knopf").addEventListener("click", () => {
      const wahl = panel.querySelector("#exp-frage").value;
      const m = panel.querySelector("#exp-frage-meldung");
      if (!wahl) { m.textContent = "Wähle zuerst eine Antwort aus."; return; }
      m.textContent = wahl === "b"
        ? "✓ Richtig! Kathode und Gitter bestehen aus verschiedenen Materialien — ihre Kontaktspannung (hier ≈ 1,5 V) verschiebt die ganze Kurve. Die Abstände bleiben 4,9 V; deshalb wertet man nur sie aus. Klassischer Klausur-Stolperstein!"
        : "✗ Noch nicht. Schau auf deine Tabelle: ALLE Minima sind um denselben Betrag verschoben, die Abstände stimmen trotzdem. Was verschiebt eine ganze Spannungsskala?";
    });
    panel.querySelector("#exp-lambdaform").addEventListener("submit", ev => {
      ev.preventDefault();
      const wert = parseDezimal(panel.querySelector("#exp-lambda").value);
      panel.querySelector("#exp-lambda-meldung").textContent =
        Number.isFinite(wert) && Math.abs(wert - wellenlaengeNm(E_ANREGUNG)) <= 3
          ? "✓ λ ≈ 253 nm — ultraviolett! Deshalb sieht man das Leuchten der Hg-Röhre nicht direkt; nachweisen kann man es z. B. mit einem Fluoreszenzschirm."
          : "✗ Rechne λ = 1239,84 / 4,9 (Ergebnis in nm) und runde auf ganze Nanometer.";
    });
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      const zeilen = zustand.notiert.map((z, i) => [
        String(z.n), z.u,
        i > 0 && z.n === zustand.notiert[i - 1].n + 1 ? z.u - zustand.notiert[i - 1].u : ""
      ]);
      csvHerunterladen("franck-hertz-minima.csv", ["n", "U_min in V", "Delta U in V"], zeilen);
    });
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      zustand.notiert = []; zustand.u = 0; zustand.uMax = 0; zustand.nadelIst = 0; nadelZiel = 0;
      zeichneSchreiber(); zeichneGeraet(); wechslePhase("aufbau");
    });
  }

  function zeigePhase(id) {
    zustand.phase = id;
    if (id === "aufbau") panelAufbau();
    if (id === "messen") panelMessen();
    if (id === "auswerten") panelAuswerten();
  }

  zeichneGeraet();
  zeichneSchreiber();
  wechslePhase("aufbau");
}
