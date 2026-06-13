// experiment.js — Interaktives Experiment: Galton-Brett (Klasse 8–10).
// Kugeln fallen durch n = 8 Nagelreihen; an jedem Nagel geht es mit
// p = 1/2 nach links oder rechts. Das Fach k (0…8) ist genau die Anzahl
// der Rechts-Entscheidungen — ein mehrstufiger Zufallsversuch.
// Messpraxis statt Knopfdruck-Ergebnis: Häufigkeiten SELBST ins Protokoll
// übertragen, Theorie (Pascal-Dreieck, Binomialkoeffizienten) erst nach
// eigener Rechnung aufdecken, Abweichungen diskutieren.
// Jede Kugel ist deterministisch geseedet (Lauf-Nr. + Kugel-Nr.) —
// dadurch reproduzierbar und in Node testbar.

import {
  mulberry32, seedAus, parseDezimal, komma, ablesungOk, esc,
  farbe, reduzierteBewegung, bauePhasen, csvHerunterladen
} from "../../../assets/js/experiment/helfer.js";

// ---------- feste Größen ----------
export const REIHEN = 8;                 // Nagelreihen n (fest; Verallgemeinerung: siehe Vertiefung)
export const FAECHER = REIHEN + 1;       // Fächer k = 0…8
export const ZIEL_KUGELN = 200;          // Protokoll-Ziel N
export const WEGE_GESAMT = 2 ** REIHEN;  // 256 gleich wahrscheinliche Wege
export const PASCAL_ZEILE_8 = [1, 8, 28, 56, 70, 56, 28, 8, 1];

// ---------- reine Logik (Node-testbar, kein DOM) ----------
export function binomialKoeff(n, k) {
  if (k < 0 || k > n) return 0;
  let w = 1;
  for (let i = 1; i <= k; i++) w = (w * (n - k + i)) / i; // bleibt ganzzahlig exakt (kleine n)
  return Math.round(w);
}
export function wahrscheinlichkeit(k) { return binomialKoeff(REIHEN, k) / WEGE_GESAMT; }
export function erwarteteAnzahl(k, n) { return n * wahrscheinlichkeit(k); }

// Pfad der Kugel Nr. i im Lauf `lauf`: 8 Entscheidungen, 0 = links, 1 = rechts.
export function kugelPfad(lauf, i) {
  const r = mulberry32(seedAus("kugel:" + lauf + ":" + i));
  const pfad = [];
  for (let s = 0; s < REIHEN; s++) pfad.push(r() < 0.5 ? 0 : 1);
  return pfad;
}
export function fachAusPfad(pfad) { return pfad.reduce((a, b) => a + b, 0); }
export function kugelFach(lauf, i) { return fachAusPfad(kugelPfad(lauf, i)); }

// Häufigkeiten der ersten `anzahl` Kugeln eines Laufs (Kugeln zählen ab 1)
export function verteilung(lauf, anzahl) {
  const f = new Array(FAECHER).fill(0);
  for (let i = 1; i <= anzahl; i++) f[kugelFach(lauf, i)]++;
  return f;
}

