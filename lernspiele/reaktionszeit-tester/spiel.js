// spiel.js — Reaktionszeit-Tester (Trainingsraum · Physik)
// Ablauf: „Bereit“-Knopf → Zufallspause 1,5–4 s → Fläche wird grün („JETZT!“) →
// Stopp per Klick, Tipp oder Leertaste. Frühstarts zählen nicht. Nach 5 gültigen
// Versuchen ist das Ergebnis der MEDIAN in Millisekunden (Bestenliste:
// kleinste Zeit zuerst, hsRichtung "aufsteigend"). Zeitmessung: performance.now().
// reduzierteBewegung: identisch — das Spiel nutzt ohnehin keine Animationen.
//
// Die reine Logik (median, reaktionsweg, istFruehstart, formatMs, formatMeter)
// ist exportiert und in Node testbar: Auf Modulebene wird kein document/window
// angefasst; das Gerüst wird nur im Browser nachgeladen (siehe Dateiende).

// ---------- Reine Logik ----------

// Median einer Messreihe — robust gegen einzelne Ausreißer.
// Ungerade Anzahl → mittlerer Wert, gerade Anzahl → Mittel der beiden mittleren.
export function median(werte) {
  if (!Array.isArray(werte) || werte.length === 0) return 0;
  const sortiert = [...werte].sort((a, b) => a - b);
  const mitte = Math.floor(sortiert.length / 2);
  return sortiert.length % 2 === 1 ? sortiert[mitte] : (sortiert[mitte - 1] + sortiert[mitte]) / 2;
}

// Reaktionsweg in Metern bei 50 km/h (≈ 13,89 m/s), auf 1 Nachkommastelle gerundet:
// weg = 13,89 m/s · t in Sekunden. reaktionsweg(250) → 3.5, reaktionsweg(200) → 2.8
export function reaktionsweg(ms) {
  return Math.round(13.89 * (ms / 1000) * 10) / 10;
}

// Frühstart: Es wurde gedrückt, bevor die Fläche grün war (tGruen == null)
// oder vor dem Grün-Zeitpunkt (tKlick < tGruen).
export function istFruehstart(tKlick, tGruen) {
  return tGruen == null || tKlick < tGruen;
}

// 247 → "0,247 s" (deutsches Komma, drei Nachkommastellen)
export function formatMs(ms) {
  return (ms / 1000).toFixed(3).replace(".", ",") + " s";
}

// 3.5 → "3,5" (Meterangabe mit 1 Nachkommastelle, deutsches Komma)
export function formatMeter(meter) {
  return meter.toFixed(1).replace(".", ",");
}

// ---------- Manifest ----------

export const manifest = {
  id: "ls-reaktionszeit",
  titel: "Reaktionszeit-Tester",
  kurz: "Miss deine Reaktionszeit in fünf gültigen Versuchen — gewertet wird der Median.",
  punkteLabel: "Reaktionszeit",
  punkteEinheit: "",
  hsRichtung: "aufsteigend",
  highscore: true,
  zeigeZeit: false,
  formatPunkte: ms => (ms / 1000).toFixed(3).replace(".", ",") + " s",
  steuerungHinweis: "Sobald die Fläche grün wird: klicken, tippen oder Leertaste!"
};

const ANZAHL_VERSUCHE = 5;
const PAUSE_MIN_MS = 1500;    // Zufallspause vor Grün: 1,5 s …
const PAUSE_SPANNE_MS = 2500; // … bis 4 s
const WEITER_MS = 1300;       // kurze Ergebnisanzeige zwischen den Versuchen
const TEMPO_TEXT = "Bei 50 km/h (≈ 13,9 m/s)";

// ---------- Spiel ----------

