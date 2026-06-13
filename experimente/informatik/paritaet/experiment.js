// experiment.js — Interaktives Experiment: Übertragungsfehler und Paritätsbit (Klasse 9).
// Realitätsnahe Messpraxis statt Knopfdruck-Ergebnis: Paritätsbits SELBST bestimmen,
// 50 Wörter durch einen gestörten Kanal schicken, die Zähler ins Protokoll übertragen,
// unerkannte Fehler im Inspektor aufspüren und mit der 2D-Blockparität sogar lokalisieren.
// Der Kanal ist deterministisch geseedet (Störrate, Übertragungs-Nr., Bit-Nr.) —
// dadurch reproduzierbar wie ein gutes Protokoll und in Node testbar.

import {
  mulberry32, seedAus, parseDezimal, komma, ablesungOk, esc,
  farbe, reduzierteBewegung, bauePhasen, csvHerunterladen
} from "../../../assets/js/experiment/helfer.js";

// ---------- feste Größen ----------
export const STOERRATEN = [0.02, 0.05, 0.1]; // Kippwahrscheinlichkeit je Bit
export const WOERTER_JE_LAUF = 50;
export const BITS_JE_WORT = 8;               // Nutzbits (ASCII-Byte)
export const BITS_GESENDET = 9;              // Nutzbits + Paritätsbit
export const BLOCK_N = 4;                    // Kantenlänge des Blockparitäts-Gitters
export const BLOCK_RUNDEN = 3;

const ALPHABET = Array.from({ length: 26 }, (_, j) => String.fromCharCode(65 + j));

// ---------- reine Logik: Parität (Node-testbar, kein DOM) ----------
export function asciiBits(zeichen) {
  return zeichen.charCodeAt(0).toString(2).padStart(BITS_JE_WORT, "0");
}
export function einsen(bits) {
  return [...bits].filter(b => b === "1").length;
}
// gerade Parität: Paritätsbit macht die Einsen-Zahl inklusive Paritätsbit gerade
export function paritaetsBit(bits) {
  return einsen(bits) % 2;
}
export function istGerade(bits) {
  return einsen(bits) % 2 === 0;
}
export function mitParitaet(bits) {
  return bits + String(paritaetsBit(bits));
}
// Bits an den angegebenen Positionen kippen (für Tests und Erklärungen)
export function kippe(bits, positionen) {
  const arr = [...bits];
  for (const b of positionen) arr[b] = arr[b] === "0" ? "1" : "0";
  return arr.join("");
}

// ---------- reine Logik: gestörter Kanal (deterministisch geseedet) ----------
// Bit b der Übertragung i kippt bei Störrate p genau dann, wenn dieser Wert < p ist.
export function kippt(p, i, b) {
  return mulberry32(seedAus("kanal:" + p + ":" + i + ":" + b))() < p;
}
export function kippIndizes(p, i, laenge = BITS_GESENDET) {
  const liste = [];
  for (let b = 0; b < laenge; b++) if (kippt(p, i, b)) liste.push(b);
  return liste;
}
export function uebertrage(gesendet, p, i) {
  return kippe(gesendet, kippIndizes(p, i, gesendet.length));
}
// zufälliges, aber geseedetes Zeichen A–Z für Übertragung i bei Störrate p
export function zufallsZeichen(p, i) {
  return ALPHABET[Math.floor(mulberry32(seedAus("zeichen:" + p + ":" + i))() * 26)];
}

// Empfängersicht plus Allwissenheit: korrekt | erkannt | unerkannt
export function bewerte(gesendet, empfangen) {
  if (empfangen === gesendet) return "korrekt";
  return istGerade(empfangen) ? "unerkannt" : "erkannt";
}
export function zaehle(uebertragungen) {
  const z = { korrekt: 0, erkannt: 0, unerkannt: 0 };
  for (const u of uebertragungen) z[u.status]++;
  return z;
}
export function fuehreLaufAus(p, anzahl = WOERTER_JE_LAUF) {
  const liste = [];
  for (let i = 1; i <= anzahl; i++) {
    const zeichen = zufallsZeichen(p, i);
    const gesendet = mitParitaet(asciiBits(zeichen));
    const gekippt = kippIndizes(p, i);
    const empfangen = kippe(gesendet, gekippt);
    liste.push({ i, zeichen, gesendet, empfangen, gekippt, status: bewerte(gesendet, empfangen) });
  }
  return liste;
}

// Theorie: Wahrscheinlichkeit eines unerkannten Fehlers je Wort
// (gerade Anzahl Kipper >= 2; wächst für kleine p etwa quadratisch: ~ C(9,2)·p²)
export function binomial(n, k) {
  if (k < 0 || k > n) return 0;
  let w = 1;
  for (let j = 1; j <= k; j++) w = (w * (n - k + j)) / j;
  return Math.round(w);
}
export function pUnerkanntTheorie(p, n = BITS_GESENDET) {
  let summe = 0;
  for (let k = 2; k <= n; k += 2) summe += binomial(n, k) * p ** k * (1 - p) ** (n - k);
  return summe;
}

// ---------- reine Logik: 2D-Blockparität (4×4-Gitter) ----------
export function blockBits(runde) {
  const r = mulberry32(seedAus("block:" + runde));
  return Array.from({ length: BLOCK_N * BLOCK_N }, () => (r() < 0.5 ? 0 : 1));
}
export function blockKippIndex(runde) {
  return Math.floor(mulberry32(seedAus("blockkipp:" + runde))() * BLOCK_N * BLOCK_N);
}
export function blockMitKipp(bits, index) {
  return bits.map((b, j) => (j === index ? 1 - b : b));
}
export function zeilenParitaet(bits, zeile) {
  let s = 0;
  for (let c = 0; c < BLOCK_N; c++) s += bits[zeile * BLOCK_N + c];
  return s % 2;
}
export function spaltenParitaet(bits, spalte) {
  let s = 0;
  for (let r = 0; r < BLOCK_N; r++) s += bits[r * BLOCK_N + spalte];
  return s % 2;
}
// Vergleich gesendete vs. aus dem gestörten Gitter berechnete Paritäten:
// genau eine unstimmige Zeile + genau eine unstimmige Spalte → Bit lokalisiert
export function blockLokalisiere(original, gestoert) {
  const zeilen = [], spalten = [];
  for (let j = 0; j < BLOCK_N; j++) {
    if (zeilenParitaet(original, j) !== zeilenParitaet(gestoert, j)) zeilen.push(j);
    if (spaltenParitaet(original, j) !== spaltenParitaet(gestoert, j)) spalten.push(j);
  }
  return zeilen.length === 1 && spalten.length === 1
    ? { zeile: zeilen[0], spalte: spalten[0] }
    : null;
}