// ---------- TESTS (laufen in Node, Modulebene DOM-frei) ----------
export const TESTS = [
  { name: "binomialKoeff(8,k) exakt 1,8,28,56,70,56,28,8,1", ok: () =>
      PASCAL_ZEILE_8.every((w, k) => binomialKoeff(8, k) === w) },
  { name: "Summe aller Wege = 256", ok: () =>
      Array.from({ length: FAECHER }, (_, k) => binomialKoeff(8, k)).reduce((a, b) => a + b, 0) === WEGE_GESAMT },
  { name: "Symmetrie C(8,k) = C(8,8−k)", ok: () =>
      [0, 1, 2, 3, 4].every(k => binomialKoeff(8, k) === binomialKoeff(8, 8 - k)) },
  { name: "Wahrscheinlichkeiten summieren zu 1", ok: () =>
      Math.abs(Array.from({ length: FAECHER }, (_, k) => wahrscheinlichkeit(k)).reduce((a, b) => a + b, 0) - 1) < 1e-12 },
  { name: "kugelPfad deterministisch: gleicher Seed → gleicher Pfad/gleiches Fach", ok: () =>
      [1, 2, 17, 200].every(i =>
        kugelPfad(3, i).join("") === kugelPfad(3, i).join("") && kugelFach(3, i) === kugelFach(3, i)) },
  { name: "Pfad gültig: genau 8 Bits aus {0,1}", ok: () =>
      Array.from({ length: 50 }, (_, j) => kugelPfad(1, j + 1))
        .every(p => p.length === REIHEN && p.every(b => b === 0 || b === 1)) },
  { name: "Fach = Anzahl der Rechts-Bits (nachgezählt)", ok: () =>
      Array.from({ length: 50 }, (_, j) => j + 1)
        .every(i => kugelFach(2, i) === kugelPfad(2, i).filter(b => b === 1).length)
      && fachAusPfad([1, 1, 1, 1, 1, 1, 1, 1]) === 8 && fachAusPfad([0, 0, 0, 0, 0, 0, 0, 0]) === 0
      && fachAusPfad([1, 0, 1, 0, 1, 0, 0, 0]) === 3 },
  { name: "Verteilung: 20000 Kugeln weichen je Fach < 0,015 von C(8,k)/256 ab", ok: () => {
      const f = verteilung(1, 20000);
      return f.every((n, k) => Math.abs(n / 20000 - wahrscheinlichkeit(k)) < 0.015);
    } },
  { name: "Erwartungswerte N·p: Mitte 54,6875 bei N = 200, Summe = N", ok: () =>
      Math.abs(erwarteteAnzahl(4, 200) - 200 * 70 / 256) < 1e-12
      && Math.abs(Array.from({ length: FAECHER }, (_, k) => erwarteteAnzahl(k, 200)).reduce((a, b) => a + b, 0) - 200) < 1e-9 },
  { name: "Determinismus über Läufe: Lauf 1 == Lauf 1, Lauf 1 ≠ Lauf 2 möglich", ok: () => {
      const a = verteilung(1, 60), b = verteilung(1, 60);
      return a.join() === b.join()
        && Array.from({ length: 60 }, (_, j) => j + 1).some(i => kugelPfad(1, i).join("") !== kugelPfad(2, i).join(""));
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
    lauf: 1,
    gefallen: 0,                              // bisher gefallene Kugeln (= höchste Kugel-Nr.)
    faecher: new Array(FAECHER).fill(0),      // Zählerstände der Fächer
    protokollOk: false,                       // Häufigkeiten korrekt übertragen?
    wegeGeloest: false,                       // Eingabefrage (70 Wege) beantwortet?
    laeuft: false,                            // Animation aktiv?
    kugeln: [],                               // animierte Kugeln {pts, beginn, segDauer, fach}
    stapelListe: [],                          // gerafft einzusortierende Fächer (100-Kugeln-Modus)
    phase: "aufbau"
  };

  // ---------- Grundgerüst: Phasen-Tabs + Canvas + Panel ----------
  const wechslePhase = bauePhasen(wurzel, [
    { id: "aufbau", label: "Aufbau" },
    { id: "messen", label: "Durchführung" },
    { id: "auswerten", label: "Auswertung" }
  ], id => {
    zustand.phase = id;
    if (id === "aufbau") panelAufbau();
    if (id === "messen") panelMessen();
    if (id === "auswerten") panelAuswerten();
  });
  wurzel.insertAdjacentHTML("beforeend", `
    <div class="exp-flaeche">
      <div class="exp-links">
        <canvas id="exp-canvas" width="400" height="620" aria-label="Galton-Brett: Trichter oben, acht versetzte Nagelreihen, darunter neun Fächer mit wachsenden Säulen. Unter jedem Fach stehen seine Nummer k und der Zählerstand."></canvas>
      </div>
      <div class="exp-rechts" id="exp-panel"></div>
    </div>`);
  const canvas = wurzel.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = wurzel.querySelector("#exp-panel");

  // ---------- Geometrie des Bretts (Canvas-Koordinaten) ----------
  const W = canvas.width, H = canvas.height, CX = W / 2;
  const DX = 38, DY = 30;                       // Nagel-/Fachraster
  const Y_START = 48;                           // Trichterauslass
  const Y_REIHE0 = 96;                          // erste Nagelreihe
  const Y_FACH_OBEN = Y_REIHE0 + (REIHEN - 1) * DY + 26; // Oberkante Fächer
  const Y_BODEN = 568;                          // Fachboden

  function saeulenSkala() {
    const maxH = Y_BODEN - Y_FACH_OBEN - 8;
    return maxH / Math.max(60, ...zustand.faecher);
  }

  // Wegpunkte einer Kugel: Trichter → je Reihe über den getroffenen Nagel → ins Fach
  function wegpunkte(pfad, fach) {
    const pts = [{ x: CX, y: Y_START }];
    let versatz = 0; // (#rechts − #links) bisher
    for (let r = 0; r < REIHEN; r++) {
      pts.push({ x: CX + versatz * DX / 2, y: Y_REIHE0 + r * DY - 8 });
      versatz += pfad[r] === 1 ? 1 : -1;
    }
    const fx = CX + (fach - REIHEN / 2) * DX;
    pts.push({ x: fx, y: Y_FACH_OBEN + 12 });
    pts.push({ x: fx, y: Y_BODEN - zustand.faecher[fach] * saeulenSkala() - 7 });
    return pts;
  }

  // ---------- Zeichnung ----------
  function zeichne() {
    const jetzt = performance.now();
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
          cAkzent = farbe("--akzent"), cFlaeche = farbe("--flaeche");
    ctx.clearRect(0, 0, W, H);
    ctx.font = "12px system-ui, sans-serif";

    // Kopfzeile: Lauf + Kugelzahl
    ctx.fillStyle = cText;
    ctx.fillText(`Lauf ${zustand.lauf} · ${zustand.gefallen} Kugeln`, 10, 18);

    // Trichter
    ctx.strokeStyle = cText; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(CX - 34, 22); ctx.lineTo(CX - 7, Y_START);
    ctx.moveTo(CX + 34, 22); ctx.lineTo(CX + 7, Y_START);
    ctx.stroke();

    // Nagelgitter (versetzt): Reihe r hat r+1 Nägel im Abstand DX
    ctx.fillStyle = cText;
    for (let r = 0; r < REIHEN; r++) {
      const y = Y_REIHE0 + r * DY;
      for (let j = 0; j <= r; j++) {
        const x = CX + (2 * j - r) * DX / 2;
        ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 7); ctx.fill();
      }
    }

    // Fächer: Trennwände + Boden
    ctx.strokeStyle = cLeise; ctx.lineWidth = 2;
    for (let j = 0; j <= FAECHER; j++) {
      const x = CX + (j - FAECHER / 2) * DX;
      ctx.beginPath(); ctx.moveTo(x, Y_FACH_OBEN); ctx.lineTo(x, Y_BODEN); ctx.stroke();
    }
    ctx.strokeStyle = cText; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(CX - FAECHER / 2 * DX, Y_BODEN); ctx.lineTo(CX + FAECHER / 2 * DX, Y_BODEN); ctx.stroke();

    // Säulen + Beschriftung (k oben leise, Zähler darunter kräftig)
    const skala = saeulenSkala();
    ctx.textAlign = "center";
    for (let k = 0; k < FAECHER; k++) {
      const x = CX + (k - REIHEN / 2) * DX;
      const h = zustand.faecher[k] * skala;
      if (h > 0) {
        ctx.fillStyle = cAkzent;
        ctx.fillRect(x - DX / 2 + 4, Y_BODEN - h, DX - 8, h);
      }
      ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif";
      ctx.fillText(String(k), x, Y_BODEN + 16);
      ctx.fillStyle = cText; ctx.font = "bold 11px system-ui, sans-serif";
      ctx.fillText(String(zustand.faecher[k]), x, Y_BODEN + 32);
    }
    ctx.textAlign = "start"; ctx.font = "11px system-ui, sans-serif";
    ctx.fillStyle = cLeise;
    ctx.fillText("Fach k", 8, Y_BODEN + 16);
    ctx.fillText("Anzahl", 8, Y_BODEN + 32);

    // animierte Kugeln
    ctx.fillStyle = cAkzent; ctx.strokeStyle = cFlaeche;
    for (const kg of zustand.kugeln) {
      if (jetzt < kg.beginn) continue;
      const t = (jetzt - kg.beginn) / kg.segDauer;
      const seg = Math.min(kg.pts.length - 2, Math.floor(t));
      const f = Math.min(1, t - seg);
      const a = kg.pts[seg], b = kg.pts[seg + 1];
      ctx.beginPath();
      ctx.arc(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f, 5.5, 0, 7);
      ctx.fill();
    }
  }

  // ---------- Kugeln fallen lassen (deterministisch je Lauf + Nr.) ----------
  let animAktiv = false;
  function tick(jetzt) {
    // gerafft: pro Frame ein paar Kugeln direkt einsortieren (100er-Knopf)
    for (let j = 0; j < 3 && zustand.stapelListe.length; j++) {
      zustand.faecher[zustand.stapelListe.shift()]++;
    }
    // animierte Kugeln: gelandete einsortieren
    for (const kg of [...zustand.kugeln]) {
      if (jetzt < kg.beginn) continue;
      if ((jetzt - kg.beginn) / kg.segDauer >= kg.pts.length - 1) {
        zustand.faecher[kg.fach]++;
        zustand.kugeln.splice(zustand.kugeln.indexOf(kg), 1);
      }
    }
    zeichne();
    if (zustand.kugeln.length || zustand.stapelListe.length) {
      requestAnimationFrame(tick);
    } else {
      animAktiv = false;
      zustand.laeuft = false;
      aktualisiereMessPanel();
    }
  }
  function starteAnimation() {
    if (!animAktiv) { animAktiv = true; requestAnimationFrame(tick); }
  }

  function fallenLassen(anzahl) {
    if (zustand.laeuft) return;
    if (zustand.protokollOk) zustand.protokollOk = false; // Zähler ändern sich → neu prüfen
    const start = zustand.gefallen;
    zustand.gefallen += anzahl;
    const nummern = Array.from({ length: anzahl }, (_, j) => start + j + 1);
    if (reduziert) {
      // reduzierte Bewegung: sofort einsortieren, keine Fallanimation
      for (const i of nummern) zustand.faecher[kugelFach(zustand.lauf, i)]++;
      zeichne(); aktualisiereMessPanel();
      return;
    }
    zustand.laeuft = true;
    aktualisiereMessPanel();
    if (anzahl <= 1) {
      const pfad = kugelPfad(zustand.lauf, nummern[0]);
      zustand.kugeln.push({ pts: wegpunkte(pfad, fachAusPfad(pfad)), beginn: performance.now(), segDauer: 80, fach: fachAusPfad(pfad) });
    } else if (anzahl <= 10) {
      nummern.forEach((i, j) => {
        const pfad = kugelPfad(zustand.lauf, i);
        zustand.kugeln.push({ pts: wegpunkte(pfad, fachAusPfad(pfad)), beginn: performance.now() + j * 130, segDauer: 38, fach: fachAusPfad(pfad) });
      });
    } else {
      // gerafft: nur die Zähler wachsen sichtbar
      zustand.stapelListe = nummern.map(i => kugelFach(zustand.lauf, i));
    }
    starteAnimation();
  }

  function neuerLauf() {
    if (zustand.laeuft) return;
    zustand.lauf++;
    zustand.gefallen = 0;
    zustand.faecher.fill(0);
    zustand.protokollOk = false;
    zustand.kugeln = []; zustand.stapelListe = [];
    zeichne();
    if (zustand.phase === "messen") panelMessen();
  }

  // ---------- Panel: Aufbau ----------
  function panelAufbau() {
    panel.innerHTML = `
      <h2>Aufbau und Idee</h2>
      <p>Oben sitzt ein <strong>Trichter</strong>, darunter ein Brett mit <strong>8 versetzten Nagelreihen</strong>, ganz unten <strong>9 Fächer</strong> (k = 0 bis 8). Jede Kugel trifft in jeder Reihe genau einen Nagel und springt dort mit der Wahrscheinlichkeit p = 1/2 nach links oder rechts — 8 Zufallsentscheidungen hintereinander, also ein <strong>mehrstufiger Zufallsversuch</strong>.</p>
      <p><strong>Der entscheidende Trick:</strong> Die Nummer des Fachs, in dem eine Kugel landet, ist genau die <strong>Anzahl ihrer Rechts-Sprünge</strong>. Fach 0 heißt „immer links“, Fach 8 „immer rechts“.</p>
      <p><strong>Plan:</strong> Lass mindestens N = ${ZIEL_KUGELN} Kugeln fallen, übertrage die Zählerstände der Fächer ins Protokoll und vergleiche sie in der Auswertung mit der Theorie. Überlege vorher: In welchem Fach werden wohl die meisten Kugeln landen — und warum?</p>
      <p class="exp-hinweis">Reproduzierbar wie ein gutes Protokoll: Jeder <strong>Lauf</strong> hat eine Nummer, und Kugel Nr. i eines Laufs nimmt immer denselben Weg. „Neuer Lauf“ startet eine frische Zufallsfolge.</p>
      <button class="knopf" id="exp-weiter1">Zur Durchführung</button>`;
    panel.querySelector("#exp-weiter1").addEventListener("click", () => wechslePhase("messen"));
  }

  // ---------- Panel: Durchführung ----------
  function panelMessen() {
    panel.innerHTML = `
      <h2>Durchführung</h2>
      <p>Lauf <strong id="exp-lauf">${zustand.lauf}</strong> · gefallen: <strong id="exp-zaehler">${zustand.gefallen}</strong> Kugeln (Ziel laut Protokoll: <strong>N = ${ZIEL_KUGELN}</strong>)</p>
      <div class="exp-knopfzeile" aria-label="Kugeln fallen lassen">
        <button class="knopf" data-n="1">1 Kugel</button>
        <button class="knopf" data-n="10">10 Kugeln</button>
        <button class="knopf" data-n="100">100 Kugeln (gerafft)</button>
        <button class="knopf zweitrangig" id="exp-neuer-lauf">Neuer Lauf</button>
      </div>
      <h3>Protokoll: Häufigkeiten übertragen</h3>
      <p>Lies die Zählerstände unter den Fächern ab und trage sie <em>exakt</em> ein — das Übertragen ist das Protokollieren.</p>
      <form id="exp-protokoll">
        <table class="exp-tabelle">
          <thead><tr><th>Fach k</th><th>Häufigkeit</th><th>geprüft</th></tr></thead>
          <tbody>${zustand.faecher.map((_, k) => `
            <tr><td>${k}</td>
            <td><input class="exp-eingabe" id="exp-fach-${k}" inputmode="numeric" autocomplete="off" aria-label="Häufigkeit Fach ${k}"></td>
            <td id="exp-status-${k}">–</td></tr>`).join("")}
          </tbody>
        </table>
        <button class="knopf">Protokoll prüfen</button>
      </form>
      <p id="exp-meldung" class="exp-meldung" aria-live="polite"></p>
      <button class="knopf" id="exp-weiter2" ${zustand.protokollOk ? "" : "disabled"}>Zur Auswertung</button>`;
    panel.querySelectorAll("[data-n]").forEach(k =>
      k.addEventListener("click", () => fallenLassen(Number(k.dataset.n))));
    panel.querySelector("#exp-neuer-lauf").addEventListener("click", neuerLauf);
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
    panel.querySelector("#exp-protokoll").addEventListener("submit", ev => {
      ev.preventDefault();
      pruefeProtokoll();
    });
    aktualisiereMessPanel();
  }

  function aktualisiereMessPanel() {
    if (zustand.phase !== "messen") return;
    const z = panel.querySelector("#exp-zaehler");
    if (!z) return;
    z.textContent = String(zustand.gefallen);
    panel.querySelector("#exp-lauf").textContent = String(zustand.lauf);
    panel.querySelectorAll("[data-n]").forEach(k => { k.disabled = zustand.laeuft; });
    panel.querySelector("#exp-neuer-lauf").disabled = zustand.laeuft;
    panel.querySelector("#exp-weiter2").disabled = !zustand.protokollOk;
  }

  function pruefeProtokoll() {
    if (zustand.laeuft) return;
    const meldung = panel.querySelector("#exp-meldung");
    let alleOk = true, leer = false;
    zustand.faecher.forEach((wahr, k) => {
      const feld = panel.querySelector(`#exp-fach-${k}`);
      const status = panel.querySelector(`#exp-status-${k}`);
      const eingabe = parseDezimal(feld.value);
      if (feld.value.trim() === "") { leer = true; status.textContent = "–"; alleOk = false; return; }
      const ok = ablesungOk(eingabe, wahr, 0); // Toleranz 0: die Zähler stehen ja da
      status.textContent = ok ? "✓" : "✗";
      if (!ok) alleOk = false;
    });
    if (leer) {
      meldung.textContent = "Noch nicht alle 9 Fächer eingetragen — auch eine 0 ist ein Messwert.";
    } else if (!alleOk) {
      meldung.textContent = "✗ Mindestens ein Wert stimmt nicht mit dem Zähler überein. Schau noch einmal genau hin.";
    } else if (zustand.gefallen < ZIEL_KUGELN) {
      meldung.textContent = `Alle Werte stimmen — aber das Protokoll verlangt N = ${ZIEL_KUGELN} Kugeln (bisher ${zustand.gefallen}). Lass weitere fallen und prüfe erneut.`;
    } else {
      zustand.protokollOk = true;
      meldung.textContent = "✓ Protokoll vollständig — weiter zur Auswertung!";
    }
    aktualisiereMessPanel();
  }

  // ---------- Panel: Auswertung ----------
  function panelAuswerten() {
    if (!zustand.protokollOk) {
      panel.innerHTML = `
        <h2>Auswertung</h2>
        <p>Hier fehlt noch deine Messreihe: Lass erst mindestens N = ${ZIEL_KUGELN} Kugeln fallen und übertrage die Häufigkeiten ins Protokoll — dann vergleichen wir mit der Theorie.</p>
        <button class="knopf" id="exp-zurueck0">Zur Durchführung</button>`;
      panel.querySelector("#exp-zurueck0").addEventListener("click", () => wechslePhase("messen"));
      return;
    }
    const N = zustand.gefallen;
    const theorieZeilen = zustand.faecher.map((b, k) => `
      <tr><td>${k}</td><td>${b}</td>
      <td>${binomialKoeff(REIHEN, k)}</td>
      <td>${binomialKoeff(REIHEN, k)}/${WEGE_GESAMT} ≈ ${komma(wahrscheinlichkeit(k) * 100, 1)} %</td>
      <td>${komma(erwarteteAnzahl(k, N), 1)}</td></tr>`).join("");
    panel.innerHTML = `
      <h2>Auswertung</h2>
      <h3>1 · Vergleich mit der Theorie</h3>
      ${zustand.wegeGeloest ? `
        <table class="exp-tabelle">
          <thead><tr><th>Fach k</th><th>beobachtet</th><th>Wege C(8;k)</th><th>P(k)</th><th>erwartet (N = ${N})</th></tr></thead>
          <tbody>${theorieZeilen}</tbody>
        </table>
        <p>Jede Kugel nimmt einen von ${WEGE_GESAMT} gleich wahrscheinlichen Wegen. In Fach k führen genau <strong>C(8;k)</strong> Wege („8 über k“, der Binomialkoeffizient) — erwartet werden also N · C(8;k)/${WEGE_GESAMT} Kugeln.</p>` : `
        <p>Jede Kugel „wählt“ 8-mal links/rechts — das ergibt 2⁸ = <strong>${WEGE_GESAMT} gleich wahrscheinliche Wege</strong>. Die Theorie-Spalten erscheinen, sobald du die Schlüsselzahl selbst bestimmt hast:</p>
        <form id="exp-wege" class="exp-ablesen">
          <label for="exp-wege-eingabe">Wie viele der ${WEGE_GESAMT} Wege führen in das mittlere Fach (k = 4)?</label>
          <input id="exp-wege-eingabe" class="exp-eingabe" inputmode="numeric" autocomplete="off">
          <button class="knopf">Prüfen</button>
        </form>
        <p id="exp-wege-meldung" class="exp-meldung" aria-live="polite"></p>
        <details>
          <summary>Tipp: Pascal-Dreieck</summary>
          <p>Zu jedem Nagel führen so viele Wege wie zu den beiden Nägeln darüber <em>zusammen</em> — genau die Bauregel des Pascal-Dreiecks. Zeile 7 ist gegeben, bilde Zeile 8 selbst:</p>
          <pre>Zeile 7:   1   7   21   35   35   21   7   1
Zeile 8:  1   8   ?    ?    ?    ?    ?   8   1</pre>
        </details>`}
      <h3>2 · Diagramm</h3>
      <canvas id="exp-diagramm" class="exp-diagramm" width="440" height="300" aria-label="Säulendiagramm der beobachteten Häufigkeiten je Fach${zustand.wegeGeloest ? ", überlagert mit Punkten für die theoretisch erwarteten Anzahlen" : ""}."></canvas>
      <p>Säulen: beobachtet${zustand.wegeGeloest ? " · Punkte: Theorie (N · P(k))" : " — die Theorie-Punkte erscheinen nach Teil 1"}</p>
      <h3>3 · Erkenntnisse</h3>
      <p><strong>Frage 1:</strong> Warum landen in der Mitte die meisten Kugeln?</p>
      <select id="exp-frage1" class="exp-wahl" aria-label="Erklärung auswählen">
        <option value="">— wähle eine Erklärung —</option>
        <option value="wege">Weil in die Mitte viel mehr Wege führen als an den Rand</option>
        <option value="rollen">Weil die Kugeln von selbst zur Mitte rollen</option>
        <option value="zufall">Weil der Zufall die Mitte bevorzugt</option>
      </select>
      <p id="exp-frage1-meldung" class="exp-meldung" aria-live="polite"></p>
      <p><strong>Frage 2:</strong> Wird die Glockenform glatter oder zackiger, wenn du viel mehr Kugeln fallen lässt?</p>
      <select id="exp-frage2" class="exp-wahl" aria-label="Vorhersage auswählen">
        <option value="">— wähle eine Antwort —</option>
        <option value="glatter">glatter</option>
        <option value="zackiger">zackiger</option>
        <option value="gleich">sie bleibt genau gleich</option>
      </select>
      <p id="exp-frage2-meldung" class="exp-meldung" aria-live="polite"></p>
      <h3>4 · Vertiefung und Export</h3>
      <details class="exp-fehler">
        <summary>Vertiefung: Pascal-Dreieck, n Reihen und die Glockenkurve</summary>
        <p>Zeile 8 des Pascal-Dreiecks zählt die Wege: <strong>1, 8, 28, 56, 70, 56, 28, 8, 1</strong> (Summe ${WEGE_GESAMT}). Unser Brett hat fest n = 8 Reihen — allgemein gilt bei n Reihen: P(Fach k) = C(n;k)/2ⁿ. Das ist die <strong>Binomialverteilung</strong> mit p = 1/2.</p>
        <p>Für große n nähert sich ihre Form immer mehr einer glatten <strong>Glockenkurve</strong> (Normalverteilung) an — das untersuchst du in der Qualifikationsphase im Thema <a href="../../../mathematik/qualifikationsphase/binomialverteilung/index.html">Binomialverteilung</a>.</p>
      </details>
      <details class="exp-fehler">
        <summary>Fehlerbetrachtung — warum trifft die Messung die Theorie nie exakt?</summary>
        <p><strong>Endliches N:</strong> ${N} Kugeln sind eine Stichprobe. Zufällige Abweichungen von einigen Kugeln pro Fach sind normal und werden — relativ gesehen — erst mit wachsendem N kleiner. Vergleiche ruhig zwei Läufe: gleiche Glockenform, andere Zackigkeit im Detail.</p>
        <p><strong>Modellgrenze:</strong> Unsere Nägel sind ideal (p = 1/2, exakt). Bei echten Brettern stehen Nägel schief, Kugeln prallen aufeinander oder springen über eine Reihe — dann ist p ≠ 1/2 und die Verteilung wird schief oder breiter. Die Glockenform selbst ist aber erstaunlich robust.</p>
      </details>
      <div class="exp-knopfzeile">
        <button class="knopf zweitrangig" id="exp-csv">Messtabelle als CSV</button>
        <button class="knopf zweitrangig" id="exp-zurueck">Zur Durchführung</button>
      </div>`;

    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      const spalten = ["Fach k", "beobachtet"].concat(
        zustand.wegeGeloest ? ["Wege C(8;k)", "P(k) in %", `erwartet (N=${N})`] : []);
      const zeilen = zustand.faecher.map((b, k) => {
        const z = [String(k), String(b)];
        if (zustand.wegeGeloest) z.push(String(binomialKoeff(REIHEN, k)), komma(wahrscheinlichkeit(k) * 100, 2), komma(erwarteteAnzahl(k, N), 2));
        return z;
      });
      csvHerunterladen(`galton-brett-lauf-${zustand.lauf}.csv`, spalten, zeilen);
    });
    panel.querySelector("#exp-wege")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const w = parseDezimal(panel.querySelector("#exp-wege-eingabe").value);
      if (ablesungOk(w, binomialKoeff(REIHEN, REIHEN / 2), 0)) {
        zustand.wegeGeloest = true;
        panelAuswerten(); // Theorie-Tabelle und -Punkte aufdecken
      } else {
        panel.querySelector("#exp-wege-meldung").textContent =
          "✗ Noch nicht — nutze den Tipp: In Zeile 8 ist jede Zahl die Summe der beiden Zahlen schräg darüber.";
      }
    });
    panel.querySelector("#exp-frage1").addEventListener("change", ev => {
      const m = panel.querySelector("#exp-frage1-meldung");
      const a = ev.target.value;
      if (a === "wege") m.innerHTML = "✓ Genau! Nach ganz außen führt nur 1 Weg (8-mal rechts bzw. 8-mal links), in die Mitte 70. Jeder Nagel ist fair — aber die <em>Wege</em> sind ungleich verteilt.";
      else if (a === "rollen") m.textContent = "✗ Nein — keine Kraft zieht die Kugeln zur Mitte. An jedem Nagel geht es mit p = 1/2 nach links oder rechts. Zähl die Wege!";
      else if (a === "zufall") m.textContent = "✗ Der Zufall bevorzugt nichts: Jeder einzelne Weg ist gleich wahrscheinlich. Entscheidend ist, wie viele Wege im selben Fach enden.";
      else m.textContent = "";
    });
    panel.querySelector("#exp-frage2").addEventListener("change", ev => {
      const m = panel.querySelector("#exp-frage2-meldung");
      const a = ev.target.value;
      if (a === "glatter") m.innerHTML = `✓ Richtig — die relativen Häufigkeiten stabilisieren sich bei großem N (<strong>Gesetz der großen Zahlen</strong>). Probiere es mit einem neuen Lauf und nur 20 Kugeln: viel zackiger! Dasselbe Phänomen zeigt die <a href="../../../simulationen/mathematik/gluecksrad/index.html">Glücksrad-Simulation</a>.`;
      else if (a === "zackiger") m.textContent = "✗ Umgekehrt: Mehr Kugeln gleichen zufällige Ausreißer aus — die Form wird glatter (Gesetz der großen Zahlen).";
      else if (a === "gleich") m.textContent = "✗ Nicht ganz: Die Glockenform bleibt, aber sie wird mit mehr Kugeln glatter — zufällige Ausreißer fallen relativ immer weniger ins Gewicht.";
      else m.textContent = "";
    });
    zeichneDiagramm(N);
  }

  function zeichneDiagramm(N) {
    const dia = panel.querySelector("#exp-diagramm");
    if (!dia) return;
    const c = dia.getContext("2d");
    const cText = farbe("--text"), cLeise = farbe("--text-leise"), cAkzent = farbe("--akzent");
    const BW = dia.width, BH = dia.height, L = 44, U = BH - 34;
    const maxWert = Math.max(...zustand.faecher, zustand.wegeGeloest ? erwarteteAnzahl(4, N) : 0) * 1.15 || 1;
    c.clearRect(0, 0, BW, BH);
    c.strokeStyle = cText; c.lineWidth = 1.5; c.font = "12px system-ui, sans-serif"; c.fillStyle = cText;
    c.beginPath(); c.moveTo(L, 10); c.lineTo(L, U); c.lineTo(BW - 8, U); c.stroke();
    c.fillText("Anzahl", 6, 20);
    c.fillText("Fach k", BW - 52, U + 26);
    // y-Hilfslinie beim Maximum der Theorie (falls sichtbar)
    const dx = (BW - L - 20) / FAECHER;
    for (let k = 0; k < FAECHER; k++) {
      const x = L + dx * (k + 0.5);
      const b = zustand.faecher[k];
      const h = (b / maxWert) * (U - 18);
      c.fillStyle = cAkzent;
      c.fillRect(x - dx * 0.32, U - h, dx * 0.64, h);
      c.fillStyle = cLeise;
      c.textAlign = "center"; c.fillText(String(k), x, U + 16); c.textAlign = "start";
    }
    if (zustand.wegeGeloest) {
      for (let k = 0; k < FAECHER; k++) {
        const x = L + dx * (k + 0.5);
        const y = U - (erwarteteAnzahl(k, N) / maxWert) * (U - 18);
        c.fillStyle = cText;
        c.beginPath(); c.arc(x, y, 4.5, 0, 7); c.fill();
      }
    }
    // y-Achsen-Anker: 0 und Maximum
    c.fillStyle = cLeise;
    c.fillText("0", L - 14, U + 4);
    c.fillText(String(Math.round(maxWert / 1.15)), L - 34, U - (1 / 1.15) * (U - 18) + 4);
  }

  // ---------- Start ----------
  zeichne();
  wechslePhase("aufbau");
}
