// experiment.js — Interaktives Experiment: Laufzeiten messen (Informatik, Klasse 10).
// Sortier-Wettrennen mit ZWEI Messgrößen — das ist die Pointe:
//   (1) VERGLEICHE: exakt zählbar, auf jedem Gerät identisch — die saubere Messgröße.
//   (2) ZEIT in ms (performance.now): gerätabhängig und schwankend — bewusst als
//       „echte“ Messung mit Streuung erlebbar.
// Verfahren A = Bubble Sort OHNE Früh-Abbruch (Vergleiche datenunabhängig exakt
// n·(n−1)/2), Verfahren B = Merge Sort (Vergleichszahl datenabhängig, ≈ n·log₂ n).
// Testdaten deterministisch geseedet: gleiches n ⇒ gleiches Array ⇒ reproduzierbare
// Vergleichszahlen; TESTS laufen DOM-frei in Node. Erstes Experiment des
// Informatik-Bereichs.

import {
  mulberry32, seedAus, parseDezimal, komma, esc,
  farbe, reduzierteBewegung, bauePhasen, csvHerunterladen
} from "../../../assets/js/experiment/helfer.js";

// ---------- feste Größen ----------
export const N_STUFEN = [500, 1000, 2000, 4000, 8000];
export const HOCHRECHNUNG_N = 1000000;

// ---------- Testdaten (deterministisch: gleiches n ⇒ gleiches Array) ----------
export function testDaten(n) {
  const r = mulberry32(seedAus("daten:" + n));
  return Array.from({ length: n }, () => Math.floor(r() * 1000000));
}

// ---------- Verfahren A: Bubble Sort ohne Früh-Abbruch ----------
// Ohne Abbruchprüfung läuft jede Runde vollständig durch — die Vergleichszahl
// ist dadurch DATENUNABHÄNGIG exakt n·(n−1)/2 (deterministisch, ideal zum Prüfen).
export function bubbleVergleiche(n) { return n * (n - 1) / 2; }
export function bubbleSortGezaehlt(daten) {
  const a = daten.slice();
  let v = 0;
  for (let i = a.length - 1; i > 0; i--) {
    for (let j = 0; j < i; j++) {
      v++; // genau hier wird verglichen
      if (a[j] > a[j + 1]) { const t = a[j]; a[j] = a[j + 1]; a[j + 1] = t; }
    }
  }
  return { sortiert: a, vergleiche: v };
}

// ---------- Verfahren B: Merge Sort mit Vergleichszähler ----------
function mischeSortiere(a, z) {
  if (a.length <= 1) return a;
  const mitte = a.length >> 1;
  const links = mischeSortiere(a.slice(0, mitte), z);
  const rechts = mischeSortiere(a.slice(mitte), z);
  const aus = new Array(a.length);
  let i = 0, j = 0, k = 0;
  while (i < links.length && j < rechts.length) {
    z.v++; // genau hier wird verglichen
    aus[k++] = links[i] <= rechts[j] ? links[i++] : rechts[j++];
  }
  while (i < links.length) aus[k++] = links[i++]; // Rest wird ohne Vergleich kopiert
  while (j < rechts.length) aus[k++] = rechts[j++];
  return aus;
}
export function mergeSortGezaehlt(daten) {
  const z = { v: 0 };
  const sortiert = mischeSortiere(daten.slice(), z);
  return { sortiert, vergleiche: z.v };
}
// Vergleichszahl von B auf den Standard-Testdaten der Größe n
export function mergeVergleiche(n) { return mergeSortGezaehlt(testDaten(n)).vergleiche; }