// ---------- TESTS (laufen in Node, Modulebene DOM-frei) ----------
export const TESTS = [
  { name: "Paritätsbit (gerade): „K“ = 01001011 → 0; Beispiele mit Soll 1", ok: () =>
      paritaetsBit("01001011") === 0 && paritaetsBit(asciiBits("K")) === 0
      && paritaetsBit("01000011") === 1 && paritaetsBit("00000001") === 1
      && paritaetsBit("11111111") === 0 && paritaetsBit("00000000") === 0 },
  { name: "ASCII-Bits korrekt: K = 75 = 01001011, A = 65, Z = 90, M = 77", ok: () =>
      asciiBits("K") === "01001011" && asciiBits("A") === "01000001"
      && asciiBits("Z") === "01011010" && parseInt(asciiBits("M"), 2) === 77 },
  { name: "Gesendete Wörter haben unverfälscht immer gerade Parität (A–Z komplett)", ok: () =>
      ALPHABET.every(z => istGerade(mitParitaet(asciiBits(z)))) },
  { name: "Kanal deterministisch: gleiche Seeds → gleiche Kipps, Läufe identisch", ok: () => {
      const a = fuehreLaufAus(0.05), b = fuehreLaufAus(0.05);
      return a.every((u, j) => u.empfangen === b[j].empfangen && u.zeichen === b[j].zeichen
        && u.gekippt.join() === b[j].gekippt.join())
        && kippt(0.1, 7, 3) === kippt(0.1, 7, 3)
        && uebertrage("010010110", 0.1, 7) === uebertrage("010010110", 0.1, 7); } },
  { name: "Kipprate über 100000 Bits nahe p (±0,005) für 2 %, 5 %, 10 %", ok: () =>
      STOERRATEN.every(p => {
        let n = 0, c = 0;
        for (let i = 1; n < 100000; i++) {
          for (let b = 0; b < BITS_GESENDET && n < 100000; b++) { n++; if (kippt(p, i, b)) c++; }
        }
        return Math.abs(c / n - p) <= 0.005; }) },
  { name: "Einzelkipp wird erkannt — an jeder der 9 Positionen", ok: () => {
      const w = mitParitaet(asciiBits("K"));
      return Array.from({ length: BITS_GESENDET }, (_, b) => b)
        .every(b => bewerte(w, kippe(w, [b])) === "erkannt"); } },
  { name: "Doppelkipp im selben Wort → unerkannt; verteilt auf zwei Wörter → beide erkannt", ok: () => {
      const w = mitParitaet(asciiBits("K")), v = mitParitaet(asciiBits("A"));
      return [[0, 1], [2, 7], [3, 8], [0, 8], [5, 6]]
        .every(([x, y]) => bewerte(w, kippe(w, [x, y])) === "unerkannt")
        && bewerte(w, kippe(w, [3])) === "erkannt" && bewerte(v, kippe(v, [7])) === "erkannt"; } },
  { name: "Kippt nur das Paritätsbit, wird der Fehler trotzdem erkannt (Nutzbits unversehrt)", ok: () =>
      ALPHABET.every(z => {
        const w = mitParitaet(asciiBits(z)), e = kippe(w, [8]);
        return bewerte(w, e) === "erkannt" && e.slice(0, 8) === w.slice(0, 8); }) },
  { name: "2D-Blockparität: jeder der 16 Einzelkipps wird eindeutig lokalisiert (3 Gitter)", ok: () =>
      [1, 2, 3].every(runde => {
        const original = blockBits(runde);
        return Array.from({ length: 16 }, (_, idx) => idx).every(idx => {
          const lok = blockLokalisiere(original, blockMitKipp(original, idx));
          return lok && lok.zeile === Math.floor(idx / 4) && lok.spalte === idx % 4;
        }); }) },
  { name: "Zähl-Pipeline am Mini-Lauf von Hand: 1× korrekt, 1× erkannt, 1× unerkannt", ok: () => {
      const w = mitParitaet(asciiBits("K"));
      const liste = [
        { status: bewerte(w, w) },                  // unverändert
        { status: bewerte(w, kippe(w, [4])) },      // Einzelkipp
        { status: bewerte(w, kippe(w, [1, 6])) }    // Doppelkipp
      ];
      const z = zaehle(liste);
      return z.korrekt === 1 && z.erkannt === 1 && z.unerkannt === 1; } },
  { name: "50er-Läufe: Zähler summieren zu 50; Sollwerte des Protokolls reproduzierbar", ok: () =>
      STOERRATEN.every(p => {
        const z = zaehle(fuehreLaufAus(p));
        return z.korrekt + z.erkannt + z.unerkannt === WOERTER_JE_LAUF; })
      && (() => {
        const z = zaehle(fuehreLaufAus(0.1));
        return z.korrekt === 18 && z.erkannt === 23 && z.unerkannt === 9; })() },
  { name: "Theorie: unerkannte Fehler wachsen überproportional zur Störrate (≈ 36·p²)", ok: () =>
      Math.abs(pUnerkanntTheorie(0.1) - 0.17969) < 0.002
      && pUnerkanntTheorie(0.1) / pUnerkanntTheorie(0.02) > 10
      && Math.abs(pUnerkanntTheorie(0.02) - 36 * 0.02 ** 2 * 0.98 ** 7) < 2e-4 }
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
    // Aufbau: Mini-Übung Paritätsbit
    uebungZeichen: "K",
    uebungGeloest: new Set(),
    // Durchführung
    p: STOERRATEN[0],
    laeufe: {},               // String(p) → Liste der 50 Übertragungen
    laeuft: false,
    flug: null,               // { beginn, dauerProWort, idx } während der Animation
    auswahl: null,            // im Inspektor gewählte Übertragung
    protokollEingaben: {},    // Feld-id → Text (überlebt Re-Render)
    protokollOk: false,
    // Auswertung: Blockparität
    blockRunde: 1,            // absolute Runden-Nr. (bestimmt den Seed)
    blockGespielt: 0,         // 0…3 in der laufenden Serie
    blockTreffer: 0,          // beim ersten Klick gefunden
    blockDaneben: false
  };

  const wechslePhase = bauePhasen(wurzel, [
    { id: "aufbau", label: "Aufbau" },
    { id: "messen", label: "Durchführung" },
    { id: "auswerten", label: "Auswertung" }
  ], id => {
    zustand.phase = id;
    if (id === "aufbau") panelAufbau();
    if (id === "messen") panelMessen();
    if (id === "auswerten") panelAuswerten();
    zeichne();
  });
  wurzel.insertAdjacentHTML("beforeend", `
    <div class="exp-flaeche">
      <div class="exp-links">
        <canvas id="exp-canvas" width="360" height="640" aria-label="Übertragungsstrecke: oben der Sender mit dem 9-Bit-Wort aus ASCII-Byte und Paritätsbit, in der Mitte der gestörte Kanal mit Blitzsymbolen an gekippten Bits, unten der Empfänger, der die Einsen nachzählt."></canvas>
      </div>
      <div class="exp-rechts" id="exp-panel"></div>
    </div>`);
  const canvas = wurzel.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = wurzel.querySelector("#exp-panel");
  const W = canvas.width, H = canvas.height;

  const schluessel = p => String(p);
  const prozent = p => String(Math.round(p * 100));
  const nibbeln = bits => bits.slice(0, 4) + " " + bits.slice(4);
  const STIL_ZELLKNOPF = "font:inherit;font-weight:700;min-width:40px;min-height:36px;padding:4px 8px;border:1.5px solid var(--linie);border-radius:6px;background:var(--flaeche);color:var(--text);cursor:pointer";
  const STIL_BITS = "font-family:ui-monospace,Consolas,monospace;font-size:1.45rem;letter-spacing:0.14em;font-weight:700;margin:6px 0";

  // ---------- Zeichnung der Übertragungsstrecke ----------
  function anzeigeAufbau() {
    const bits = asciiBits(zustand.uebungZeichen);
    const fertig = zustand.uebungGeloest.has(zustand.uebungZeichen);
    const wort = fertig ? mitParitaet(bits) : bits + "?";
    return { i: 0, zeichen: zustand.uebungZeichen, gesendet: wort, empfangen: wort, gekippt: [], fertig };
  }

  function zeichne() {
    const cText = farbe("--text"), cLeise = farbe("--text-leise"), cAkzent = farbe("--akzent"),
          cFehler = farbe("--fehler", "#b3334f"), cFlaeche = farbe("--flaeche");
    ctx.clearRect(0, 0, W, H);
    ctx.textAlign = "start"; ctx.lineJoin = "round";

    function blitz(x, y, s) {
      ctx.strokeStyle = cFehler; ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(x + 4 * s, y);
      ctx.lineTo(x - 2 * s, y + 7 * s);
      ctx.lineTo(x + 2 * s, y + 7 * s);
      ctx.lineTo(x - 4 * s, y + 14 * s);
      ctx.stroke();
    }
    function kasten(y0, h, label) {
      ctx.strokeStyle = cText; ctx.lineWidth = 2; ctx.fillStyle = cFlaeche;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(14, y0, W - 28, h, 10); else ctx.rect(14, y0, W - 28, h);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = cLeise; ctx.font = "bold 12px system-ui, sans-serif";
      ctx.fillText(label.toUpperCase(), 26, y0 + 19);
    }
    // 9 Bitzellen (8 Nutzbits + abgesetztes Paritätsbit); gekippte: Blitz + Unterstreichung
    function bitZellen(bits, y, gekippt) {
      const zb = 30, gap = 2, extra = 8;
      const x0 = (W - (9 * zb + 8 * gap + extra)) / 2;
      for (let b = 0; b < 9; b++) {
        const x = x0 + b * (zb + gap) + (b === 8 ? extra : 0);
        const kipp = gekippt.includes(b);
        ctx.lineWidth = 1.5; ctx.strokeStyle = b === 8 ? cAkzent : cLeise;
        ctx.strokeRect(x, y, zb, 34);
        ctx.font = "bold 19px ui-monospace, Consolas, monospace"; ctx.textAlign = "center";
        ctx.fillStyle = kipp ? cFehler : cText;
        ctx.fillText(bits[b] ?? "", x + zb / 2, y + 24);
        if (kipp) {
          ctx.strokeStyle = cFehler; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(x + 5, y + 29.5); ctx.lineTo(x + zb - 5, y + 29.5); ctx.stroke();
          blitz(x + zb / 2, y - 17, 0.9);
        }
        ctx.font = "10px system-ui, sans-serif"; ctx.fillStyle = b === 8 ? cAkzent : cLeise;
        ctx.fillText(b === 8 ? "P" : String(b), x + zb / 2, y + 46);
        ctx.textAlign = "start";
      }
    }

    const aufbau = zustand.phase === "aufbau";
    const lauf = zustand.laeufe[schluessel(zustand.p)];
    let senderItem = null, empfItem = null, kopf;
    if (aufbau) {
      senderItem = empfItem = anzeigeAufbau();
      kopf = "Vorschau: Kanal störungsfrei";
    } else if (zustand.flug && lauf) {
      const n = Math.min(zustand.flug.idx, lauf.length - 1);
      senderItem = lauf[n];
      empfItem = zustand.flug.idx > 0 ? lauf[Math.min(zustand.flug.idx, lauf.length) - 1] : null;
      kopf = `Übertragung ${Math.min(zustand.flug.idx + 1, lauf.length)}/${lauf.length} · p = ${prozent(zustand.p)} %`;
    } else if (zustand.auswahl) {
      senderItem = empfItem = zustand.auswahl;
      kopf = `Inspektor: Übertragung ${zustand.auswahl.i} · p = ${prozent(zustand.p)} %`;
    } else if (lauf) {
      senderItem = empfItem = lauf[lauf.length - 1];
      kopf = `Lauf fertig: ${lauf.length} Wörter · p = ${prozent(zustand.p)} % (zuletzt: Nr. ${lauf.length})`;
    } else {
      kopf = `Bereit · p = ${prozent(zustand.p)} % — noch keine Übertragung`;
    }
    ctx.fillStyle = cLeise; ctx.font = "12px system-ui, sans-serif";
    ctx.fillText(kopf, 14, 16);

    // Sender
    kasten(26, 142, "Sender");
    if (senderItem) {
      ctx.fillStyle = cText; ctx.font = "bold 20px system-ui, sans-serif";
      ctx.fillText(`„${senderItem.zeichen}“`, 26, 66);
      ctx.fillStyle = cLeise; ctx.font = "12px system-ui, sans-serif";
      ctx.fillText(`ASCII ${senderItem.zeichen.charCodeAt(0)} + Paritätsbit`, 74, 61);
      bitZellen(senderItem.gesendet, 96, []);
    } else {
      ctx.fillStyle = cLeise; ctx.font = "13px system-ui, sans-serif";
      ctx.fillText("Wähle eine Störrate und starte den Lauf.", 26, 96);
    }

    // Kanal (gestrichelte Leitung)
    ctx.strokeStyle = cLeise; ctx.lineWidth = 2; ctx.setLineDash([7, 6]);
    ctx.beginPath(); ctx.moveTo(168, 176); ctx.lineTo(168, 462); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(192, 176); ctx.lineTo(192, 462); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = cLeise; ctx.font = "12px system-ui, sans-serif";
    ctx.fillText("Kanal", 22, 250);
    ctx.fillText(aufbau ? "störungsfrei" : `Störrate ${prozent(zustand.p)} %`, 22, 268);

    // Blitze des angezeigten Worts entlang der Leitung
    const blitzWort = zustand.flug ? senderItem : empfItem;
    if (!aufbau && blitzWort) {
      const liste = blitzWort.gekippt.slice(0, 4);
      liste.forEach((b, j) => {
        const y = 205 + j * 62;
        blitz(180, y, 1.5);
        ctx.fillStyle = cFehler; ctx.font = "bold 12px system-ui, sans-serif";
        ctx.fillText(b === 8 ? "Paritätsbit kippt!" : `Bit ${b} kippt!`, 210, y + 12);
      });
      if (blitzWort.gekippt.length > 4) {
        ctx.fillStyle = cFehler;
        ctx.fillText(`+ ${blitzWort.gekippt.length - 4} weitere`, 210, 205 + 4 * 62);
      }
      if (!blitzWort.gekippt.length && !zustand.flug) {
        ctx.fillStyle = cLeise; ctx.fillText("keine Störung bei diesem Wort", 210, 320);
      }
    }

    // fliegendes Wort während der Animation
    if (zustand.flug && senderItem) {
      const f = Math.min(1, (performance.now() - zustand.flug.beginn) / zustand.flug.dauerProWort - zustand.flug.idx);
      const y = 180 + f * 250;
      ctx.fillStyle = cFlaeche; ctx.strokeStyle = cAkzent; ctx.lineWidth = 2;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(154, y, 52, 26, 6); else ctx.rect(154, y, 52, 26);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = cText; ctx.font = "bold 14px system-ui, sans-serif"; ctx.textAlign = "center";
      ctx.fillText(senderItem.zeichen, 180, y + 18);
      ctx.textAlign = "start";
    }

    // Empfänger
    kasten(470, 152, "Empfänger");
    if (empfItem) {
      bitZellen(empfItem.empfangen, 508, empfItem.gekippt);
      const anz = einsen(empfItem.empfangen.replace("?", ""));
      ctx.font = "13px system-ui, sans-serif";
      if (aufbau && !empfItem.fertig) {
        ctx.fillStyle = cText;
        ctx.fillText(`Einsen bisher: ${anz} — Paritätsbit fehlt noch:`, 26, 580);
        ctx.fillText("bestimme es rechts in der Mini-Übung!", 26, 600);
      } else {
        const gerade = anz % 2 === 0;
        ctx.fillStyle = cText;
        ctx.fillText(`Er zählt die Einsen: ${anz} → ${gerade ? "gerade" : "ungerade"}`, 26, 580);
        ctx.font = "bold 14px system-ui, sans-serif";
        ctx.fillStyle = gerade ? cText : cFehler;
        ctx.fillText(gerade ? "✓ Parität ok — Wort angenommen" : "✗ Fehler erkannt! (Aber wo?)", 26, 602);
      }
    } else {
      ctx.fillStyle = cLeise; ctx.font = "13px system-ui, sans-serif";
      ctx.fillText("wartet auf das erste Wort …", 26, 540);
    }
  }

  // ---------- Lauf mit Animation ----------
  function sperreKnoepfe(an) {
    const senden = panel.querySelector("#exp-senden");
    if (senden) senden.disabled = an;
    panel.querySelectorAll('input[name="exp-p"]').forEach(r => { r.disabled = an; });
  }
  function flugTick() {
    const flug = zustand.flug;
    if (!flug) return;
    flug.idx = Math.floor((performance.now() - flug.beginn) / flug.dauerProWort);
    aktualisiereZaehler(Math.min(flug.idx, WOERTER_JE_LAUF));
    zeichne();
    if (flug.idx >= WOERTER_JE_LAUF) {
      zustand.flug = null; zustand.laeuft = false;
      sperreKnoepfe(false); zeigeChips(); zeichne();
    } else {
      requestAnimationFrame(flugTick);
    }
  }
  function starteLauf() {
    if (zustand.laeuft) return;
    const key = schluessel(zustand.p);
    if (!zustand.laeufe[key]) zustand.laeufe[key] = fuehreLaufAus(zustand.p);
    zustand.auswahl = null;
    zeigeDetail();
    if (reduziert) {
      aktualisiereZaehler(WOERTER_JE_LAUF); zeigeChips(); zeichne();
      return;
    }
    zustand.laeuft = true;
    zustand.flug = { beginn: performance.now(), dauerProWort: 70, idx: 0 };
    sperreKnoepfe(true);
    const chips = panel.querySelector("#exp-chips");
    if (chips) chips.innerHTML = "";
    requestAnimationFrame(flugTick);
  }
  function aktualisiereZaehler(n) {
    const zelleK = panel.querySelector("#exp-z-korrekt");
    if (!zelleK) return;
    const lauf = zustand.laeufe[schluessel(zustand.p)];
    const z = lauf && n ? zaehle(lauf.slice(0, n)) : null;
    zelleK.textContent = z ? String(z.korrekt) : "–";
    panel.querySelector("#exp-z-erkannt").textContent = z ? String(z.erkannt) : "–";
    panel.querySelector("#exp-z-unerkannt").textContent = z ? String(z.unerkannt) : "–";
    const anzeige = panel.querySelector("#exp-p-anzeige");
    if (anzeige) anzeige.textContent = prozent(zustand.p);
  }

  // ---------- Panel: Aufbau (mit Mini-Übung) ----------
  function panelAufbau() {
    const bits = asciiBits(zustand.uebungZeichen);
    const anzahl = zustand.uebungGeloest.size;
    panel.innerHTML = `
      <h2>Aufbau und Idee</h2>
      <p>Der <strong>Sender</strong> schickt Zeichen als <strong>ASCII-Bytes</strong> (8 Bit) durch einen gestörten <strong>Kanal</strong>: Dort kann jedes Bit mit einer kleinen Wahrscheinlichkeit <strong>kippen</strong> (aus 0 wird 1 und umgekehrt). Damit das auffällt, hängt der Sender ein <strong>Paritätsbit</strong> an. Bei <em>gerader Parität</em> wählt er es so, dass die Anzahl der Einsen im 9-Bit-Wort <strong>gerade</strong> ist. Der Empfänger zählt nach: ungerade ⇒ <strong>„Fehler erkannt!“</strong></p>
      <p class="exp-hinweis">Beispiel „K“ = 0100 1011: vier Einsen — schon gerade —, also Paritätsbit <strong>0</strong>. Gesendet werden die 9 Bits 0100 1011 <strong>0</strong>.</p>
      <p><strong>Plan:</strong> Erst bestimmst du selbst Paritätsbits (unten), dann überträgst du je 50 Wörter bei drei Störraten, protokollierst die Zähler und untersuchst in der Auswertung, welche Fehler durchrutschen — und wie man sie sogar orten kann. Überlege vorher: Wie viele von 50 Wörtern kommen bei 10 % Störrate je Bit wohl unversehrt an?</p>
      <h3>Mini-Übung: Paritätsbit selbst bestimmen</h3>
      <p>Pflicht vor der Durchführung: <strong>drei verschiedene Zeichen</strong> (geschafft: <strong>${anzahl} von 3</strong>${anzahl ? " — " + [...zustand.uebungGeloest].map(esc).join(", ") : ""}).</p>
      <label for="exp-zeichen"><strong>Zeichen wählen (A–Z):</strong></label>
      <select id="exp-zeichen" class="exp-wahl">
        ${ALPHABET.map(z => `<option value="${z}" ${z === zustand.uebungZeichen ? "selected" : ""}>${zustand.uebungGeloest.has(z) ? "✓ " : ""}${z}</option>`).join("")}
      </select>
      <p style="${STIL_BITS}" id="exp-bits-gross" aria-label="ASCII-Bits von ${esc(zustand.uebungZeichen)}: ${bits.split("").join(" ")}">${nibbeln(bits)}</p>
      <form id="exp-paritaet" class="exp-ablesen">
        <label for="exp-pbit">Dein Paritätsbit (0 oder 1):</label>
        <input id="exp-pbit" class="exp-eingabe" inputmode="numeric" autocomplete="off" maxlength="1" style="width:3em">
        <button class="knopf">Prüfen</button>
      </form>
      <p id="exp-meldung" class="exp-meldung" aria-live="polite"></p>
      <button class="knopf" id="exp-weiter1" ${anzahl >= 3 ? "" : "disabled"}>Zur Durchführung</button>`;
    panel.querySelector("#exp-zeichen").addEventListener("change", ev => {
      zustand.uebungZeichen = ev.target.value;
      panelAufbau(); zeichne();
    });
    panel.querySelector("#exp-paritaet").addEventListener("submit", ev => {
      ev.preventDefault();
      const meldung = panel.querySelector("#exp-meldung");
      const roh = panel.querySelector("#exp-pbit").value.trim();
      const zeichen = zustand.uebungZeichen, b = asciiBits(zeichen);
      if (roh !== "0" && roh !== "1") {
        meldung.textContent = "Gib 0 oder 1 ein — das Paritätsbit ist ein einzelnes Bit.";
        return;
      }
      if (Number(roh) !== paritaetsBit(b)) {
        meldung.textContent = `✗ Zähl noch einmal: Wie viele Einsen stecken in ${nibbeln(b)}? Mit Paritätsbit muss die Gesamtzahl gerade sein. Probier es gleich nochmal!`;
        return;
      }
      const neu = !zustand.uebungGeloest.has(zeichen);
      zustand.uebungGeloest.add(zeichen);
      panelAufbau(); zeichne();
      panel.querySelector("#exp-meldung").textContent =
        `✓ Richtig: ${nibbeln(b)} hat ${einsen(b)} Einsen — ${einsen(b) % 2 === 0 ? "gerade" : "ungerade"} —, also Paritätsbit ${paritaetsBit(b)}. Gesendet wird ${nibbeln(mitParitaet(b))}.`
        + (zustand.uebungGeloest.size < 3 ? " Wähle ein neues Zeichen!" : " Alle drei geschafft — weiter zur Durchführung!")
        + (neu ? "" : " (Dieses Zeichen zählte schon.)");
    });
    panel.querySelector("#exp-weiter1").addEventListener("click", () => wechslePhase("messen"));
  }

  // ---------- Panel: Durchführung ----------
  function panelMessen() {
    if (zustand.uebungGeloest.size < 3) {
      panel.innerHTML = `
        <h2>Durchführung</h2>
        <p>Bestimme zuerst in Phase 1 für <strong>drei Zeichen</strong> das Paritätsbit selbst — dann weißt du genau, was der Sender gleich tausendfach automatisch macht.</p>
        <button class="knopf" id="exp-zurueck0">Zum Aufbau</button>`;
      panel.querySelector("#exp-zurueck0").addEventListener("click", () => wechslePhase("aufbau"));
      return;
    }
    panel.innerHTML = `
      <h2>Durchführung</h2>
      <p>Wähle eine <strong>Störrate</strong> und übertrage <strong>50 zufällige Zeichen</strong>. Der Zähler führt automatisch Buch — du überträgst die Endstände in die Messtabelle. Miss <strong>alle drei</strong> Störraten.</p>
      <div class="exp-knopfzeile" role="radiogroup" aria-label="Störrate je Bit wählen">
        ${STOERRATEN.map(p => `<label style="display:inline-flex;align-items:center;gap:6px;border:1.5px solid var(--linie);border-radius:999px;padding:6px 12px;cursor:pointer"><input type="radio" name="exp-p" value="${p}" ${p === zustand.p ? "checked" : ""}>${prozent(p)} % je Bit</label>`).join("")}
      </div>
      <div class="exp-knopfzeile">
        <button class="knopf" id="exp-senden">50 Wörter übertragen</button>
      </div>
      <table class="exp-tabelle" aria-label="Automatischer Zähler des aktuellen Laufs">
        <thead><tr><th style="text-align:left">Zähler (p = <span id="exp-p-anzeige">${prozent(zustand.p)}</span> %)</th><th>Anzahl</th></tr></thead>
        <tbody>
          <tr><td style="text-align:left">✓ korrekt angekommen</td><td id="exp-z-korrekt">–</td></tr>
          <tr><td style="text-align:left">⚡ Fehler erkannt (Parität ungerade)</td><td id="exp-z-erkannt">–</td></tr>
          <tr><td style="text-align:left">✗ Fehler unerkannt (Parität stimmt, Wort trotzdem falsch)</td><td id="exp-z-unerkannt">–</td></tr>
        </tbody>
      </table>
      <h3>Einzelwort-Inspektor</h3>
      <p>Klick eine Übertragung an: gekippte Bits sind mit ⚡ und Unterstreichung markiert. Such dir besonders ein ✗-Wort heraus — dort kippten mehrere Bits!</p>
      <div id="exp-chips" style="display:flex;flex-wrap:wrap;gap:4px;margin:8px 0" aria-label="Liste der 50 Übertragungen"></div>
      <div id="exp-detail" aria-live="polite"></div>
      <h3>Messtabelle (Protokoll)</h3>
      <p>Übertrage die drei Zählerstände <em>exakt</em> — für jede Störrate einen 50er-Lauf.</p>
      <form id="exp-protokoll">
        <div style="overflow-x:auto"><table class="exp-tabelle">
          <thead><tr><th>p</th><th>korrekt</th><th>erkannt</th><th>unerkannt</th><th>geprüft</th></tr></thead>
          <tbody>${STOERRATEN.map((p, idx) => `<tr>
            <td>${prozent(p)} %</td>
            ${["korrekt", "erkannt", "unerkannt"].map(art => `<td><input class="exp-eingabe" style="width:3.5em" id="exp-prot-${idx}-${art}" inputmode="numeric" autocomplete="off" value="${esc(zustand.protokollEingaben["exp-prot-" + idx + "-" + art] ?? "")}" aria-label="Anzahl ${art} bei Störrate ${prozent(p)} Prozent"></td>`).join("")}
            <td id="exp-prot-status-${idx}">–</td></tr>`).join("")}
          </tbody>
        </table></div>
        <button class="knopf">Protokoll prüfen</button>
      </form>
      <p id="exp-meldung" class="exp-meldung" aria-live="polite"></p>
      <button class="knopf" id="exp-weiter2" ${zustand.protokollOk ? "" : "disabled"}>Zur Auswertung</button>`;
    panel.querySelectorAll('input[name="exp-p"]').forEach(r => r.addEventListener("change", () => {
      zustand.p = Number(r.value);
      zustand.auswahl = null;
      const lauf = zustand.laeufe[schluessel(zustand.p)];
      aktualisiereZaehler(lauf ? lauf.length : 0);
      zeigeChips(); zeigeDetail(); zeichne();
    }));
    panel.querySelector("#exp-senden").addEventListener("click", starteLauf);
    panel.querySelector("#exp-protokoll").addEventListener("input", ev => {
      if (ev.target.id) zustand.protokollEingaben[ev.target.id] = ev.target.value;
    });
    panel.querySelector("#exp-protokoll").addEventListener("submit", ev => {
      ev.preventDefault(); pruefeProtokoll();
    });
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
    const lauf = zustand.laeufe[schluessel(zustand.p)];
    aktualisiereZaehler(lauf ? lauf.length : 0);
    zeigeChips(); zeigeDetail();
  }

  function zeigeChips() {
    const ziel = panel.querySelector("#exp-chips");
    if (!ziel) return;
    const lauf = zustand.laeufe[schluessel(zustand.p)];
    if (!lauf || zustand.laeuft) {
      ziel.innerHTML = zustand.laeuft ? "" : '<p class="exp-meldung">Für diese Störrate gibt es noch keinen Lauf.</p>';
      return;
    }
    const info = { korrekt: ["✓", "korrekt angekommen"], erkannt: ["⚡", "Fehler erkannt"], unerkannt: ["✗", "Fehler unerkannt"] };
    ziel.innerHTML = lauf.map(u => {
      const gewaehlt = zustand.auswahl && zustand.auswahl.i === u.i;
      return `<button type="button" data-i="${u.i}" aria-pressed="${!!gewaehlt}" aria-label="Übertragung ${u.i} (Zeichen ${u.zeichen}): ${info[u.status][1]}" style="${STIL_ZELLKNOPF}${gewaehlt ? ";border-color:var(--akzent);border-width:2.5px" : ""}">${u.i}&hairsp;${info[u.status][0]}</button>`;
    }).join("");
    ziel.querySelectorAll("[data-i]").forEach(k => k.addEventListener("click", () => {
      zustand.auswahl = lauf[Number(k.dataset.i) - 1];
      zeigeChips(); zeigeDetail(); zeichne();
    }));
  }

  function zeigeDetail() {
    const ziel = panel.querySelector("#exp-detail");
    if (!ziel) return;
    const u = zustand.auswahl;
    if (!u) { ziel.innerHTML = ""; return; }
    const kipper = u.gekippt.length;
    const zelle = (z, kipp) => kipp
      ? `<td>⚡<u style="text-decoration-thickness:2.5px"><strong>${z}</strong></u></td>`
      : `<td>${z}</td>`;
    const texte = {
      korrekt: "✓ Unverändert angekommen — die Parität ist gerade, der Empfänger nimmt das Wort an.",
      erkannt: `⚡ ${kipper === 1 ? "1 Bit ist" : kipper + " Bits sind"} gekippt — die Einsen-Zahl ist ungerade: Der Empfänger meldet „Fehler erkannt!“. Welches Bit es war, weiß er allerdings nicht.`,
      unerkannt: `✗ ${kipper} Bits sind gekippt — die Einsen-Zahl ist damit wieder gerade: Der Empfänger merkt nichts und nimmt ein falsches Wort an. Unerkannter Fehler!`
    };
    ziel.innerHTML = `
      <p><strong>Übertragung ${u.i}</strong> — gesendet: „${esc(u.zeichen)}“ (ASCII ${u.zeichen.charCodeAt(0)}) · gekippt: ${u.gekippt.map(b => b === 8 ? "P" : "Bit " + b).join(", ") || "—"}</p>
      <div style="overflow-x:auto"><table class="exp-tabelle">
        <thead><tr><th></th>${Array.from({ length: 9 }, (_, b) => `<th scope="col">${b === 8 ? "P" : b}</th>`).join("")}</tr></thead>
        <tbody>
          <tr><th scope="row" style="text-align:left">gesendet</th>${[...u.gesendet].map(z => zelle(z, false)).join("")}</tr>
          <tr><th scope="row" style="text-align:left">empfangen</th>${[...u.empfangen].map((z, b) => zelle(z, u.gekippt.includes(b))).join("")}</tr>
        </tbody>
      </table></div>
      <p class="exp-meldung">${texte[u.status]}</p>`;
  }

  function pruefeProtokoll() {
    const meldung = panel.querySelector("#exp-meldung");
    let alleOk = true, fehltLauf = false, leer = false;
    STOERRATEN.forEach((p, idx) => {
      const status = panel.querySelector(`#exp-prot-status-${idx}`);
      const lauf = zustand.laeufe[schluessel(p)];
      if (!lauf) { fehltLauf = true; alleOk = false; status.textContent = "Lauf fehlt"; return; }
      const soll = zaehle(lauf);
      let zeileOk = true, zeileLeer = false;
      for (const art of ["korrekt", "erkannt", "unerkannt"]) {
        const feld = panel.querySelector(`#exp-prot-${idx}-${art}`);
        if (feld.value.trim() === "") { zeileLeer = true; continue; }
        if (!ablesungOk(parseDezimal(feld.value), soll[art], 0)) zeileOk = false;
      }
      if (zeileLeer) { leer = true; alleOk = false; status.textContent = "–"; }
      else { status.textContent = zeileOk ? "✓" : "✗"; if (!zeileOk) alleOk = false; }
    });
    if (fehltLauf) meldung.textContent = "Mindestens eine Störrate fehlt noch — wähle sie oben aus und übertrage 50 Wörter.";
    else if (leer) meldung.textContent = "Noch nicht alle Felder ausgefüllt — auch eine 0 ist ein Messwert.";
    else if (!alleOk) meldung.textContent = "✗ Mindestens ein Wert weicht vom Zähler ab. Stelle die jeweilige Störrate ein und lies den Zähler noch einmal ab.";
    else {
      zustand.protokollOk = true;
      meldung.textContent = "✓ Protokoll vollständig — weiter zur Auswertung!";
      panel.querySelector("#exp-weiter2").disabled = false;
    }
  }

  // ---------- Panel: Auswertung ----------
  function panelAuswerten() {
    if (!zustand.protokollOk) {
      panel.innerHTML = `
        <h2>Auswertung</h2>
        <p>Hier fehlt noch deine Messreihe: Übertrage erst je 50 Wörter bei allen drei Störraten und trage die Zähler ins Protokoll ein — dann nehmen wir die Fehler auseinander.</p>
        <button class="knopf" id="exp-zurueck0">Zur Durchführung</button>`;
      panel.querySelector("#exp-zurueck0").addEventListener("click", () => wechslePhase("messen"));
      return;
    }
    const ergebnisse = STOERRATEN.map(p => ({ p, ...zaehle(zustand.laeufe[schluessel(p)]) }));
    const faktor = pUnerkanntTheorie(0.1) / pUnerkanntTheorie(0.02);
    panel.innerHTML = `
      <h2>Auswertung</h2>
      <h3>1 · Erkenntnisse</h3>
      <p><strong>Frage 1:</strong> Warum entgehen manche Fehler der Paritätsprüfung?</p>
      <select id="exp-frage1" class="exp-wahl" aria-label="Erklärung auswählen">
        <option value="">— wähle eine Erklärung —</option>
        <option value="gerade">Eine gerade Anzahl gekippter Bits hebt sich in der Einsen-Zählung auf</option>
        <option value="pbit">Das Paritätsbit kann selbst kippen — dann stimmt gar nichts mehr</option>
        <option value="zufall">Zufall — manchmal übersieht die Prüfung eben etwas</option>
      </select>
      <p id="exp-frage1-meldung" class="exp-meldung" aria-live="polite"></p>
      <p><strong>Frage 2:</strong> Der Empfänger meldet „Fehler erkannt!“ — kann er das Wort auch reparieren?</p>
      <select id="exp-frage2" class="exp-wahl" aria-label="Antwort auswählen">
        <option value="">— wähle eine Antwort —</option>
        <option value="nein">Nein — er weiß nur, dass ein Bit gekippt ist, aber nicht welches</option>
        <option value="pbit">Ja — er kippt einfach das Paritätsbit zurück</option>
        <option value="probieren">Ja — er probiert alle 9 Bits durch, eines wird schon passen</option>
      </select>
      <p id="exp-frage2-meldung" class="exp-meldung" aria-live="polite"></p>
      <h3>2 · Wenn man wissen will, WO: 2D-Blockparität</h3>
      <p>Schreibe 16 Bits in ein 4×4-Gitter und sichere <strong>jede Zeile und jede Spalte</strong> mit einem eigenen Paritätsbit (gerade Parität). Kippt ein Bit, passen <strong>genau eine Zeilen- und genau eine Spaltenparität</strong> nicht mehr — ihr Kreuzungspunkt verrät das Bit. Unten hat der Kanal <strong>ein Bit gekippt</strong>; unstimmige Paritäten sind mit ✗ markiert. <strong>Klick das gekippte Bit an!</strong></p>
      <div id="exp-block"></div>
      <p id="exp-block-meldung" class="exp-meldung" aria-live="polite"></p>
      <h3>3 · Unerkannte Fehler und Störrate</h3>
      <div style="overflow-x:auto"><table class="exp-tabelle">
        <thead><tr><th>p</th><th>unerkannt (von ${WOERTER_JE_LAUF})</th><th>Quote</th><th>Theorie erwartet</th></tr></thead>
        <tbody>${ergebnisse.map(e => `<tr><td>${prozent(e.p)} %</td><td>${e.unerkannt}</td><td>${komma(e.unerkannt / WOERTER_JE_LAUF * 100, 0)} %</td><td>${komma(pUnerkanntTheorie(e.p) * WOERTER_JE_LAUF, 1)}</td></tr>`).join("")}</tbody>
      </table></div>
      <p>Die Störrate wächst von 2 % auf 10 % nur auf das <strong>5-Fache</strong> — die Wahrscheinlichkeit eines unerkannten Fehlers laut Rechnung aber etwa auf das <strong>${komma(faktor, 0)}-Fache</strong>. Sie steigt <strong>überproportional</strong>, denn dafür müssen <em>mindestens zwei</em> Bits desselben Wortes kippen: Wahrscheinlichkeit ≈ 36 · p² (bei 9 Bits). Dein 50er-Lauf streut um die Erwartung — typisch für eine kleine Stichprobe, vergleiche die letzte Spalte.</p>
      <h3>4 · Export und Fehlerbetrachtung</h3>
      <details class="exp-fehler"><summary>Fehlerbetrachtung — was kostet das Paritätsbit, und wo versagt es?</summary>
        <p><strong>Preis:</strong> Für 8 Nutzbits gehen 9 Bits über die Leitung — rund <strong>12,5 % Überhang</strong>, der keine Nutzdaten transportiert. Sicherheit gegen Übertragungsfehler kostet immer Bandbreite; die Kunst ist, mit möglichst wenig Zusatzbits möglichst viel zu erkennen.</p>
        <p><strong>Grenzen:</strong> Eine gerade Anzahl Kipper im selben Wort bleibt unsichtbar — und genau das passiert bei steigender Störrate überproportional oft. Bei Störungs-<em>Bursts</em> (viele Kipper direkt nacheinander, z. B. ein Funke am Kabel) versagt ein einzelnes Paritätsbit deshalb schnell. Und reparieren kann es nichts: nur DASS, nicht WO.</p>
        <p><strong>Ausblick:</strong> Echte Systeme nutzen darum längere <strong>Prüfsummen</strong> und <strong>CRC</strong> (mehrere geschickt verrechnete Prüfbits, die auch Bursts fast immer entlarven) — und Speicher mit <strong>ECC</strong> korrigiert Einzelkipper selbstständig, nach derselben Kreuzungs-Idee wie deine Blockparität.</p>
      </details>
      <div class="exp-knopfzeile">
        <button class="knopf zweitrangig" id="exp-csv">Messtabelle als CSV</button>
        <button class="knopf zweitrangig" id="exp-zurueck">Zur Durchführung</button>
      </div>`;
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      csvHerunterladen("paritaet-messreihe.csv",
        ["Stoerrate p je Bit in %", "korrekt", "Fehler erkannt", "Fehler unerkannt", "Quote unerkannt in %", "Theorie: erwartet unerkannt je 50"],
        ergebnisse.map(e => [prozent(e.p), String(e.korrekt), String(e.erkannt), String(e.unerkannt),
          e.unerkannt / WOERTER_JE_LAUF * 100, pUnerkanntTheorie(e.p) * WOERTER_JE_LAUF]));
    });
    panel.querySelector("#exp-frage1").addEventListener("change", ev => {
      const m = panel.querySelector("#exp-frage1-meldung");
      const a = ev.target.value;
      if (a === "gerade") m.textContent = "✓ Genau: Kippen z. B. zwei Bits, ändert sich die Einsen-Zahl um +2, 0 oder −2 — sie bleibt gerade, die Prüfung schlägt nicht an. Solche Wörter trägst du im Inspektor unter ✗.";
      else if (a === "pbit") m.textContent = "✗ Ein beliebter Irrtum: Kippt NUR das Paritätsbit, ist die Einsen-Zahl ungerade — der Fehler wird ganz normal ERKANNT (die 8 Nutzbits sind sogar unversehrt angekommen). Unerkannt bleibt ein Fehler nur, wenn eine GERADE Anzahl Bits kippt.";
      else if (a === "zufall") m.textContent = "✗ Hier ist nichts Zufall: Die Prüfung übersieht einen Fehler genau dann, wenn eine gerade Anzahl Bits gekippt ist. Öffne ein ✗-Wort im Inspektor und zähle die Blitze.";
      else m.textContent = "";
    });
    panel.querySelector("#exp-frage2").addEventListener("change", ev => {
      const m = panel.querySelector("#exp-frage2-meldung");
      const a = ev.target.value;
      if (a === "nein") m.textContent = "✓ Richtig — die Parität sagt nur, DASS etwas kippte, nicht WO. Der Empfänger kann das Wort nur neu anfordern; genau so machen es echte Netzwerkprotokolle. Wie man das WO herausbekommt, zeigt Teil 2.";
      else if (a === "pbit") m.textContent = "✗ Gekippt sein kann jedes der 9 Bits — auch ein Nutzbit. Das Paritätsbit zurückzukippen wäre reines Raten.";
      else if (a === "probieren") m.textContent = "✗ Beim Durchprobieren entstehen 9 verschiedene Kandidaten, alle mit gerader Parität — welcher der richtige war, lässt sich nicht entscheiden. Ohne Zusatzinformation keine Reparatur.";
      else m.textContent = "";
    });
    zeigeBlock();
  }

  // ---------- 2D-Blockparität: Gitter-Runden ----------
  function zeigeBlock() {
    const ziel = panel.querySelector("#exp-block");
    if (!ziel) return;
    if (zustand.blockGespielt >= BLOCK_RUNDEN) {
      ziel.innerHTML = `
        <p><strong>${zustand.blockTreffer} von ${BLOCK_RUNDEN}</strong> gekippten Bits direkt beim ersten Klick lokalisiert${zustand.blockTreffer === BLOCK_RUNDEN ? " — stark!" : " — mit jeder Runde wird der Blick schärfer."}</p>
        <p>Merke: Mit Zeilen- <em>und</em> Spaltenparität kann der Empfänger Einzelkipper nicht nur erkennen, sondern <strong>reparieren</strong> — zurückkippen genügt. Der Preis: 8 Paritätsbits für 16 Nutzbits.</p>
        <button class="knopf zweitrangig" id="exp-block-neu">3 neue Runden</button>`;
      ziel.querySelector("#exp-block-neu").addEventListener("click", () => {
        zustand.blockGespielt = 0; zustand.blockTreffer = 0; zustand.blockDaneben = false;
        zeigeBlock();
        panel.querySelector("#exp-block-meldung").textContent = "";
      });
      return;
    }
    const runde = zustand.blockRunde;
    const original = blockBits(runde);
    const kippIdx = blockKippIndex(runde);
    const gestoert = blockMitKipp(original, kippIdx);
    const zeilenHtml = Array.from({ length: BLOCK_N }, (_, r) => {
      const zellen = Array.from({ length: BLOCK_N }, (_, c) => {
        const idx = r * BLOCK_N + c;
        return `<td><button type="button" data-idx="${idx}" style="${STIL_ZELLKNOPF}" aria-label="Zeile ${r + 1}, Spalte ${c + 1}: Bit ${gestoert[idx]}">${gestoert[idx]}</button></td>`;
      }).join("");
      const falsch = zeilenParitaet(gestoert, r) !== zeilenParitaet(original, r);
      return `<tr><th scope="row">Z${r + 1}</th>${zellen}<td aria-label="Zeilenparität ${zeilenParitaet(original, r)}${falsch ? ", unstimmig" : ", stimmig"}">${zeilenParitaet(original, r)}${falsch ? " ✗" : ""}</td></tr>`;
    }).join("");
    const spaltenHtml = Array.from({ length: BLOCK_N }, (_, c) => {
      const falsch = spaltenParitaet(gestoert, c) !== spaltenParitaet(original, c);
      return `<td aria-label="Spaltenparität ${spaltenParitaet(original, c)}${falsch ? ", unstimmig" : ", stimmig"}">${spaltenParitaet(original, c)}${falsch ? " ✗" : ""}</td>`;
    }).join("");
    ziel.innerHTML = `
      <p>Runde <strong>${zustand.blockGespielt + 1} von ${BLOCK_RUNDEN}</strong> · beim ersten Klick gefunden: <strong>${zustand.blockTreffer}</strong></p>
      <div style="overflow-x:auto"><table class="exp-tabelle" aria-label="Empfangenes 4-mal-4-Bitgitter mit gesendeten Zeilen- und Spaltenparitäten; unstimmige Paritäten sind mit ✗ markiert">
        <thead><tr><th></th><th>S1</th><th>S2</th><th>S3</th><th>S4</th><th>Parität</th></tr></thead>
        <tbody>
          ${zeilenHtml}
          <tr><th scope="row">Parität</th>${spaltenHtml}<td></td></tr>
        </tbody>
      </table></div>`;
    ziel.querySelectorAll("[data-idx]").forEach(k => k.addEventListener("click", () => {
      const meldung = panel.querySelector("#exp-block-meldung");
      if (Number(k.dataset.idx) === kippIdx) {
        const lok = blockLokalisiere(original, gestoert);
        if (!zustand.blockDaneben) zustand.blockTreffer++;
        zustand.blockGespielt++; zustand.blockRunde++; zustand.blockDaneben = false;
        meldung.textContent = `✓ Gefunden! Zeile ${lok.zeile + 1} und Spalte ${lok.spalte + 1} meldeten ✗ — am Kreuzungspunkt sitzt der Kipper. Zurückkippen, fertig: Das ist Fehlerkorrektur.`;
        zeigeBlock();
      } else {
        zustand.blockDaneben = true;
        meldung.textContent = "✗ Noch nicht — such die Zeile mit ✗ und die Spalte mit ✗: Das gesuchte Bit sitzt genau an ihrem Kreuzungspunkt.";
      }
    }));
  }

  // ---------- Start ----------
  zeichne();
  wechslePhase("aufbau");
}