export function starte(api) {
  // Phasen: start | warten | gruen | pause (Zwischenanzeige) | fertig
  let phase = "start";
  let zeiten = [];       // gültige Reaktionszeiten in ms (ganzzahlig)
  let fruehstarts = 0;
  let tGruen = null;     // Zeitpunkt des Grünwechsels (performance.now())
  let timer = 0;

  const flaeche = api.flaeche;

  function setzeTimer(fn, ms) { clearTimeout(timer); timer = setTimeout(fn, ms); }

  // Eine Bühne ist nie nur Farbe: Symbol + großer Text + Hinweiszeile.
  function buehne(klasse, symbol, gross, klein) {
    return `<div class="rt-buehne ${klasse}">
      <p class="rt-symbol" aria-hidden="true">${symbol}</p>
      <p class="rt-gross">${gross}</p>
      ${klein ? `<p class="rt-klein">${klein}</p>` : ""}
    </div>`;
  }

  function zeigeStart() {
    clearTimeout(timer);
    phase = "start"; zeiten = []; fruehstarts = 0; tGruen = null;
    api.setzePunkte("–");
    flaeche.innerHTML = `<div class="rt-buehne rt-neutral">
      <p class="rt-symbol" aria-hidden="true">✋</p>
      <p class="rt-gross">Reaktionszeit messen</p>
      <p class="rt-klein">5 gültige Versuche, gewertet wird der Median.<br>Wer vor Grün drückt, bekommt einen neuen Anlauf.</p>
      <button type="button" class="knopf rt-bereit" id="rt-bereit">Bereit</button>
    </div>`;
    flaeche.querySelector("#rt-bereit").addEventListener("click", () => {
      flaeche.focus(); // damit die Leertaste sofort ankommt
      starteWarten();
    });
  }

  function starteWarten() {
    phase = "warten"; tGruen = null;
    const zaehler = `Versuch ${zeiten.length + 1} von ${ANZAHL_VERSUCHE}` +
      (fruehstarts ? ` · Frühstarts: ${fruehstarts}` : "");
    flaeche.innerHTML = buehne("rt-warten", "⏳", "Warte auf Grün …", zaehler);
    setzeTimer(() => {
      phase = "gruen"; tGruen = performance.now();
      flaeche.innerHTML = buehne("rt-gruen", "⚡", "JETZT!", "Klicken, tippen oder Leertaste!");
    }, PAUSE_MIN_MS + Math.random() * PAUSE_SPANNE_MS);
  }

  function druck() {
    const jetzt = performance.now();
    if (phase === "warten" && istFruehstart(jetzt, tGruen)) {
      // Frühstart: zählt nicht, kostet keinen Versuch — neuer Anlauf.
      fruehstarts++;
      phase = "pause";
      clearTimeout(timer);
      flaeche.innerHTML = buehne("rt-fehler", "✗", "Zu früh!", "Kein Problem — das zählt nicht. Gleich kommt ein neuer Anlauf.");
      setzeTimer(starteWarten, WEITER_MS);
    } else if (phase === "gruen") {
      const ms = Math.round(jetzt - tGruen);
      zeiten.push(ms);
      api.setzePunkte(formatMs(Math.round(median(zeiten))));
      if (zeiten.length >= ANZAHL_VERSUCHE) { auswerten(); return; }
      phase = "pause";
      flaeche.innerHTML = buehne("rt-neutral", "✓", formatMs(ms), `Versuch ${zeiten.length} von ${ANZAHL_VERSUCHE} geschafft — weiter geht’s …`);
      setzeTimer(starteWarten, WEITER_MS);
    }
    // In den Phasen start/pause/fertig passiert bei einem Druck nichts.
  }

  function auswerten() {
    clearTimeout(timer);
    phase = "fertig";
    const med = Math.round(median(zeiten));
    const weg = reaktionsweg(med);
    const zeilen = zeiten
      .map((z, i) => `<tr><td>${i + 1}</td><td>${formatMs(z)}</td></tr>`)
      .join("");
    let einordnung;
    if (med < 180) {
      einordnung = "Unter 180 ms — das ist Profi-Niveau (Sprintstart, E-Sport)!";
    } else if (med <= 300) {
      einordnung = "Typisch sind 200–300 ms — genau in diesem Bereich liegst du. Stark!";
    } else {
      einordnung = "Typisch sind 200–300 ms — ausgeruht und konzentriert holst du da bestimmt noch etwas heraus.";
    }
    flaeche.innerHTML = buehne("rt-neutral", "✓", formatMs(med), "Fertig! Deine Auswertung steht unten im Panel.");
    api.vorbei(med, `
      <table class="rt-tabelle">
        <caption>Deine ${ANZAHL_VERSUCHE} gültigen Versuche</caption>
        <thead><tr><th scope="col">Versuch</th><th scope="col">Zeit</th></tr></thead>
        <tbody>${zeilen}</tbody>
      </table>
      ${fruehstarts ? `<p class="rt-randnotiz">Frühstarts (nicht gewertet): ${fruehstarts}</p>` : ""}
      <p>${TEMPO_TEXT} fährt ein Auto in deiner Reaktionszeit ≈ <b>${formatMeter(weg)} m</b> weit —
        das ist dein <a href="../../physik/klasse-8/bewegung-und-diagramme/index.html">Reaktionsweg</a>,
        der erste Teil des Anhaltewegs.</p>
      <p>${einordnung}</p>`);
  }

  // Eingaben: Zeiger (Maus/Touch/Stift) auf der Fläche + Leertaste.
  // Nur einmal binden — Neustarts laufen über zeigeStart(), nicht über starte().
  flaeche.addEventListener("pointerdown", ev => {
    if (ev.button !== undefined && ev.button !== 0) return; // nur Haupttaste
    if (ev.target.closest("#rt-bereit")) return;            // der Knopf löst über click aus
    druck();
  });
  api.tasten(ev => {
    if (ev.key !== " " || ev.repeat) return;
    if (phase === "start") { starteWarten(); return; } // Leertaste startet auch
    druck();
  });

  api.neustartCb(zeigeStart);
  zeigeStart();
}

// ---------- Browser-Start ----------
// Nur im Browser das Gerüst laden — in Node (Tests) gibt es kein document.
if (typeof document !== "undefined") {
  import("../../assets/js/spiel/geruest.js").then(m => m.starteSpielSeite({ manifest, starte }));
}