// ---------- Eingabe-/Auswertungs-Helfer (rein, Node-testbar) ----------
// Anzahlen dürfen mit Tausenderpunkten/-leerzeichen oder als 5e11 eingetippt werden.
export function parseAnzahl(text) {
  let t = String(text).trim().replace(/[\s']/g, "");
  if (!/[eE]/.test(t)) t = t.replace(/\.(?=\d{3}(\D|$))/g, ""); // Tausenderpunkte raus
  return parseDezimal(t);
}
// Verdopplungsquotient: A → 4,0 ± 0,1 · B → 2,1 ± 0,15
export function quotientOk(verfahren, wert) {
  const soll = verfahren === "a" ? 4.0 : 2.1;
  const tol = verfahren === "a" ? 0.1 : 0.15;
  return Number.isFinite(wert) && Math.abs(wert - soll) <= tol;
}
// Hochrechnung für A bei n = 10⁶: exakt n·(n−1)/2 ≈ 5,0·10¹¹, Toleranz Faktor 2
export function hochrechnungOk(wert) {
  const exakt = bubbleVergleiche(HOCHRECHNUNG_N);
  return Number.isFinite(wert) && wert >= exakt / 2 && wert <= exakt * 2;
}

function istAufsteigend(a) {
  for (let i = 1; i < a.length; i++) if (a[i - 1] > a[i]) return false;
  return true;
}

// ---------- TESTS (laufen DOM-frei in Node) ----------
// Hinweis zum Band in Test 5: Der Durchschnittsfall von Merge Sort liegt bei
// ≈ n·log₂n − 1,25·n Vergleichen (Knuth), der Worst Case bei ≈ n·log₂n − n.
// Das Band [n·log₂n − 1,5n; n·log₂n] deckt beides mit Spielraum ab.
export const TESTS = [
  { name: "Verfahren A zählt exakt n·(n−1)/2 (n = 10, 500, 1000, 8000)", ok: () =>
      [10, 500, 1000, 8000].every(n =>
        bubbleSortGezaehlt(testDaten(n)).vergleiche === bubbleVergleiche(n)) },
  { name: "Formelwerte: 45 · 124 750 · 499 500 · 31 996 000", ok: () =>
      bubbleVergleiche(10) === 45 && bubbleVergleiche(500) === 124750
      && bubbleVergleiche(1000) === 499500 && bubbleVergleiche(8000) === 31996000 },
  { name: "Mini-Beispiel von Hand: [3,1,2] → A 3 Vergleiche, B 3 Vergleiche, beide sortiert", ok: () => {
      const a = bubbleSortGezaehlt([3, 1, 2]), b = mergeSortGezaehlt([3, 1, 2]);
      return a.vergleiche === 3 && b.vergleiche === 3
        && a.sortiert.join() === "1,2,3" && b.sortiert.join() === "1,2,3";
    } },
  { name: "Beide Verfahren sortieren 5 geseedete Arrays korrekt (gegen Array.sort)", ok: () =>
      [1, 2, 37, 500, 1234].every((laenge, idx) => {
        const r = mulberry32(seedAus("pruef:" + (idx + 1)));
        const arr = Array.from({ length: laenge }, () => Math.floor(r() * 100000));
        const referenz = arr.slice().sort((x, y) => x - y).join(",");
        return bubbleSortGezaehlt(arr).sortiert.join(",") === referenz
          && mergeSortGezaehlt(arr).sortiert.join(",") === referenz;
      }) },
  { name: "Merge-Vergleiche im n·log₂n-Band (n = 500, 2000, 8000)", ok: () =>
      [500, 2000, 8000].every(n => {
        const v = mergeVergleiche(n);
        return v >= n * Math.log2(n) - 1.5 * n && v <= n * Math.log2(n);
      }) },
  { name: "Testdaten deterministisch, richtige Länge, Werte in [0; 10⁶)", ok: () =>
      testDaten(1000).join() === testDaten(1000).join()
      && testDaten(500).join() !== testDaten(1000).slice(0, 500).join()
      && N_STUFEN.every(n => testDaten(n).length === n)
      && testDaten(2000).every(w => Number.isInteger(w) && w >= 0 && w < 1000000) },
  { name: "Gleiches n ⇒ gleiche Vergleichszahl (B zweimal auf n = 2000)", ok: () =>
      mergeVergleiche(2000) === mergeVergleiche(2000)
      && istAufsteigend(mergeSortGezaehlt(testDaten(2000)).sortiert) },
  { name: "Verdopplungsquotient A ≈ 4 (± 0,02) auf allen Stufen", ok: () =>
      [500, 1000, 2000, 4000].every(n =>
        Math.abs(bubbleVergleiche(2 * n) / bubbleVergleiche(n) - 4) <= 0.02) },
  { name: "Verdopplungsquotient B: 4000→8000 in [2,0; 2,2], alle Stufen in (2,0; 2,3)", ok: () => {
      const q = [];
      for (let i = 0; i + 1 < N_STUFEN.length; i++) {
        q.push(mergeVergleiche(N_STUFEN[i + 1]) / mergeVergleiche(N_STUFEN[i]));
      }
      const letzter = q[q.length - 1];
      return letzter >= 2.0 && letzter <= 2.2 && q.every(x => x > 2.0 && x < 2.3);
    } },
  { name: "Eingabe-Check Verdopplung: 4,0/3,95 ✓ · 3,85 ✗ · 2,2 ✓ · 2,3 ✗", ok: () =>
      quotientOk("a", 4.0) && quotientOk("a", 3.95) && !quotientOk("a", 3.85)
      && quotientOk("b", 2.2) && quotientOk("b", 2.0) && !quotientOk("b", 2.3)
      && !quotientOk("b", NaN) },
  { name: "Hochrechnung: 5·10¹¹ ✓ · 2,4·10¹¹ ✗ · 1,1·10¹² ✗ (Faktor-2-Band)", ok: () =>
      hochrechnungOk(5e11) && hochrechnungOk(bubbleVergleiche(HOCHRECHNUNG_N))
      && !hochrechnungOk(2.4e11) && !hochrechnungOk(1.1e12) && !hochrechnungOk(NaN) },
  { name: "parseAnzahl: 31.996.000 · 124750 · 5e11 · 2,5e11 · Unsinn", ok: () =>
      parseAnzahl("31.996.000") === 31996000 && parseAnzahl("124750") === 124750
      && parseAnzahl("5e11") === 5e11 && parseAnzahl("2,5e11") === 2.5e11
      && Number.isNaN(parseAnzahl("viele")) }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;
  const reduziert = reduzierteBewegung();
  const tausender = w => Math.round(w).toLocaleString("de-DE");

  const zustand = {
    n: N_STUFEN[0],
    laeuft: false,          // Rennen (Rechnung oder Animation) aktiv?
    ergebnisse: {},         // n → { vA, vB, tA, tB } (letzter Lauf)
    protokolliert: {},      // n → true, sobald beide Vergleichszahlen korrekt übertragen
    eingaben: {},           // Zwischenstände der Tabellenfelder (überleben das Neuzeichnen)
    rennen: null,           // { n, start, dauerA, dauerB } für die Balken-Animation
    quotAOk: false, quotBOk: false, hochOk: false,
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
        <canvas id="exp-canvas" width="400" height="420" aria-label="Wettrennen zweier Sortierverfahren: zwei waagerechte Balken wachsen entlang einer logarithmischen Vergleichs-Skala, daneben Zählerstände und gestoppte Zeiten."></canvas>
      </div>
      <div class="exp-rechts" id="exp-panel"></div>
    </div>`);
  const canvas = wurzel.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = wurzel.querySelector("#exp-panel");

  // ---------- Renn-Grafik: Balkenlänge ∝ log₁₀(Vergleiche) ----------
  const X0 = 24, X1 = 384, LOG_MIN = 2, LOG_MAX = 8; // Skala 10² … 10⁸
  function xPos(wert) {
    const d = Math.log10(Math.max(wert, Math.pow(10, LOG_MIN)));
    const p = Math.min(1, Math.max(0, (d - LOG_MIN) / (LOG_MAX - LOG_MIN)));
    return X0 + p * (X1 - X0);
  }
  // Zählerstand während der Animation: läuft auf der log-Skala gleichmäßig mit
  function zwischenstand(ziel, p) {
    if (p >= 1) return ziel;
    return Math.min(ziel, Math.round(Math.pow(10, LOG_MIN + p * (Math.log10(ziel) - LOG_MIN))));
  }

  function zeichne() {
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
          cAkzent = farbe("--akzent"), cFehler = farbe("--fehler", "#b33");
    const erg = zustand.ergebnisse[zustand.n];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillStyle = cText;
    ctx.fillText(erg || zustand.rennen ? `Wettrennen: n = ${tausender(zustand.n)} Zahlen` : "Sortier-Wettrennen", X0 - 4, 26);

    // Fortschritt 0…1 je Verfahren (ohne Rennen: fertig)
    let pA = 1, pB = 1;
    if (zustand.rennen && !reduziert) {
      const t = performance.now() - zustand.rennen.start;
      pA = Math.min(1, t / zustand.rennen.dauerA);
      pB = Math.min(1, t / zustand.rennen.dauerB);
    }

    // Bahnen
    const bahnen = [
      { name: "Verfahren A — Bubble Sort", farbe: cFehler, y: 66, v: erg ? erg.vA : 0, t: erg ? erg.tA : 0, p: pA },
      { name: "Verfahren B — Merge Sort", farbe: cAkzent, y: 186, v: erg ? erg.vB : 0, t: erg ? erg.tB : 0, p: pB }
    ];
    for (const b of bahnen) {
      ctx.font = "bold 13px system-ui, sans-serif";
      ctx.fillStyle = cText;
      ctx.fillText(b.name, X0 - 4, b.y);
      ctx.strokeStyle = cLeise; ctx.lineWidth = 1;
      ctx.strokeRect(X0, b.y + 8, X1 - X0, 26);
      if (erg) {
        const stand = zwischenstand(b.v, b.p);
        ctx.fillStyle = b.farbe;
        ctx.fillRect(X0, b.y + 8, Math.max(2, xPos(stand) - X0), 26);
        ctx.fillStyle = cText; ctx.font = "13px system-ui, sans-serif";
        ctx.fillText(`${tausender(stand)} Vergleiche`, X0, b.y + 52);
        ctx.fillText(b.p >= 1 ? `✓ fertig — Zeit: ${komma(b.t, 1)} ms` : "… sortiert noch", X0, b.y + 70);
      } else {
        ctx.fillStyle = cLeise; ctx.font = "13px system-ui, sans-serif";
        ctx.fillText("wartet auf den Start", X0, b.y + 52);
      }
    }

    // log-Skala unten
    const yAchse = 330;
    ctx.strokeStyle = cText; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(X0, yAchse); ctx.lineTo(X1, yAchse); ctx.stroke();
    ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "center";
    const hochzahlen = ["10²", "10³", "10⁴", "10⁵", "10⁶", "10⁷", "10⁸"];
    for (let d = LOG_MIN; d <= LOG_MAX; d++) {
      const x = xPos(Math.pow(10, d));
      ctx.beginPath(); ctx.moveTo(x, yAchse); ctx.lineTo(x, yAchse + 6); ctx.stroke();
      ctx.fillStyle = cLeise; ctx.fillText(hochzahlen[d - LOG_MIN], x, yAchse + 20);
    }
    ctx.textAlign = "start";
    ctx.fillStyle = cText;
    ctx.fillText("Vergleiche (logarithmische Skala: jeder Strich = ×10)", X0, yAchse + 40);
    if (erg) {
      ctx.fillStyle = cLeise;
      ctx.fillText("Langer Balken = viel Arbeit. Die Zeiten stoppt dein Gerät.", X0, yAchse + 58);
    }
  }

  // ---------- Wettrennen: rechnen, Zeit stoppen, animieren ----------
  function status(text) {
    const m = panel.querySelector("#exp-meldung");
    if (m) m.textContent = text;
  }

  function starteRennen() {
    if (zustand.laeuft) return;
    const n = zustand.n;
    zustand.laeuft = true;
    zustand.rennen = null;
    aktualisiereKnoepfe();
    status(n === 8000
      ? "Testdaten werden erzeugt … bei n = 8000 braucht Verfahren A rund 32 Millionen Vergleiche — gleich spürst du das."
      : "Testdaten werden erzeugt …");
    // setTimeout-Stufen, damit der Browser die Statuszeile zwischendurch zeichnen kann
    setTimeout(() => {
      const daten = testDaten(n);
      status(`Verfahren A (Bubble Sort) sortiert ${tausender(n)} Zahlen …`);
      setTimeout(() => {
        const startA = performance.now();
        const ergA = bubbleSortGezaehlt(daten);
        const tA = performance.now() - startA;
        status("Verfahren B (Merge Sort) sortiert dasselbe Array …");
        setTimeout(() => {
          const startB = performance.now();
          const ergB = mergeSortGezaehlt(daten);
          const tB = performance.now() - startB;
          zustand.ergebnisse[n] = { vA: ergA.vergleiche, vB: ergB.vergleiche, tA, tB };
          starteAnimation(n);
        }, 30);
      }, 30);
    }, 20);
  }

  function starteAnimation(n) {
    const erg = zustand.ergebnisse[n];
    if (reduziert) { rennenFertig(); return; } // reduzierte Bewegung: Ergebnis direkt
    const dauerA = 1800;
    const dauerB = Math.min(dauerA, Math.max(220, dauerA * erg.tB / Math.max(erg.tA, 0.1)));
    zustand.rennen = { n, start: performance.now(), dauerA, dauerB };
    requestAnimationFrame(function tick() {
      zeichne();
      const t = performance.now() - zustand.rennen.start;
      if (t < zustand.rennen.dauerA) requestAnimationFrame(tick);
      else { zustand.rennen = null; rennenFertig(); }
    });
  }

  function rennenFertig() {
    zustand.laeuft = false;
    zeichne();
    if (zustand.phase === "messen") {
      panelMessen();
      const erg = zustand.ergebnisse[zustand.n];
      status(`Zieleinlauf bei n = ${tausender(zustand.n)}: A ${tausender(erg.vA)} Vergleiche (${komma(erg.tA, 1)} ms) · B ${tausender(erg.vB)} Vergleiche (${komma(erg.tB, 1)} ms). Übertrage beide Vergleichszahlen in die Tabelle.`);
    }
  }

  // ---------- Panel: Aufbau ----------
  function panelAufbau() {
    panel.innerHTML = `
      <h2>Aufbau und Messplan</h2>
      <p>Zwei Sortier­maschinen treten an, beide bekommen <strong>exakt dasselbe</strong> zufällige Zahlen­array: <strong>Verfahren A (Bubble Sort)</strong> vergleicht stur Runde für Runde jedes Nachbar­paar — <strong>Verfahren B (Merge Sort)</strong> teilt die Liste, sortiert die Hälften und mischt sie zusammen.</p>
      <p>Gemessen wird auf <strong>zwei Ebenen</strong> — das ist der Kern dieses Experiments:</p>
      <ul>
        <li><strong>Vergleiche:</strong> Ein Zähler im Programm zählt jeden einzelnen Vergleich mit. Exakt, reproduzierbar, auf jedem Gerät gleich — die saubere Messgröße.</li>
        <li><strong>Zeit in ms:</strong> Die Stoppuhr deines Browsers. Echt gemessen — und deshalb abhängig von deinem Gerät und allem, was es nebenbei tut.</li>
      </ul>
      <p><strong>Plan:</strong> Lass das Wettrennen für alle fünf Größen n = 500, 1000, 2000, 4000 und 8000 laufen und übertrage <em>beide</em> Vergleichszahlen exakt in die Messtabelle — die Zeiten protokolliert dein Gerät automatisch mit.</p>
      <p class="exp-hinweis">Reproduzierbar wie ein gutes Protokoll: Zu jedem n gehört immer dasselbe Test-Array, also auch dieselben Vergleichszahlen. Ob das auch für die Zeiten gilt? Beobachte selbst.</p>
      <p><strong>Überlege vorher:</strong> Wenn sich n verdoppelt — verdoppelt sich dann auch der Aufwand beider Verfahren? Notiere deine Vermutung.</p>
      <button class="knopf" id="exp-weiter1">Zur Durchführung</button>`;
    panel.querySelector("#exp-weiter1").addEventListener("click", () => wechslePhase("messen"));
  }

  // ---------- Panel: Durchführung ----------
  function zeile(n) {
    const erg = zustand.ergebnisse[n];
    const fertig = zustand.protokolliert[n];
    const feld = (kuerzel, wert) => erg
      ? `<input class="exp-eingabe" id="exp-${kuerzel}-${n}" inputmode="numeric" autocomplete="off" value="${esc(zustand.eingaben[kuerzel + n] || "")}" aria-label="Vergleiche Verfahren ${kuerzel === "va" ? "A" : "B"} bei n = ${n}">`
      : "–";
    return `<tr>
      <td>${tausender(n)}</td>
      <td>${fertig ? tausender(erg.vA) : feld("va")}</td>
      <td>${fertig ? tausender(erg.vB) : feld("vb")}</td>
      <td>${erg ? komma(erg.tA, 1) : "–"}</td>
      <td>${erg ? komma(erg.tB, 1) : "–"}</td>
      <td id="exp-status-${n}">${fertig ? "✓" : "–"}</td>
    </tr>`;
  }

  function panelMessen() {
    const anzahl = N_STUFEN.filter(n => zustand.protokolliert[n]).length;
    panel.innerHTML = `
      <h2>Durchführung</h2>
      <div class="exp-regler">
        <label for="exp-n">Wie viele Zahlen sollen sortiert werden?</label>
        <select id="exp-n" class="exp-wahl">
          ${N_STUFEN.map(n => `<option value="${n}" ${n === zustand.n ? "selected" : ""}>n = ${tausender(n)}${zustand.protokolliert[n] ? " (protokolliert ✓)" : ""}</option>`).join("")}
        </select>
      </div>
      <p id="exp-n-hinweis" class="exp-hinweis" ${zustand.n === 8000 ? "" : "hidden"}>Bei n = 8000 braucht Verfahren A rund <strong>32 Millionen</strong> Vergleiche — der Lauf dauert spürbar. Genau diese Erfahrung gehört zum Experiment.</p>
      <div class="exp-knopfzeile">
        <button class="knopf" id="exp-start">Wettrennen starten</button>
      </div>
      <p id="exp-meldung" class="exp-meldung" aria-live="polite"></p>
      <h3>Messtabelle</h3>
      <p>Übertrage nach jedem Rennen <strong>beide Vergleichszahlen exakt</strong> vom Canvas in die Tabelle (Tippen mit oder ohne Tausenderpunkte). Die Zeit­spalten füllt dein Gerät selbst aus.</p>
      <form id="exp-protokoll">
        <table class="exp-tabelle">
          <thead><tr><th>n</th><th>Vergleiche A</th><th>Vergleiche B</th><th>Zeit A in ms</th><th>Zeit B in ms</th><th>geprüft</th></tr></thead>
          <tbody>${N_STUFEN.map(zeile).join("")}</tbody>
        </table>
        <button class="knopf" id="exp-pruefen">Protokoll prüfen</button>
      </form>
      <p id="exp-protokoll-meldung" class="exp-meldung" aria-live="polite">${anzahl} von 5 Größen protokolliert.</p>
      <button class="knopf" id="exp-weiter2" ${anzahl === N_STUFEN.length ? "" : "disabled"}>Zur Auswertung</button>`;
    panel.querySelector("#exp-n").addEventListener("change", ev => {
      zustand.n = Number(ev.target.value);
      panel.querySelector("#exp-n-hinweis").hidden = zustand.n !== 8000;
      zustand.rennen = null;
      zeichne();
    });
    panel.querySelector("#exp-start").addEventListener("click", starteRennen);
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
    panel.querySelectorAll(".exp-eingabe").forEach(f => f.addEventListener("input", () => {
      zustand.eingaben[f.id.replace("exp-", "").replace("-", "")] = f.value;
    }));
    panel.querySelector("#exp-protokoll").addEventListener("submit", ev => {
      ev.preventDefault();
      pruefeProtokoll();
    });
    aktualisiereKnoepfe();
  }

  function pruefeProtokoll() {
    if (zustand.laeuft) return;
    let neu = 0, falsch = 0, leer = 0;
    for (const n of N_STUFEN) {
      const erg = zustand.ergebnisse[n];
      if (!erg || zustand.protokolliert[n]) continue;
      const feldA = panel.querySelector(`#exp-va-${n}`);
      const feldB = panel.querySelector(`#exp-vb-${n}`);
      if (feldA.value.trim() === "" && feldB.value.trim() === "") { leer++; continue; }
      // Toleranz 0: Protokollieren heißt exakt übertragen
      const okA = parseAnzahl(feldA.value) === erg.vA;
      const okB = parseAnzahl(feldB.value) === erg.vB;
      if (okA && okB) {
        zustand.protokolliert[n] = true;
        delete zustand.eingaben["va" + n]; delete zustand.eingaben["vb" + n];
        neu++;
      } else {
        falsch++;
        panel.querySelector(`#exp-status-${n}`).textContent = "✗";
      }
    }
    const anzahl = N_STUFEN.filter(n => zustand.protokolliert[n]).length;
    let text;
    if (falsch) text = `✗ Mindestens ein Wert stimmt nicht exakt mit dem Zähler überein — vergleiche Ziffer für Ziffer (${anzahl} von 5 protokolliert).`;
    else if (neu) text = anzahl === N_STUFEN.length
      ? "✓ Alle fünf Größen protokolliert — weiter zur Auswertung!"
      : `✓ Übertragen. ${anzahl} von 5 Größen protokolliert — miss auch die übrigen n.`;
    else text = leer ? "Trage erst die Vergleichszahlen des letzten Rennens ein." : "Starte zuerst ein Wettrennen — dann gibt es etwas zu protokollieren.";
    if (neu) panelMessen(); // bei Fehlern stehen lassen, damit die ✗-Markierungen sichtbar bleiben
    panel.querySelector("#exp-protokoll-meldung").textContent = text;
  }

  function aktualisiereKnoepfe() {
    if (zustand.phase !== "messen") return;
    const start = panel.querySelector("#exp-start");
    if (!start) return;
    start.disabled = zustand.laeuft;
    panel.querySelector("#exp-n").disabled = zustand.laeuft;
    panel.querySelector("#exp-pruefen").disabled = zustand.laeuft;
  }

  // ---------- Panel: Auswertung ----------
  function panelAuswerten() {
    const fertig = N_STUFEN.every(n => zustand.protokolliert[n]);
    if (!fertig) {
      panel.innerHTML = `
        <h2>Auswertung</h2>
        <p>Hier fehlt noch deine Messreihe: Lass das Wettrennen für <strong>alle fünf</strong> Größen n laufen und übertrage jeweils beide Vergleichszahlen — dann werten wir aus.</p>
        <button class="knopf" id="exp-zurueck0">Zur Durchführung</button>`;
      panel.querySelector("#exp-zurueck0").addEventListener("click", () => wechslePhase("messen"));
      return;
    }
    const erg = n => zustand.ergebnisse[n];
    const qA = erg(8000).vA / erg(4000).vA;
    const qB = erg(8000).vB / erg(4000).vB;
    const kette = N_STUFEN.slice(1).map((n, i) => ({
      von: N_STUFEN[i], nach: n,
      qa: erg(n).vA / erg(N_STUFEN[i]).vA,
      qb: erg(n).vB / erg(N_STUFEN[i]).vB
    }));
    const beideQ = zustand.quotAOk && zustand.quotBOk;
    panel.innerHTML = `
      <h2>Auswertung</h2>
      <h3>1 · Verdopplung: Was passiert mit den Vergleichen?</h3>
      <table class="exp-tabelle">
        <thead><tr><th>n</th><th>Vergleiche A</th><th>Vergleiche B</th></tr></thead>
        <tbody>${N_STUFEN.map(n => `<tr><td>${tausender(n)}</td><td>${tausender(erg(n).vA)}</td><td>${tausender(erg(n).vB)}</td></tr>`).join("")}</tbody>
      </table>
      ${beideQ ? `
        <p>✓ <strong>Verfahren A: Faktor ≈ 4</strong> — doppelte Daten, <em>vierfacher</em> Aufwand. Das ist quadratisches Wachstum: Vergleiche ≈ n²/2 (exakt n·(n−1)/2).<br>
        <strong>Verfahren B: Faktor ≈ 2,1</strong> — nur knapp mehr als verdoppelt, also <em>fast linear</em>: Vergleiche ≈ n·log₂ n.</p>
        <table class="exp-tabelle">
          <thead><tr><th>Schritt</th><th>Faktor A</th><th>Faktor B</th></tr></thead>
          <tbody>${kette.map(s => `<tr><td>${tausender(s.von)} → ${tausender(s.nach)}</td><td>${komma(s.qa, 2)}</td><td>${komma(s.qb, 2)}</td></tr>`).join("")}</tbody>
        </table>
        <p>Schau auf die B-Spalte: Der Faktor sinkt mit wachsendem n langsam Richtung 2 — der log₂-Anteil wächst eben kaum noch.</p>` : `
        <form id="exp-quot" class="exp-ablesen">
          <label for="exp-quot-a">Berechne aus deiner Tabelle für den Schritt n = 4000 → 8000 (eine Nachkommastelle genügt): Faktor A =</label>
          <input id="exp-quot-a" class="exp-eingabe" inputmode="decimal" autocomplete="off">
          <label for="exp-quot-b">Faktor B =</label>
          <input id="exp-quot-b" class="exp-eingabe" inputmode="decimal" autocomplete="off">
          <button class="knopf">Prüfen</button>
        </form>
        <p id="exp-quot-meldung" class="exp-meldung" aria-live="polite"></p>`}
      <canvas id="exp-diagramm" class="exp-diagramm" width="440" height="300" aria-label="Diagramm: Vergleiche über n. Die Kurve von Verfahren A schießt steil nach oben, die von Verfahren B bleibt ganz unten nahe der n-Achse."></canvas>
      <p>Beide Kurven im <em>gleichen</em> Maßstab: A explodiert, B klebt am Boden — bei n = 8000 kommt B mit rund einem ${tausender(erg(8000).vA / erg(8000).vB)}-stel des Aufwands von A aus.</p>
      <h3>2 · Hochrechnung: eine Million Zahlen</h3>
      ${zustand.hochOk ? `
        <p>✓ Exakt wären es n·(n−1)/2 ≈ <strong>5,0·10¹¹</strong> Vergleiche — eine halbe <em>Billion</em>. Verfahren B begnügt sich mit rund 2·10⁷ (20 Millionen), etwa <strong>25 000-mal</strong> weniger. Deshalb sortiert kein Handy der Welt mit Verfahren A.</p>` : `
        <p>Verfahren A brauchte bei n = 8000 rund 32 Millionen Vergleiche. Schätze mit deiner Verdopplungs-Erkenntnis hoch: Wie viele Vergleiche braucht A bei <strong>n = 1 000 000</strong>?</p>
        <form id="exp-hoch" class="exp-ablesen">
          <label for="exp-hoch-eingabe">Vergleiche ≈</label>
          <input id="exp-hoch-eingabe" class="exp-eingabe" inputmode="decimal" autocomplete="off" size="14">
          <button class="knopf">Prüfen</button>
        </form>
        <p>Eingabe z.&nbsp;B. als <code>5e11</code> oder ausgeschrieben mit Tausenderpunkten.</p>
        <p id="exp-hoch-meldung" class="exp-meldung" aria-live="polite"></p>
        <details><summary>Tipp: in Verdopplungen denken</summary>
          <p>Von 8000 auf 1 000 000 sind es etwa 7 Verdopplungen (8000 · 2⁷ = 1 024 000). Jede Verdopplung vervierfacht den Aufwand von A: 32 Mio · 4⁷ ≈ ? — oder direkt mit der Formel n·(n−1)/2.</p>
        </details>`}
      <h3>3 · Und warum schwanken die Zeiten?</h3>
      <p>Starte dasselbe Rennen ruhig zweimal: Die <strong>Vergleichszahlen</strong> sind exakt gleich, die <strong>Zeiten</strong> nie. Woran liegt das?</p>
      <select id="exp-zeit" class="exp-wahl" aria-label="Erklärung auswählen">
        <option value="">— wähle eine Erklärung —</option>
        <option value="takt">Andere Programme und wechselnder Prozessortakt funken in die Zeitmessung hinein</option>
        <option value="daten">Das Programm erzeugt jedes Mal ein anderes Zufalls-Array</option>
        <option value="zufall">Die Verfahren vergleichen mal mehr, mal weniger</option>
      </select>
      <p id="exp-zeit-meldung" class="exp-meldung" aria-live="polite"></p>
      <h3>4 · Vertiefung und Export</h3>
      <details class="exp-fehler">
        <summary>Vertiefung: die O-Schreibweise</summary>
        <p>Für „der Aufwand wächst ungefähr wie n²“ schreibt die Informatik kurz <strong>O(n²)</strong> — gesprochen „Groß-O von n Quadrat“. Bubble Sort liegt in O(n²), Merge Sort in <strong>O(n·log n)</strong>. Die Schreibweise nennt nur die <em>Größenordnung</em>: Vorfaktoren und kleine Summanden lässt man weg, denn bei großem n entscheidet allein der am schnellsten wachsende Anteil — genau das hat deine Verdopplungs-Tabelle gezeigt.</p>
        <p>Auch dein Browser sortiert übrigens mit einem O(n·log n)-Verfahren, wenn eine Webseite <code>sort()</code> aufruft.</p>
      </details>
      <details class="exp-fehler">
        <summary>Fehlerbetrachtung — Zeit messen ist schmutzig, Vergleiche zählen ist sauber</summary>
        <p><strong>Zeitmessung = Systemrauschen:</strong> Andere Programme, Browser-Tabs, Energiesparmodus und die begrenzte Auflösung der Browser-Stoppuhr verfälschen jede einzelne Messung. Der allererste Lauf ist oft besonders langsam, weil der Browser den Code erst noch übersetzt. Bei sehr kleinem n misst die Uhr fast nur noch Rauschen.</p>
        <p><strong>Vergleiche = saubere Maßzahl:</strong> Sie hängen nur vom Verfahren und den Daten ab — nicht vom Gerät. Deshalb bewertet die Informatik Algorithmen über gezählte Rechenschritte statt über Sekunden.</p>
        <p><strong>Modellgrenze:</strong> Vergleiche sind nicht die ganze Wahrheit — auch Kopieren und Verschieben kostet Zeit, und Merge Sort braucht zusätzlichen Speicher. An der Größenordnung n² gegen n·log n ändert das nichts.</p>
      </details>
      <div class="exp-knopfzeile">
        <button class="knopf zweitrangig" id="exp-csv">Messtabelle als CSV</button>
        <button class="knopf zweitrangig" id="exp-zurueck">Zur Durchführung</button>
      </div>`;
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      csvHerunterladen("laufzeitmessung-sortieren.csv",
        ["n", "Vergleiche A (Bubble Sort)", "Vergleiche B (Merge Sort)", "Zeit A in ms", "Zeit B in ms"],
        N_STUFEN.map(n => [String(n), String(erg(n).vA), String(erg(n).vB), komma(erg(n).tA, 1), komma(erg(n).tB, 1)]));
    });
    panel.querySelector("#exp-quot")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabeA = parseDezimal(panel.querySelector("#exp-quot-a").value);
      const eingabeB = parseDezimal(panel.querySelector("#exp-quot-b").value);
      const okA = quotientOk("a", eingabeA), okB = quotientOk("b", eingabeB);
      if (okA && okB) {
        zustand.quotAOk = zustand.quotBOk = true;
        panelAuswerten();
      } else {
        panel.querySelector("#exp-quot-meldung").textContent =
          `${okA ? "✓ Faktor A stimmt." : "✗ Faktor A: Teile den 8000er-Wert der A-Spalte durch den 4000er-Wert."} ${okB ? "✓ Faktor B stimmt." : "✗ Faktor B: genauso — 8000er-Wert der B-Spalte geteilt durch 4000er-Wert."}`;
      }
    });
    panel.querySelector("#exp-hoch")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const wert = parseAnzahl(panel.querySelector("#exp-hoch-eingabe").value);
      if (hochrechnungOk(wert)) {
        zustand.hochOk = true;
        panelAuswerten();
      } else {
        panel.querySelector("#exp-hoch-meldung").textContent = Number.isFinite(wert)
          ? "✗ Da fehlt noch eine Größenordnung oder zwei — nutze den Tipp und rechne in Verdopplungen."
          : "✗ Das konnte ich nicht als Zahl lesen — z. B. 5e11 oder 500.000.000.000.";
      }
    });
    panel.querySelector("#exp-zeit").addEventListener("change", ev => {
      const m = panel.querySelector("#exp-zeit-meldung");
      const wahl = ev.target.value;
      if (wahl === "takt") m.innerHTML = "✓ Genau: Die Stoppuhr misst dein <em>System</em> mit — Hintergrundprogramme, Browserarbeit, Prozessortakt. Zeit ist eine verrauschte Messgröße deines Geräts; die Vergleichszahl ist die saubere, geräteunabhängige Maßzahl.";
      else if (wahl === "daten") m.textContent = "✗ Nein — gleiches n bedeutet hier immer exakt dasselbe Array. Gerade deshalb sind ja auch die Vergleichszahlen bei jedem Lauf identisch.";
      else if (wahl === "zufall") m.textContent = "✗ Schau in deine Messtabelle: Die Vergleichszahlen sind bei jedem Lauf exakt gleich. Am Verfahren liegt die Schwankung also nicht.";
      else m.textContent = "";
    });
    zeichneDiagramm();
  }

  // Diagramm: Vergleiche über n, beide Verfahren im GLEICHEN (linearen) Maßstab
  function zeichneDiagramm() {
    const dia = panel.querySelector("#exp-diagramm");
    if (!dia) return;
    const c = dia.getContext("2d");
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
          cAkzent = farbe("--akzent"), cFehler = farbe("--fehler", "#b33");
    const BW = dia.width, BH = dia.height, L = 56, U = BH - 40, R = BW - 16;
    const nMax = N_STUFEN[N_STUFEN.length - 1] * 1.06;
    const vMax = zustand.ergebnisse[8000].vA * 1.08;
    c.clearRect(0, 0, BW, BH);
    c.strokeStyle = cText; c.lineWidth = 1.5; c.font = "12px system-ui, sans-serif";
    c.beginPath(); c.moveTo(L, 12); c.lineTo(L, U); c.lineTo(R, U); c.stroke();
    c.fillStyle = cText;
    c.fillText("Vergleiche", 6, 22);
    c.fillText("n", R - 10, U + 28);
    c.fillStyle = cLeise;
    c.fillText("0", L - 14, U + 14);
    c.fillText("8000", L + (8000 / nMax) * (R - L) - 16, U + 14);
    c.fillText("≈ 32 Mio.", 6, U - (zustand.ergebnisse[8000].vA / vMax) * (U - 18) + 4);
    const x = n => L + (n / nMax) * (R - L);
    const y = v => U - (v / vMax) * (U - 18);
    for (const reihe of [
      { schluessel: "vA", farbe: cFehler, name: "A (Bubble)" },
      { schluessel: "vB", farbe: cAkzent, name: "B (Merge)" }
    ]) {
      c.strokeStyle = reihe.farbe; c.lineWidth = 2;
      c.beginPath();
      N_STUFEN.forEach((n, i) => {
        const px = x(n), py = y(zustand.ergebnisse[n][reihe.schluessel]);
        if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
      });
      c.stroke();
      c.fillStyle = reihe.farbe;
      for (const n of N_STUFEN) { c.beginPath(); c.arc(x(n), y(zustand.ergebnisse[n][reihe.schluessel]), 4, 0, 7); c.fill(); }
    }
    c.fillStyle = cText;
    c.fillText("A (Bubble Sort)", x(5200), y(zustand.ergebnisse[8000].vA * 0.55));
    c.fillText("B (Merge Sort) — klebt am Boden", x(2400), U - 8);
  }

  // ---------- Start ----------
  zeichne();
  wechslePhase("aufbau");
}
